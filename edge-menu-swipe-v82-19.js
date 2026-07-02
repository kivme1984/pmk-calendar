'use strict';

(() => {
  if (globalThis.PMK_EDGE_MENU_SWIPE_V82_19) return;
  globalThis.PMK_EDGE_MENU_SWIPE_V82_19 = true;

  const EDGE = 28;
  const OPEN_DISTANCE = 72;
  const MAX_TIME = 900;
  let gesture = null;

  function isMobile() {
    return matchMedia('(max-width:760px)').matches;
  }

  function sidebar() {
    return document.querySelector('#sidebar');
  }

  function reset() {
    gesture = null;
  }

  function touchPoint(event, changed = false) {
    const list = changed ? event.changedTouches : event.touches;
    return list?.[0] || null;
  }

  function onStart(event) {
    if (!isMobile() || event.touches?.length !== 1) return reset();
    const panel = sidebar();
    const point = touchPoint(event);
    if (!panel || !point || panel.classList.contains('open') || point.clientX > EDGE) return reset();

    gesture = {
      startX: point.clientX,
      startY: point.clientY,
      lastX: point.clientX,
      startedAt: performance.now(),
      horizontal: false,
      rejected: false,
    };
  }

  function onMove(event) {
    if (!gesture) return;
    const point = touchPoint(event);
    if (!point) return reset();

    const dx = point.clientX - gesture.startX;
    const dy = point.clientY - gesture.startY;
    gesture.lastX = point.clientX;

    if (!gesture.horizontal && !gesture.rejected && Math.max(Math.abs(dx), Math.abs(dy)) >= 10) {
      if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.35) gesture.horizontal = true;
      else if (Math.abs(dy) > Math.abs(dx)) gesture.rejected = true;
    }

    if (!gesture.horizontal) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onEnd(event) {
    if (!gesture) return;
    const point = touchPoint(event, true);
    const current = gesture;
    reset();
    if (!point || current.rejected || !current.horizontal) return;

    const dx = point.clientX - current.startX;
    const dy = point.clientY - current.startY;
    const elapsed = performance.now() - current.startedAt;
    const shouldOpen = dx >= OPEN_DISTANCE
      && Math.abs(dx) > Math.abs(dy) * 1.35
      && elapsed <= MAX_TIME;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!shouldOpen) return;
    const panel = sidebar();
    if (!panel) return;
    panel.classList.add('open');
    document.body.classList.add('pmk-sidebar-open');
    document.documentElement.classList.add('pmk-menu-active-v82-19');
    document.querySelector('#menuToggle')?.setAttribute('aria-expanded', 'true');
    globalThis.dispatchEvent(new CustomEvent('pmk-edge-menu-opened'));
  }

  function onCancel() {
    reset();
  }

  function boot() {
    document.addEventListener('touchstart', onStart, { passive: true, capture: true });
    document.addEventListener('touchmove', onMove, { passive: false, capture: true });
    document.addEventListener('touchend', onEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', onCancel, { passive: true, capture: true });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
