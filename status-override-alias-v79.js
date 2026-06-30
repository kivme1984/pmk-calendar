'use strict';

(() => {
  if (window.PMK_STATUS_OVERRIDE_ALIAS_V79) return;
  window.PMK_STATUS_OVERRIDE_ALIAS_V79 = true;

  const KEY = 'pmk-status-overrides-v74';
  const pending = new Map();

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch { return {}; }
  }
  function write(value) {
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
  }
  function notify(id, status) {
    window.dispatchEvent(new CustomEvent('pmk-status-overrides-updated', { detail:{ id, status } }));
    requestAnimationFrame(() => {
      window.PMK_COMPLETED_WORKFLOW_V79_API?.scrub?.();
      window.PMK_COMPLETED_WORKFLOW_V79_API?.render?.();
      window.PMK_IN_WORK_WORKFLOW_V73_API?.render?.();
    });
  }

  function remember(id, status) {
    if (!id || !status) return;
    pending.set(String(id), { status:String(status), at:Date.now() });
    setTimeout(() => pending.delete(String(id)), 10000);
  }

  function aliasLatest(id, status) {
    queueMicrotask(() => {
      const map = read();
      if (map[id]?.status === status) {
        notify(id, status);
        return;
      }
      const now = Date.now();
      const candidate = Object.values(map)
        .filter(item => item?.status === status && Math.abs(now - new Date(item.updatedAt || 0).getTime()) < 8000)
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
      if (!candidate) return;
      map[id] = { ...candidate, legacyEventId:id };
      write(map);
      notify(id, status);
    });
  }

  window.addEventListener('click', event => {
    const button = event.target.closest?.('[data-status-event][data-status]');
    if (!button) return;
    const id = button.dataset.statusEvent;
    const status = button.dataset.status;
    remember(id, status);
    setTimeout(() => aliasLatest(id, status), 0);
  }, true);

  window.addEventListener('submit', event => {
    const dialog = event.target.closest?.('#pmkContractRequiredDialog');
    if (!dialog) return;
    const id = dialog.dataset.eventId;
    const status = dialog.dataset.nextStatus || 'picked-up';
    remember(id, status);
    setTimeout(() => aliasLatest(id, status), 0);
  }, true);

  const observer = new MutationObserver(() => {
    pending.forEach(({ status }, id) => aliasLatest(id, status));
  });
  const start = () => {
    const target = document.querySelector('#todayEvents');
    if (target) observer.observe(target, { childList:true, subtree:true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();