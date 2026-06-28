'use strict';

(() => {
  const EVENT_CACHE_KEY = 'pmk-google-events-cache-v2';
  const LEGACY_EVENT_CACHE_KEY = 'pmk-google-events-cache-v1';
  let refreshPromise = null;
  let refreshSequence = 0;
  let dayRenderSequence = 0;
  let indexedEventsRef = null;
  let eventsByDate = new Map();
  let lastRefreshAt = 0;

  function readCachedEvents() {
    for (const key of [EVENT_CACHE_KEY, LEGACY_EVENT_CACHE_KEY]) {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (Array.isArray(saved?.events) && saved.events.length) return saved.events;
      } catch {}
    }
    return [];
  }

  function saveCachedEvents(events) {
    try {
      const items = [...events]
        .sort((a, b) => new Date(a.start?.dateTime || a.start || 0) - new Date(b.start?.dateTime || b.start || 0))
        .slice(-2000);
      localStorage.setItem(EVENT_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), events: items }));
    } catch {}
  }

  function restoreCachedEvents() {
    if (state.events.length) return;
    const cached = readCachedEvents();
    if (!cached.length) return;
    state.events = cached;
    invalidateEventCaches();
  }

  restoreCachedEvents();

  const originalEventDateKey = eventDateKey;
  const dateKeyCache = new WeakMap();
  eventDateKey = event => {
    if (!event || typeof event !== 'object') return originalEventDateKey(event);
    if (dateKeyCache.has(event)) return dateKeyCache.get(event);
    const key = originalEventDateKey(event);
    dateKeyCache.set(event, key);
    return key;
  };

  function rebuildDateIndex() {
    const all = getAllEvents();
    if (all === indexedEventsRef) return eventsByDate;
    indexedEventsRef = all;
    eventsByDate = new Map();
    all.forEach(event => {
      const key = eventDateKey(event);
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key).push(event);
    });
    return eventsByDate;
  }

  function countKeys(keys, index) {
    return keys.reduce((sum, key) => sum + (index.get(key)?.length || 0), 0);
  }

  function updateNavigationCounts(index) {
    const anchor = state.periodAnchorKey || state.selectedDayKey || businessTodayKey();
    const three = Array.from({ length: 3 }, (_, i) => addDaysToKey(anchor, i));
    const week = Array.from({ length: 7 }, (_, i) => addDaysToKey(anchor, i));
    const monthBase = new Date(`${anchor}T12:00:00Z`);
    const month = monthKey(monthBase);
    const monthKeys = Array.from({ length: daysInMonthKey(month) }, (_, i) => `${month}-${pad(i + 1)}`);
    qs('#todayCount').textContent = index.get(state.selectedDayKey || anchor)?.length || 0;
    qs('#threeDaysCount').textContent = countKeys(three, index);
    qs('#weekCount').textContent = countKeys(week, index);
    qs('#monthCount').textContent = countKeys(monthKeys, index);

    const updateDelivery = () => {
      const count = getAllEvents().reduce((sum, event) => sum + (eventMeta(event).requestStatus === 'pending-delivery' ? 1 : 0), 0);
      qs('#deliveryWaitingCount').textContent = count;
    };
    if ('requestIdleCallback' in window) requestIdleCallback(updateDelivery, { timeout: 1000 });
    else setTimeout(updateDelivery, 0);
  }

  function renderDayFast() {
    const renderId = ++dayRenderSequence;
    const key = state.selectedDayKey || businessTodayKey();
    state.selectedDayKey = key;
    state.periodAnchorKey = key;

    qs('#todayTitle').textContent = dayTitle(key);
    qs('#todaySubtitle').textContent = state.token
      ? 'Данные синхронизированы с Google Calendar.'
      : (state.events.length ? 'Показана последняя сохранённая синхронизация.' : 'Google Calendar не подключён.');
    syncDateControls();

    requestAnimationFrame(() => {
      if (renderId !== dayRenderSequence || state.currentView !== 'day') return;
      const index = rebuildDateIndex();
      const events = index.get(key) || [];
      qs('#summaryTotal').textContent = events.length;
      qs('#summaryPickup').textContent = events.filter(event => eventMeta(event).visitType === 'pickup').length;
      qs('#summaryDelivery').textContent = events.filter(event => eventMeta(event).visitType === 'delivery').length;
      qs('#summaryAttention').textContent = events.filter(event => {
        const data = eventMeta(event);
        return !data.phone || !displayAddress(data, event);
      }).length;
      renderToday(events);
      updateNavigationCounts(index);
    });
  }

  const originalRenderAll = renderAll;
  renderAll = function stableRenderAll() {
    if (state.currentView === 'day') {
      renderDayFast();
      return;
    }
    originalRenderAll();
  };

  const originalShiftPeriod = shiftPeriod;
  shiftSelectedDay = function stableShiftSelectedDay(days) {
    state.selectedDayKey = addDaysToKey(state.selectedDayKey || businessTodayKey(), days);
    state.periodAnchorKey = state.selectedDayKey;
    state.currentView = 'day';
    renderDayFast();
    pushAppHistory('day');
  };
  shiftPeriod = function stableShiftPeriod(days) {
    if (state.currentView === 'day') {
      shiftSelectedDay(days);
      return;
    }
    originalShiftPeriod(days);
  };

  googleRequest = async function stableGoogleRequest(path, options = {}) {
    if (!state.token) throw new Error('Google Calendar не подключён. Показаны сохранённые данные.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          Authorization: `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      if (response.status === 401) {
        clearSavedToken();
        updateConnectionUI();
        throw new Error('Сессия Google закончилась. Заявки сохранены — нажмите «Подключить Google» вручную.');
      }
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Google Calendar: ${response.status} ${body.slice(0, 160)}`);
      }
      return response.status === 204 ? null : response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Google Calendar не ответил за 20 секунд. Показаны сохранённые заявки.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  async function loadGooglePages() {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 730);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 365);
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const items = [];
    let pageToken = '';
    let pages = 0;

    do {
      const params = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '2500',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const result = await googleRequest(`/calendars/${calendarId}/events?${params}`);
      items.push(...(result?.items || []));
      pageToken = result?.nextPageToken || '';
      pages += 1;
    } while (pageToken && pages < 4);

    return items;
  }

  function looksLikeWrongAccount(previous, next) {
    if (!previous.length) return false;
    if (!next.length) return true;
    const previousHasPmk = previous.some(event => isPmkEvent(event));
    const nextHasPmk = next.some(event => isPmkEvent(event));
    return previousHasPmk && !nextHasPmk;
  }

  refreshEvents = function stableRefreshEvents() {
    restoreCachedEvents();
    if (!state.token) {
      invalidateEventCaches();
      indexedEventsRef = null;
      renderAll();
      updateConnectionUI();
      return Promise.resolve();
    }
    if (refreshPromise) return refreshPromise;

    const requestId = ++refreshSequence;
    const previous = [...state.events];
    refreshPromise = (async () => {
      try {
        const items = await loadGooglePages();
        if (requestId !== refreshSequence) return;
        if (looksLikeWrongAccount(previous, items)) {
          state.events = previous;
          showToast('Google вернул пустой или другой календарь. Сохранённые заявки оставлены на экране.', 'error');
        } else {
          state.events = items;
          saveCachedEvents(items);
          lastRefreshAt = Date.now();
        }
      } catch (error) {
        if (previous.length) state.events = previous;
        showToast(error.message, 'error');
      } finally {
        invalidateEventCaches();
        indexedEventsRef = null;
        renderAll();
        updateConnectionUI();
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  };

  autoReconnectGoogle = function disabledAutomaticReconnect() {};
  scheduleGoogleAutoReconnect = function stableGoogleStartup() {
    restoreCachedEvents();
    updateConnectionUI();
    if (state.token) setTimeout(() => refreshEvents(), 150);
  };

  connectGoogle = function manualGoogleConnect() {
    if (!state.settings.clientId) {
      setView('settings');
      showToast('Сначала укажите OAuth Client ID.', 'error');
      return;
    }
    if (!initializeGoogleTokenClient()) {
      showToast('Библиотека Google ещё загружается. Повторите через несколько секунд.', 'error');
      return;
    }
    state.silentReconnect = false;
    state.tokenClient.requestAccessToken({ prompt: state.token ? '' : 'select_account' });
  };

  updateConnectionUI = function stableConnectionUI() {
    const badge = qs('#connectionBadge');
    if (!badge) return;
    if (state.token) {
      badge.textContent = 'Google подключён';
      badge.className = 'status-badge online';
    } else if (state.events.length) {
      badge.textContent = 'Последняя синхронизация';
      badge.className = 'status-badge offline';
    } else {
      badge.textContent = 'Google не подключён';
      badge.className = 'status-badge offline';
    }
    qs('#connectGoogleBtn').textContent = state.token ? 'Переподключить' : 'Подключить Google';
    const submit = qs('#submitBtn');
    if (submit) submit.textContent = state.token
      ? (qs('#eventId').value ? 'Обновить в календаре' : 'Создать в календаре')
      : 'Сохранить на устройстве';
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !state.token) return;
    if (Date.now() - lastRefreshAt > 5 * 60 * 1000) refreshEvents();
  });
})();
