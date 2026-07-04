'use strict';

(() => {
  if (window.PMK_MOBILE_KEYBOARD_FORM_V82_20_3) return;
  window.PMK_MOBILE_KEYBOARD_FORM_V82_20_3 = true;
  window.PMK_MOBILE_KEYBOARD_FORM_V82_20 = true;

  const ROOT_CLASS = 'pmk-keyboard-active';
  const FOCUS_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
  const SPACER_CLASS = 'pmk-keyboard-scroll-spacer';
  let lastFocused = null;
  let lastKeyboardHeight = 0;
  let lastLiftAt = 0;

  function viewport() { return window.visualViewport || null; }
  function keyboardHeight() {
    const vv = viewport();
    if (!vv) return 0;
    return Math.round(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
  }
  function visualHeight() { return Math.round(viewport()?.height || window.innerHeight); }
  function isEditable(element) { return Boolean(element && element.matches && element.matches(FOCUS_SELECTOR)); }
  function scrollRoot() { return document.scrollingElement || document.documentElement; }
  function activePanel() {
    return document.querySelector('.step-panel:not(.hidden),.form-step:not(.hidden),.view:not(.hidden),#view-form:not(.hidden),#view-add:not(.hidden)') || document.body;
  }
  function formContainer(element) {
    return element?.closest?.('.step-panel,.form-step,.modal,.dialog,.form-modal,.request-form,.manager-form,.main-content,#eventForm,#requestForm,#managerForm') || activePanel();
  }
  function ensureSpacer() {
    let spacer = document.querySelector(`.${SPACER_CLASS}`);
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.className = SPACER_CLASS;
      spacer.setAttribute('aria-hidden', 'true');
    }
    const parent = formContainer(lastFocused);
    if (parent && spacer.parentElement !== parent) parent.append(spacer);
    return spacer;
  }
  function setKeyboardState() {
    const height = keyboardHeight();
    const active = height > 80;
    lastKeyboardHeight = active ? height : 0;
    const spacerHeight = active ? Math.max(height + 260, Math.round(visualHeight() * 0.9)) : 0;

    document.documentElement.classList.toggle(ROOT_CLASS, active);
    document.body.classList.toggle(ROOT_CLASS, active);
    document.documentElement.style.setProperty('--pmk-keyboard-height', `${lastKeyboardHeight}px`);
    document.documentElement.style.setProperty('--pmk-keyboard-spacer', `${spacerHeight}px`);
    document.body.style.setProperty('--pmk-keyboard-height', `${lastKeyboardHeight}px`);
    document.body.style.setProperty('--pmk-keyboard-spacer', `${spacerHeight}px`);

    const spacer = ensureSpacer();
    spacer.style.height = `${spacerHeight}px`;
    spacer.style.minHeight = `${spacerHeight}px`;
    spacer.hidden = !active;
    return active;
  }
  function nearestScrollable(element) {
    let node = element;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(`${style.overflowY}${style.overflow}`) && node.scrollHeight > node.clientHeight + 8) return node;
      node = node.parentElement;
    }
    return scrollRoot();
  }
  function liftFieldOnce(target) {
    if (!target) return;
    setKeyboardState();
    if (!lastKeyboardHeight) return;

    const now = Date.now();
    if (now - lastLiftAt < 260) return;
    lastLiftAt = now;

    const vv = viewport();
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const rect = target.getBoundingClientRect();
    const desiredBottom = visibleBottom - 140;
    if (rect.bottom <= desiredBottom && rect.top >= 96) return;

    const delta = rect.bottom > desiredBottom ? rect.bottom - desiredBottom : rect.top - 110;
    const scroller = nearestScrollable(target);
    if (Math.abs(delta) < 8) return;
    if (scroller === scrollRoot()) window.scrollBy({ top: delta, behavior: 'auto' });
    else scroller.scrollTop += delta;
  }
  function onFocus(event) {
    if (!isEditable(event.target)) return;
    lastFocused = event.target;
    setKeyboardState();
    setTimeout(() => liftFieldOnce(lastFocused), 180);
    setTimeout(() => liftFieldOnce(lastFocused), 520);
  }
  function onViewportResize() {
    const previous = lastKeyboardHeight;
    setKeyboardState();
    if (lastFocused && Math.abs(lastKeyboardHeight - previous) > 40) setTimeout(() => liftFieldOnce(lastFocused), 120);
  }
  function install() {
    setKeyboardState();
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('click', event => {
      if (isEditable(event.target)) {
        lastFocused = event.target;
        setKeyboardState();
      }
    }, true);
    window.addEventListener('resize', onViewportResize, { passive: true });
    window.addEventListener('orientationchange', onViewportResize, { passive: true });
    viewport()?.addEventListener('resize', onViewportResize, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
