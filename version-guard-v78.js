'use strict';

(() => {
  const VERSION = '78';
  window.PMK_APP_VERSION = VERSION;
  document.documentElement.dataset.pmkVersion = VERSION;

  function applyVersion() {
    const heading = document.querySelector('#view-settings > .page-heading');
    if (!heading) return false;

    let panel = document.querySelector('#settingsVersionHeader');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'settingsVersionHeader';
      panel.className = 'settings-version-header';
      panel.innerHTML = '<div class="settings-version-info"><span class="settings-version-label">Версия приложения</span><strong id="settingsVersionValue"></strong><small id="settingsVersionRelease"></small></div><a id="settingsUpdateButton" class="button button-primary settings-update-button">Обновить приложение</a>';
      heading.insertAdjacentElement('afterend', panel);
    }

    const value = panel.querySelector('#settingsVersionValue');
    const release = panel.querySelector('#settingsVersionRelease');
    const update = panel.querySelector('#settingsUpdateButton');
    if (value) value.textContent = 'v78';
    if (release) release.textContent = 'Установленная проверенная сборка · 2026-06-30';
    if (update) update.href = './reset.html?v=78-settings';
    return true;
  }

  function install() {
    applyVersion();
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-view="settings"], .nav-settings')) return;
      requestAnimationFrame(applyVersion);
    }, true);
    window.dispatchEvent(new CustomEvent('pmk-version-ready', { detail:{ version:'78' } }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();