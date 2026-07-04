'use strict';

(() => {
  if (globalThis.PMK_MONTH_SUMMARY_COUNTERS_V82_28) return;
  globalThis.PMK_MONTH_SUMMARY_COUNTERS_V82_28 = true;
  globalThis.PMK_MONTH_DAY_DISTRICT_COUNTERS_V82_30 = true;
  globalThis.PMK_MONTH_DIRECT_RENDER_V82_31 = true;

  const DISTRICTS = ['Автозаводский','Ленинский','Канавинский','Московский','Сормовский','Нижегородский','Советский','Приокский','За городом'];
  const ABBR = {
    'Автозаводский': 'АВТ',
    'Ленинский': 'ЛЕН',
    'Канавинский': 'КАН',
    'Московский': 'МОС',
    'Сормовский': 'СОР',
    'Нижегородский': 'НИЖ',
    'Советский': 'СОВ',
    'Приокский': 'ПРИ',
    'За городом': 'ЗА ГОР',
    'Без района': 'Б/Р',
  };
  const originalRenderPeriod = globalThis.renderPeriod;

  function ensureMonthStyles() {
    if (document.getElementById('pmkMonthSummaryV8228Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkMonthSummaryV8228Styles';
    style.textContent = `
      #weekEvents.pmk-month-direct-board-v82-31{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:8px!important;overflow-x:hidden!important;width:100%!important;max-width:100%!important;padding:0 0 12px!important;margin:0!important;box-sizing:border-box!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-summary-v82-28{grid-column:1/-1!important;display:grid!important;gap:10px!important;padding:12px!important;margin:0 0 4px!important;border-radius:16px!important;background:linear-gradient(135deg,rgba(255,196,0,.18),rgba(255,255,255,.96))!important;border:1px solid rgba(0,0,0,.08)!important;box-shadow:0 10px 22px rgba(0,0,0,.07)!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-summary-v82-28 h3{margin:0!important;font-size:18px!important;line-height:1.15!important;color:#111827!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-total-row-v82-28{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-total-card-v82-28{padding:9px!important;border-radius:14px!important;background:#fff!important;border:1px solid rgba(0,0,0,.07)!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-total-card-v82-28 strong{display:block!important;font-size:24px!important;line-height:1!important;color:#111827!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-total-card-v82-28 span{display:block!important;margin-top:4px!important;font-size:12px!important;line-height:1.15!important;font-weight:800!important;color:#6b7280!important}
      #weekEvents.pmk-month-direct-board-v82-31 .day-column{min-height:128px!important;padding:9px!important;border-radius:12px!important;cursor:pointer!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
      #weekEvents.pmk-month-direct-board-v82-31 .day-column.today{border-color:#ffc400!important;box-shadow:inset 0 3px 0 #ffc400!important}
      #weekEvents.pmk-month-direct-board-v82-31 .day-heading{width:100%!important;margin:0 0 8px!important;padding:0!important;border:0!important;background:transparent!important;text-align:left!important}
      #weekEvents.pmk-month-direct-board-v82-31 .day-heading strong{display:block!important;font-size:15px!important;line-height:1.12!important;color:#111827!important;white-space:normal!important}
      #weekEvents.pmk-month-direct-board-v82-31 .day-heading > span{display:block!important;margin-top:3px!important;font-size:12px!important;font-weight:900!important;color:#6b7280!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-day-districts-v82-30{display:flex!important;flex-wrap:wrap!important;gap:5px!important;margin:6px 0 8px!important;width:100%!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-day-district-pill-v82-30{display:inline-flex!important;align-items:center!important;gap:4px!important;padding:5px 7px!important;border-radius:999px!important;background:#111827!important;color:#fff!important;font-size:11px!important;font-weight:900!important;line-height:1!important;letter-spacing:.01em!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-day-district-pill-v82-30 b{font-size:16px!important;line-height:1!important;color:#ffc400!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-day-district-empty-v82-30{display:inline-flex!important;padding:5px 7px!important;border-radius:999px!important;background:rgba(0,0,0,.07)!important;color:#6b7280!important;font-size:11px!important;font-weight:900!important;line-height:1!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-day-total-v82-31{display:inline-grid!important;place-items:center!important;min-width:72px!important;min-height:48px!important;margin-top:3px!important;padding:7px 10px!important;border-radius:14px!important;background:#f3f3f1!important;color:#111827!important;font-weight:900!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-day-total-v82-31 b{display:block!important;font-size:26px!important;line-height:1!important}
      #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-day-total-v82-31 span{display:block!important;margin-top:2px!important;font-size:11px!important;color:#6b7280!important}
      #weekEvents.pmk-month-direct-board-v82-31 .day-add{display:none!important}
      #weekEvents.pmk-month-direct-board-v82-31 .day-event{display:none!important}
      @media(max-width:520px){
        #weekEvents.pmk-month-direct-board-v82-31{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important;overflow-x:hidden!important}
        #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-summary-v82-28{padding:10px!important;border-radius:15px!important}
        #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-summary-v82-28 h3{font-size:17px!important}
        #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-total-row-v82-28{gap:6px!important}
        #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-total-card-v82-28{padding:8px 7px!important}
        #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-total-card-v82-28 strong{font-size:22px!important}
        #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-total-card-v82-28 span{font-size:11px!important}
        #weekEvents.pmk-month-direct-board-v82-31 .day-column{min-height:122px!important;padding:8px!important}
        #weekEvents.pmk-month-direct-board-v82-31 .day-heading strong{font-size:14px!important}
        #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-day-district-pill-v82-30{font-size:10px!important;padding:5px 6px!important}
        #weekEvents.pmk-month-direct-board-v82-31 .pmk-month-day-district-pill-v82-30 b{font-size:15px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function pluralPointsLocal(value) {
    const n = Math.abs(Number(value || 0));
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'точка';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'точки';
    return 'точек';
  }

  function countLabel(value) {
    const n = Math.abs(Number(value || 0));
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'заявка';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'заявки';
    return 'заявок';
  }

  function districtName(data = {}) {
    return String(data.district || '').trim() || 'Без района';
  }

  function districtAbbr(name = '') {
    const clean = String(name || '').trim() || 'Без района';
    return ABBR[clean] || clean.slice(0, 3).toUpperCase();
  }

  function monthSummaryHtml(events = []) {
    const total = events.length;
    let done = 0;
    events.forEach(event => {
      const data = eventMeta(event);
      if (data.requestStatus === 'completed') done += 1;
    });
    const left = Math.max(0, total - done);

    return `<section class="pmk-month-summary-v82-28" aria-label="Сводка месяца">
      <h3>Сводка месяца</h3>
      <div class="pmk-month-total-row-v82-28">
        <div class="pmk-month-total-card-v82-28"><strong>${total}</strong><span>Всего ${countLabel(total)}</span></div>
        <div class="pmk-month-total-card-v82-28"><strong>${left}</strong><span>Осталось</span></div>
        <div class="pmk-month-total-card-v82-28"><strong>${done}</strong><span>Выполнено</span></div>
      </div>
    </section>`;
  }

  function districtCountersHtml(dayEvents = []) {
    if (!dayEvents.length) return '<span class="pmk-month-day-district-empty-v82-30">Нет заявок</span>';
    const counts = new Map();
    dayEvents.forEach(event => {
      const name = districtName(eventMeta(event));
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const ordered = [
      ...DISTRICTS.filter(name => counts.has(name)).map(name => [name, counts.get(name)]),
      ...[...counts.entries()].filter(([name]) => !DISTRICTS.includes(name)).sort((a, b) => b[1] - a[1]),
    ];
    return `<div class="pmk-month-day-districts-v82-30">${ordered.map(([name, count]) => `<span class="pmk-month-day-district-pill-v82-30"><b>${count}</b>${escapeHtml(districtAbbr(name))}</span>`).join('')}</div>`;
  }

  function monthDayHtml(dateKey, dayEvents = [], todayKey) {
    const date = dateKeyForDisplay(dateKey);
    const total = dayEvents.length;
    const dateTitle = `${WEEKDAY_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${date.toLocaleDateString('ru-RU',{month:'short', timeZone:'UTC'})}`;
    return `<section class="day-column ${dateKey === todayKey ? 'today' : ''}" data-month-day="${dateKey}">
      <button class="day-heading day-open" data-open-day="${dateKey}" type="button">
        <strong>${escapeHtml(dateTitle)}</strong>
        <span>${total} ${pluralPointsLocal(total)}</span>
      </button>
      ${districtCountersHtml(dayEvents)}
      <div class="pmk-month-day-total-v82-31"><b>${total}</b><span>${pluralPointsLocal(total)}</span></div>
    </section>`;
  }

  function renderMonthDirect(events = [], dateKeys = []) {
    const board = qs('#weekEvents');
    if (!board) return;
    ensureMonthStyles();
    const todayKey = businessTodayKey();
    board.className = 'week-board month-board pmk-month-direct-board-v82-31';
    board.innerHTML = `${monthSummaryHtml(events)}${dateKeys.map(dateKey => {
      const dayEvents = events.filter(event => eventDateKey(event) === dateKey);
      return monthDayHtml(dateKey, dayEvents, todayKey);
    }).join('')}`;
    qsa('[data-open-day]', board).forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      openDay(button.dataset.openDay);
    }));
    qsa('[data-month-day]', board).forEach(column => column.addEventListener('click', event => {
      if (event.target.closest('button,a,input,select,textarea')) return;
      openDay(column.dataset.monthDay);
    }));
  }

  if (typeof originalRenderPeriod === 'function') {
    globalThis.renderPeriod = function renderPeriodMonthSummary(events, dateKeys, period = 'week') {
      if (period === 'month') return renderMonthDirect(events, dateKeys);
      return originalRenderPeriod(events, dateKeys, period);
    };
  }
})();