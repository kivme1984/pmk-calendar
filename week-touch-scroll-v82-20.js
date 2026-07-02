'use strict';

(() => {
  if (globalThis.PMK_WEEK_TOUCH_SCROLL_V82_20) return;
  globalThis.PMK_WEEK_TOUCH_SCROLL_V82_20 = true;

  const BOARD_SELECTOR = '#weekEvents.pmk-week-v82-19, #weekEvents.pmk-week-v82-20';
  let boundBoard = null;
  let session = null;
  let suppressClickUntil = 0;
  let momentumFrame = 0;

  function scrollRoot() {
    return document.scrollingElement || document.documentElement;
  }

  function stopMomentum() {
    if (momentumFrame) cancelAnimationFrame(momentumFrame);
    momentumFrame = 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pointFrom(event, changed = false) {
    const list = changed ? event.changedTouches : event.touches;
    const touch = list?.[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function stopParentSwipe(event) {
    event.stopPropagation();
  }

  function onStart(event) {
    if (!event.touches || event.touches.length !== 1) return;
    const board = event.currentTarget;
    if (!board.matches(BOARD_SELECTOR)) return;
    const point = pointFrom(event);
    if (!point) return;
    stopParentSwipe(event);
    stopMomentum();
    session = {
      board,
      startX: point.x,
      startY: point.y,
      lastX: point.x,
      lastY: point.y,
      lastTime: performance.now(),
      startLeft: board.scrollLeft,
      startTop: scrollRoot().scrollTop,
      axis: '',
      moved: false,
      velocityX: 0,
      velocityY: 0,
    };
  }

  function chooseAxis(dx, dy) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 7) return '';
    return Math.abs(dx) > Math.abs(dy) * 1.08 ? 'x' : 'y';
  }

  function onMove(event) {
    if (!session || event.currentTarget !== session.board) return;
    const point = pointFrom(event);
    if (!point) return;
    stopParentSwipe(event);
    const dx = point.x - session.startX;
    const dy = point.y - session.startY;
    if (!session.axis) session.axis = chooseAxis(dx, dy);
    if (!session.axis) return;

    event.preventDefault();
    session.moved = session.moved || Math.max(Math.abs(dx), Math.abs(dy)) > 11;

    const now = performance.now();
    const elapsed = Math.max(8, now - session.lastTime);
    if (session.axis === 'x') {
      session.board.scrollLeft = session.startLeft - dx;
      session.velocityX = clamp((session.lastX - point.x) / elapsed, -1.8, 1.8);
    } else {
      scrollRoot().scrollTop = session.startTop - dy;
      session.velocityY = clamp((session.lastY - point.y) / elapsed, -1.8, 1.8);
    }
    session.lastX = point.x;
    session.lastY = point.y;
    session.lastTime = now;
  }

  function runMomentum(axis, velocity, board) {
    const root = scrollRoot();
    let current = clamp(velocity * 17, -28, 28);
    const step = () => {
      current *= 0.9;
      if (Math.abs(current) < 0.35) {
        momentumFrame = 0;
        return;
      }
      if (axis === 'x') board.scrollLeft += current;
      else root.scrollTop += current;
      momentumFrame = requestAnimationFrame(step);
    };
    if (Math.abs(current) >= 0.35) momentumFrame = requestAnimationFrame(step);
  }

  function onEnd(event) {
    if (!session || event.currentTarget !== session.board) return;
    stopParentSwipe(event);
    const ended = session;
    session = null;
    if (ended.moved) suppressClickUntil = performance.now() + 380;
    if (ended.axis === 'x') runMomentum('x', ended.velocityX, ended.board);
    if (ended.axis === 'y') runMomentum('y', ended.velocityY, ended.board);
  }

  function onCancel(event) {
    stopParentSwipe(event);
    session = null;
  }

  function bindBoard() {
    const board = document.querySelector('#weekEvents');
    if (!board || board === boundBoard) return Boolean(board);
    if (boundBoard) {
      boundBoard.removeEventListener('touchstart', onStart);
      boundBoard.removeEventListener('touchmove', onMove);
      boundBoard.removeEventListener('touchend', onEnd);
      boundBoard.removeEventListener('touchcancel', onCancel);
    }
    boundBoard = board;
    board.addEventListener('touchstart', onStart, { passive: true });
    board.addEventListener('touchmove', onMove, { passive: false });
    board.addEventListener('touchend', onEnd, { passive: true });
    board.addEventListener('touchcancel', onCancel, { passive: true });
    return true;
  }

  document.addEventListener('click', (event) => {
    if (performance.now() > suppressClickUntil) return;
    if (!event.target.closest(BOARD_SELECTOR)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  function boot() {
    bindBoard();
    const observer = new MutationObserver(bindBoard);
    observer.observe(document.body, { childList: true, subtree: true });
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      bindBoard();
      if (attempts >= 100) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
