'use strict';

(() => {
  if (window.PMK_SETTINGS_VERSION_HEADER_V59) return;
  window.PMK_SETTINGS_VERSION_HEADER_V59 = true;

  const $ = (selector, root = document) => root.querySelector(selector);

  async function loadVersion() {
    try {
      const response = await fetch(`./version.json?settings=${Date.now()}`, { cache:'no-store' });
      if (!response.ok) throw new Error('version unavailable');
      return await response.json();
    } catch {
      return { version:'73', release:'compact-note-and-in-work-tab', date:'2026-06-30' };
    }
  }

  async function install() {
    const view = $('#view-settings');
    const heading = $('#view-settings > .page-heading');
    if (!view || !heading || $('#settingsVersionHeader')) return Boolean($('#settingsVersionHeader'));
    $('#view-settings .settings-actions a[href*="reset.html"]')?.remove();
    const panel = document.createElement('section');
    panel.id = 'settingsVersionHeader';
    panel.className = 'settings-version-header';
    panel.innerHTML = '<div class="settings-version-info"><span class="settings-version-label">Версия приложения</span><strong id="settingsVersionValue">v73</strong><small id="settingsVersionRelease">Основная версия</small></div><a id="settingsUpdateButton" class="button button-primary settings-update-button" href="./reset.html?v=73-settings">Обновить приложение</a>';
    heading.insertAdjacentElement('afterend', panel);
    const info = await loadVersion();
    const version = String(info?.version || '73');
    $('#settingsVersionValue').textContent = `v${version}`;
    $('#settingsVersionRelease').textContent = info?.date ? `Установленная сборка · ${info.date}` : 'Установленная сборка';
    $('#settingsUpdateButton').href = `./reset.html?v=${encodeURIComponent(version)}-settings-${Date.now()}`;
    return true;
  }

  const start = () => requestAnimationFrame(() => { if (!install()) setTimeout(install, 200); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();