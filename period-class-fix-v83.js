'use strict';

(() => {
  if (globalThis.PMK_PERIOD_CLASS_FIX_V83) return;
  globalThis.PMK_PERIOD_CLASS_FIX_V83 = true;

  const previousRenderPeriod = renderPeriod;

  function markPeriod(period) {
    const board = document.querySelector('#weekEvents');
    if (!board) return;
    board.classList.toggle('pmk-three-days-period', period === 'three-days');
    board.classList.toggle('pmk-week-period', period === 'week');
  }

  renderPeriod = function renderPeriodClassSafeV83(events, dateKeys, period = 'week') {
    const result = previousRenderPeriod(events, dateKeys, period);
    markPeriod(period);
    return result;
  };

  requestAnimationFrame(() => markPeriod(state.currentView));
})();