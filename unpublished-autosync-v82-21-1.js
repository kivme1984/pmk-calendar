'use strict';

(() => {
  if (globalThis.PMK_UNPUBLISHED_AUTOSYNC_V82_21_1) return;
  globalThis.PMK_UNPUBLISHED_AUTOSYNC_V82_21_1 = true;

  let running = false;
  let timer = null;
  let lastToastAt = 0;

  function localItems() {
    try {
      return Array.isArray(state?.localEvents) ? state.localEvents.filter(event => String(event.id || '').startsWith('local-')) : [];
    } catch { return []; }
  }

  function pmkIdOf(event) {
    try {
      const data = typeof decodePmkData === 'function' ? decodePmkData(event) : null;
      return data?.pmkId || event?.extendedProperties?.private?.pmkId || '';
    } catch { return ''; }
  }

  function hasCloudDuplicate(localEvent) {
    const localPmkId = pmkIdOf(localEvent);
    if (!localPmkId || !Array.isArray(state?.events)) return false;
    return state.events.some(event => pmkIdOf(event) === localPmkId && !String(event.id || '').startsWith('local-'));
  }

  function bodyForUpload(localEvent) {
    const data = typeof decodePmkData === 'function' ? decodePmkData(localEvent) : null;
    if (data && typeof toGoogleEvent === 'function') {
      return toGoogleEvent({ ...data, eventId: '', syncedFromLocalId: localEvent.id });
    }
    const { id, htmlLink, updated, ...body } = localEvent;
    return body;
  }

  async function uploadOne(localEvent) {
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    if (hasCloudDuplicate(localEvent)) return { id: localEvent.id, skipped: true };
    await googleRequest(`/calendars/${calendarId}/events`, { method: 'POST', body: JSON.stringify(bodyForUpload(localEvent)) });
    return { id: localEvent.id, uploaded: true };
  }

  async function syncUnpublished(reason = 'auto') {
    if (running) return;
    if (!state?.token || !navigator.onLine) return;
    const pending = localItems();
    if (!pending.length) return;
    running = true;
    try {
      let done = 0;
      const removeIds = new Set();
      for (const localEvent of pending) {
        try {
          const result = await uploadOne(localEvent);
          if (result.uploaded || result.skipped) {
            removeIds.add(result.id);
            done += 1;
          }
        } catch (error) {
          console.warn('PMK unpublished sync failed', localEvent.id, error);
        }
      }
      if (removeIds.size) {
        state.localEvents = state.localEvents.filter(event => !removeIds.has(event.id));
        persistLocalEvents();
        if (typeof refreshEvents === 'function') await refreshEvents();
        const now = Date.now();
        if (now - lastToastAt > 15000) {
          lastToastAt = now;
          showToast?.(`Синхронизировано неопубликованных заявок: ${done}`, 'success');
        }
      }
    } finally {
      running = false;
    }
  }

  function scheduleSync(delay = 4000, reason = 'scheduled') {
    clearTimeout(timer);
    timer = setTimeout(() => syncUnpublished(reason), delay);
  }

  function boot() {
    scheduleSync(5000, 'boot');
    setInterval(() => syncUnpublished('interval'), 180000);
    window.addEventListener('online', () => scheduleSync(1200, 'online'));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) scheduleSync(1200, 'visible');
    });
    window.addEventListener('focus', () => scheduleSync(1200, 'focus'));
    document.addEventListener('click', event => {
      if (event.target?.closest?.('#connectGoogleBtn,#submitBtn')) scheduleSync(6500, 'after-click');
    }, true);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
