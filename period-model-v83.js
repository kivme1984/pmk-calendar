'use strict';

(() => {
  if (globalThis.PMK_PERIOD_MODEL_V83) return;
  globalThis.PMK_PERIOD_MODEL_V83 = true;

  function mondayIndex(dateKey) {
    const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return (day + 6) % 7;
  }

  function monthCells(dateKeys = []) {
    const keys = [...dateKeys].filter(Boolean).sort();
    if (!keys.length) return [];
    const cells = Array(mondayIndex(keys[0])).fill(null).concat(keys);
    while (cells.length % 7) cells.push(null);
    return cells;
  }

  function workingDistricts(schedule = {}, dateKey = '') {
    if (!dateKey) return [];
    const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return [...new Set((schedule[weekday] || []).map(slot => String(slot?.[2] || '').trim()).filter(Boolean))];
  }

  function filterDayEvents(events = [], mode = '', getMeta = event => event, getAddress = data => data.address || '') {
    if (!mode) return events;
    return events.filter(event => {
      const data = getMeta(event) || {};
      if (mode === 'pickup') return data.visitType === 'pickup';
      if (mode === 'delivery') return data.visitType === 'delivery';
      if (mode === 'attention') return !String(data.phone || '').trim() || !String(getAddress(data, event) || '').trim();
      return true;
    });
  }

  globalThis.PMK_PERIOD_MODEL_V83_API = { mondayIndex, monthCells, workingDistricts, filterDayEvents };
})();