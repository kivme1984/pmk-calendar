'use strict';

const PMK_CACHE_KEY = 'pmk-google-events-cache-v1';
function pmkCacheLoad() {
  try {
    const saved = JSON.parse(localStorage.getItem(PMK_CACHE_KEY) || 'null');
    if (!state.events.length && Array.isArray(saved?.events)) state.events = saved.events;
  } catch {}
}
function pmkCacheSave(events) {
  try {
    const items = [...events]
      .sort((a,b) => new Date(a.start?.dateTime || a.start || 0) - new Date(b.start?.dateTime || b.start || 0))
      .slice(-300);
    localStorage.setItem(PMK_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), events: items }));
  } catch {}
}
pmkCacheLoad();

const pmkDecodeCache = new WeakMap();
const pmkDecodeOriginal = decodePmkData;
decodePmkData = event => {
  if (!event || typeof event !== 'object') return pmkDecodeOriginal(event);
  if (pmkDecodeCache.has(event)) return pmkDecodeCache.get(event);
  const value = pmkDecodeOriginal(event);
  pmkDecodeCache.set(event, value);
  return value;
};
const pmkMetaCache = new WeakMap();
const pmkMetaOriginal = eventMeta;
eventMeta = event => {
  if (!event || typeof event !== 'object') return pmkMetaOriginal(event);
  if (pmkMetaCache.has(event)) return pmkMetaCache.get(event);
  const value = pmkMetaOriginal(event);
  pmkMetaCache.set(event, value);
  return value;
};

const pmkRenderSearchOriginal = renderSearch;
renderSearch = () => state.currentView === 'search' && pmkRenderSearchOriginal();
const pmkRenderPeriodOriginal = renderPeriod;
renderPeriod = (...args) => ['three-days','week','month'].includes(state.currentView) && pmkRenderPeriodOriginal(...args);
const pmkRenderTodayOriginal = renderToday;
renderToday = events => ['day','delivery-waiting'].includes(state.currentView) && pmkRenderTodayOriginal(events);

schedulePreviewUpdate = () => {
  clearTimeout(state.previewTimer);
  state.previewTimer = setTimeout(() => state.currentView === 'form' && updatePreview(), 280);
};

refreshEvents = async () => {
  try {
    if (state.token) {
      const start = new Date(); start.setUTCDate(start.getUTCDate() - 400);
      const end = new Date(); end.setUTCDate(end.getUTCDate() + 210);
      const params = new URLSearchParams({
        timeMin: start.toISOString(), timeMax: end.toISOString(),
        singleEvents: 'true', orderBy: 'startTime', maxResults: '1000',
      });
      const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
      const result = await googleRequest(`/calendars/${calendarId}/events?${params}`);
      state.events = result.items || [];
      pmkCacheSave(state.events);
    }
    invalidateEventCaches();
    pmkConflictSource = null;
    renderAll();
    checkUpcomingNotifications();
  } catch (error) {
    invalidateEventCaches();
    pmkConflictSource = null;
    renderAll();
    showToast(`${error.message} Показана последняя сохранённая синхронизация.`, 'error');
  }
};

const pmkConnectionOriginal = updateConnectionUI;
updateConnectionUI = () => {
  pmkConnectionOriginal();
  if (!state.token && state.events.length) {
    qs('#connectionBadge').textContent = 'Последняя синхронизация';
    qs('#connectionBadge').className = 'status-badge offline';
    qs('#submitBtn').textContent = 'Сохранить на устройстве';
  }
};
