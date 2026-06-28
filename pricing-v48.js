'use strict';

(() => {
  if (window.PMK_PRICING_V48) return;

  const DEFAULT_PRICE = Object.freeze({
    noPile: 300,
    synthetic: 350,
    syntheticWide: 450,
    wool: 400,
    highPile: 450,
    delicate: 800,
    conditioner: 300,
    odorSmall: 700,
    odorLarge: 1000,
    hair: 150,
    stain: 500,
    pileLift: 150,
    disinfection: 700,
    ozonation: 300,
    express: 1000,
    minimum: 1800,
    regularDiscount: 10,
    wideThreshold: 3,
    odorAreaThreshold: 6,
  });

  let calculationTimer = 0;
  let applyingCalculatedValues = false;

  const clampDiscount = value => Math.max(0, Math.min(100, Number(value) || 0));
  const money = value => formatMoney(Math.round(Number(value) || 0));
  const areaText = value => Number(value || 0).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  const clean = value => String(value || '').trim();

  function priceTable() {
    let custom = {};
    try { custom = state?.settings?.pricing || {}; } catch {}
    const table = {};
    Object.entries(DEFAULT_PRICE).forEach(([key, fallback]) => {
      const value = Number(custom?.[key]);
      table[key] = Number.isFinite(value) && value >= 0 ? value : fallback;
    });
    table.regularDiscount = Math.min(100, table.regularDiscount);
    return table;
  }

  function baseRate(rug = {}) {
    const price = priceTable();
    const material = clean(rug.material);
    const pile = clean(rug.pile);
    const width = Number(rug.width || 0);

    if (!material) return 0;
    if (['Вискоза', 'Шёлк', 'Хлопок'].includes(material)) return price.delicate;
    if (material === 'Безворсный') return price.noPile;
    if (!pile) return 0;
    if (pile === 'Более 1 см') return price.highPile;
    if (material === 'Шерсть') return price.wool;
    if (material === 'Синтетика' && pile === 'Без ворса') return price.noPile;
    if (material === 'Синтетика' && pile === 'До 1 см') return width > price.wideThreshold ? price.syntheticWide : price.synthetic;
    return 0;
  }

  function ensurePricingUI() {
    const priceInput = qs('#estimatedPrice');
    const priceGrid = priceInput?.closest('.field-grid');
    if (!priceInput || !priceGrid) return false;

    let toggle = qs('#autoPrice');
    if (!toggle) {
      const row = document.createElement('label');
      row.className = 'toggle-row auto-price-toggle';
      row.innerHTML = '<input type="checkbox" id="autoPrice"><span><strong>Рассчитать стоимость автоматически</strong><small>Расчёт по прайсу из настроек без скидки за количество ковров.</small></span>';
      priceGrid.parentNode.insertBefore(row, priceGrid);
      toggle = qs('#autoPrice');
    }

    if (!qs('#autoPriceBreakdown')) {
      const breakdown = document.createElement('div');
      breakdown.id = 'autoPriceBreakdown';
      breakdown.className = 'auto-price-breakdown hidden';
      priceGrid.parentNode.insertBefore(breakdown, priceGrid.nextSibling);
    }

    priceInput.step = '1';
    return Boolean(toggle);
  }

  function updateServiceLabels() {
    const price = priceTable();
    const labels = {
      'Удаление пятен': `Пятна / слайм / пластилин / маркеры · ${money(price.stain)}/ковёр`,
      'Вычёсывание шерсти и волос': `Вычёсывание шерсти и волос · ${money(price.hair)}/м²`,
      'Удаление запаха мочи': `Удаление запаха мочи · ${money(price.odorSmall)} до ${areaText(price.odorAreaThreshold)} м² / ${money(price.odorLarge)} свыше`,
      'Дезинфекция': `Дезинфекция / ковёр после потопа · ${money(price.disinfection)}/ковёр`,
      'Подъём ворса': `Расчёсывание / подъём ворса · ${money(price.pileLift)}/м²`,
      'Озонация': `Озонация · ${money(price.ozonation)}/ковёр`,
      'Кондиционер': `Кондиционер · ${money(price.conditioner)}/ковёр`,
      'Экспресс-стирка': `Экспресс-стирка · ${money(price.express)}/заказ`,
    };

    Object.entries(labels).forEach(([value, text]) => {
      document.querySelectorAll(`.rug-services input[value="${value}"], .v51-services input[value="${value}"]`).forEach(input => {
        if (input.nextElementSibling && input.nextElementSibling.textContent !== text) input.nextElementSibling.textContent = text;
      });
    });
  }

  function setCalculatedPrice(value) {
    const input = qs('#estimatedPrice');
    if (!input) return;
    applyingCalculatedValues = true;
    input.value = value ? String(Math.round(value)) : '';
    applyingCalculatedValues = false;
  }

  function currentDiscount() {
    const input = qs('#discount');
    if (!input) return qs('#regularCustomer')?.checked ? priceTable().regularDiscount : 0;
    const value = clampDiscount(input.value);
    if (String(value) !== input.value) input.value = String(value);
    return value;
  }

  function syncRegularCustomerDiscount(force = false) {
    const regular = qs('#regularCustomer');
    const discount = qs('#discount');
    if (!regular || !discount) return;
    if (regular.checked && (force || discount.dataset.manualDiscount !== '1')) discount.value = String(priceTable().regularDiscount);
    if (!regular.checked && force) discount.value = '0';
  }

  function calculatePrice() {
    if (!ensurePricingUI()) return;
    updateServiceLabels();

    const price = priceTable();
    const toggle = qs('#autoPrice');
    const priceInput = qs('#estimatedPrice');
    const breakdown = qs('#autoPriceBreakdown');
    const enabled = Boolean(toggle?.checked);

    priceInput.readOnly = enabled;
    priceInput.classList.toggle('auto-price-readonly', enabled);
    breakdown.classList.toggle('hidden', !enabled);
    if (!enabled) return;

    const rugs = collectRugs();
    const lines = [];
    const errors = [];
    let subtotal = 0;
    let expressAdded = false;

    rugs.forEach((rug, index) => {
      const length = Number(rug.length || 0);
      const width = Number(rug.width || 0);
      const area = length * width;
      const rate = baseRate(rug);
      const services = Array.isArray(rug.services) ? [...new Set(rug.services)] : [];

      if (!(length > 0 && width > 0)) {
        errors.push(`Ковёр ${index + 1}: укажите длину и ширину`);
        return;
      }
      if (!rate) {
        errors.push(`Ковёр ${index + 1}: проверьте материал и ворс`);
        return;
      }

      const base = Math.round(area * rate);
      subtotal += base;
      lines.push(`Ковёр ${index + 1}: ${areaText(area)} м² × ${rate} ₽ = ${money(base)}`);

      const addFixed = (service, value, label) => {
        if (!services.includes(service)) return;
        subtotal += value;
        lines.push(`${label}: ${money(value)}`);
      };
      const addArea = (service, value, label) => {
        if (!services.includes(service)) return;
        const amount = Math.round(area * value);
        subtotal += amount;
        lines.push(`${label}: ${areaText(area)} м² × ${value} ₽ = ${money(amount)}`);
      };

      addFixed('Удаление пятен', price.stain, 'Пятна / слайм / пластилин / маркеры');
      addArea('Вычёсывание шерсти и волос', price.hair, 'Вычёсывание шерсти и волос');
      if (services.includes('Удаление запаха мочи')) {
        const value = area <= price.odorAreaThreshold ? price.odorSmall : price.odorLarge;
        subtotal += value;
        lines.push(`Удаление запаха мочи: ${money(value)}`);
      }
      addFixed('Дезинфекция', price.disinfection, 'Дезинфекция / ковёр после потопа');
      addArea('Подъём ворса', price.pileLift, 'Расчёсывание / подъём ворса');
      addFixed('Озонация', price.ozonation, 'Озонация');
      addFixed('Кондиционер', price.conditioner, 'Кондиционер');
      if (services.includes('Экспресс-стирка') && !expressAdded) {
        expressAdded = true;
        subtotal += price.express;
        lines.push(`Экспресс-заказ: ${money(price.express)}`);
      }
    });

    if (errors.length) {
      setCalculatedPrice(0);
      breakdown.className = 'auto-price-breakdown warning';
      breakdown.innerHTML = `<strong>Авторасчёт пока невозможен</strong><span>${errors.map(escapeHtml).join('<br>')}</span>`;
      schedulePreviewUpdate();
      return;
    }

    if (!subtotal) {
      setCalculatedPrice(0);
      breakdown.className = 'auto-price-breakdown';
      breakdown.innerHTML = '<strong>Заполните параметры ковра</strong><span>После заполнения сумма появится автоматически.</span>';
      schedulePreviewUpdate();
      return;
    }

    const discount = currentDiscount();
    const discounted = Math.round(subtotal * (100 - discount) / 100);
    const total = Math.max(discounted, price.minimum);
    setCalculatedPrice(total);

    if (discount) lines.push(`Скидка ${discount}%: −${money(subtotal - discounted)}`);
    if (total > discounted) lines.push(`Минимальный заказ: ${money(price.minimum)}`);
    lines.push(`Итого: ${money(total)}`);

    breakdown.className = 'auto-price-breakdown success';
    breakdown.innerHTML = `<strong>Стоимость рассчитана автоматически</strong><span>${lines.map(escapeHtml).join('<br>')}</span>`;
    schedulePreviewUpdate();
  }

  function scheduleCalculation() {
    clearTimeout(calculationTimer);
    calculationTimer = setTimeout(calculatePrice, 180);
  }

  function installListeners() {
    const form = qs('#requestForm');
    if (!form || form.dataset.pricingV48 === '1') return;
    form.dataset.pricingV48 = '1';

    form.addEventListener('input', event => {
      if (event.target?.id === 'discount' && !applyingCalculatedValues) event.target.dataset.manualDiscount = '1';
      if (event.target?.matches('.rug-length, .rug-width, .rug-material, .rug-pile, .rug-services input, .v51-services input, #discount')) scheduleCalculation();
    });

    form.addEventListener('change', event => {
      if (event.target?.id === 'autoPrice') {
        if (event.target.checked) syncRegularCustomerDiscount(false);
        calculatePrice();
        return;
      }
      if (event.target?.id === 'regularCustomer') {
        const discount = qs('#discount');
        if (discount) discount.dataset.manualDiscount = '0';
        syncRegularCustomerDiscount(true);
        calculatePrice();
        return;
      }
      if (event.target?.matches('.rug-length, .rug-width, .rug-material, .rug-pile, .rug-services input, .v51-services input, #discount')) scheduleCalculation();
    });

    const rugs = qs('#rugsContainer');
    if (rugs && rugs.dataset.pricingObserverV48 !== '1') {
      rugs.dataset.pricingObserverV48 = '1';
      new MutationObserver(() => {
        updateServiceLabels();
        scheduleCalculation();
      }).observe(rugs, { childList: true, subtree: true });
    }

    window.addEventListener('pmk-pricing-updated', () => {
      const discount = qs('#discount');
      if (qs('#regularCustomer')?.checked && discount?.dataset.manualDiscount !== '1') syncRegularCustomerDiscount(true);
      updateServiceLabels();
      calculatePrice();
    });
  }

  ensurePricingUI();

  const previousGetFormData = getFormData;
  getFormData = function getFormDataWithPricingV48() {
    const data = previousGetFormData();
    data.autoPrice = Boolean(qs('#autoPrice')?.checked);
    return data;
  };

  const previousFillForm = fillForm;
  fillForm = function fillFormWithPricingV48(data = {}) {
    previousFillForm(data);
    ensurePricingUI();
    const toggle = qs('#autoPrice');
    if (toggle) toggle.checked = Boolean(data.autoPrice);
    const discount = qs('#discount');
    if (discount) {
      discount.dataset.manualDiscount = data.discount !== undefined ? '1' : '0';
      if (data.discount !== undefined) discount.value = String(clampDiscount(data.discount));
    }
    syncRegularCustomerDiscount(false);
    calculatePrice();
  };

  const previousResetForm = resetForm;
  resetForm = function resetFormWithPricingV48(addDefaultRug = true) {
    previousResetForm(addDefaultRug);
    ensurePricingUI();
    const toggle = qs('#autoPrice');
    if (toggle) toggle.checked = false;
    const price = qs('#estimatedPrice');
    if (price) {
      price.readOnly = false;
      price.classList.remove('auto-price-readonly');
    }
    const discount = qs('#discount');
    if (discount) {
      discount.dataset.manualDiscount = '0';
      discount.value = '0';
    }
    const breakdown = qs('#autoPriceBreakdown');
    if (breakdown) breakdown.className = 'auto-price-breakdown hidden';
  };

  function install() {
    ensurePricingUI();
    installListeners();
    updateServiceLabels();
    syncRegularCustomerDiscount(false);
    calculatePrice();
  }

  window.PMK_PRICING_V48 = { DEFAULT_PRICE, priceTable, calculatePrice, scheduleCalculation, baseRate };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();