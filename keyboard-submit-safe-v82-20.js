'use strict';

(() => {
  if (window.PMK_KEYBOARD_SUBMIT_SAFE_V82_20_DISABLED) return;
  window.PMK_KEYBOARD_SUBMIT_SAFE_V82_20_DISABLED = true;
  window.PMK_KEYBOARD_SUBMIT_SAFE_V82_20 = true;

  function removeFloatingDone() {
    document.getElementById('pmkKeyboardSubmitSafe')?.remove();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', removeFloatingDone, { once: true });
  else removeFloatingDone();
})();
