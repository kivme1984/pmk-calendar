'use strict';

(() => {
  if (window.PMK_MOBILE_KEYBOARD_FORM_V82_20_2) return;
  window.PMK_MOBILE_KEYBOARD_FORM_V82_20_2 = true;
  window.PMK_MOBILE_KEYBOARD_FORM_V82_20 = true;

  const ROOT_CLASS = 'pmk-keyboard-active';
  const FOCUS_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
  const SPACER_CLASS = 'pmk-keyboard-scroll-spacer';
  let lastFocused = null;
  let resizeTimer = 0;

  function viewport() {
    return window.visualViewport || null;
  }

  function keyboardHeight() {
    const vv = viewport();
    if (!vv) return 0;
    return Math.round(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
  }

  function visualHeight() {
    return Math.round(viewport()?.height || window.innerHeight);
  }

  function isEditable(element) {
    return Boolean(element && element.matches && element.matches(FOCUS_SELECTOR));
  }

  function scrollRoot() {
    return document.scrollingElement || document.documentElement;
  }

  function activeStep() {
    return document.querySelector('.step-panel:not(.hidden),.form-step:not(.hidden),.view:not(.hidden),#view-form:not(.hidden),#view-add:not(.hidden)') || document.body;
  }

  function formContainer(element) {
    return element?.closest?.('.step-panel,.form-step,.modal,.dialog,.form-modal,.request-form,.manager-form,.main-content,#eventForm,#requestForm,#managerForm') || activeStep() || scrollRoot();
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

  function applyViewportPadding() {
    const height = keyboardHeight();
    const active = height > 80;
    const extra = active ? Math.max(height + 180, Math.round(visualHeight() * 0.72)) : 0;

    document.documentElement.classList.toggle(ROOT_CLASS, active);
    document.body.classList.toggle(ROOT_CLASS, active);
    document.documentElement.style.setProperty('--pmk-keyboard-height', `${active ? height : 0}px`);
    document.documentElement.style.setProperty('--pmk-keyboard-spacer', `${extra}px`);
    document.documentElement.style.setProperty('--pmk-visual-height', `${visualHeight()}px`);
    document.body.style.setProperty('--pmk-keyboard-height', `${active ? height : 0}px`);
    document.body.style.setProperty('--pmk-keyboard-spacer', `${extra}px`);

    const spacer = ensureSpacer();
    spacer.style.height = `${extra}px`;
    spacer.style.minHeight = `${extra}px`;
    spacer.hidden = !active;

    const root = scrollRoot();
    if (active) {
      root.style.paddingBottom = `${extra}px`;
      document.body.style.paddingBottom = `${extra}px`;
    } else {
      root.style.paddingBottom = '';
      document.body.style.paddingBottom = '';
    }
    return active;
  }

  function nearestScrollable(element) {
    let node = element;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(`${style.overflowY}${style.overflow}`) && node.scrollHeight > node.clientHeight + 12) return node;
      node = node.parentElement;
    }
    return scrollRoot();
  }

  function scrollFocusedIntoView(force = false) {
    const active = document.activeElement;
    if (!force && !isEditable(active)) return;
    const target = isEditable(active) ? active : lastFocused;
    if (!target) return;

    const activeKeyboard = applyViewportPadding();
    const margin = activeKeyboard ? keyboardHeight() + 220 : 140;
    target.style.scrollMarginBottom = `${margin}px`;
    target.style.scrollMarginTop = '110px';

    requestAnimationFrame(() => {
      const scroller = nearestScrollable(target);
      const rect = target.getBoundingClientRect();
      const vv = viewport();
      const visibleTop = vv ? vv.offsetTop : 0;
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const desiredBottom = visibleBottom - 155;
      const desiredTop = visibleTop + 120;

      if (rect.bottom > desiredBottom) {
        const delta = rect.bottom - desiredBottom;
        if (scroller === scrollRoot()) window.scrollBy({ top: delta, behavior: 'smooth' });
        else scroller.scrollTop += delta;
      } else if (rect.top < desiredTop) {
        const delta = rect.top - desiredTop;
        if (scroller === scrollRoot()) window.scrollBy({ top: delta, behavior: 'smooth' });
        else scroller.scrollTop += delta;
      }
    });
  }

  function keepScrollingRoom() {
    applyViewportPadding();
    if (lastFocused) scrollFocusedIntoView(false);
  }

  function onFocus(event) {
    if (!isEditable(event.target)) return;
    lastFocused = event.target;
    setTimeout(() => scrollFocusedIntoView(true), 60);
    setTimeout(() => scrollFocusedIntoView(true), 280);
    setTimeout(() => scrollFocusedIntoView(true), 620);
  }

  function onResize() {
    clearTimeout(resizeTimer);
    applyViewportPadding();
    resizeTimer = setTimeout(keepScrollingRoom, 80);
  }

  function install() {
    applyViewportPadding();
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('input', () => setTimeout(keepScrollingRoom, 0), true);
    document.addEventListener('click', event => {
      if (isEditable(event.target)) setTimeout(() => scrollFocusedIntoView(true), 120);
    }, true);
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    viewport()?.addEventListener('resize', onResize, { passive: true });
    viewport()?.addEventListener('scroll', onResize, { passive: true });
    new MutationObserver(() => setTimeout(applyViewportPadding, 0)).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
