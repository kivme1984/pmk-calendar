'use strict';

(() => {
  if (globalThis.PMK_MONTH_COMPACT_CLASSIC_V82_35) return;
  globalThis.PMK_MONTH_SUMMARY_COUNTERS_V82_28 = true;
  globalThis.PMK_MONTH_DAY_DISTRICT_COUNTERS_V82_30 = true;
  globalThis.PMK_MONTH_ROUTE_COUNTERS_V82_33 = true;
  globalThis.PMK_MONTH_CLASSIC_TABLE_V82_34 = true;
  globalThis.PMK_MONTH_COMPACT_CLASSIC_V82_35 = true;

  const DISTRICTS = ['Автозаводский','Ленинский','Канавинский','Московский','Сормовский','Нижегородский','Советский','Приокский','За городом'];
  const SHORT = {
    'Автозаводский': 'Авт',
    'Ленинский': 'Лен',
    'Канавинский': 'Кан',
    'Московский': 'Мск',
    'Сормовский': 'Сорм',
    'Нижегородский': 'Ниж',
    'Советский': 'Сов',
    'Приокский': 'При',
    'За городом': 'Заг',
    'Без района': '—',
  };
  const MONTH_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const originalRenderPeriod = globalThis.renderPeriod;

  function ensureMonthStyles() {
    if (document.getElementById('pmkMonthCompactClassicV8235Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkMonthCompactClassicV8235Styles';
    style.textContent = `
      #weekEvents.pmk-month-compact-v82-35{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:1px!important;width:100%!important;max-width:100%!important;overflow:visible!important;padding:0!important;border:1px solid var(--line,#deded8)!important;border-radius:16px!important;background:var(--line,#deded8)!important;box-shadow:0 10px 28px rgba(20,20,18,.06)!important;box-sizing:border-box!important}
      #weekEvents.pmk-month-compact-v82-35 *{box-sizing:border-box!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-summary-v82-35{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;padding:8px!important;background:var(--surface,#fff)!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35{min-width:0!important;height:50px!important;display:flex!important;align-items:center!important;gap:7px!important;padding:6px 8px!important;border:1px solid var(--line,#deded8)!important;border-radius:12px!important;background:#fafaf8!important;color:#171717!important;overflow:hidden!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35.primary{background:#ffc400!important;border-color:#efb800!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35 strong{display:block!important;flex:0 0 auto!important;font-size:25px!important;line-height:1!important;font-weight:1000!important;letter-spacing:-.06em!important;color:#171717!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35 span{display:block!important;min-width:0!important;font-size:10px!important;line-height:1.05!important;font-weight:950!important;color:#667085!important;text-transform:uppercase!important;letter-spacing:.03em!important;white-space:normal!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35.primary span{color:#171717!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-weekday-v82-35{min-height:24px!important;display:grid!important;place-items:center!important;padding:5px 2px!important;background:#20201f!important;color:#fff!important;font-size:10px!important;font-weight:950!important;letter-spacing:.04em!important;text-transform:uppercase!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-empty-cell-v82-35{min-height:76px!important;background:rgba(255,255,255,.42)!important}
      #weekEvents.pmk-month-compact-v82-35 .day-column{min-width:0!important;min-height:76px!important;padding:0!important;border:0!important;border-radius:0!important;background:var(--surface,#fff)!important;box-shadow:none!important;overflow:hidden!important}
      #weekEvents.pmk-month-compact-v82-35 .day-column.today{box-shadow:inset 0 0 0 2px #ffc400!important;position:relative!important;z-index:1!important}
      #weekEvents.pmk-month-compact-v82-35 .day-open{width:100%!important;height:100%!important;min-height:76px!important;display:grid!important;grid-template-rows:auto 1fr auto!important;gap:3px!important;margin:0!important;padding:5px!important;border:0!important;border-radius:0!important;background:transparent!important;color:var(--text,#191919)!important;text-align:left!important;box-shadow:none!important;touch-action:manipulation!important}
      #weekEvents.pmk-month-compact-v82-35 .day-open:hover{background:#fff8dc!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-date-v82-35{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:3px!important;min-width:0!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-date-v82-35 strong{font-size:12px!important;line-height:1!important;font-weight:950!important;color:var(--text,#191919)!important;letter-spacing:-.02em!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-date-v82-35 span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:8px!important;font-weight:900!important;color:var(--muted,#6c6c67)!important;text-transform:uppercase!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-day-total-v82-35{display:flex!important;align-items:flex-end!important;gap:2px!important;align-self:center!important;justify-self:start!important;color:var(--text,#191919)!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-day-total-v82-35 strong{font-size:27px!important;line-height:.82!important;font-weight:1000!important;letter-spacing:-.08em!important;color:#171717!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-day-total-v82-35 span{font-size:8px!important;line-height:1!important;font-weight:950!important;color:#747b86!important;text-transform:uppercase!important;max-width:38px!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-route-list-v82-35{display:flex!important;flex-wrap:wrap!important;gap:2px!important;align-self:end!important;min-width:0!important;max-height:24px!important;overflow:hidden!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-route-chip-v82-35{display:inline-flex!important;align-items:center!important;gap:2px!important;min-width:0!important;max-width:100%!important;padding:2px 4px!important;border-radius:999px!important;background:#f1f1ed!important;border:1px solid rgba(0,0,0,.06)!important;color:#222!important;font-size:8px!important;line-height:1!important;font-weight:900!important;white-space:nowrap!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-route-chip-v82-35 b{display:inline-grid!important;place-items:center!important;min-width:13px!important;height:13px!important;border-radius:999px!important;background:#ffc400!important;color:#171717!important;font-size:8px!important;line-height:1!important;font-weight:1000!important}
      #weekEvents.pmk-month-compact-v82-35 .pmk-month-route-empty-v82-35{color:#9aa0a6!important;font-size:9px!important;font-weight:850!important;align-self:end!important}
      #weekEvents.pmk-month-compact-v82-35 .day-event,#weekEvents.pmk-month-compact-v82-35 .day-add{display:none!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-compact-v82-35{background:rgba(255,255,255,.12)!important;box-shadow:0 10px 28px rgba(0,0,0,.24)!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35{background:#171b1f!important;color:#fff!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35 strong,:root[data-theme="dark"] #weekEvents.pmk-month-compact-v82-35 .pmk-month-date-v82-35 strong,:root[data-theme="dark"] #weekEvents.pmk-month-compact-v82-35 .pmk-month-day-total-v82-35 strong{color:#fff!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35.primary strong{color:#171717!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-compact-v82-35 .pmk-month-weekday-v82-35{background:#050607!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-compact-v82-35 .pmk-month-empty-cell-v82-35{background:rgba(255,255,255,.035)!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-compact-v82-35 .pmk-month-route-chip-v82-35{background:#171b1f!important;border-color:rgba(255,255,255,.13)!important;color:#f4f7fb!important}
      @media(max-width:760px){
        #weekEvents.pmk-month-compact-v82-35{border-radius:12px!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;overflow:visible!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-summary-v82-35{gap:4px!important;padding:6px!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35{height:42px!important;padding:5px 6px!important;border-radius:10px!important;gap:5px!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35 strong{font-size:21px!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-total-card-v82-35 span{font-size:8px!important;letter-spacing:0!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-weekday-v82-35{min-height:21px!important;font-size:9px!important;padding:4px 1px!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-empty-cell-v82-35,#weekEvents.pmk-month-compact-v82-35 .day-column,#weekEvents.pmk-month-compact-v82-35 .day-open{min-height:64px!important}
        #weekEvents.pmk-month-compact-v82-35 .day-open{padding:4px 3px!important;gap:2px!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-date-v82-35 strong{font-size:10px!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-date-v82-35 span{font-size:7px!important;max-width:34px!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-day-total-v82-35 strong{font-size:23px!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-day-total-v82-35 span{display:none!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-route-list-v82-35{gap:1px!important;max-height:21px!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-route-chip-v82-35{font-size:7px!important;padding:1px 3px!important}
        #weekEvents.pmk-month-compact-v82-35 .pmk-month-route-chip-v82-35 b{min-width:11px!important;height:11px!important;font-size:7px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function pluralRequests(value) {
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

  function districtShort(name = '') {
    const clean = String(name || '').trim() || 'Без района';
    return SHORT[clean] || clean;
  }

  function countDistricts(dayEvents = []) {
    const counts = new Map();
    dayEvents.forEach(event => {
      const name = districtName(eventMeta(event));
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [
      ...DISTRICTS.filter(name => counts.has(name)).map(name => [name, counts.get(name)]),
      ...[...counts.entries()].filter(([name]) => !DISTRICTS.includes(name)).sort((a, b) => b[1] - a[1]),
    ];
  }

  function monthSummaryHtml(events = []) {
    let pickups = 0;
    let deliveries = 0;
    events.forEach(event => {
      const data = eventMeta(event);
      if (data.visitType === 'delivery') deliveries += 1;
      else pickups += 1;
    });
    const total = events.length;
    return `<section class="pmk-month-summary-v82-35" aria-label="Сводка месяца">
      <div class="pmk-month-total-card-v82-35 primary"><strong>${total}</strong><span>Всего</span></div>
      <div class="pmk-month-total-card-v82-35"><strong>${pickups}</strong><span>Заборы</span></div>
      <div class="pmk-month-total-card-v82-35"><strong>${deliveries}</strong><span>Доставки</span></div>
    </section>`;
  }

  function districtRouteHtml(dayEvents = []) {
    const rows = countDistricts(dayEvents);
    if (!rows.length) return '<span class="pmk-month-route-empty-v82-35">без заявок</span>';
    return `<span class="pmk-month-route-list-v82-35">${rows.map(([name, count]) => `<span class="pmk-month-route-chip-v82-35" title="${escapeHtml(name)}: ${count}"><span>${escapeHtml(districtShort(name))}</span><b>${count}</b></span>`).join('')}</span>`;
  }

  function monthDateLabel(dateKey) {
    const date = dateKeyForDisplay(dateKey);
    return date.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  }

  function monthDayCellHtml(dateKey, dayEvents = [], todayKey) {
    const date = dateKeyForDisplay(dateKey);
    const total = dayEvents.length;
    return `<section class="day-column ${dateKey === todayKey ? 'today' : ''}" data-month-day="${dateKey}">
      <button class="day-open" data-open-day="${dateKey}" type="button" aria-label="Открыть ${dateKey}: ${total} ${pluralRequests(total)}">
        <span class="pmk-month-date-v82-35"><strong>${date.getUTCDate()}</strong><span>${WEEKDAY_SHORT[date.getUTCDay()]} · ${monthDateLabel(dateKey)}</span></span>
        <span class="pmk-month-day-total-v82-35"><strong>${total}</strong><span>${pluralRequests(total)}</span></span>
        ${districtRouteHtml(dayEvents)}
      </button>
    </section>`;
  }

  function renderMonthTable(events = [], dateKeys = []) {
    const board = qs('#weekEvents');
    if (!board) return;
    ensureMonthStyles();
    const todayKey = businessTodayKey();
    const byDate = new Map();
    events.forEach(event => {
      const key = eventDateKey(event);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(event);
    });
    const firstKey = dateKeys[0] || todayKey;
    const firstDate = dateKeyForDisplay(firstKey);
    const leadingEmpty = (firstDate.getUTCDay() + 6) % 7;
    const totalCells = leadingEmpty + dateKeys.length;
    const trailingEmpty = (7 - (totalCells % 7)) % 7;
    board.className = 'week-board month-board pmk-month-compact-v82-35';
    board.innerHTML = `${monthSummaryHtml(events)}
      ${MONTH_WEEKDAYS.map(day => `<div class="pmk-month-weekday-v82-35">${day}</div>`).join('')}
      ${Array.from({ length: leadingEmpty }, () => '<div class="pmk-month-empty-cell-v82-35" aria-hidden="true"></div>').join('')}
      ${dateKeys.map(dateKey => monthDayCellHtml(dateKey, byDate.get(dateKey) || [], todayKey)).join('')}
      ${Array.from({ length: trailingEmpty }, () => '<div class="pmk-month-empty-cell-v82-35" aria-hidden="true"></div>').join('')}`;
    qsa('[data-open-day]', board).forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      openDay(button.dataset.openDay);
    }));
  }

  if (typeof originalRenderPeriod === 'function') {
    globalThis.renderPeriod = function renderPeriodCompactClassicMonth(events, dateKeys, period = 'week') {
      if (period === 'month') return renderMonthTable(events, dateKeys);
      return originalRenderPeriod(events, dateKeys, period);
    };
  }
})();
