'use strict';

(() => {
  if (globalThis.PMK_TEST_VERSION_LABEL_V82_20) return;
  globalThis.PMK_TEST_VERSION_LABEL_V82_20 = true;

  const TITLE = 'ПМК Календарь · тест v82.20';
  const INDICATOR_HTML = '<i></i><span>Тест v82.20</span>';
  let applying = false;

  function apply() {
    if (applying) return;
    applying = true;
    try {
      if (document.documentElement.dataset.pmkCandidate !== '82.20') {
        document.documentElement.dataset.pmkCandidate = '82.20';
      }
      if (document.title !== TITLE) document.title = TITLE;

      const indicator = document.querySelector('#pmkVersionIndicator');
      if (indicator) {
        const className = 'pmk-version-indicator-v82-10 is-current pmk-test-version-v82-20';
        if (indicator.className !== className) indicator.className = className;
        if (indicator.innerHTML !== INDICATOR_HTML) indicator.innerHTML = INDICATOR_HTML;
        if (indicator.getAttribute('href') !== '#') indicator.href = '#';
        if (indicator.title !== 'Открыта новая тестовая сборка v82.20') {
          indicator.title = 'Открыта новая тестовая сборка v82.20';
        }
      }

      let badge = document.querySelector('#pmkTestBuildBadgeV8220');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'pmkTestBuildBadgeV8220';
        badge.className = 'pmk-test-build-badge-v82-20';
        badge.textContent = 'НОВАЯ ТЕСТОВАЯ v82.20';
        document.body.appendChild(badge);
      } else {
        if (badge.className !== 'pmk-test-build-badge-v82-20') badge.className = 'pmk-test-build-badge-v82-20';
        if (badge.textContent !== 'НОВАЯ ТЕСТОВАЯ v82.20') badge.textContent = 'НОВАЯ ТЕСТОВАЯ v82.20';
      }
    } finally {
      applying = false;
    }
  }

  function boot() {
    apply();
    const observer = new MutationObserver(() => queueMicrotask(apply));
    observer.observe(document.documentElement, { childList: true, subtree: true });
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      apply();
      if (attempts >= 120) clearInterval(timer);
    }, 250);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
