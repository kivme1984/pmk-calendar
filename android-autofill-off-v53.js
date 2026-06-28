'use strict';

(() => {
  if (window.PMK_ANDROID_AUTOFILL_OFF_V53) return;
  window.PMK_ANDROID_AUTOFILL_OFF_V53 = true;

  const PERSONAL_SELECTORS = [
    '#customerName',
    '#phone',
    '#settlement',
    '#street',
    '#houseNumber',
    '#apartmentNumber',
    '#entrance',
    '#floor',
    '#managerComment',
    '#globalSearch',
    '#reminderText',
  ].join(',');

  function markInput(input) {
    if (!input || input.dataset.pmkAutofillOff === '1') return;
    input.dataset.pmkAutofillOff = '1';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'none');
    input.setAttribute('data-form-type', 'other');
    input.setAttribute('data-lpignore', 'true');
    input.setAttribute('data-1p-ignore', 'true');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', input.id === 'customerName' ? 'words' : 'none');
    input.spellcheck = false;

    if (input.hasAttribute('name')) {
      input.dataset.pmkOriginalName = input.getAttribute('name') || '';
      input.removeAttribute('name');
    }
  }

  function addAutofillDecoys(form) {
    if (!form || form.querySelector('[data-pmk-autofill-decoys]')) return;
    const box = document.createElement('div');
    box.dataset.pmkAutofillDecoys = '1';
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    box.innerHTML = '<input type="text" tabindex="-1" autocomplete="username"><input type="password" tabindex="-1" autocomplete="new-password">';
    form.prepend(box);
  }

  function protectForm(form) {
    if (!form) return;
    form.setAttribute('autocomplete', 'off');
    form.setAttribute('data-form-type', 'other');
    form.setAttribute('data-lpignore', 'true');
    form.setAttribute('data-1p-ignore', 'true');
    addAutofillDecoys(form);
    form.querySelectorAll(PERSONAL_SELECTORS).forEach(markInput);
  }

  function protectAll() {
    document.querySelectorAll('form').forEach(protectForm);
    document.querySelectorAll(PERSONAL_SELECTORS).forEach(markInput);
  }

  function boot() {
    protectAll();

    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        protectAll();
      });
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener('focusin', event => {
      if (event.target?.matches?.(PERSONAL_SELECTORS)) markInput(event.target);
    }, true);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();