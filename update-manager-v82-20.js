'use strict';

(() => {
  if (window.PMK_UPDATE_MANAGER_V82_35) return;
  window.PMK_UPDATE_MANAGER_V82_20 = true;
  window.PMK_UPDATE_MANAGER_V82_35 = true;

  const CURRENT = '82.35.0';
  const CHECK_EVERY = 1000 * 60 * 20;
  const STYLE_ID = 'pmkUpdateManagerStyle';
  const INSTALLED_VERSION_KEY = 'pmk-installed-version';
  const INSTALLED_TOKEN_KEY = 'pmk-installed-build-token';
  let lastCheck = 0;
  let pendingRelease = null;

  function compare(a, b) {
    const aa = String(a || '').split('.').map(Number);
    const bb = String(b || '').split('.').map(Number);
    for (let i = 0; i < Math.max(aa.length, bb.length); i += 1) {
      const diff = (aa[i] || 0) - (bb[i] || 0);
      if (diff) return diff;
    }
    return 0;
  }

  function releaseToken(release = {}) {
    return `${release.version || ''}|${release.buildToken || ''}|${release.publishedAt || ''}`;
  }

  function cleanupModal() {
    document.querySelectorAll('.pmk-update-modal-backdrop').forEach(item => item.remove());
    document.documentElement.classList.remove('pmk-update-locked');
    document.body?.classList.remove('pmk-update-locked');
    if (document.body) {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.pointerEvents = '';
    }
  }

  function rememberInstalled(release = {}) {
    try {
      localStorage.setItem(INSTALLED_VERSION_KEY, release.version || CURRENT);
      if (release.buildToken) localStorage.setItem(INSTALLED_TOKEN_KEY, release.buildToken);
      sessionStorage.setItem('pmk-update-later-token', releaseToken(release));
    } catch {}
  }

  function alreadyInstalled(release = {}) {
    const version = release.version || '';
    if (!version) return true;
    if (compare(version, CURRENT) <= 0) return true;
    try {
      const savedVersion = localStorage.getItem(INSTALLED_VERSION_KEY) || '';
      const savedToken = localStorage.getItem(INSTALLED_TOKEN_KEY) || '';
      if (savedVersion && compare(version, savedVersion) <= 0) return true;
      if (release.buildToken && savedToken === release.buildToken) return true;
    } catch {}
    return false;
  }

  function css() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .pmk-update-modal-backdrop{position:fixed;inset:0;z-index:2147482500;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.55);backdrop-filter:blur(5px)}
      .pmk-update-modal{width:min(420px,100%);border-radius:22px;background:#fff;color:#171717;box-shadow:0 28px 90px rgba(0,0,0,.35);padding:22px}
      .pmk-update-modal h2{margin:0 0 8px;font-size:24px;line-height:1.12}.pmk-update-modal p{margin:0 0 18px;color:#555;line-height:1.4;font-size:15px}
      .pmk-update-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pmk-update-actions button{min-height:50px;border-radius:14px;border:1px solid #ddd;font:800 16px/1.1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.pmk-update-later{background:#fff;color:#222}.pmk-update-now{border-color:#f6b400!important;background:#f6b400;color:#111}
      .pmk-update-loading .pmk-update-now{opacity:.75;pointer-events:none}
    `;
    document.head.append(style);
  }

  function dialog(release) {
    if (alreadyInstalled(release)) return cleanupModal();
    const token = releaseToken(release);
    try {
      if (sessionStorage.getItem('pmk-update-later-token') === token) return cleanupModal();
    } catch {}
    css();
    cleanupModal();
    const box = document.createElement('div');
    box.id = 'pmkUpdateModal';
    box.className = 'pmk-update-modal-backdrop';
    box.innerHTML = `<div class="pmk-update-modal" role="dialog" aria-modal="true"><h2>Доступно обновление</h2><p>Есть новая версия ПМК Календаря: <b>${release.version || ''}</b>. Обновить приложение сейчас?</p><div class="pmk-update-actions"><button type="button" class="pmk-update-later">Позже</button><button type="button" class="pmk-update-now">Обновить</button></div></div>`;
    box.querySelector('.pmk-update-later').addEventListener('click', () => {
      try { sessionStorage.setItem('pmk-update-later-token', token); } catch {}
      cleanupModal();
    });
    box.querySelector('.pmk-update-now').addEventListener('click', () => updateNow(release, box));
    document.body.append(box);
  }

  async function clearOldCaches() {
    if (!window.caches) return;
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('pmk-calendar-v')).map(k => caches.delete(k)));
  }

  async function updateNow(release, box) {
    box?.classList.add('pmk-update-loading');
    rememberInstalled(release);
    try {
      const regs = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : [];
      await Promise.all(regs.map(reg => reg.update().catch(() => null)));
      await clearOldCaches();
    } catch {}
    cleanupModal();
    const url = release.updateUrl || './reset.html';
    location.href = `${url}${url.includes('?') ? '&' : '?'}release=auto-update-${Date.now()}`;
  }

  async function check(force = false) {
    if (!force && Date.now() - lastCheck < CHECK_EVERY) return;
    lastCheck = Date.now();
    try {
      const response = await fetch(`./pmk-release.json?update=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return cleanupModal();
      const release = await response.json();
      if (alreadyInstalled(release) && release.forceUpdate !== true) return cleanupModal();
      if (compare(release.version, CURRENT) > 0 || release.forceUpdate === true) {
        pendingRelease = release;
        dialog(release);
      } else cleanupModal();
    } catch { cleanupModal(); }
  }

  window.PMK_UPDATE_MANAGER = { check, updateNow: () => pendingRelease && updateNow(pendingRelease) };

  function boot() {
    rememberInstalled({ version: CURRENT, buildToken: 'compact-month-no-loop-v82-35' });
    cleanupModal();
    setTimeout(() => check(true), 1200);
    setInterval(check, CHECK_EVERY);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
