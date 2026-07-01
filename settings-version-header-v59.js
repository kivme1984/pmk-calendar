'use strict';

(() => {
  if (window.PMK_SETTINGS_VERSION_HEADER_V59) return;
  window.PMK_SETTINGS_VERSION_HEADER_V59 = true;
  const $ = (selector, root = document) => root.querySelector(selector);

  async function install() {
    const view = $('#view-settings');
    const heading = $('#view-settings > .page-heading');
    if (!view || !heading || $('#settingsVersionHeader')) return Boolean($('#settingsVersionHeader'));
    $('#view-settings .settings-actions a[href*="reset.html"]')?.remove();
    const panel = document.createElement('section');
    panel.id = 'settingsVersionHeader';
    panel.className = 'settings-version-header';
    panel.innerHTML = '<div class="settings-version-info"><span class="settings-version-label">Версия приложения</span><strong id="settingsVersionValue">v87</strong><small id="settingsVersionRelease">Настоящий свайп, статусы 2×2 и заметка в 2 строки · 2026-07-01</small></div><a id="settingsUpdateButton" class="button button-primary settings-update-button" href="./reset.html?v=87-settings">Обновить приложение</a>';
    heading.insertAdjacentElement('afterend', panel);
    return true;
  }

  const start = () => requestAnimationFrame(() => { if (!install()) setTimeout(install, 200); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();