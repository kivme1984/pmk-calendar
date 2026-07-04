'use strict';

(() => {
  if (globalThis.PMK_MONTH_ROUTE_COUNTERS_V82_33) return;
  globalThis.PMK_MONTH_SUMMARY_COUNTERS_V82_28 = true;
  globalThis.PMK_MONTH_DAY_DISTRICT_COUNTERS_V82_30 = true;
  globalThis.PMK_MONTH_ROUTE_COUNTERS_V82_33 = true;

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
    if (document.getElementById('pmkMonthRouteCountersV8233Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkMonthRouteCountersV8233Styles';
    style.textContent = `
      #weekEvents.pmk-month-route-counters-v82-33{width:100%!important;max-width:100%!important;overflow-x:hidden!important;box-sizing:border-box!important}
      #weekEvents.pmk-month-route-counters-v82-33 *{box-sizing:border-box!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-summary-v82-33{grid-column:1/-1!important;display:grid!important;gap:8px!important;padding:10px!important;margin:0 0 8px!important;border-radius:16px!important;background:linear-gradient(135deg,rgba(255,196,0,.16),rgba(255,255,255,.96))!important;border:1px solid rgba(0,0,0,.08)!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-summary-v82-33 h3{margin:0!important;font-size:17px!important;line-height:1.15!important;color:#111827!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-total-row-v82-33{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-total-card-v82-33{padding:8px 7px!important;border-radius:13px!important;background:#fff!important;border:1px solid rgba(0,0,0,.07)!important;min-width:0!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-total-card-v82-33 strong{display:block!important;font-size:22px!important;line-height:1!important;color:#111827!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-total-card-v82-33 span{display:block!important;margin-top:3px!important;font-size:11px!important;line-height:1.12!important;font-weight:850!important;color:#6b7280!important}
      #weekEvents.pmk-month-route-counters-v82-33 .day-column{min-width:0!important;max-width:100%!important;overflow:hidden!important}
      #weekEvents.pmk-month-route-counters-v82-33 .day-heading{min-height:82px!important;padding:8px!important;align-items:flex-start!important;text-align:left!important;gap:3px!important;overflow:hidden!important}
      #weekEvents.pmk-month-route-counters-v82-33 .day-heading strong{font-size:14px!important;line-height:1.12!important;white-space:normal!important}
      #weekEvents.pmk-month-route-counters-v82-33 .day-heading > span{font-size:12px!important;font-weight:900!important;color:#6b7280!important}
      #weekEvents.pmk-month-route-counters-v82-33 .day-heading small{display:block!important;width:100%!important;margin-top:4px!important;color:#111827!important;font-size:12px!important;line-height:1.18!important;font-weight:850!important;max-height:44px!important;overflow:hidden!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-route-list-v82-33{display:grid!important;gap:1px!important;width:100%!important;min-width:0!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-route-line-v82-33{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:4px!important;min-width:0!important;white-space:nowrap!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-route-line-v82-33 span{overflow:hidden!important;text-overflow:ellipsis!important;min-width:0!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-route-line-v82-33 b{font-size:12px!important;white-space:nowrap!important;color:#111827!important}
      #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-route-empty-v82-33{color:#8a8f98!important;font-size:12px!important;font-weight:850!important}
      #weekEvents.pmk-month-route-counters-v82-33 .day-event{display:none!important}
      #weekEvents.pmk-month-route-counters-v82-33 .day-add{display:none!important}
      @media(max-width:520px){
        #weekEvents.pmk-month-route-counters-v82-33{grid-template-columns:repeat(auto-fill,minmax(145px,1fr))!important;gap:6px!important;overflow-x:hidden!important}
        #weekEvents.pmk-month-route-counters-v82-33 .day-heading{min-height:84px!important;padding:7px!important}
        #weekEvents.pmk-month-route-counters-v82-33 .day-heading strong{font-size:13px!important}
        #weekEvents.pmk-month-route-counters-v82-33 .day-heading small{font-size:11px!important;max-height:42px!important}
        #weekEvents.pmk-month-route-counters-v82-33 .pmk-month-route-line-v82-33 b{font-size:11px!important}
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
    return `<section class="pmk-month-summary-v82-33" aria-label="Сводка месяца">
      <h3>Сводка месяца</h3>
      <div class="pmk-month-total-row-v82-33">
        <div class="pmk-month-total-card-v82-33"><strong>${total}</strong><span>Всего ${countLabel(total)}</span></div>
        <div class="pmk-month-total-card-v82-33"><strong>${left}</strong><span>Осталось</span></div>
        <div class="pmk-month-total-card-v82-33"><strong>${done}</strong><span>Выполнено</span></div>
      </div>
    </section>`;
  }

  function districtRouteHtml(dayEvents = []) {
    if (!dayEvents.length) return '<span class="pmk-month-route-empty-v82-33">Нет заявок</span>';
    const counts = new Map();
    dayEvents.forEach(event => {
      const name = districtName(eventMeta(event));
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const ordered = [
      ...DISTRICTS.filter(name => counts.has(name)).map(name => [name, counts.get(name)]),
      ...[...counts.entries()].filter(([name]) => !DISTRICTS.includes(name)).sort((a, b) => b[1] - a[1]),
    ];
    return `<span class="pmk-month-route-list-v82-33">${ordered.map(([name, count]) => `<span class="pmk-month-route-line-v82-33"><span>${escapeHtml(districtShort(name))}</span><b>${count} ${pluralPointsLocal(count)}</b></span>`).join('')}</span>`;
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

    board.className = 'week-board month-board pmk-month-route-counters-v82-33';
    board.innerHTML = `${monthSummaryHtml(events)}${dateKeys.map(dateKey => {
      const date = dateKeyForDisplay(dateKey);
      const dayEvents = byDate.get(dateKey) || [];
      return `<section class="day-column ${dateKey === todayKey ? 'today' : ''}" data-month-day="${dateKey}">
        <button class="day-heading day-open" data-open-day="${dateKey}" type="button"><strong>${WEEKDAY_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${date.toLocaleDateString('ru-RU',{month:'short', timeZone:'UTC'})}</strong><span>${dayEvents.length} ${pluralPointsLocal(dayEvents.length)}</span><small>${districtRouteHtml(dayEvents)}</small></button>
      </section>`;
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
    globalThis.renderPeriod = function renderPeriodMonthRouteCounters(events, dateKeys, period = 'week') {
      if (period === 'month') return renderMonthTable(events, dateKeys);
      return originalRenderPeriod(events, dateKeys, period);
    };
  }
})();