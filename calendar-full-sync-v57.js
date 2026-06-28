'use strict';

(() => {
  if (window.PMK_FULL_CALENDAR_SYNC_V57) return;
  window.PMK_FULL_CALENDAR_SYNC_V57 = true;

  let activeSync = null;

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  async function loadEveryCalendarPage() {
    if (!state.token) return [];

    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const items = [];
    let pageToken = '';
    let page = 0;

    emit('pmk-calendar-sync-start');

    do {
      const params = new URLSearchParams({
        timeMin: '1970-01-01T00:00:00Z',
        timeMax: '2100-01-01T00:00:00Z',
        singleEvents: 'true',
        orderBy: 'startTime',
        showDeleted: 'false',
        maxResults: '2500',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const result = await googleRequest(`/calendars/${calendarId}/events?${params}`);
      items.push(...(result?.items || []));
      pageToken = result?.nextPageToken || '';
      page += 1;
      emit('pmk-calendar-sync-progress', { page, count: items.length });
    } while (pageToken && page < 200);

    return items;
  }

  async function fullRefresh() {
    if (!state.token) {
      invalidateEventCaches();
      renderAll();
      return;
    }
    if (activeSync) return activeSync;

    activeSync = (async () => {
      try {
        const events = await loadEveryCalendarPage();
        state.events = events;
        window.PMK_FULL_CALENDAR_SYNC_READY = true;
        window.PMK_FULL_CALENDAR_EVENT_COUNT = events.length;
        invalidateEventCaches();
        renderAll();
        checkUpcomingNotifications();
        emit('pmk-calendar-sync-done', { count: events.length });
      } catch (error) {
        window.PMK_FULL_CALENDAR_SYNC_READY = false;
        invalidateEventCaches();
        renderAll();
        emit('pmk-calendar-sync-error', { message: error?.message || String(error) });
        showToast(error.message || 'Не удалось загрузить весь Google Calendar.', 'error');
      } finally {
        activeSync = null;
      }
    })();

    return activeSync;
  }

  refreshEvents = fullRefresh;
  window.PMK_FULL_CALENDAR_SYNC = { refresh: fullRefresh };
})();