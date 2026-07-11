'use strict';

(() => {
  if (window.PMK_ANDROID_AUTOFILL_OFF_V53) return;
  window.PMK_ANDROID_AUTOFILL_OFF_V53 = true;
  window.PMK_GOOGLE_AUTOFILL_SAVE_OFF_V82_24 = true;

  const PROTECTED_FORMS = '#requestForm,#reminderForm';
  const PROTECTED_SELECTORS = [
    '#requestForm input',
    '#requestForm select',
    '#requestForm textarea',
    '#reminderForm input',
    '#reminderForm textarea',
    '#addressSearch',
    '#globalSearch',
    '#jumpDate',
    '#jumpPeriodDate',
  ].join(',');

  const KEEP_NAME_TYPES = new Set(['radio', 'checkbox']);
  const SAFE_AUTOCOMPLETE = new Set(['date', 'time', 'number', 'range', 'color']);

  function randomToken(id = 'field') {
    return `pmk_${String(id).replace(/[^a-z0-9_-]/gi, '_')}_${Date.now().toString(36)}`;
  }

  function markElement(element) {
    if (!element || element.dataset.pmkAutofillProtected === '1') return;
    const tag = element.tagName?.toLowerCase();
    const type = String(element.getAttribute('type') || '').toLowerCase();

    element.dataset.pmkAutofillProtected = '1';
    element.dataset.formType = 'other';
    element.dataset.lpignore = 'true';
    element.dataset['1pIgnore'] = 'true';
    element.dataset.bwignore = 'true';
    element.dataset.pmkNoSave = '1';
    element.setAttribute('data-form-type', 'other');
    element.setAttribute('data-lpignore', 'true');
    element.setAttribute('data-1p-ignore', 'true');
    element.setAttribute('data-bwignore', 'true');
    element.setAttribute('aria-autocomplete', 'none');
    element.setAttribute('autocorrect', 'off');
    element.setAttribute('autocapitalize', element.id === 'customerName' ? 'words' : 'none');
    element.spellcheck = false;

    if (tag === 'select' || SAFE_AUTOCOMPLETE.has(type)) {
      element.setAttribute('autocomplete', 'off');
    } else {
      element.setAttribute('autocomplete', 'new-password');
    }

    if (element.name && !KEEP_NAME_TYPES.has(type)) {
      element.dataset.pmkOriginalName = element.dataset.pmkOriginalName || element.name;
      element.name = randomToken(element.id || element.dataset.pmkOriginalName || 'field');
    }
  }

  function addAutofillDecoys(form) {
    if (!form || form.querySelector('[data-pmk-autofill-decoys]')) return;
    const box = document.createElement('div');
    box.dataset.pmkAutofillDecoys = '1';
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    box.innerHTML = [
      '<input type="text" tabindex="-1" autocomplete="off" data-form-type="other" data-lpignore="true">',
      '<input type="text" tabindex="-1" autocomplete="off" data-form-type="other" data-lpignore="true">',
    ].join('');
    form.prepend(box);
  }

  function protectForm(form) {
    if (!form) return;
    form.setAttribute('autocomplete', 'off');
    form.setAttribute('data-form-type', 'other');
    form.setAttribute('data-lpignore', 'true');
    form.setAttribute('data-1p-ignore', 'true');
    form.setAttribute('data-bwignore', 'true');
    addAutofillDecoys(form);
    form.querySelectorAll('input,select,textarea').forEach(markElement);
  }

  function removeSavePasswordDecoys() {
    document.querySelectorAll('[data-pmk-autofill-decoys] input[type="password"]').forEach(node => node.remove());
  }

  function protectAll() {
    removeSavePasswordDecoys();
    document.querySelectorAll(PROTECTED_FORMS).forEach(protectForm);
    document.querySelectorAll(PROTECTED_SELECTORS).forEach(markElement);
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
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['autocomplete', 'name', 'type'] });

    document.addEventListener('focusin', event => {
      if (event.target?.matches?.(PROTECTED_SELECTORS)) {
        markElement(event.target);
        setTimeout(() => markElement(event.target), 0);
      }
    }, true);

    document.addEventListener('input', event => {
      if (event.target?.matches?.(PROTECTED_SELECTORS)) markElement(event.target);
    }, true);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();