'use strict';

(() => {
  if (globalThis.PMK_DIRECT_VERSION_HEADER_V92) return;
  globalThis.PMK_DIRECT_VERSION_HEADER_V92 = true;

  function apply() {
    const panel = document.querySelector('#settingsVersionHeader');
    if (!panel) return false;
    const value = panel.querySelector('#settingsVersionValue');
    const release = panel.querySelector('#settingsVersionRelease');
    const button = panel.querySelector('#settingsUpdateButton');
    if (value) value.textContent = 'v92 · полная прямая';
    if (release) release.textContent = 'Все рабочие модули без установки ярлыка';
    if (button) {
      button.textContent = 'Перезапустить безопасно';
      button.href = './full-direct-v92.html';
    }
    return true;
  }

  function install() {
    if (apply()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (apply() || attempts > 60) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
