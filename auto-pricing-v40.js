'use strict';

(() => {
  const SITE_PRICING = Object.freeze({
    base: Object.freeze({
      noPileSynthetic: 300,
      mediumSynthetic: 350,
      mediumSyntheticWide: 450,
      mediumWool: 400,
      highPile: 450,
      delicate: 800,
    }),
    wideWidthFrom: 3,
    conditionerPerRug: 350,
    odorPerRug: 700,
    odorLargePerRug: 1000,
    odorAreaThreshold: 6,
    hairPerM2: 150,
    stainPerRug: 600,
    pileLiftPerM2: 150,
    minOrder: 1800,
    delivery: 0,
    loyalPercent: 10,
    tiers: Object.freeze([
      Object.freeze({ min: 2, percent: 5 }),
      Object.freeze({ min: 3, percent: 10 }),
    ]),
  });

  const MANUAL_PRICE_SERVICES = new Set([
    'Дезинфекция',
    'Удаление слайма / пластилина',
    'Озонация',
    'Экспресс-стирка',
  ]);

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
      discount: regular ? SITE_PRICING.loyalPercent : Number(data.discount || 0),
      orderSource: data.orderSource || (regular ? 'Постоянный клиент' : ''),
    };
  }

  function baseRateForRug(rug = {}) {
    const material = rug.material || '';
    const pile = rug.pile || '';
    const width = Number(rug.width || 0);

    if (['Вискоза', 'Шёлк', 'Хлопок'].includes(material)) return SITE_PRICING.base.delicate;
    if (pile === 'Более 1 см') return SITE_PRICING.base.highPile;
    if (material === 'Шерсть') return SITE_PRICING.base.mediumWool;
    if (material === 'Безворсный' || (material === 'Синтетика' && pile === 'Без ворса')) return SITE_PRICING.base.noPileSynthetic;
    if (material === 'Синтетика') {
      return width >= SITE_PRICING.wideWidthFrom
        ? SITE_PRICING.base.mediumSyntheticWide
        : SITE_PRICING.base.mediumSynthetic;
    }
    return 0;
  }

  function tierDiscountForRugCount(count) {
    let percent = 0;
    SITE_PRICING.tiers.forEach(tier => {
      if (count >= tier.min) percent = Math.max(percent, tier.percent);
    });
    return percent;
  }

  function automaticDiscountPercent(rugCount) {
    if (qs('#regularCustomer')?.checked) return SITE_PRICING.loyalPercent;
    return tierDiscountForRugCount(rugCount);
  }

  function rememberManualDiscount() {
    const discount = qs('#discount');
    if (!discount || discount.readOnly) return;
    discount.dataset.manualValue = discount.value || '0';
  }

  function syncDiscountField(rugCount = collectRugs().length, options = {}) {
    const regular = qs('#regularCustomer');
    const autoToggle = qs('#autoPrice');
    const discount = qs('#discount');
    if (!regular || !autoToggle || !discount) return 0;

    if (options.rememberManual) rememberManualDiscount();

    if (regular.checked || autoToggle.checked) {
      const percent = automaticDiscountPercent(rugCount);
      discount.value = String(percent);
      discount.readOnly = true;
      discount.classList.add('discount-locked');
      return percent;
    }

    discount.readOnly = false;
    discount.classList.remove('discount-locked');
    if (options.restoreManual) discount.value = discount.dataset.manualValue || '0';
    return Number(discount.value || 0);
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
    const discount = syncDiscountField(rugs.length);
    const lines = [];
    const problems = [];
    const manualServices = new Set();
    let subtotal = 0;

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
      if (services.includes('Кондиционер')) {
        subtotal += SITE_PRICING.conditionerPerRug;
        lines.push(`Кондиционер: ${formatMoney(SITE_PRICING.conditionerPerRug)}`);
      }
      if (services.includes('Удаление запаха мочи')) {
        const value = area <= SITE_PRICING.odorAreaThreshold
          ? SITE_PRICING.odorPerRug
          : SITE_PRICING.odorLargePerRug;
        subtotal += value;
        lines.push(`Удаление запаха мочи: ${formatMoney(value)}`);
      }
      if (services.includes('Вычёсывание шерсти и волос')) {
        const value = Math.round(area * SITE_PRICING.hairPerM2);
        subtotal += value;
        lines.push(`Вычёсывание шерсти и волос: ${area.toFixed(2).replace('.00', '')} м² × ${SITE_PRICING.hairPerM2} ₽ = ${formatMoney(value)}`);
      }
      if (services.includes('Удаление пятен')) {
        subtotal += SITE_PRICING.stainPerRug;
        lines.push(`Удаление пятен: ${formatMoney(SITE_PRICING.stainPerRug)}`);
      }
      if (services.includes('Подъём ворса')) {
        const value = Math.round(area * SITE_PRICING.pileLiftPerM2);
        subtotal += value;
        lines.push(`Расчёсывание / подъём ворса: ${area.toFixed(2).replace('.00', '')} м² × ${SITE_PRICING.pileLiftPerM2} ₽ = ${formatMoney(value)}`);
      }

      services.forEach(service => {
        if (MANUAL_PRICE_SERVICES.has(service)) manualServices.add(service);
      });
    });

    if (problems.length || manualServices.size) {
      priceInput.value = '';
      const notes = [...problems];
      if (manualServices.size) {
        notes.push(`Цена вручную: ${[...manualServices].join(', ')}`);
        if (subtotal) notes.push(`Известная часть расчёта до этих услуг: ${formatMoney(subtotal)}`);
      }
      breakdown.className = 'auto-price-breakdown warning';
      breakdown.innerHTML = `<strong>Нужна проверка менеджера</strong><span>${notes.map(escapeHtml).join('<br>')}</span>`;
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

    const discounted = Math.round(subtotal * (100 - discount) / 100);
    const finalPrice = Math.max(discounted + SITE_PRICING.delivery, SITE_PRICING.minOrder);
    priceInput.value = String(finalPrice);

    if (discount > 0) {
      const reason = qs('#regularCustomer')?.checked
        ? 'постоянный клиент'
        : `${rugs.length} ${pluralRugs(rugs.length)}`;
      lines.push(`Скидка ${discount}% (${reason}): −${formatMoney(subtotal - discounted)}`);
    }
    lines.push(`Доставка по городу: ${formatMoney(SITE_PRICING.delivery)}`);
    if (finalPrice > discounted + SITE_PRICING.delivery) lines.push(`Минимальный заказ: ${formatMoney(SITE_PRICING.minOrder)}`);
    lines.push(`Итого: ${formatMoney(finalPrice)}`);

    breakdown.className = 'auto-price-breakdown success';
    breakdown.innerHTML = `<strong>Стоимость рассчитана по калькулятору сайта</strong><span>${lines.map(escapeHtml).join('<br>')}</span>`;
    schedulePreviewUpdate();
  }

  function syncRegularCustomer(options = {}) {
    const regular = qs('#regularCustomer');
    const discount = qs('#discount');
    if (!regular || !discount) return;

    if (regular.checked && options.rememberManual !== false) rememberManualDiscount();
    syncDiscountField(collectRugs().length, {
      restoreManual: !regular.checked && !qs('#autoPrice')?.checked,
    });
    calculatePrice();
  }

  function ensurePricingUI() {
    const priceInput = qs('#estimatedPrice');
    const priceGrid = priceInput?.closest('.field-grid');
    if (!priceGrid || qs('#autoPrice')) return;

    const toggle = document.createElement('label');
    toggle.className = 'toggle-row auto-price-toggle';
    toggle.innerHTML = '<input type="checkbox" id="autoPrice" /><span><strong>Рассчитать стоимость автоматически</strong><small>Тарифы полностью совпадают с калькулятором на сайте.</small></span>';
    priceGrid.parentNode.insertBefore(toggle, priceGrid);

    const breakdown = document.createElement('div');
    breakdown.id = 'autoPriceBreakdown';
    breakdown.className = 'auto-price-breakdown hidden';
    priceGrid.parentNode.insertBefore(breakdown, priceGrid.nextSibling);

    const addressGrid = qs('#houseNumber')?.closest('.field-grid');
    addressGrid?.classList.add('address-fields-grid');
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
    qs('#discount').dataset.manualValue = String(enhanced.regularCustomer ? 0 : Number(enhanced.discount || 0));
    syncDiscountField(enhanced.rugs?.length || collectRugs().length);
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
    if (qs('#discount')) {
      qs('#discount').dataset.manualValue = '0';
      qs('#discount').value = '0';
      qs('#discount').readOnly = false;
      qs('#discount').classList.remove('discount-locked');
    }
    if (qs('#autoPriceBreakdown')) qs('#autoPriceBreakdown').className = 'auto-price-breakdown hidden';
    syncRegularCustomer({ rememberManual: false });
  };

  document.addEventListener('DOMContentLoaded', () => {
    ensurePricingUI();
    const discount = qs('#discount');
    if (discount && !discount.dataset.manualValue) discount.dataset.manualValue = discount.value || '0';
    syncRegularCustomer({ rememberManual: false });

    qs('#autoPrice')?.addEventListener('change', event => {
      if (event.target.checked) rememberManualDiscount();
      syncDiscountField(collectRugs().length, { restoreManual: !event.target.checked });
      calculatePrice();
    });
    qs('#regularCustomer')?.addEventListener('change', () => syncRegularCustomer());
    qs('#orderSource')?.addEventListener('change', event => {
      if (event.target.value !== 'Постоянный клиент') return;
      qs('#regularCustomer').checked = true;
      syncRegularCustomer();
      schedulePreviewUpdate();
    });

    const form = qs('#requestForm');
    const recalculate = event => {
      if (event.target.matches('.rug-length, .rug-width, .rug-material, .rug-pile, .rug-services input')) {
        syncDiscountField(collectRugs().length);
        calculatePrice();
      }
      if (event.target.matches('#discount') && !event.target.readOnly) {
        event.target.dataset.manualValue = event.target.value || '0';
        calculatePrice();
      }
    };
    form?.addEventListener('input', recalculate);
    form?.addEventListener('change', recalculate);
    form?.addEventListener('click', event => {
      if (event.target.closest('.remove-rug') || event.target.closest('#addRugBtn')) {
        setTimeout(() => {
          syncDiscountField(collectRugs().length);
          calculatePrice();
        }, 0);
      }
    });
  });
})();
