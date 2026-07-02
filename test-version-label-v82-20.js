'use strict';

(() => {
  if (globalThis.PMK_TEST_VERSION_LABEL_V82_20) return;
  globalThis.PMK_TEST_VERSION_LABEL_V82_20 = true;

  function apply() {
    document.documentElement.dataset.pmkCandidate = '82.20';
    document.title = 'ПМК Календарь · тест v82.20';

    const indicator = document.querySelector('#pmkVersionIndicator');
    if (indicator) {
      indicator.className = 'pmk-version-indicator-v82-10 is-current pmk-test-version-v82-20';
      indicator.innerHTML = '<i></i><span>Тест v82.20</span>';
      indicator.href = '#';
      indicator.title = 'Открыта новая тестовая сборка v82.20';
    }

    let badge = document.querySelector('#pmkTestBuildBadgeV8220');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'pmkTestBuildBadgeV8220';
      badge.className = 'pmk-test-build-badge-v82-20';
      badge.textContent = 'НОВАЯ ТЕСТОВАЯ v82.20';
      document.body.appendChild(badge);
    }
  }

  function boot() {
    apply();
    const observer = new MutationObserver(apply);
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
