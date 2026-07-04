'use strict';

(() => {
  if (window.PMK_KEYBOARD_SUBMIT_SAFE_V82_20_3) return;
  window.PMK_KEYBOARD_SUBMIT_SAFE_V82_20_3 = true;
  window.PMK_KEYBOARD_SUBMIT_SAFE_V82_20 = true;

  const ID = 'pmkKeyboardSubmitSafe';
  const EDITABLE = 'input,textarea,select,[contenteditable="true"]';

  function editing() {
    return Boolean(document.activeElement && document.activeElement.matches && document.activeElement.matches(EDITABLE));
  }

  function keyboardOffset() {
    const vv = window.visualViewport;
    if (!vv) return 10;
    const h = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    return h > 40 ? h + 12 : 10;
  }

  function nearFormEnd() {
    const actions = document.querySelector('#requestForm .form-actions');
    const submit = document.querySelector('#submitBtn');
    const end = actions || submit;
    if (!end) return false;
    const rect = end.getBoundingClientRect();
    const vh = window.visualViewport ? window.visualViewport.height + window.visualViewport.offsetTop : window.innerHeight;
    return rect.top < vh + 180;
  }

  function action() {
    const topDone = [...document.querySelectorAll('button')].find(b => b.id !== ID && String(b.textContent || '').trim() === 'Готово' && b.offsetParent !== null);
    const submit = document.querySelector('#submitBtn');
    const form = document.querySelector('#requestForm');
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    setTimeout(() => {
      if (topDone) topDone.click();
      else if (form && form.requestSubmit) form.requestSubmit(submit || undefined);
      else if (submit) submit.click();
    }, 80);
  }

  function ensure() {
    let b = document.getElementById(ID);
    if (b) return b;
    b = document.createElement('button');
    b.id = ID;
    b.type = 'button';
    b.textContent = 'Готово';
    b.addEventListener('pointerdown', e => e.stopPropagation(), true);
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); action(); });
    document.body.appendChild(b);
    return b;
  }

  function sync() {
    const b = ensure();
    const show = editing() && nearFormEnd();
    b.hidden = !show;
    if (show) b.style.bottom = `${keyboardOffset()}px`;
  }

  function boot() {
    ensure();
    document.addEventListener('focusin', () => setTimeout(sync, 80), true);
    document.addEventListener('focusout', () => setTimeout(sync, 350), true);
    document.addEventListener('click', () => setTimeout(sync, 80), true);
    document.addEventListener('scroll', () => setTimeout(sync, 40), true);
    window.addEventListener('resize', sync, { passive: true });
    window.visualViewport && window.visualViewport.addEventListener('resize', sync, { passive: true });
    window.visualViewport && window.visualViewport.addEventListener('scroll', sync, { passive: true });
    setInterval(sync, 500);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
