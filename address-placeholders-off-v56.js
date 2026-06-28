'use strict';

(() => {
  if (window.PMK_ADDRESS_PLACEHOLDERS_OFF_V56) return;
  window.PMK_ADDRESS_PLACEHOLDERS_OFF_V56 = true;

  const selectors = [
    '#addressSearch',
    '#settlement',
    '#street',
    '#houseNumber',
    '#apartmentNumber',
    '#entrance',
    '#floor',
  ].join(',');

  function clearPlaceholders(root = document) {
    root.querySelectorAll?.(selectors).forEach(input => {
      if (input.hasAttribute('placeholder')) input.removeAttribute('placeholder');
    });
  }

  function boot() {
    clearPlaceholders();

    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        clearPlaceholders();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();