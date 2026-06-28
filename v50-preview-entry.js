'use strict';

(() => {
  function openForm() {
    const formView = document.querySelector('#view-form');
    if (formView?.classList.contains('active')) return true;
    const trigger = document.querySelector('.nav-create, [data-open-form]');
    if (!trigger) return false;
    trigger.click();
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(openForm, 120), { once: true });
  } else {
    setTimeout(openForm, 120);
  }
})();
