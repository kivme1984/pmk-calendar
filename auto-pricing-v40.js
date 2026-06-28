'use strict';

(() => {
  const SHAGGY_RE = /ш[еёа]гги|шагги|shaggy|shaggi|\bshag\b|ков[её]р\s*травк/i;
  const SYNTHETIC_RE = /синтет|полипропилен|полиэстер|полиамид|акрил|нейлон|олефин|микрофибр|heat\s*set|хит[-\s]*сет|\bbcf\b|фризе/i;
  const WOOL_RE = /шерстян|\bwool\b|100\s*%\s*шерст|материал\s*[:\-]?\s*шерст|состав[^\n]{0,30}шерст/i;
  const NO_PILE_RE = /без\s*ворс|безворс|циновк|килим/i;
  const HIGH_PILE_RE = /длинн\w*\s*ворс|высок\w*\s*ворс|более\s*1\s*см|свыше\s*1\s*см|длинноворс/i;
  const LOW_PILE_RE = /средн\w*\s*ворс|коротк\w*\s*ворс|низк\w*\s*ворс|до\s*1\s*см|коротковорс/i;
  const COMBING_RE = /расч[её]с(?:ыван|ать|ка|ывание)?(?:\s+ворс[а-я]*)?|поднят(?:ие|ь)\s*ворс[а-я]*|подъ[её]м\s*ворс[а-я]*|причес(?:ать|ывание)\s*ворс[а-я]*/i;

  function inferMaterial(text = '') {
    if (/вискоз/i.test(text)) return 'Вискоза';
    if (/ш[её]лк|silk/i.test(text)) return 'Шёлк';
    if (/хлопок|хлопков|cotton/i.test(text)) return 'Хлопок';
    if (SHAGGY_RE.test(text) || SYNTHETIC_RE.test(text)) return 'Синтетика';
    if (WOOL_RE.test(text)) return 'Шерсть';
    if (NO_PILE_RE.test(text)) return 'Безворсный';
    return '';
  }

  function inferPile(text = '') {
    if (NO_PILE_RE.test(text)) return 'Без ворса';
    if (SHAGGY_RE.test(text) || HIGH_PILE_RE.test(text)) return 'Более 1 см';

    const measured = text.match(/ворс[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*(мм|см)/i);
    if (measured) {
      const amount = Number(measured[1].replace(',', '.'));
      const centimetres = measured[2].toLowerCase() === 'мм' ? amount / 10 : amount;
      return centimetres > 1 ? 'Более 1 см' : 'До 1 см';
    }

    if (LOW_PILE_RE.test(text)) return 'До 1 см';
    return '';
  }

  function sizeLines(text = '') {
    return String(text || '')
      .split(/\n+/)
      .map(line => line.trim())
      .filter(line => /\d+(?:[.,]\d+)?\s*[xх×*]\s*\d+(?:[.,]\d+)?/i.test(line));
  }

  function mergeServices(services = [], context = '') {
    const result = Array.isArray(services) ? [...services] : [];
    if (COMBING_RE.test(context) && !result.includes('Подъём ворса')) result.push('Подъём ворса');
    return result;
  }

  function enhanceOrderData(data = {}) {
    const rawText = [data.managerComment, data.description, data.rawText, data.orderSource].filter(Boolean).join('\n');
    const rugs = Array.isArray(data.rugs) ? data.rugs : [];
    const contexts = sizeLines(rawText);
    const enhancedRugs = rugs.map((rug, index) => {
      const lineContext = contexts[index] || '';
      const context = [lineContext, rugs.length === 1 ? rawText : ''].filter(Boolean).join('\n');
      const shaggy = SHAGGY_RE.test(context);
      return {
        ...rug,
        material: rug.material || (shaggy ? 'Синтетика' : inferMaterial(context)),
        pile: rug.pile || (shaggy ? 'Более 1 см' : inferPile(context)),
        services: mergeServices(rug.services, context),
      };
    });

    const regular = Boolean(data.regularCustomer) || /постоянн\w*\s+клиент|повторн\w*\s+заказ|уже\s+обращал/i.test(rawText);
    return {
      ...data,
      rugs: enhancedRugs.length ? enhancedRugs : rugs,
      regularCustomer: regular,
      discount: regular ? 10 : Number(data.discount || 0),
      orderSource: data.orderSource || (regular ? 'Постоянный клиент' : ''),
    };
  }

  function baseRateForRug(rug = {}) {
    const material = rug.material || '';
    const pile = rug.pile || '';
    const width = Number(rug.width || 0);

    if (['Вискоза', 'Шёлк', 'Хлопок'].includes(material)) return 800;
    if (pile === 'Более 1 см') return 450;
    if (material === 'Шерсть') return 400;
    if (material === 'Безворсный' || (material === 'Синтетика' && pile === 'Без ворса')) return 300;
    if (material === 'Синтетика') return width > 3 ? 450 : 350;
    return 0;
  }

  function calculatePrice() {
    const autoToggle = qs('#autoPrice');
    const priceInput = qs('#estimatedPrice');
    const breakdown = qs('#autoPriceBreakdown');
    if (!autoToggle || !priceInput || !breakdown) return;

    priceInput.readOnly = autoToggle.checked;
    priceInput.classList.toggle('auto-price-readonly', autoToggle.checked);
    breakdown.classList.toggle('hidden', !autoToggle.checked);
    if (!autoToggle.checked) return;

    const rugs = collectRugs();
    const lines = [];
    const problems = [];
    let subtotal = 0;
    let expressAdded = false;

    rugs.forEach((rug, index) => {
      const length = Number(rug.length || 0);
      const width = Number(rug.width || 0);
      const area = length * width;
      const rate = baseRateForRug(rug);

      if (!(length > 0 && width > 0)) {
        problems.push(`Ковёр ${index + 1}: укажите длину и ширину`);
        return;
      }
      if (!rate) {
        problems.push(`Ковёр ${index + 1}: укажите материал и ворс`);
        return;
      }

      const base = Math.round(area * rate);
      subtotal += base;
      lines.push(`Ковёр ${index + 1}: ${area.toFixed(2).replace('.00', '')} м² × ${rate} ₽ = ${formatMoney(base)}`);

      const services = Array.isArray(rug.services) ? rug.services : [];
      if (services.includes('Удаление запаха мочи')) {
        const value = area <= 6 ? 700 : 1000;
        subtotal += value;
        lines.push(`Удаление запаха: ${formatMoney(value)}`);
      }
      if (services.includes('Вычёсывание шерсти и волос')) {
        const value = Math.round(area * 150);
        subtotal += value;
        lines.push(`Вычёсывание шерсти и волос: ${area.toFixed(2).replace('.00', '')} м² × 150 ₽ = ${formatMoney(value)}`);
      }
      if (services.includes('Кондиционер')) {
        subtotal += 300;
        lines.push(`Кондиционер: ${formatMoney(300)}`);
      }
      if (services.includes('Озонация')) {
        subtotal += 300;
        lines.push(`Озонация: ${formatMoney(300)}`);
      }
      if (services.includes('Подъём ворса')) {
        const value = Math.round(area * 150);
        subtotal += value;
        lines.push(`Расчёсывание ворса: ${area.toFixed(2).replace('.00', '')} м² × 150 ₽ = ${formatMoney(value)}`);
      }
      if (services.includes('Экспресс-стирка') && !expressAdded) {
        subtotal += 1000;
        expressAdded = true;
        lines.push(`Экспресс-заказ: ${formatMoney(1000)}`);
      }
    });

    if (problems.length) {
      priceInput.value = '';
      breakdown.className = 'auto-price-breakdown warning';
      breakdown.innerHTML = `<strong>Авторасчёт пока невозможен</strong><span>${problems.map(escapeHtml).join('<br>')}</span>`;
      schedulePreviewUpdate();
      return;
    }

    if (!subtotal) {
      priceInput.value = '';
      breakdown.className = 'auto-price-breakdown';
      breakdown.innerHTML = '<strong>Заполните параметры ковра</strong><span>После размеров, материала и ворса сумма появится автоматически.</span>';
      schedulePreviewUpdate();
      return;
    }

    const discount = Number(qs('#discount')?.value || 0);
    const discounted = Math.round(subtotal * (100 - discount) / 100);
    const minimum = Number(state.settings.minimumOrder || 1800);
    const finalPrice = Math.max(discounted, minimum);
    priceInput.value = String(finalPrice);

    if (discount > 0) lines.push(`Скидка ${discount}%: −${formatMoney(subtotal - discounted)}`);
    if (finalPrice > discounted) lines.push(`Минимальный заказ: ${formatMoney(minimum)}`);
    lines.push(`Итого: ${formatMoney(finalPrice)}`);

    breakdown.className = 'auto-price-breakdown success';
    breakdown.innerHTML = `<strong>Стоимость рассчитана автоматически</strong><span>${lines.map(escapeHtml).join('<br>')}</span>`;
    schedulePreviewUpdate();
  }

  function syncRegularCustomer(options = {}) {
    const regular = qs('#regularCustomer');
    const discount = qs('#discount');
    if (!regular || !discount) return;

    if (regular.checked) {
      discount.value = '10';
      discount.readOnly = true;
      discount.classList.add('discount-locked');
    } else {
      discount.readOnly = false;
      discount.classList.remove('discount-locked');
      if (options.clearTen && Number(discount.value || 0) === 10) discount.value = '0';
    }
    calculatePrice();
  }

  function ensurePricingUI() {
    const priceInput = qs('#estimatedPrice');
    const priceGrid = priceInput?.closest('.field-grid');
    if (!priceGrid || qs('#autoPrice')) return;

    const toggle = document.createElement('label');
    toggle.className = 'toggle-row auto-price-toggle';
    toggle.innerHTML = '<input type="checkbox" id="autoPrice" /><span><strong>Рассчитать стоимость автоматически</strong><small>По размерам, материалу, ворсу и выбранным услугам.</small></span>';
    priceGrid.parentNode.insertBefore(toggle, priceGrid);

    const breakdown = document.createElement('div');
    breakdown.id = 'autoPriceBreakdown';
    breakdown.className = 'auto-price-breakdown hidden';
    priceGrid.parentNode.insertBefore(breakdown, priceGrid.nextSibling);

    const addressGrid = qs('#houseNumber')?.closest('.field-grid');
    addressGrid?.classList.add('address-fields-grid');
    const combingLabel = qs('.rug-services input[value="Подъём ворса"]')?.nextElementSibling;
    if (combingLabel) combingLabel.textContent = 'Расчёсывание / подъём ворса';
    priceInput.step = '1';
  }

  ensurePricingUI();

  const originalEventMeta = eventMeta;
  eventMeta = event => enhanceOrderData(originalEventMeta(event));

  const originalGetFormData = getFormData;
  getFormData = function getFormDataWithAutoPrice() {
    const data = enhanceOrderData(originalGetFormData());
    data.autoPrice = Boolean(qs('#autoPrice')?.checked);
    return data;
  };

  const originalFillForm = fillForm;
  fillForm = function fillFormWithAutoPrice(data) {
    const enhanced = enhanceOrderData(data);
    originalFillForm(enhanced);
    qs('#autoPrice').checked = Boolean(enhanced.autoPrice);
    qs('#regularCustomer').checked = Boolean(enhanced.regularCustomer);
    qs('#discount').value = enhanced.regularCustomer ? '10' : String(enhanced.discount || 0);
    syncRegularCustomer();
    calculatePrice();
  };

  const originalResetForm = resetForm;
  resetForm = function resetFormWithAutoPrice(addDefaultRug = true) {
    originalResetForm(addDefaultRug);
    if (qs('#autoPrice')) qs('#autoPrice').checked = false;
    if (qs('#estimatedPrice')) {
      qs('#estimatedPrice').readOnly = false;
      qs('#estimatedPrice').classList.remove('auto-price-readonly');
    }
    if (qs('#autoPriceBreakdown')) qs('#autoPriceBreakdown').className = 'auto-price-breakdown hidden';
    syncRegularCustomer();
  };

  document.addEventListener('DOMContentLoaded', () => {
    ensurePricingUI();
    syncRegularCustomer();

    qs('#autoPrice')?.addEventListener('change', calculatePrice);
    qs('#regularCustomer')?.addEventListener('change', () => syncRegularCustomer({ clearTen: true }));
    qs('#orderSource')?.addEventListener('change', event => {
      if (event.target.value !== 'Постоянный клиент') return;
      qs('#regularCustomer').checked = true;
      syncRegularCustomer();
      schedulePreviewUpdate();
    });

    const form = qs('#requestForm');
    const recalculate = event => {
      if (event.target.matches('.rug-length, .rug-width, .rug-material, .rug-pile, .rug-services input, #discount')) calculatePrice();
    };
    form?.addEventListener('input', recalculate);
    form?.addEventListener('change', recalculate);
    form?.addEventListener('click', event => {
      if (event.target.closest('.remove-rug') || event.target.closest('#addRugBtn')) setTimeout(calculatePrice, 0);
    });
  });
})();
