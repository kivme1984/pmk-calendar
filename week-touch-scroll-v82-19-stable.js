'use strict';

(() => {
  if (globalThis.PMK_WEEK_TOUCH_SCROLL_V82_19_STABLE) return;
  globalThis.PMK_WEEK_TOUCH_SCROLL_V82_19_STABLE = true;

  const BOARD_SELECTOR = '#weekEvents.pmk-week-v82-19';
  let boundBoard = null;
  let session = null;
  let suppressClickUntil = 0;
  let momentumFrame = 0;

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

  function chooseAxis(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 8) return '';
    if (absX > absY * 1.12) return 'x';
    if (absY > absX * 1.05) return 'y';
    return '';
  }

  function onStart(event) {
    if (!event.touches || event.touches.length !== 1) return;
    const board = event.currentTarget;
    if (!board.matches(BOARD_SELECTOR)) return;
    const point = pointFrom(event);
    if (!point) return;

    stopMomentum();
    session = {
      board,
      startX: point.x,
      startY: point.y,
      lastX: point.x,
      lastTime: performance.now(),
      startLeft: board.scrollLeft,
      axis: '',
      movedX: false,
      velocityX: 0,
    };
  }

  function onMove(event) {
    if (!session || event.currentTarget !== session.board) return;
    const point = pointFrom(event);
    if (!point) return;

    const dx = point.x - session.startX;
    const dy = point.y - session.startY;
    if (!session.axis) session.axis = chooseAxis(dx, dy);
    if (!session.axis) return;

    // Vertical movement is deliberately left to the browser. This allows the
    // page to scroll naturally even when the finger starts on a day card.
    if (session.axis === 'y') return;

    event.preventDefault();
    event.stopPropagation();
    session.movedX = session.movedX || Math.abs(dx) > 11;
    session.board.scrollLeft = session.startLeft - dx;

    const now = performance.now();
    const elapsed = Math.max(8, now - session.lastTime);
    session.velocityX = clamp((session.lastX - point.x) / elapsed, -1.8, 1.8);
    session.lastX = point.x;
    session.lastTime = now;
  }

  function runHorizontalMomentum(velocity, board) {
    let current = clamp(velocity * 17, -28, 28);
    const step = () => {
      current *= 0.9;
      if (Math.abs(current) < 0.35) {
        momentumFrame = 0;
        return;
      }
      board.scrollLeft += current;
      momentumFrame = requestAnimationFrame(step);
    };
    if (Math.abs(current) >= 0.35) momentumFrame = requestAnimationFrame(step);
  }

  function onEnd(event) {
    if (!session || event.currentTarget !== session.board) return;
    const ended = session;
    session = null;

    if (ended.axis !== 'x') return;
    event.stopPropagation();
    if (ended.movedX) suppressClickUntil = performance.now() + 380;
    runHorizontalMomentum(ended.velocityX, ended.board);
  }

  function onCancel() {
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
