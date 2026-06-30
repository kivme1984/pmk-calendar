'use strict';

(() => {
  if (window.PMK_FAST_CALENDAR_SYNC_V68) return;
  window.PMK_FAST_CALENDAR_SYNC_V68 = true;

  const CACHE_NAME = 'pmk-calendar-data-v68';
  const CACHE_PATH = './__pmk-calendar-events-v68.json';
  const LAST_SYNC_KEY = 'pmk-calendar-last-sync-v68';
  const CALENDAR_KEY = 'pmk-calendar-cache-id-v68';
  let activeSync = null;
  let cachePromise = null;

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function calendarId() {
    return String(state.settings.calendarId || 'primary');
  }

  function bumpRevision() {
    window.PMK_EVENTS_REVISION = Number(window.PMK_EVENTS_REVISION || 0) + 1;
  }

  function readLastSync() {
    try {
      if (localStorage.getItem(CALENDAR_KEY) !== calendarId()) return '';
      return localStorage.getItem(LAST_SYNC_KEY) || '';
    } catch { return ''; }
  }

  function saveLastSync(value) {
    try {
      localStorage.setItem(CALENDAR_KEY, calendarId());
      if (value) localStorage.setItem(LAST_SYNC_KEY, value);
      else localStorage.removeItem(LAST_SYNC_KEY);
    } catch {}
  }

  async function readCache() {
    if (!('caches' in window)) return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(CACHE_PATH);
      if (!response) return null;
      const payload = await response.json();
      if (payload?.calendarId !== calendarId() || !Array.isArray(payload?.events)) return null;
      return payload;
    } catch { return null; }
  }

  async function writeCache(events) {
    if (!('caches' in window)) return;
    try {
      const cache = await caches.open(CACHE_NAME);
      const payload = JSON.stringify({ calendarId:calendarId(), savedAt:Date.now(), events });
      await cache.put(CACHE_PATH, new Response(payload, { headers:{ 'Content-Type':'application/json' } }));
    } catch {}
  }

  async function hydrateCachedEvents() {
    if (cachePromise) return cachePromise;
    cachePromise = (async () => {
      const payload = await readCache();
      if (!payload?.events?.length) return false;
      if (!state.events.length || payload.events.length >= state.events.length) {
        state.events = payload.events;
        window.PMK_FULL_CALENDAR_EVENT_COUNT = payload.events.length;
        window.PMK_FULL_CALENDAR_CACHE_READY = true;
        window.PMK_FULL_CALENDAR_SYNC_READY = true;
        bumpRevision();
        invalidateEventCaches();
        renderAll();
        emit('pmk-calendar-cache-ready', { count:payload.events.length, savedAt:payload.savedAt || 0 });
      }
      return true;
    })().finally(() => { cachePromise = null; });
    return cachePromise;
  }

  async function requestPages(params, onPage) {
    const id = encodeURIComponent(calendarId());
    let pageToken = '';
    let page = 0;
    do {
      const query = new URLSearchParams(params);
      if (pageToken) query.set('pageToken', pageToken);
      const result = await googleRequest(`/calendars/${id}/events?${query}`);
      const items = Array.isArray(result?.items) ? result.items : [];
      onPage(items);
      pageToken = result?.nextPageToken || '';
      page += 1;
      emit('pmk-calendar-sync-progress', { page, count:Number(onPage.count?.() || 0) });
    } while (pageToken && page < 200);
  }

  async function fullSync() {
    const events = [];
    const append = items => events.push(...items);
    append.count = () => events.length;
    await requestPages({
      timeMin:'1970-01-01T00:00:00Z',
      timeMax:'2100-01-01T00:00:00Z',
      singleEvents:'true',
      orderBy:'startTime',
      showDeleted:'false',
      maxResults:'2500',
    }, append);
    return events;
  }

  async function incrementalSync(updatedMin) {
    const map = new Map((state.events || []).map(event => [event.id, event]));
    let processed = 0;
    const apply = items => {
      items.forEach(event => {
        processed += 1;
        if (!event?.id) return;
        if (event.status === 'cancelled') map.delete(event.id);
        else map.set(event.id, event);
      });
    };
    apply.count = () => processed;
    await requestPages({
      updatedMin,
      singleEvents:'true',
      showDeleted:'true',
      maxResults:'2500',
    }, apply);
    return [...map.values()].sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0));
  }

  async function performSync() {
    if (!state.token) {
      await hydrateCachedEvents();
      invalidateEventCaches();
      renderAll();
      return;
    }
    if (activeSync) return activeSync;

    activeSync = (async () => {
      emit('pmk-calendar-sync-start');
      const syncStartedAt = new Date().toISOString();
      try {
        await hydrateCachedEvents();
        const lastSync = readLastSync();
        let events;
        if (lastSync && state.events.length) {
          try {
            events = await incrementalSync(lastSync);
          } catch {
            events = await fullSync();
          }
        } else {
          events = await fullSync();
        }
        state.events = events;
        saveLastSync(syncStartedAt);
        window.PMK_FULL_CALENDAR_SYNC_READY = true;
        window.PMK_FULL_CALENDAR_CACHE_READY = true;
        window.PMK_FULL_CALENDAR_EVENT_COUNT = events.length;
        bumpRevision();
        invalidateEventCaches();
        renderAll();
        checkUpcomingNotifications();
        await writeCache(events);
        emit('pmk-calendar-sync-done', { count:events.length });
      } catch (error) {
        window.PMK_FULL_CALENDAR_SYNC_READY = Boolean(state.events.length);
        invalidateEventCaches();
        renderAll();
        emit('pmk-calendar-sync-error', { message:error?.message || String(error) });
        showToast(error?.message || 'Не удалось синхронизировать Google Calendar.', 'error');
      } finally {
        activeSync = null;
      }
    })();

    return activeSync;
  }

  refreshEvents = performSync;
  window.PMK_FULL_CALENDAR_SYNC = { refresh:performSync, hydrate:hydrateCachedEvents };

  const previousPersistLocalEvents = persistLocalEvents;
  persistLocalEvents = function persistLocalEventsWithRevisionV68() {
    const result = previousPersistLocalEvents();
    bumpRevision();
    emit('pmk-local-events-changed', { count:state.localEvents.length });
    return result;
  };

  const start = () => requestAnimationFrame(() => hydrateCachedEvents());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();