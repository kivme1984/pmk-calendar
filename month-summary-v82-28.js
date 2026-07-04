'use strict';

(() => {
  if (globalThis.PMK_MONTH_SUMMARY_COUNTERS_V82_28) return;
  globalThis.PMK_MONTH_SUMMARY_COUNTERS_V82_28 = true;
  globalThis.PMK_MONTH_DAY_DISTRICT_COUNTERS_V82_30 = true;

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
      .month-board .pmk-month-summary-v82-28{grid-column:1/-1!important;display:grid!important;gap:10px!important;padding:12px!important;margin:0 0 10px!important;border-radius:16px!important;background:linear-gradient(135deg,rgba(255,196,0,.18),rgba(255,255,255,.96))!important;border:1px solid rgba(0,0,0,.08)!important;box-shadow:0 10px 22px rgba(0,0,0,.07)!important}
      .month-board .pmk-month-summary-v82-28 h3{margin:0!important;font-size:18px!important;line-height:1.15!important;color:#111827!important}
      .month-board .pmk-month-total-row-v82-28{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}
      .month-board .pmk-month-total-card-v82-28{padding:9px!important;border-radius:14px!important;background:#fff!important;border:1px solid rgba(0,0,0,.07)!important}
      .month-board .pmk-month-total-card-v82-28 strong{display:block!important;font-size:24px!important;line-height:1!important;color:#111827!important}
      .month-board .pmk-month-total-card-v82-28 span{display:block!important;margin-top:4px!important;font-size:12px!important;line-height:1.15!important;font-weight:800!important;color:#6b7280!important}
      .month-board.month-board .day-heading{min-height:72px!important;padding:8px!important;text-align:left!important;cursor:pointer!important;align-items:flex-start!important;gap:4px!important}
      .month-board.month-board .day-heading strong{font-size:15px!important;line-height:1.12!important}
      .month-board.month-board .day-heading > span:not(.pmk-month-day-districts-v82-30 span){font-size:13px!important;font-weight:900!important}
      .month-board.month-board .day-heading small{display:flex!important;flex-wrap:wrap!important;gap:4px!important;margin-top:5px!important;width:100%!important;color:inherit!important;font-size:0!important;line-height:1!important}
      .month-board.month-board .pmk-month-day-districts-v82-30{display:flex!important;flex-wrap:wrap!important;gap:4px!important;width:100%!important}
      .month-board.month-board .pmk-month-day-district-pill-v82-30{display:inline-flex!important;align-items:center!important;gap:4px!important;padding:4px 6px!important;border-radius:999px!important;background:#111827!important;color:#fff!important;font-size:11px!important;font-weight:900!important;line-height:1!important;letter-spacing:.01em!important}
      .month-board.month-board .pmk-month-day-district-pill-v82-30 b{font-size:15px!important;line-height:1!important;color:#ffc400!important}
      .month-board.month-board .pmk-month-day-district-empty-v82-30{display:inline-flex!important;padding:4px 6px!important;border-radius:999px!important;background:rgba(0,0,0,.07)!important;color:#6b7280!important;font-size:11px!important;font-weight:900!important;line-height:1!important}
      .month-board.month-board .day-column{cursor:pointer!important;min-height:122px!important}
      .month-board.month-board .day-event{padding:8px!important;gap:4px!important;font-size:13px!important;line-height:1.2!important}
      .month-board.month-board .day-event b{font-size:13px!important;line-height:1.18!important}
      .month-board.month-board .day-event span{font-size:12px!important;line-height:1.18!important}
      .month-board.month-board .empty-state{font-size:13px!important;line-height:1.2!important;padding:10px!important}
      @media(max-width:520px){
        .month-board .pmk-month-summary-v82-28{padding:10px!important;border-radius:15px!important}
        .month-board .pmk-month-summary-v82-28 h3{font-size:17px!important}
        .month-board .pmk-month-total-row-v82-28{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
        .month-board .pmk-month-total-card-v82-28{padding:8px 7px!important}
        .month-board .pmk-month-total-card-v82-28 strong{font-size:22px!important}
        .month-board .pmk-month-total-card-v82-28 span{font-size:11px!important}
        .month-board.month-board .day-heading strong{font-size:14px!important}
        .month-board.month-board .pmk-month-day-district-pill-v82-30{font-size:10px!important;padding:4px 5px!important}
        .month-board.month-board .pmk-month-day-district-pill-v82-30 b{font-size:14px!important}
        .month-board.month-board .day-event b{font-size:13px!important}
        .month-board.month-board .day-event span{font-size:12px!important}
      }
    `;
    document.head.appendChild(style);
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
    return `<span class="pmk-month-day-districts-v82-30">${ordered.map(([name, count]) => `<span class="pmk-month-day-district-pill-v82-30"><b>${count}</b>${escapeHtml(districtAbbr(name))}</span>`).join('')}</span>`;
  }

  function applyDayDistrictCounters(board, events = []) {
    qsa('.day-column', board).forEach(column => {
      const openButton = column.querySelector('[data-open-day]');
      const dateKey = openButton?.dataset?.openDay;
      const small = openButton?.querySelector('small');
      if (!dateKey || !small) return;
      const dayEvents = events.filter(event => eventDateKey(event) === dateKey);
      small.innerHTML = districtCountersHtml(dayEvents);
      small.setAttribute('aria-label', 'Заявки по районам за день');
    });
  }

  function enhanceMonthDrilldown(board) {
    qsa('.day-column', board).forEach(column => {
      const openButton = column.querySelector('[data-open-day]');
      const dateKey = openButton?.dataset?.openDay;
      if (!dateKey || column.dataset.pmkMonthDrilldown === '1') return;
      column.dataset.pmkMonthDrilldown = '1';
      column.title = 'Открыть этот день';
      column.addEventListener('click', event => {
        if (event.target.closest('.day-event,.day-add,[data-add-day],details,summary,a,input,select,textarea')) return;
        openDay(dateKey);
      });
    });
  }

  function renderMonthWithSummary(events, dateKeys, period) {
    if (typeof originalRenderPeriod !== 'function') return;
    originalRenderPeriod(events, dateKeys, period);
    const board = qs('#weekEvents');
    if (!board) return;
    ensureMonthStyles();
    const existing = board.querySelector('.pmk-month-summary-v82-28');
    if (existing) existing.remove();
    board.insertAdjacentHTML('afterbegin', monthSummaryHtml(events));
    applyDayDistrictCounters(board, events);
    enhanceMonthDrilldown(board);
  }

  if (typeof originalRenderPeriod === 'function') {
    globalThis.renderPeriod = function renderPeriodMonthSummary(events, dateKeys, period = 'week') {
      if (period === 'month') return renderMonthWithSummary(events, dateKeys, period);
      return originalRenderPeriod(events, dateKeys, period);
    };
  }
})();