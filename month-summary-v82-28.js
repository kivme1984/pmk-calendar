'use strict';

(() => {
  if (globalThis.PMK_MONTH_COMPACT_LIST_V82_32) return;
  globalThis.PMK_MONTH_SUMMARY_COUNTERS_V82_28 = true;
  globalThis.PMK_MONTH_DAY_DISTRICT_COUNTERS_V82_30 = true;
  globalThis.PMK_MONTH_DIRECT_RENDER_V82_31 = true;
  globalThis.PMK_MONTH_COMPACT_LIST_V82_32 = true;

  const DISTRICTS = ['Автозаводский','Ленинский','Канавинский','Московский','Сормовский','Нижегородский','Советский','Приокский','За городом'];
  const SHORT = {
    'Автозаводский': 'Авто',
    'Ленинский': 'Лен',
    'Канавинский': 'Кан',
    'Московский': 'Моск',
    'Сормовский': 'Сорм',
    'Нижегородский': 'Ниж',
    'Советский': 'Сов',
    'Приокский': 'При',
    'За городом': 'За городом',
    'Без района': 'Без района',
  };
  const originalRenderPeriod = globalThis.renderPeriod;

  function ensureMonthStyles() {
    if (document.getElementById('pmkMonthCompactListV8232Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkMonthCompactListV8232Styles';
    style.textContent = `
      #weekEvents.pmk-month-list-board-v82-32{display:block!important;width:100%!important;max-width:100%!important;overflow:hidden!important;margin:0!important;padding:0 0 14px!important;box-sizing:border-box!important}
      #weekEvents.pmk-month-list-board-v82-32 *{box-sizing:border-box!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-summary-v82-32{display:grid!important;gap:8px!important;padding:10px!important;margin:0 0 10px!important;border-radius:16px!important;background:linear-gradient(135deg,rgba(255,196,0,.18),rgba(255,255,255,.96))!important;border:1px solid rgba(0,0,0,.08)!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-summary-v82-32 h3{margin:0!important;font-size:17px!important;line-height:1.15!important;color:#111827!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-total-row-v82-32{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-total-card-v82-32{padding:8px 7px!important;border-radius:13px!important;background:#fff!important;border:1px solid rgba(0,0,0,.07)!important;min-width:0!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-total-card-v82-32 strong{display:block!important;font-size:22px!important;line-height:1!important;color:#111827!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-total-card-v82-32 span{display:block!important;margin-top:3px!important;font-size:11px!important;line-height:1.12!important;font-weight:850!important;color:#6b7280!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-list-v82-32{display:grid!important;gap:7px!important;width:100%!important;max-width:100%!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-day-row-v82-32{width:100%!important;max-width:100%!important;display:grid!important;grid-template-columns:minmax(92px,118px) minmax(0,1fr)!important;gap:8px!important;align-items:start!important;padding:10px!important;border:1px solid var(--line,#deded8)!important;border-radius:14px!important;background:#fff!important;text-align:left!important;color:#111827!important;box-shadow:none!important;overflow:hidden!important;touch-action:manipulation!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-day-row-v82-32.today{border-color:#ffc400!important;box-shadow:inset 3px 0 0 #ffc400!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-date-v82-32{min-width:0!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-date-v82-32 strong{display:block!important;font-size:15px!important;line-height:1.08!important;color:#111827!important;white-space:normal!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-date-v82-32 span{display:block!important;margin-top:4px!important;font-size:12px!important;line-height:1.1!important;font-weight:900!important;color:#6b7280!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-district-list-v82-32{display:grid!important;gap:3px!important;min-width:0!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-district-line-v82-32{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-height:24px!important;padding:3px 8px!important;border-radius:9px!important;background:#f3f3f1!important;color:#111827!important;font-size:13px!important;font-weight:850!important;line-height:1.1!important;min-width:0!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-district-line-v82-32 b{font-size:14px!important;font-weight:950!important;color:#111827!important;white-space:nowrap!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-district-line-v82-32 span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      #weekEvents.pmk-month-list-board-v82-32 .pmk-month-empty-v82-32{padding:18px!important;border-radius:14px!important;background:#fff!important;color:#6b7280!important;font-size:14px!important;font-weight:850!important;text-align:center!important}
      @media(max-width:520px){
        #weekEvents.pmk-month-list-board-v82-32{overflow:hidden!important}
        #weekEvents.pmk-month-list-board-v82-32 .pmk-month-day-row-v82-32{grid-template-columns:minmax(82px,104px) minmax(0,1fr)!important;gap:7px!important;padding:9px!important;border-radius:13px!important}
        #weekEvents.pmk-month-list-board-v82-32 .pmk-month-date-v82-32 strong{font-size:14px!important}
        #weekEvents.pmk-month-list-board-v82-32 .pmk-month-date-v82-32 span{font-size:12px!important}
        #weekEvents.pmk-month-list-board-v82-32 .pmk-month-district-line-v82-32{font-size:12px!important;padding:3px 7px!important}
        #weekEvents.pmk-month-list-board-v82-32 .pmk-month-district-line-v82-32 b{font-size:13px!important}
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

  function monthSummaryHtml(events = []) {
    const total = events.length;
    let done = 0;
    events.forEach(event => {
      const data = eventMeta(event);
      if (data.requestStatus === 'completed') done += 1;
    });
    const left = Math.max(0, total - done);
    return `<section class="pmk-month-summary-v82-32" aria-label="Сводка месяца">
      <h3>Сводка месяца</h3>
      <div class="pmk-month-total-row-v82-32">
        <div class="pmk-month-total-card-v82-32"><strong>${total}</strong><span>Всего ${countLabel(total)}</span></div>
        <div class="pmk-month-total-card-v82-32"><strong>${left}</strong><span>Осталось</span></div>
        <div class="pmk-month-total-card-v82-32"><strong>${done}</strong><span>Выполнено</span></div>
      </div>
    </section>`;
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

  function districtListHtml(dayEvents = []) {
    const rows = countDistricts(dayEvents);
    return `<div class="pmk-month-district-list-v82-32">${rows.map(([name, count]) => `<div class="pmk-month-district-line-v82-32"><span>${escapeHtml(districtShort(name))}</span><b>${count} ${pluralPointsLocal(count)}</b></div>`).join('')}</div>`;
  }

  function monthDayRowHtml(dateKey, dayEvents = [], todayKey) {
    const date = dateKeyForDisplay(dateKey);
    const total = dayEvents.length;
    const dateTitle = `${WEEKDAY_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${date.toLocaleDateString('ru-RU',{month:'short', timeZone:'UTC'})}`;
    return `<button class="pmk-month-day-row-v82-32 ${dateKey === todayKey ? 'today' : ''}" data-month-day="${dateKey}" type="button">
      <span class="pmk-month-date-v82-32"><strong>${escapeHtml(dateTitle)}</strong><span>${total} ${pluralPointsLocal(total)}</span></span>
      ${districtListHtml(dayEvents)}
    </button>`;
  }

  function renderMonthCompactList(events = [], dateKeys = []) {
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
    const activeKeys = dateKeys.filter(key => (byDate.get(key) || []).length > 0);
    board.className = 'week-board month-board pmk-month-list-board-v82-32';
    board.innerHTML = `${monthSummaryHtml(events)}<div class="pmk-month-list-v82-32">${activeKeys.length ? activeKeys.map(key => monthDayRowHtml(key, byDate.get(key) || [], todayKey)).join('') : '<div class="pmk-month-empty-v82-32">В этом месяце заявок нет</div>'}</div>`;
    qsa('[data-month-day]', board).forEach(row => row.addEventListener('click', event => {
      event.preventDefault();
      openDay(row.dataset.monthDay);
    }));
  }

  if (typeof originalRenderPeriod === 'function') {
    globalThis.renderPeriod = function renderPeriodMonthCompactList(events, dateKeys, period = 'week') {
      if (period === 'month') return renderMonthCompactList(events, dateKeys);
      return originalRenderPeriod(events, dateKeys, period);
    };
  }
})();