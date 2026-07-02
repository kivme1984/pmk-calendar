'use strict';

(() => {
  if (globalThis.PMK_STABLE_VERSION_LABEL_V82_19) return;
  globalThis.PMK_STABLE_VERSION_LABEL_V82_19 = true;

  const VERSION = '82.19.1';
  const LABEL = `Резервная v${VERSION}`;

  function apply() {
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
