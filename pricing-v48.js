'use strict';

(() => {
  if (window.PMK_PRICING_V48) return;

  const PRICE = Object.freeze({
    noPile: 300,
    synthetic: 350,
    syntheticWide: 450,
    wool: 400,
    highPile: 450,
    delicate: 800,
    conditioner: 350,
    odorSmall: 700,
    odorLarge: 1000,
    hair: 150,
    stain: 600,
    pileLift: 150,
    disinfection: 700,
    slimePlasticine: 500,
    ozonation: 300,
    express: 1000,
    minimum: 1800,
  });

  let calculationTimer = 0;
  let applyingCalculatedValues = false;

  const clampDiscount = value => Math.max(0, Math.min(100, Number(value) || 0));
  const money = value => formatMoney(Math.round(Number(value) || 0));
  const areaText = value => Number(value || 0).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');

  function baseRate(rug = {}) {
    const material = rug.material || '';
    const pile = rug.pile || '';
    const width = Number(rug.width || 0);
    if (['Вискоза', 'Шёлк', 'Хлопок'].includes(material)) return PRICE.delicate;
    if (pile === 'Более 1 см') return PRICE.highPile;
    if (material === 'Шерсть') return PRICE.wool;
    if (material === 'Безворсный' || (material === 'Синтетика' && pile === 'Без ворса')) return PRICE.noPile;
    if (material === 'Синтетика') return width >= 3 ? PRICE.syntheticWide : PRICE.synthetic;
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
      row.innerHTML = '<input type="checkbox" id="autoPrice"><span><strong>Рассчитать стоимость автоматически</strong><small>Используется один стабильный расчёт без скидки за количество ковров.</small></span>';
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
    const labels = {
      'Удаление пятен': 'Удаление пятен · 600 ₽/ковёр',
      'Вычёсывание шерсти и волос': 'Вычёсывание шерсти и волос · 150 ₽/м²',
      'Удаление запаха мочи': 'Удаление запаха мочи · 700 ₽ до 6 м² / 1000 ₽ свыше 6 м²',
      'Дезинфекция': 'Дезинфекция · 700 ₽/ковёр',
      'Удаление слайма / пластилина': 'Удаление слайма / пластилина · 500 ₽/ковёр',
      'Подъём ворса': 'Расчёсывание / подъём ворса · 150 ₽/м²',
      'Озонация': 'Озонация · 300 ₽/ковёр',
      'Кондиционер': 'Кондиционер · 350 ₽/ковёр',
      'Экспресс-стирка': 'Экспресс-стирка · 1000 ₽/заказ',
    };

    Object.entries(labels).forEach(([value, text]) => {
      document.querySelectorAll(`.rug-services input[value="${value}"]`).forEach(input => {
        if (input.nextElementSibling && input.nextElementSibling.textContent !== text) {
          input.nextElementSibling.textContent = text;
        }
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
    if (!input) return qs('#regularCustomer')?.checked ? 10 : 0;
    const value = clampDiscount(input.value);
    if (String(value) !== input.value) input.value = String(value);
    return value;
  }

  function syncRegularCustomerDiscount(force = false) {
    const regular = qs('#regularCustomer');
    const discount = qs('#discount');
    if (!regular || !discount) return;
    if (regular.checked && (force || discount.dataset.manualDiscount !== '1')) discount.value = '10';
    if (!regular.checked && force) discount.value = '0';
  }

  function calculatePrice() {
    if (!ensurePricingUI()) return;
    updateServiceLabels();

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
      const services = Array.isArray(rug.services) ? rug.services : [];

      if (!(length > 0 && width > 0)) {
        errors.push(`Ковёр ${index + 1}: укажите длину и ширину`);
        return;
      }
      if (!rate) {
        errors.push(`Ковёр ${index + 1}: укажите материал и ворс`);
        return;
      }

      const base = Math.round(area * rate);
      subtotal += base;
      lines.push(`Ковёр ${index + 1}: ${areaText(area)} м² × ${rate} ₽ = ${money(base)}`);

      const addFixed = (service, price, label) => {
        if (!services.includes(service)) return;
        subtotal += price;
        lines.push(`${label}: ${money(price)}`);
      };
      const addArea = (service, price, label) => {
        if (!services.includes(service)) return;
        const value = Math.round(area * price);
        subtotal += value;
        lines.push(`${label}: ${areaText(area)} м² × ${price} ₽ = ${money(value)}`);
      };

      addFixed('Кондиционер', PRICE.conditioner, 'Кондиционер');
      if (services.includes('Удаление запаха мочи')) {
        const value = area <= 6 ? PRICE.odorSmall : PRICE.odorLarge;
        subtotal += value;
        lines.push(`Удаление запаха мочи: ${money(value)}`);
      }
      addArea('Вычёсывание шерсти и волос', PRICE.hair, 'Вычёсывание шерсти и волос');
      addFixed('Удаление пятен', PRICE.stain, 'Удаление пятен');
      addArea('Подъём ворса', PRICE.pileLift, 'Расчёсывание / подъём ворса');
      addFixed('Дезинфекция', PRICE.disinfection, 'Дезинфекция');
      addFixed('Удаление слайма / пластилина', PRICE.slimePlasticine, 'Удаление слайма / пластилина');
      addFixed('Озонация', PRICE.ozonation, 'Озонация');
      if (services.includes('Экспресс-стирка') && !expressAdded) {
        expressAdded = true;
        subtotal += PRICE.express;
        lines.push(`Экспресс-заказ: ${money(PRICE.express)}`);
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
    const total = Math.max(discounted, PRICE.minimum);
    setCalculatedPrice(total);

    if (discount) lines.push(`Скидка ${discount}%: −${money(subtotal - discounted)}`);
    if (total > discounted) lines.push(`Минимальный заказ: ${money(PRICE.minimum)}`);
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
      if (event.target?.id === 'discount' && !applyingCalculatedValues) {
        event.target.dataset.manualDiscount = '1';
      }
      if (event.target?.matches('.rug-length, .rug-width, .rug-material, .rug-pile, .rug-services input, #discount')) {
        scheduleCalculation();
      }
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
      if (event.target?.matches('.rug-length, .rug-width, .rug-material, .rug-pile, .rug-services input, #discount')) {
        scheduleCalculation();
      }
    });

    const rugs = qs('#rugsContainer');
    if (rugs && rugs.dataset.pricingObserverV48 !== '1') {
      rugs.dataset.pricingObserverV48 = '1';
      new MutationObserver(() => {
        updateServiceLabels();
        scheduleCalculation();
      }).observe(rugs, { childList: true });
    }
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

  window.PMK_PRICING_V48 = { calculatePrice, scheduleCalculation, baseRate };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
