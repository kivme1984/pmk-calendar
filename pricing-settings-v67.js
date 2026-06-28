'use strict';

(() => {
  if (window.PMK_PRICING_SETTINGS_V67) return;
  window.PMK_PRICING_SETTINGS_V67 = true;

  const DEFAULTS = Object.freeze({
    noPile: 300,
    synthetic: 350,
    syntheticWide: 450,
    wool: 400,
    highPile: 450,
    delicate: 800,
    stain: 500,
    odorSmall: 700,
    odorLarge: 1000,
    disinfection: 700,
    hair: 150,
    pileLift: 150,
    conditioner: 300,
    ozonation: 300,
    express: 1000,
    minimum: 1800,
    regularDiscount: 10,
    wideThreshold: 3,
    odorAreaThreshold: 6,
  });

  const GROUPS = [
    {
      title: 'Основная стирка, ₽/м²',
      fields: [
        ['noPile', 'Безворсная синтетика', '₽/м²', 50],
        ['synthetic', 'Синтетика, ворс до 1 см', '₽/м²', 50],
        ['syntheticWide', 'Синтетика шире порога', '₽/м²', 50],
        ['wool', 'Шерсть, ворс до 1 см', '₽/м²', 50],
        ['highPile', 'Ворс более 1 см', '₽/м²', 50],
        ['delicate', 'Вискоза / шёлк / хлопок', '₽/м²', 50],
      ],
    },
    {
      title: 'Дополнительные услуги',
      fields: [
        ['stain', 'Пятна / слайм / пластилин / маркеры', '₽/ковёр', 50],
        ['odorSmall', 'Запах мочи до порога площади', '₽/ковёр', 50],
        ['odorLarge', 'Запах мочи свыше порога', '₽/ковёр', 50],
        ['disinfection', 'Дезинфекция / после потопа', '₽/ковёр', 50],
        ['hair', 'Вычёсывание шерсти и волос', '₽/м²', 50],
        ['pileLift', 'Расчёсывание / подъём ворса', '₽/м²', 50],
        ['conditioner', 'Кондиционер', '₽/ковёр', 50],
        ['ozonation', 'Озонирование', '₽/ковёр', 50],
        ['express', 'Экспресс-выполнение', '₽/заказ', 50],
      ],
    },
    {
      title: 'Правила калькулятора',
      fields: [
        ['minimum', 'Минимальный заказ', '₽', 50],
        ['regularDiscount', 'Скидка постоянного клиента', '%', 1],
        ['wideThreshold', 'Повышенный тариф при ширине строго больше', 'м', 0.1],
        ['odorAreaThreshold', 'Порог площади для запаха мочи', 'м²', 0.1],
      ],
    },
  ];

  const $ = selector => document.querySelector(selector);
  const fieldId = key => `pricingSetting-${key}`;

  function normalized(source = {}) {
    const result = {};
    Object.entries(DEFAULTS).forEach(([key, fallback]) => {
      const value = Number(source?.[key]);
      result[key] = Number.isFinite(value) && value >= 0 ? value : fallback;
    });
    result.regularDiscount = Math.min(100, result.regularDiscount);
    return result;
  }

  function currentPricing() {
    try {
      const source = { ...(state?.settings?.pricing || {}) };
      if (source.minimum === undefined && Number.isFinite(Number(state?.settings?.minimumOrder))) source.minimum = Number(state.settings.minimumOrder);
      return normalized(source);
    } catch {
      return normalized({});
    }
  }

  function fieldMarkup([key, label, unit, step]) {
    return `<label class="pmk-price-field">
      <span>${label}</span>
      <span class="pmk-price-input-wrap">
        <input type="number" id="${fieldId(key)}" min="0" step="${step}" inputmode="decimal">
        <small>${unit}</small>
      </span>
    </label>`;
  }

  function cardMarkup() {
    return `<details id="pricingSettingsCard" class="form-card pricing-settings-card" open>
      <summary>Прайс калькулятора</summary>
      <p class="pricing-settings-intro">Все значения хранятся на этом устройстве и применяются сразу после сохранения настроек.</p>
      <div class="pricing-settings-groups">
        ${GROUPS.map(group => `<section class="pricing-settings-group">
          <h3>${group.title}</h3>
          <div class="pricing-settings-fields">${group.fields.map(fieldMarkup).join('')}</div>
        </section>`).join('')}
      </div>
      <div class="pricing-settings-footer">
        <button type="button" id="resetPricingDefaultsBtn" class="button button-secondary">Вернуть стандартный прайс</button>
        <span id="pricingSettingsState" aria-live="polite"></span>
      </div>
    </details>`;
  }

  function fill(pricing = currentPricing()) {
    const values = normalized(pricing);
    Object.entries(values).forEach(([key, value]) => {
      const input = $(`#${fieldId(key)}`);
      if (input) input.value = String(value);
    });
  }

  function read() {
    const values = {};
    Object.keys(DEFAULTS).forEach(key => {
      const input = $(`#${fieldId(key)}`);
      const value = Number(input?.value);
      values[key] = Number.isFinite(value) && value >= 0 ? value : DEFAULTS[key];
    });
    return normalized(values);
  }

  function markChanged() {
    const stateLabel = $('#pricingSettingsState');
    if (stateLabel) stateLabel.textContent = 'Есть несохранённые изменения';
  }

  function syncLegacyMinimum(pricing = read()) {
    const legacy = $('#minimumOrderSetting');
    if (legacy) legacy.value = String(pricing.minimum);
  }

  function persistAfterBaseSave() {
    const pricing = read();
    try {
      state.settings.pricing = pricing;
      state.settings.minimumOrder = pricing.minimum;
      saveSettings();
    } catch (error) {
      console.error('Не удалось сохранить прайс калькулятора', error);
      return;
    }
    const stateLabel = $('#pricingSettingsState');
    if (stateLabel) stateLabel.textContent = 'Прайс сохранён';
    window.dispatchEvent(new CustomEvent('pmk-pricing-updated', { detail: pricing }));
  }

  function install() {
    if ($('#pricingSettingsCard')) return true;
    const grid = $('#view-settings .settings-grid');
    if (!grid) return false;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = cardMarkup();
    const rulesCard = $('#minimumOrderSetting')?.closest('.form-card');
    const card = wrapper.firstElementChild;
    if (rulesCard?.nextSibling) grid.insertBefore(card, rulesCard.nextSibling);
    else grid.appendChild(card);

    $('#minimumOrderSetting')?.closest('.field')?.classList.add('pmk-price-legacy-minimum');
    fill();
    syncLegacyMinimum(currentPricing());

    Object.keys(DEFAULTS).forEach(key => $(`#${fieldId(key)}`)?.addEventListener('input', markChanged));
    $('#resetPricingDefaultsBtn')?.addEventListener('click', () => {
      fill(DEFAULTS);
      syncLegacyMinimum(DEFAULTS);
      markChanged();
    });

    const saveButton = $('#saveSettingsBtn');
    saveButton?.addEventListener('click', () => syncLegacyMinimum(read()), true);
    saveButton?.addEventListener('click', persistAfterBaseSave);
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 100) clearInterval(timer);
    }, 50);
  }

  window.PMK_PRICING_DEFAULTS = DEFAULTS;
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();