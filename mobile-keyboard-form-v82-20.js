'use strict';

(() => {
  if (window.PMK_MOBILE_KEYBOARD_FORM_V82_20_4) return;
  window.PMK_MOBILE_KEYBOARD_FORM_V82_20_4 = true;
  window.PMK_MOBILE_KEYBOARD_FORM_V82_20 = true;

  const ROOT_CLASS = 'pmk-keyboard-active';
  const EDITABLE = 'input, textarea, select, [contenteditable="true"]';
  const SPACER_CLASS = 'pmk-keyboard-scroll-spacer';
  let lastFocused = null;

  function vv() { return window.visualViewport || null; }
  function isEditable(el) { return Boolean(el?.matches?.(EDITABLE)); }
  function visualBottom() { return vv() ? vv().offsetTop + vv().height : window.innerHeight; }
  function visualHeight() { return Math.round(vv()?.height || window.innerHeight); }
  function keyboardOpen() { return isEditable(document.activeElement); }

  function formView() {
    return document.querySelector('#view-form') || document.querySelector('#requestForm') || document.body;
  }

  function ensureSpacer() {
    let spacer = document.querySelector(`.${SPACER_CLASS}`);
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.className = SPACER_CLASS;
      spacer.setAttribute('aria-hidden', 'true');
    }
    const form = document.querySelector('#requestForm') || formView();
    if (spacer.parentElement !== form) form.append(spacer);
    return spacer;
  }

  function applyState() {
    const active = keyboardOpen();
    const h = visualHeight();
    const spacer = active ? Math.max(360, Math.round(h * 0.9)) : 0;
    document.documentElement.classList.toggle(ROOT_CLASS, active);
    document.body.classList.toggle(ROOT_CLASS, active);
    document.documentElement.style.setProperty('--pmk-visual-height', `${h}px`);
    document.documentElement.style.setProperty('--pmk-keyboard-spacer', `${spacer}px`);
    document.body.style.setProperty('--pmk-visual-height', `${h}px`);
    document.body.style.setProperty('--pmk-keyboard-spacer', `${spacer}px`);
    const node = ensureSpacer();
    node.hidden = !active;
    node.style.height = `${spacer}px`;
    node.style.minHeight = `${spacer}px`;
  }

  function nearestScroller(el) {
    let node = el;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(`${style.overflowY}${style.overflow}`) && node.scrollHeight > node.clientHeight + 8) return node;
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  function reveal(el) {
    if (!el) return;
    applyState();
    requestAnimationFrame(() => {
      const bottom = visualBottom();
      const rect = el.getBoundingClientRect();
      const safeBottom = bottom - 96;
      const safeTop = (vv()?.offsetTop || 0) + 92;
      let delta = 0;
      if (rect.bottom > safeBottom) delta = rect.bottom - safeBottom;
      else if (rect.top < safeTop) delta = rect.top - safeTop;
      if (Math.abs(delta) < 6) return;
      const scroller = nearestScroller(el);
      if (scroller === document.scrollingElement || scroller === document.documentElement) window.scrollBy({ top: delta, behavior: 'auto' });
      else scroller.scrollTop += delta;
    });
  }

  function onFocus(event) {
    if (!isEditable(event.target)) return;
    lastFocused = event.target;
    setTimeout(() => reveal(lastFocused), 120);
    setTimeout(() => reveal(lastFocused), 420);
  }

  function sync() {
    applyState();
    if (lastFocused && isEditable(document.activeElement)) setTimeout(() => reveal(lastFocused), 80);
  }

  function boot() {
    applyState();
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('focusout', () => setTimeout(applyState, 220), true);
    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('orientationchange', sync, { passive: true });
    vv()?.addEventListener('resize', sync, { passive: true });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
