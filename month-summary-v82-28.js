'use strict';

(() => {
  if (globalThis.PMK_MONTH_CLASSIC_TABLE_V82_34) return;
  globalThis.PMK_MONTH_SUMMARY_COUNTERS_V82_28 = true;
  globalThis.PMK_MONTH_DAY_DISTRICT_COUNTERS_V82_30 = true;
  globalThis.PMK_MONTH_ROUTE_COUNTERS_V82_33 = true;
  globalThis.PMK_MONTH_CLASSIC_TABLE_V82_34 = true;

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
    'За городом': 'Загор',
    'Без района': 'Без р-на',
  };
  const MONTH_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const originalRenderPeriod = globalThis.renderPeriod;

  function ensureMonthStyles() {
    if (document.getElementById('pmkMonthClassicTableV8234Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkMonthClassicTableV8234Styles';
    style.textContent = `
      #weekEvents.pmk-month-classic-v82-34{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:1px!important;width:100%!important;max-width:100%!important;overflow:hidden!important;padding:0 0 14px!important;border:1px solid var(--line,#deded8)!important;border-radius:20px!important;background:var(--line,#deded8)!important;box-shadow:0 16px 45px rgba(20,20,18,.08)!important;box-sizing:border-box!important}
      #weekEvents.pmk-month-classic-v82-34 *{box-sizing:border-box!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-summary-v82-34{grid-column:1/-1!important;display:grid!important;grid-template-columns:minmax(0,1fr) repeat(3,minmax(96px,150px))!important;gap:12px!important;align-items:center!important;padding:16px!important;background:var(--surface,#fff)!important;color:var(--text,#191919)!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-summary-title-v82-34 strong{display:block!important;font-size:24px!important;line-height:1.05!important;letter-spacing:-.03em!important;color:var(--text,#191919)!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-summary-title-v82-34 span{display:block!important;margin-top:4px!important;font-size:12px!important;font-weight:850!important;color:var(--muted,#6c6c67)!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-total-card-v82-34{min-width:0!important;padding:12px!important;border:1px solid var(--line,#deded8)!important;border-radius:15px!important;background:#fafaf8!important;text-align:center!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-total-card-v82-34 strong{display:block!important;font-size:34px!important;line-height:.95!important;letter-spacing:-.06em!important;color:#171717!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-total-card-v82-34 span{display:block!important;margin-top:5px!important;font-size:11px!important;line-height:1.1!important;font-weight:900!important;color:#6b7280!important;text-transform:uppercase!important;letter-spacing:.04em!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-total-card-v82-34.primary{background:linear-gradient(135deg,#ffc400,#ffe27a)!important;border-color:#f3b800!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-total-card-v82-34.primary strong,#weekEvents.pmk-month-classic-v82-34 .pmk-month-total-card-v82-34.primary span{color:#171717!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-weekday-v82-34{min-height:34px!important;display:grid!important;place-items:center!important;padding:8px 4px!important;background:#20201f!important;color:#fff!important;font-size:12px!important;font-weight:950!important;letter-spacing:.06em!important;text-transform:uppercase!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-empty-cell-v82-34{min-height:116px!important;background:rgba(255,255,255,.42)!important}
      #weekEvents.pmk-month-classic-v82-34 .day-column{min-width:0!important;min-height:116px!important;padding:0!important;border:0!important;border-radius:0!important;background:var(--surface,#fff)!important;box-shadow:none!important;overflow:hidden!important}
      #weekEvents.pmk-month-classic-v82-34 .day-column.today{box-shadow:inset 0 0 0 3px #ffc400!important;position:relative!important;z-index:1!important}
      #weekEvents.pmk-month-classic-v82-34 .day-open{width:100%!important;height:100%!important;min-height:116px!important;display:grid!important;grid-template-rows:auto 1fr auto!important;gap:6px!important;margin:0!important;padding:9px!important;border:0!important;border-radius:0!important;background:transparent!important;color:var(--text,#191919)!important;text-align:left!important;box-shadow:none!important;touch-action:manipulation!important}
      #weekEvents.pmk-month-classic-v82-34 .day-open:hover{background:#fff8dc!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-date-v82-34{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:6px!important;min-width:0!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-date-v82-34 strong{font-size:16px!important;line-height:1!important;font-weight:950!important;color:var(--text,#191919)!important;letter-spacing:-.02em!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-date-v82-34 span{font-size:10px!important;font-weight:900!important;color:var(--muted,#6c6c67)!important;text-transform:uppercase!important;white-space:nowrap!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-day-total-v82-34{display:flex!important;align-items:flex-end!important;gap:5px!important;align-self:center!important;justify-self:start!important;color:var(--text,#191919)!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-day-total-v82-34 strong{font-size:38px!important;line-height:.85!important;font-weight:1000!important;letter-spacing:-.08em!important;color:#171717!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-day-total-v82-34 span{font-size:10px!important;line-height:1.05!important;font-weight:950!important;color:#6b7280!important;text-transform:uppercase!important;max-width:52px!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-route-list-v82-34{display:flex!important;flex-wrap:wrap!important;gap:3px!important;align-self:end!important;min-width:0!important;max-height:38px!important;overflow:hidden!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-route-chip-v82-34{display:inline-flex!important;align-items:center!important;gap:3px!important;min-width:0!important;max-width:100%!important;padding:3px 5px!important;border-radius:999px!important;background:#f1f1ed!important;border:1px solid rgba(0,0,0,.06)!important;color:#222!important;font-size:10px!important;line-height:1!important;font-weight:900!important;white-space:nowrap!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-route-chip-v82-34 b{display:inline-grid!important;place-items:center!important;min-width:16px!important;height:16px!important;border-radius:999px!important;background:#ffc400!important;color:#171717!important;font-size:10px!important;line-height:1!important;font-weight:1000!important}
      #weekEvents.pmk-month-classic-v82-34 .pmk-month-route-empty-v82-34{color:#9aa0a6!important;font-size:11px!important;font-weight:850!important}
      #weekEvents.pmk-month-classic-v82-34 .day-event,#weekEvents.pmk-month-classic-v82-34 .day-add{display:none!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-classic-v82-34{background:rgba(255,255,255,.12)!important;box-shadow:0 16px 45px rgba(0,0,0,.28)!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-classic-v82-34 .pmk-month-total-card-v82-34{background:#171b1f!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-classic-v82-34 .pmk-month-weekday-v82-34{background:#050607!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-classic-v82-34 .pmk-month-empty-cell-v82-34{background:rgba(255,255,255,.035)!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-classic-v82-34 .pmk-month-day-total-v82-34 strong,:root[data-theme="dark"] #weekEvents.pmk-month-classic-v82-34 .pmk-month-date-v82-34 strong{color:#fff!important}
      :root[data-theme="dark"] #weekEvents.pmk-month-classic-v82-34 .pmk-month-route-chip-v82-34{background:#171b1f!important;border-color:rgba(255,255,255,.13)!important;color:#f4f7fb!important}
      @media(max-width:760px){
        #weekEvents.pmk-month-classic-v82-34{border-radius:14px!important;gap:1px!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;grid-template-columns:repeat(7,minmax(72px,1fr))!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-summary-v82-34{grid-template-columns:1fr!important;gap:8px!important;position:sticky!important;left:0!important;z-index:2!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-summary-v82-34{grid-column:1/-1!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-total-card-v82-34{padding:9px 8px!important;text-align:left!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-total-card-v82-34 strong{display:inline-block!important;min-width:42px!important;font-size:28px!important;margin-right:7px!important;vertical-align:middle!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-total-card-v82-34 span{display:inline!important;font-size:11px!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-empty-cell-v82-34,#weekEvents.pmk-month-classic-v82-34 .day-column,#weekEvents.pmk-month-classic-v82-34 .day-open{min-height:94px!important}
        #weekEvents.pmk-month-classic-v82-34 .day-open{padding:6px!important;gap:4px!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-date-v82-34 strong{font-size:13px!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-date-v82-34 span{font-size:9px!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-day-total-v82-34 strong{font-size:30px!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-day-total-v82-34 span{font-size:9px!important;max-width:42px!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-route-list-v82-34{gap:2px!important;max-height:34px!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-route-chip-v82-34{font-size:9px!important;padding:2px 4px!important}
        #weekEvents.pmk-month-classic-v82-34 .pmk-month-route-chip-v82-34 b{min-width:14px!important;height:14px!important;font-size:9px!important}
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
    const total = events.length;
    let pickups = 0;
    let deliveries = 0;
    let done = 0;
    events.forEach(event => {
      const data = eventMeta(event);
      if (data.visitType === 'delivery') deliveries += 1;
      else pickups += 1;
      if (data.requestStatus === 'completed') done += 1;
    });
    return `<section class="pmk-month-summary-v82-34" aria-label="Сводка месяца">
      <div class="pmk-month-summary-title-v82-34"><strong>Месячный календарь</strong><span>Классическая сетка: день, общий счётчик и районы с точками</span></div>
      <div class="pmk-month-total-card-v82-34 primary"><strong>${total}</strong><span>Всего ${countLabel(total)}</span></div>
      <div class="pmk-month-total-card-v82-34"><strong>${pickups}</strong><span>Заборы</span></div>
      <div class="pmk-month-total-card-v82-34"><strong>${deliveries}</strong><span>Доставки</span></div>
    </section>`;
  }

  function districtRouteHtml(dayEvents = []) {
    const rows = countDistricts(dayEvents);
    if (!rows.length) return '<span class="pmk-month-route-empty-v82-34">без заявок</span>';
    return `<span class="pmk-month-route-list-v82-34">${rows.map(([name, count]) => `<span class="pmk-month-route-chip-v82-34" title="${escapeHtml(name)}: ${count} ${pluralPointsLocal(count)}"><span>${escapeHtml(districtShort(name))}</span><b>${count}</b></span>`).join('')}</span>`;
  }

  function monthDateLabel(dateKey) {
    const date = dateKeyForDisplay(dateKey);
    return date.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  }

  function monthDayCellHtml(dateKey, dayEvents = [], todayKey) {
    const date = dateKeyForDisplay(dateKey);
    const total = dayEvents.length;
    return `<section class="day-column ${dateKey === todayKey ? 'today' : ''}" data-month-day="${dateKey}">
      <button class="day-open" data-open-day="${dateKey}" type="button" aria-label="Открыть ${dateKey}: ${total} ${countLabel(total)}">
        <span class="pmk-month-date-v82-34"><strong>${date.getUTCDate()}</strong><span>${WEEKDAY_SHORT[date.getUTCDay()]} · ${monthDateLabel(dateKey)}</span></span>
        <span class="pmk-month-day-total-v82-34"><strong>${total}</strong><span>${countLabel(total)}</span></span>
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

    board.className = 'week-board month-board pmk-month-classic-v82-34';
    board.innerHTML = `${monthSummaryHtml(events)}
      ${MONTH_WEEKDAYS.map(day => `<div class="pmk-month-weekday-v82-34">${day}</div>`).join('')}
      ${Array.from({ length: leadingEmpty }, () => '<div class="pmk-month-empty-cell-v82-34" aria-hidden="true"></div>').join('')}
      ${dateKeys.map(dateKey => monthDayCellHtml(dateKey, byDate.get(dateKey) || [], todayKey)).join('')}
      ${Array.from({ length: trailingEmpty }, () => '<div class="pmk-month-empty-cell-v82-34" aria-hidden="true"></div>').join('')}`;

    qsa('[data-open-day]', board).forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      openDay(button.dataset.openDay);
    }));
  }

  if (typeof originalRenderPeriod === 'function') {
    globalThis.renderPeriod = function renderPeriodClassicMonthCounters(events, dateKeys, period = 'week') {
      if (period === 'month') return renderMonthTable(events, dateKeys);
      return originalRenderPeriod(events, dateKeys, period);
    };
  }
})();
