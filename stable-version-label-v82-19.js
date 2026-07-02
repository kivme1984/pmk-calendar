'use strict';

(() => {
  if (globalThis.PMK_STABLE_VERSION_LABEL_V82_19) return;
  globalThis.PMK_STABLE_VERSION_LABEL_V82_19 = true;

  const VERSION = '82.19.1';
  const LABEL = `Резервная v${VERSION}`;

  function installSearchNormalization() {
    if (globalThis.PMK_SEARCH_NORMALIZATION_V82_19 || typeof eventSearchText !== 'function') return;
    globalThis.PMK_SEARCH_NORMALIZATION_V82_19 = true;
    const previousEventSearchText = eventSearchText;
    eventSearchText = function eventSearchTextNormalizedV8219(event) {
      const text = String(previousEventSearchText(event) || '').toLowerCase();
      const compactDigits = text.replace(/\D+/g, '');
      return compactDigits ? `${text} ${compactDigits}` : text;
    };
  }

  function ensureCompatibilityNodes() {
    if (!document.querySelector('#threeDaysCount')) {
      const counter = document.createElement('span');
      counter.id = 'threeDaysCount';
      counter.hidden = true;
      counter.setAttribute('aria-hidden', 'true');
      document.body.appendChild(counter);
    }
  }

  function readPricing() {
    const pricing = {};
    document.querySelectorAll('[id^="pricingSetting-"]').forEach(input => {
      const key = input.id.replace('pricingSetting-', '');
      const value = Number(input.value);
      if (key && Number.isFinite(value) && value >= 0) pricing[key] = value;
    });
    return pricing;
  }

  function persistPricing() {
    if (typeof state === 'undefined' || typeof saveSettings !== 'function') return;
    const pricing = readPricing();
    if (!Object.keys(pricing).length) return;
    state.settings.pricing = { ...(state.settings.pricing || {}), ...pricing };
    if (Number.isFinite(pricing.minimum)) state.settings.minimumOrder = pricing.minimum;
    saveSettings();
    globalThis.dispatchEvent(new CustomEvent('pmk-pricing-updated', { detail: state.settings.pricing }));
  }

  function installPricingPersistence() {
    const button = document.querySelector('#saveSettingsBtn');
    if (!button || button.dataset.pmkStablePricingV8219 === '1') return;
    button.dataset.pmkStablePricingV8219 = '1';
    button.addEventListener('click', () => setTimeout(persistPricing, 0));
  }

  function apply() {
    installSearchNormalization();
    ensureCompatibilityNodes();
    installPricingPersistence();
    document.documentElement.dataset.pmkCandidate = VERSION;
    if (document.title !== `ПМК Календарь · ${LABEL}`) {
      document.title = `ПМК Календарь · ${LABEL}`;
    }

    const indicator = document.querySelector('#pmkVersionIndicator');
    if (indicator) {
      indicator.className = 'pmk-version-indicator-v82-10 is-current pmk-stable-version-v82-19';
      indicator.href = '#';
      indicator.title = 'Открыта проверенная резервная версия ПМК Календаря';
      if (indicator.textContent?.trim() !== LABEL) {
        indicator.innerHTML = `<i></i><span>${LABEL}</span>`;
      }
    }

    let badge = document.querySelector('#pmkStableBuildBadgeV8219');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'pmkStableBuildBadgeV8219';
      badge.className = 'pmk-stable-build-badge-v82-19';
      badge.textContent = 'РЕЗЕРВНАЯ v82.19.1';
      document.body.appendChild(badge);
    }
  }

  function boot() {
    apply();
    const observer = new MutationObserver(() => apply());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      apply();
      if (attempts >= 80) clearInterval(timer);
    }, 250);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
