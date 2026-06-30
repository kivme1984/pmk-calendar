'use strict';

(() => {
  if (window.PMK_YANDEX_PRIMARY_REFRESH_V72) return;
  window.PMK_YANDEX_PRIMARY_REFRESH_V72 = true;

  const CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const CACHE_KEY = 'pmk-yandex-calendar-cache-v1';
  const DEFAULT_API_URL = 'https://lucky-math-8e63pmk-address.standart-media.workers.dev/calendar';
  const YANDEX_PREFIX = 'local-yandex-';
  const previousRefresh = refreshEvents;
  let activeRefresh = null;

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function config() {
    return {
      enabled: true,
      apiUrl: DEFAULT_API_URL,
      syncToken: '',
      ...(readJson(CONFIG_KEY, {}) || {}),
    };
  }

  function configured() {
    const value = config();
    return Boolean(value.enabled && value.apiUrl && value.syncToken);
  }

  async function request(path, options = {}) {
    const value = config();
    const response = await fetch(`${String(value.apiUrl).replace(/\/+$/, '')}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${value.syncToken}`,
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; }
    catch { payload = text ? { error: text } : null; }
    if (!response.ok) throw new Error(payload?.error || `Яндекс.Календарь: ошибка ${response.status}`);
    return payload;
  }

  function normalize(event) {
    const data = event?.pmkData || (() => {
      try { return decodePmkData(event); }
      catch { return null; }
    })();
    if (!data?.pmkId) return null;
    return {
      ...event,
      id: `${YANDEX_PREFIX}${data.pmkId}`,
      _provider: 'yandex',
      _providers: ['yandex'],
      _pmkId: data.pmkId,
      htmlLink: event.htmlLink || 'https://calendar.yandex.ru/',
      extendedProperties: { private: encodePmkData(data) },
    };
  }

  function applyEvents(events, source = 'network') {
    state.events = events;
    window.PMK_FULL_CALENDAR_SYNC_READY = true;
    window.PMK_FULL_CALENDAR_EVENT_COUNT = events.length;
    window.PMK_EVENTS_REVISION = Number(window.PMK_EVENTS_REVISION || 0) + 1;
    invalidateEventCaches();
    renderAll();
    checkUpcomingNotifications();
    updateConnectionUI();
    window.dispatchEvent(new CustomEvent('pmk-yandex-sync-done', { detail: { count: events.length, source } }));
    window.dispatchEvent(new CustomEvent('pmk-calendar-sync-done', { detail: { count: events.length, provider: 'yandex' } }));
    return events;
  }

  async function refreshYandexPrimary() {
    if (activeRefresh) return activeRefresh;
    activeRefresh = (async () => {
      window.dispatchEvent(new CustomEvent('pmk-calendar-sync-start', { detail: { provider: 'yandex' } }));
      try {
        if (typeof window.PMK_YANDEX_CALENDAR?.flushQueue === 'function') {
          await window.PMK_YANDEX_CALENDAR.flushQueue().catch(() => null);
        }
        const payload = await request('/events?from=1970-01-01&to=2100-01-01');
        const events = (Array.isArray(payload?.events) ? payload.events : []).map(normalize).filter(Boolean);
        writeJson(CACHE_KEY, events);
        return applyEvents(events, 'network');
      } catch (error) {
        const cached = (readJson(CACHE_KEY, []) || []).map(normalize).filter(Boolean);
        if (cached.length) applyEvents(cached, 'cache');
        window.dispatchEvent(new CustomEvent('pmk-yandex-sync-error', { detail: { message: error?.message || String(error) } }));
        window.dispatchEvent(new CustomEvent('pmk-calendar-sync-error', { detail: { message: error?.message || String(error), provider: 'yandex' } }));
        if (!cached.length) throw error;
        return cached;
      } finally {
        activeRefresh = null;
      }
    })();
    return activeRefresh;
  }

  async function providerRefreshV72() {
    if (configured() && !state.token) return refreshYandexPrimary();
    return previousRefresh();
  }

  refreshEvents = providerRefreshV72;
  if (window.PMK_FULL_CALENDAR_SYNC) window.PMK_FULL_CALENDAR_SYNC.refresh = providerRefreshV72;
  if (window.PMK_YANDEX_CALENDAR) window.PMK_YANDEX_CALENDAR.refresh = providerRefreshV72;

  window.PMK_YANDEX_PRIMARY_REFRESH_V72_API = {
    refresh: providerRefreshV72,
    refreshYandexPrimary,
    configured,
  };
})();