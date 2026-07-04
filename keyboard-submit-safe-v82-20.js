'use strict';

(() => {
  if (window.PMK_KEYBOARD_SUBMIT_SAFE_V82_20) return;
  window.PMK_KEYBOARD_SUBMIT_SAFE_V82_20 = true;

  const ID = 'pmkKeyboardSubmitSafe';
  const EDITABLE = 'input,textarea,select,[contenteditable="true"]';

  function kb() {
    const vv = window.visualViewport;
    return vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
  }

  function editing() {
    return Boolean(document.activeElement && document.activeElement.matches && document.activeElement.matches(EDITABLE));
  }

  function action() {
    const topDone = [...document.querySelectorAll('button')].find(b => b.id !== ID && String(b.textContent || '').trim() === 'Готово' && b.offsetParent !== null);
    const submit = document.querySelector('#submitBtn');
    const draft = document.querySelector('#saveDraftBtn');
    const form = document.querySelector('#requestForm');
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    setTimeout(() => {
      if (topDone) topDone.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      else if (submit) submit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      else if (form && form.requestSubmit) form.requestSubmit();
      else if (draft) draft.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, 80);
  }

  function ensure() {
    let b = document.getElementById(ID);
    if (b) return b;
    b = document.createElement('button');
    b.id = ID;
    b.type = 'button';
    b.textContent = 'Готово';
    b.addEventListener('click', e => { e.preventDefault(); action(); });
    document.body.appendChild(b);
    return b;
  }

  function sync() {
    const h = kb();
    const show = h > 80 && editing();
    const b = ensure();
    b.hidden = !show;
    if (show) b.style.bottom = `${h + 12}px`;
  }

  function boot() {
    ensure();
    document.addEventListener('focusin', () => setTimeout(sync, 160), true);
    document.addEventListener('focusout', () => setTimeout(sync, 240), true);
    window.addEventListener('resize', sync, { passive: true });
    window.visualViewport && window.visualViewport.addEventListener('resize', sync, { passive: true });
    setInterval(sync, 600);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
