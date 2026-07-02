'use strict';

(() => {
  if (globalThis.PMK_VERSION_INDICATOR_V82_13) return;
  globalThis.PMK_VERSION_INDICATOR_V82_13 = true;
  const CURRENT = String(globalThis.PMK_TEST_VERSION || '82.13');
  let applying = false;

  function compare(a, b) {
    const left = String(a || '').split('.').map(Number);
    const right = String(b || '').split('.').map(Number);
    for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
      const diff = (left[i] || 0) - (right[i] || 0);
      if (diff) return diff;
    }
    return 0;
  }

  async function apply() {
    if (applying) return;
    const node = document.querySelector('#pmkVersionIndicator');
    if (!node) return;
    applying = true;
    try {
      const response = await fetch(`./pmk-release.json?version-check=${encodeURIComponent(CURRENT)}-${Date.now()}`, { cache: 'no-store' });
      const release = response.ok ? await response.json() : { version: CURRENT };
      const hasUpdate = compare(release.version, CURRENT) > 0;
      node.className = `pmk-version-indicator-v82-10 ${hasUpdate ? 'has-update' : 'is-current'}`;
      node.innerHTML = `<i></i><span>${hasUpdate ? `Обновление v${release.version}` : `Актуальная v${CURRENT}`}</span>`;
      node.href = hasUpdate ? (release.testUrl || release.updateUrl || '#') : '#';
      node.title = hasUpdate ? `Доступна версия ${release.version}` : `Установлена актуальная версия ${CURRENT}`;
    } catch {
      node.className = 'pmk-version-indicator-v82-10 is-current';
      node.innerHTML = `<i></i><span>Актуальная v${CURRENT}</span>`;
      node.href = '#';
    } finally {
      applying = false;
    }
  }

  function boot() {
    apply();
    const observer = new MutationObserver(() => setTimeout(apply, 0));
    observer.observe(document.querySelector('.app-header') || document.body, { childList: true, subtree: true, characterData: true });
    setInterval(apply, 10000);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
