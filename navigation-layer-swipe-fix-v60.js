'use strict';

(() => {
  if (window.PMK_NAVIGATION_LAYER_SWIPE_FIX_V60) return;
  window.PMK_NAVIGATION_LAYER_SWIPE_FIX_V60 = true;

  setupSwipeNavigation = function setupSafeSwipeNavigation() {
    const main = qs('.main-content');
    const sidebar = qs('#sidebar');
    if (!main || !sidebar || main.dataset.pmkSafeSwipeV60 === '1') return;
    main.dataset.pmkSafeSwipeV60 = '1';

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
      const horizontal = Math.abs(dx) >= 85 && Math.abs(dx) > Math.abs(dy) * 1.6;

      if (sidebar.classList.contains('open') && dx < -55 && horizontal) {
        sidebar.classList.remove('open');
        reset();
        return;
      }

      // В многодневных режимах горизонтальное движение используется только
      // для просмотра колонок. Смена периода выполняется кнопками навигации.
      if (state.currentView !== 'day') return reset();

      const interactive = startTarget?.closest?.('input,textarea,select,button,a,[contenteditable="true"],.event-card,.day-column,.week-board');
      if (interactive || elapsed > 900 || !horizontal) return reset();

      shiftSelectedDay(dx < 0 ? 1 : -1);
      reset();
    };

    const cancel = () => reset();

    main.addEventListener('touchstart', start, { passive: true });
    main.addEventListener('touchend', end, { passive: true });
    main.addEventListener('touchcancel', cancel, { passive: true });
    sidebar.addEventListener('touchstart', start, { passive: true });
    sidebar.addEventListener('touchend', end, { passive: true });
    sidebar.addEventListener('touchcancel', cancel, { passive: true });
  };

  document.addEventListener('DOMContentLoaded', () => {
    const menu = qs('#menuToggle');
    const sidebar = qs('#sidebar');
    if (!menu || !sidebar) return;

    const syncMenuState = () => {
      const open = sidebar.classList.contains('open');
      document.body.classList.toggle('pmk-sidebar-open', open);
      menu.setAttribute('aria-expanded', String(open));
    };

    menu.addEventListener('click', () => requestAnimationFrame(syncMenuState));
    qsa('.nav-item', sidebar).forEach(item => item.addEventListener('click', () => {
      sidebar.classList.remove('open');
      syncMenuState();
    }));

    new MutationObserver(syncMenuState).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    syncMenuState();
  });
})();