'use strict';

(() => {
  const VERSION = '82.2';
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
      panel.innerHTML = '<div class="settings-version-info"><span class="settings-version-label">Версия приложения</span><strong id="settingsVersionValue"></strong><small id="settingsVersionRelease"></small></div><a id="settingsUpdateButton" class="button button-primary settings-update-button">Переустановить приложение</a>';
      heading.insertAdjacentElement('afterend', panel);
    }
    panel.querySelector('#settingsVersionValue').textContent = 'v82.2';
    panel.querySelector('#settingsVersionRelease').textContent = 'Тест: стабильная v82 + шапка, свайпы, заметка и вертикальные статусы';
    panel.querySelector('#settingsUpdateButton').href = './install-v82-2.html';
    return true;
  }

  function install() {
    applyVersion();
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-view="settings"], .nav-settings')) return;
      requestAnimationFrame(applyVersion);
    }, true);
    window.dispatchEvent(new CustomEvent('pmk-version-ready', { detail:{ version:VERSION } }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
