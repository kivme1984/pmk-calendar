'use strict';

(() => {
  if (globalThis.PMK_DIRECT_SWIPE_PERFORMANCE_V91) return;
  globalThis.PMK_DIRECT_SWIPE_PERFORMANCE_V91 = true;

  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 760px) {
      #weekEvents.week-board,
      #weekEvents.three-days-board {
        overflow-x: auto !important;
        overflow-y: visible !important;
        -webkit-overflow-scrolling: touch !important;
        touch-action: pan-x pan-y pinch-zoom !important;
        overscroll-behavior-x: contain !important;
        overscroll-behavior-y: auto !important;
        scroll-snap-type: none !important;
        scroll-behavior: auto !important;
      }
      #weekEvents.week-board *,
      #weekEvents.three-days-board * {
        touch-action: pan-x pan-y pinch-zoom !important;
      }
      #weekEvents .day-column {
        scroll-snap-align: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  setupSwipeNavigation = function setupDirectSwipeV91() {
    const main = qs('.main-content');
    const sidebar = qs('#sidebar');
    if (!main || !sidebar || main.dataset.pmkDirectSwipeV91 === '1') return;
    main.dataset.pmkDirectSwipeV91 = '1';

    let startX = 0;
    let startY = 0;
    let startTarget = null;
    let startedAt = 0;

    const reset = () => {
      startX = 0;
      startY = 0;
      startTarget = null;
      startedAt = 0;
    };

    const start = event => {
      const touch = event.touches?.[0];
      if (!touch) return reset();
      startX = touch.clientX;
      startY = touch.clientY;
      startTarget = event.target;
      startedAt = Date.now();
    };

    const end = event => {
      const touch = event.changedTouches?.[0];
      if (!touch || !startedAt) return reset();

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const elapsed = Date.now() - startedAt;
      const horizontal = Math.abs(dx) >= 75 && Math.abs(dx) > Math.abs(dy) * 1.45;

      if (sidebar.classList.contains('open') && horizontal && dx < 0) {
        sidebar.classList.remove('open');
        reset();
        return;
      }

      if (state.currentView !== 'day' || !horizontal || elapsed > 900) return reset();

      const interactive = startTarget?.closest?.('input,textarea,select,button,a,[contenteditable="true"],.event-card,.day-column,#weekEvents');
      if (!interactive) shiftSelectedDay(dx < 0 ? 1 : -1);
      reset();
    };

    main.addEventListener('touchstart', start, { passive: true });
    main.addEventListener('touchend', end, { passive: true });
    main.addEventListener('touchcancel', reset, { passive: true });
    sidebar.addEventListener('touchstart', start, { passive: true });
    sidebar.addEventListener('touchend', end, { passive: true });
    sidebar.addEventListener('touchcancel', reset, { passive: true });
  };
})();
