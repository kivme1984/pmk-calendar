'use strict';

(() => {
  const VERSION = '82.19.1';
  const RELEASE = '82.19.1';
  const BRANCH = '82';
  window.PMK_APP_VERSION = RELEASE;
  document.documentElement.dataset.pmkVersion = RELEASE;

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
    panel.querySelector('#settingsVersionValue').textContent = `v${RELEASE}`;
    panel.querySelector('#settingsVersionRelease').textContent = 'Облачные статусы, быстрые периоды и исправленные свайпы · 2026-07-03';
    panel.querySelector('#settingsUpdateButton').href = `./reset.html?v=${RELEASE}-settings`;
    return true;
  }

  function install() {
    applyVersion();
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-view="settings"], .nav-settings')) return;
      requestAnimationFrame(applyVersion);
    }, true);
    window.dispatchEvent(new CustomEvent('pmk-version-ready', { detail: { version: RELEASE, branch: BRANCH } }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
