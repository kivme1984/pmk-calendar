'use strict';

(() => {
  const VERSION = '78';
  const RELEASE = 'runtime-version-source-of-truth';
  window.PMK_ACTIVE_BUILD_VERSION = VERSION;
  window.PMK_ACTIVE_BUILD_RELEASE = RELEASE;
  document.documentElement.dataset.pmkVersion = VERSION;

  function applyVersion() {
    const value = document.querySelector('#settingsVersionValue');
    const release = document.querySelector('#settingsVersionRelease');
    const update = document.querySelector('#settingsUpdateButton');
    if (!value && !release && !update) return false;

    if (value) value.textContent = `v${VERSION}`;
    if (release) release.textContent = 'Активная сборка · 2026-06-30';
    if (update) update.href = `./reset.html?v=${VERSION}-settings-${Date.now()}`;
    return true;
  }

  if (!applyVersion()) {
    const observer = new MutationObserver(() => {
      if (applyVersion()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
  }

  window.addEventListener('pmk-view-change', applyVersion);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') applyVersion();
  });
})();