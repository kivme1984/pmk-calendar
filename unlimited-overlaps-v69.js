'use strict';

(() => {
  if (window.PMK_UNLIMITED_OVERLAPS_V69) return;
  window.PMK_UNLIMITED_OVERLAPS_V69 = true;

  function overlapEvents(data = {}) {
    if (!data.visitDate || !data.startTime || !data.endTime) return [];
    const formStart = `${data.visitDate}T${data.startTime}`;
    const formEnd = `${data.visitDate}T${data.endTime}`;
    return getAllEvents().filter(event => {
      if (event.id === data.eventId) return false;
      const range = comparableEventRange(event);
      if (!range.start || !range.end) return false;
      return formStart < range.end && formEnd > range.start;
    });
  }

  checkConflicts = function checkConflictsInformationalV69(data = {}) {
    const box = qs('#conflictHint');
    if (!box) return true;
    box.className = 'info-box hidden';

    const overlaps = overlapEvents(data);
    state.conflictCacheKey = '';
    state.conflictCacheResult = null;

    if (!overlaps.length) return true;

    const names = overlaps
      .slice(0, 3)
      .map(event => {
        const item = eventMeta(event);
        const name = item.customerName || event.summary || 'заявка';
        const start = formatTime(event.start?.dateTime || event.start);
        const end = formatTime(event.end?.dateTime || event.end);
        return `${name} ${start}–${end}`;
      });

    const extra = overlaps.length > names.length ? ` и ещё ${overlaps.length - names.length}` : '';
    box.className = 'info-box warning pmk-overlap-information';
    box.textContent = `На это время уже есть ${overlaps.length} ${pluralPoints(overlaps.length)}: ${names.join('; ')}${extra}. Это только информация — новую заявку можно сохранить без ограничений.`;
    return true;
  };

  window.PMK_UNLIMITED_OVERLAPS_V69_API = { overlapEvents };
})();