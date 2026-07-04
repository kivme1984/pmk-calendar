'use strict';

(() => {
  if (window.PMK_MOBILE_KEYBOARD_FORM_V82_20) return;
  window.PMK_MOBILE_KEYBOARD_FORM_V82_20 = true;

  const ROOT_CLASS = 'pmk-keyboard-active';
  const FOCUS_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
  let lastFocused = null;
  let resizeTimer = 0;

  function viewport() {
    return window.visualViewport || null;
  }

  function keyboardHeight() {
    const vv = viewport();
    if (!vv) return 0;
    const height = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    return Math.round(height);
  }

  function isEditable(element) {
    return Boolean(element && element.matches && element.matches(FOCUS_SELECTOR));
  }

  function formContainer(element) {
    if (!element) return document.scrollingElement || document.documentElement;
    return element.closest('.modal,.dialog,.form-modal,.request-form,.form-card,.manager-form,.main-content,#eventForm,#requestForm,#managerForm') || document.scrollingElement || document.documentElement;
  }

  function applyViewportPadding() {
    const height = keyboardHeight();
    const active = height > 80;
    document.documentElement.classList.toggle(ROOT_CLASS, active);
    document.body.classList.toggle(ROOT_CLASS, active);
    document.documentElement.style.setProperty('--pmk-keyboard-height', `${active ? height : 0}px`);
    document.body.style.setProperty('--pmk-keyboard-height', `${active ? height : 0}px`);
    return active;
  }

  function scrollFocusedIntoView(force = false) {
    const active = document.activeElement;
    if (!force && !isEditable(active)) return;
    const target = isEditable(active) ? active : lastFocused;
    if (!target) return;

    const activeKeyboard = applyViewportPadding();
    const margin = activeKeyboard ? keyboardHeight() + 110 : 120;
    target.style.scrollMarginBottom = `${margin}px`;
    target.style.scrollMarginTop = '90px';

    requestAnimationFrame(() => {
      try {
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      } catch {
        target.scrollIntoView(false);
      }

      setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const vv = viewport();
        const visibleBottom = vv ? vv.height + vv.offsetTop : window.innerHeight;
        const covered = rect.bottom > visibleBottom - 96;
        if (covered) {
          const delta = rect.bottom - (visibleBottom - 120);
          const scroller = formContainer(target);
          if (scroller && scroller !== document.documentElement && scroller !== document.body) scroller.scrollTop += delta;
          else window.scrollBy({ top: delta, behavior: 'smooth' });
        }
      }, 170);
    });
  }

  function onFocus(event) {
    if (!isEditable(event.target)) return;
    lastFocused = event.target;
    setTimeout(() => scrollFocusedIntoView(true), 80);
    setTimeout(() => scrollFocusedIntoView(true), 320);
  }

  function onResize() {
    clearTimeout(resizeTimer);
    applyViewportPadding();
    resizeTimer = setTimeout(() => scrollFocusedIntoView(false), 90);
  }

  function onSubmitButtonFocusFix() {
    document.querySelectorAll('#submitBtn,.form-actions .button-primary,[data-submit],button[type="submit"]').forEach(button => {
      button.style.scrollMarginBottom = 'calc(var(--pmk-keyboard-height, 0px) + 130px)';
    });
  }

  function install() {
    applyViewportPadding();
    onSubmitButtonFocusFix();
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('click', event => {
      if (isEditable(event.target)) setTimeout(() => scrollFocusedIntoView(true), 120);
    }, true);
    window.addEventListener('resize', onResize, { passive: true });
    viewport()?.addEventListener('resize', onResize, { passive: true });
    viewport()?.addEventListener('scroll', onResize, { passive: true });
    new MutationObserver(onSubmitButtonFocusFix).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
