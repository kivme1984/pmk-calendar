'use strict';

(() => {
  if (globalThis.PMK_MONTH_SUMMARY_COUNTERS_V82_28) return;
  globalThis.PMK_MONTH_SUMMARY_COUNTERS_V82_28 = true;

  const DISTRICTS = ['Автозаводский','Ленинский','Канавинский','Московский','Сормовский','Нижегородский','Советский','Приокский','За городом'];
  const originalRenderPeriod = globalThis.renderPeriod;

  function ensureMonthStyles() {
    if (document.getElementById('pmkMonthSummaryV8228Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkMonthSummaryV8228Styles';
    style.textContent = `
      .month-board .pmk-month-summary-v82-28{grid-column:1/-1!important;display:grid!important;gap:12px!important;padding:14px!important;margin:0 0 12px!important;border-radius:18px!important;background:linear-gradient(135deg,rgba(255,196,0,.20),rgba(255,255,255,.96))!important;border:1px solid rgba(0,0,0,.08)!important;box-shadow:0 12px 28px rgba(0,0,0,.08)!important}
      .month-board .pmk-month-summary-v82-28 h3{margin:0!important;font-size:20px!important;line-height:1.15!important;color:#111827!important}
      .month-board .pmk-month-total-row-v82-28{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}
      .month-board .pmk-month-total-card-v82-28{padding:10px!important;border-radius:14px!important;background:#fff!important;border:1px solid rgba(0,0,0,.07)!important}
      .month-board .pmk-month-total-card-v82-28 strong{display:block!important;font-size:24px!important;line-height:1!important;color:#111827!important}
      .month-board .pmk-month-total-card-v82-28 span{display:block!important;margin-top:4px!important;font-size:12px!important;line-height:1.15!important;font-weight:800!important;color:#6b7280!important}
      .month-board .pmk-month-districts-v82-28{display:flex!important;gap:7px!important;flex-wrap:wrap!important}
      .month-board .pmk-month-district-pill-v82-28{display:flex!important;align-items:center!important;gap:6px!important;padding:7px 9px!important;border-radius:999px!important;background:#111827!important;color:#fff!important;font-size:12px!important;font-weight:900!important;line-height:1!important}
      .month-board .pmk-month-district-pill-v82-28 b{font-size:15px!important;color:#ffc400!important}
      .month-board.month-board .day-heading{min-height:58px!important;padding:9px!important;text-align:left!important;cursor:pointer!important}
      .month-board.month-board .day-heading strong{font-size:14px!important;line-height:1.15!important}
      .month-board.month-board .day-heading span{font-size:13px!important;font-weight:900!important}
      .month-board.month-board .day-heading small{display:none!important}
      .month-board.month-board .day-column{cursor:pointer!important;min-height:118px!important}
      .month-board.month-board .day-event{padding:8px!important;gap:4px!important;font-size:13px!important;line-height:1.2!important}
      .month-board.month-board .day-event b{font-size:13px!important;line-height:1.18!important}
      .month-board.month-board .day-event span{font-size:12px!important;line-height:1.18!important}
      .month-board.month-board .empty-state{font-size:13px!important;line-height:1.2!important;padding:10px!important}
      @media(max-width:520px){
        .month-board .pmk-month-summary-v82-28{padding:12px!important;border-radius:16px!important}
        .month-board .pmk-month-summary-v82-28 h3{font-size:18px!important}
        .month-board .pmk-month-total-row-v82-28{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
        .month-board .pmk-month-total-card-v82-28{padding:9px 7px!important}
        .month-board .pmk-month-total-card-v82-28 strong{font-size:22px!important}
        .month-board .pmk-month-total-card-v82-28 span{font-size:11px!important}
        .month-board .pmk-month-district-pill-v82-28{font-size:11px!important;padding:7px 8px!important}
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

  function monthSummaryHtml(events = []) {
    const total = events.length;
    let done = 0;
    const districtCounts = new Map();

    events.forEach(event => {
      const data = eventMeta(event);
      if (data.requestStatus === 'completed') done += 1;
      const name = districtName(data);
      districtCounts.set(name, (districtCounts.get(name) || 0) + 1);
    });

    const left = Math.max(0, total - done);
    const ordered = [
      ...DISTRICTS.filter(name => districtCounts.has(name)).map(name => [name, districtCounts.get(name)]),
      ...[...districtCounts.entries()].filter(([name]) => !DISTRICTS.includes(name)).sort((a,b) => b[1] - a[1]),
    ];

    return `<section class="pmk-month-summary-v82-28" aria-label="Сводка месяца">
      <h3>Сводка месяца</h3>
      <div class="pmk-month-total-row-v82-28">
        <div class="pmk-month-total-card-v82-28"><strong>${total}</strong><span>Всего ${countLabel(total)}</span></div>
        <div class="pmk-month-total-card-v82-28"><strong>${left}</strong><span>Осталось</span></div>
        <div class="pmk-month-total-card-v82-28"><strong>${done}</strong><span>Выполнено</span></div>
      </div>
      <div class="pmk-month-districts-v82-28">
        ${ordered.length ? ordered.map(([name,count]) => `<span class="pmk-month-district-pill-v82-28"><b>${count}</b>${escapeHtml(name)}</span>`).join('') : '<span class="pmk-month-district-pill-v82-28"><b>0</b>Районов нет</span>'}
      </div>
    </section>`;
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
    enhanceMonthDrilldown(board);
  }

  if (typeof originalRenderPeriod === 'function') {
    globalThis.renderPeriod = function renderPeriodMonthSummary(events, dateKeys, period = 'week') {
      if (period === 'month') return renderMonthWithSummary(events, dateKeys, period);
      return originalRenderPeriod(events, dateKeys, period);
    };
  }
})();