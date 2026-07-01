'use strict';

(() => {
  if (globalThis.PMK_DIRECT_HEALTHCHECK_V92) return;
  globalThis.PMK_DIRECT_HEALTHCHECK_V92 = true;

  function run() {
    const checks = {
      form: Boolean(document.querySelector('#requestForm')),
      search: Boolean(document.querySelector('#globalSearch')),
      inWork: Boolean(document.querySelector('[data-view="in-work"], .nav-in-work')),
      completed: Boolean(document.querySelector('[data-view="completed"], .nav-completed')),
      archive: Boolean(document.querySelector('[data-view="archive"], .nav-archive')),
      googleSync: typeof globalThis.PMK_FULL_CALENDAR_SYNC?.refresh === 'function',
      providerPanel: Boolean(document.querySelector('#pmkProviderStatusPanel')),
    };
    const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
    globalThis.PMK_DIRECT_HEALTH_V92 = { ok: missing.length === 0, checks, missing, checkedAt: new Date().toISOString() };
    try { localStorage.setItem('pmk-direct-health-v92', JSON.stringify(globalThis.PMK_DIRECT_HEALTH_V92)); } catch {}
    if (missing.length && typeof showToast === 'function') showToast(`Не загрузились модули: ${missing.join(', ')}`, 'error');
  }

  const start = () => setTimeout(run, 1200);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
