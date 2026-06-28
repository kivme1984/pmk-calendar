'use strict';

(() => {
  const P = {
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
  };

  const clampDiscount = value => Math.max(0, Math.min(100, Number(value) || 0));
  const money = value => formatMoney(Math.round(value));
  const areaText = value => value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');

  function baseRate(rug = {}) {
    const material = rug.material || '';
    const pile = rug.pile || '';
    const width = Number(rug.width || 0);
    if (['Вискоза', 'Шёлк', 'Хлопок'].includes(material)) return P.delicate;
    if (pile === 'Более 1 см') return P.highPile;
    if (material === 'Шерсть') return P.wool;
    if (material === 'Безворсный' || (material === 'Синтетика' && pile === 'Без ворса')) return P.noPile;
    if (material === 'Синтетика') return width >= 3 ? P.syntheticWide : P.synthetic;
    return 0;
  }

  function suggestedDiscount(rugs = []) {
    if (qs('#regularCustomer')?.checked) return 10;
    if (rugs.length >= 3) return 10;
    if (rugs.length >= 2) return 5;
    return 0;
  }

  function unlockDiscount() {
    const input = qs('#discount');
    if (!input) return;
    input.readOnly = false;
    input.removeAttribute('readonly');
    input.classList.remove('discount-locked');
    input.title = 'Можно указать скидку вручную';
  }

  function discountForCalculation(rugs = []) {
    const input = qs('#discount');
    if (!input) return suggestedDiscount(rugs);

    unlockDiscount();
    const isManual = input.dataset.manualDiscount === '1';
    const value = isManual
      ? clampDiscount(input.dataset.manualValue ?? input.value)
      : suggestedDiscount(rugs);

    input.value = String(value);
    if (isManual) input.dataset.manualValue = String(value);
    input.dataset.autoDiscount = String(suggestedDiscount(rugs));
    return value;
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
        if (input.nextElementSibling) input.nextElementSibling.textContent = text;
      });
    });
  }

  function calculateCompletePrice() {
    const toggle = qs('#autoPrice');
    const priceInput = qs('#estimatedPrice');
    const breakdown = qs('#autoPriceBreakdown');
    unlockDiscount();
    if (!toggle || !priceInput || !breakdown || !toggle.checked) return;

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

      addFixed('Кондиционер', P.conditioner, 'Кондиционер');
      if (services.includes('Удаление запаха мочи')) {
        const value = area <= 6 ? P.odorSmall : P.odorLarge;
        subtotal += value;
        lines.push(`Удаление запаха мочи: ${money(value)}`);
      }
      addArea('Вычёсывание шерсти и волос', P.hair, 'Вычёсывание шерсти и волос');
      addFixed('Удаление пятен', P.stain, 'Удаление пятен');
      addArea('Подъём ворса', P.pileLift, 'Расчёсывание / подъём ворса');
      addFixed('Дезинфекция', P.disinfection, 'Дезинфекция');
      addFixed('Удаление слайма / пластилина', P.slimePlasticine, 'Удаление слайма / пластилина');
      addFixed('Озонация', P.ozonation, 'Озонация');
      if (services.includes('Экспресс-стирка') && !expressAdded) {
        subtotal += P.express;
        expressAdded = true;
        lines.push(`Экспресс-заказ: ${money(P.express)}`);
      }
    });

    if (errors.length) {
      priceInput.value = '';
      breakdown.className = 'auto-price-breakdown warning';
      breakdown.innerHTML = `<strong>Авторасчёт пока невозможен</strong><span>${errors.map(escapeHtml).join('<br>')}</span>`;
      schedulePreviewUpdate();
      return;
    }

    if (!subtotal) {
      priceInput.value = '';
      breakdown.className = 'auto-price-breakdown';
      breakdown.innerHTML = '<strong>Заполните параметры ковра</strong><span>После заполнения сумма появится автоматически.</span>';
      schedulePreviewUpdate();
      return;
    }

    const discount = discountForCalculation(rugs);
    const afterDiscount = Math.round(subtotal * (100 - discount) / 100);
    const total = Math.max(afterDiscount, P.minimum);
    priceInput.value = String(total);

    if (discount) {
      const manual = qs('#discount')?.dataset.manualDiscount === '1';
      lines.push(`Скидка ${discount}%${manual ? ' (вручную)' : ''}: −${money(subtotal - afterDiscount)}`);
    }
    if (total > afterDiscount) lines.push(`Минимальный заказ: ${money(P.minimum)}`);
    lines.push(`Итого: ${money(total)}`);

    breakdown.className = 'auto-price-breakdown success';
    breakdown.innerHTML = `<strong>Стоимость рассчитана автоматически</strong><span>${lines.map(escapeHtml).join('<br>')}</span>`;
    schedulePreviewUpdate();
  }

  function scheduleCalculation() {
    setTimeout(() => {
      updateServiceLabels();
      unlockDiscount();
      calculateCompletePrice();
    }, 0);
  }

  const previousFillForm = fillForm;
  fillForm = function fillFormWithManualDiscount(data = {}) {
    previousFillForm(data);
    const input = qs('#discount');
    if (input) {
      const rugs = Array.isArray(data.rugs) ? data.rugs : [];
      const automatic = data.regularCustomer ? 10 : rugs.length >= 3 ? 10 : rugs.length >= 2 ? 5 : 0;
      const saved = clampDiscount(data.discount || 0);
      input.dataset.manualDiscount = saved !== automatic ? '1' : '0';
      input.dataset.manualValue = String(saved);
      input.value = String(saved);
      unlockDiscount();
    }
    scheduleCalculation();
  };

  const previousResetForm = resetForm;
  resetForm = function resetFormWithManualDiscount(addDefaultRug = true) {
    previousResetForm(addDefaultRug);
    const input = qs('#discount');
    if (input) {
      input.dataset.manualDiscount = '0';
      input.dataset.manualValue = '0';
      input.value = '0';
      unlockDiscount();
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    updateServiceLabels();
    const form = qs('#requestForm');
    const discountInput = qs('#discount');

    if (discountInput) {
      discountInput.dataset.manualDiscount ||= '0';
      discountInput.dataset.manualValue ||= discountInput.value || '0';
      unlockDiscount();

      const observer = new MutationObserver(unlockDiscount);
      observer.observe(discountInput, { attributes: true, attributeFilter: ['readonly', 'class'] });
    }

    const captureManualDiscount = event => {
      if (event.target?.id !== 'discount') return;
      event.target.dataset.manualDiscount = '1';
      event.target.dataset.manualValue = event.target.value;
      unlockDiscount();
      scheduleCalculation();
    };

    form?.addEventListener('beforeinput', captureManualDiscount, true);
    form?.addEventListener('input', captureManualDiscount, true);
    form?.addEventListener('change', event => {
      if (event.target?.id === 'regularCustomer') {
        const input = qs('#discount');
        if (input) {
          input.dataset.manualDiscount = '0';
          input.dataset.manualValue = '';
        }
      }
      scheduleCalculation();
    }, true);

    form?.addEventListener('input', scheduleCalculation);
    form?.addEventListener('change', scheduleCalculation);
    form?.addEventListener('click', scheduleCalculation);
    scheduleCalculation();
  });
})();
