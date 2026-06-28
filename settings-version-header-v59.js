'use strict';

(() => {
  if (window.PMK_SETTINGS_VERSION_HEADER_V59) return;
  window.PMK_SETTINGS_VERSION_HEADER_V59 = true;

  const $ = (selector, root = document) => root.querySelector(selector);

  async function loadVersion() {
    try {
      const response = await fetch(`./version.json?settings=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('version unavailable');
      return await response.json();
    } catch {
      return { version: '63', release: 'safe-service-worker-recovery', date: '2026-06-28' };
    }
  }

  async function install() {
    const view = $('#view-settings');
    const heading = $('#view-settings > .page-heading');
    if (!view || !heading) return false;
    if ($('#settingsVersionHeader')) return true;

    const oldUpdate = $('#view-settings .settings-actions a[href*="reset.html"]');
    const panel = document.createElement('section');
    panel.id = 'settingsVersionHeader';
    panel.className = 'settings-version-header';
    panel.innerHTML = `
      <div class="settings-version-info">
        <span class="settings-version-label">Версия приложения</span>
        <strong id="settingsVersionValue">v63</strong>
        <small id="settingsVersionRelease">Основная версия</small>
      </div>
      <a id="settingsUpdateButton" class="button button-primary settings-update-button" href="./reset.html?v=63-settings">
        Обновить приложение
      </a>`;

    heading.insertAdjacentElement('afterend', panel);
    oldUpdate?.remove();

    const info = await loadVersion();
    const version = String(info?.version || '63');
    $('#settingsVersionValue').textContent = `v${version}`;
    $('#settingsVersionRelease').textContent = info?.date
      ? `Установленная сборка · ${info.date}`
      : 'Установленная сборка';
    const button = $('#settingsUpdateButton');
    if (button) button.href = `./reset.html?v=${encodeURIComponent(version)}-settings-${Date.now()}`;
    return true;
  }

  function boot() {
    install().then(done => {
      if (done) return;
      let attempts = 0;
      const timer = setInterval(async () => {
        attempts += 1;
        if (await install() || attempts > 100) clearInterval(timer);
      }, 50);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();