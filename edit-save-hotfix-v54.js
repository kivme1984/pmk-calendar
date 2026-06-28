'use strict';

(() => {
  if (window.PMK_EDIT_SAVE_HOTFIX_V54) return;
  window.PMK_EDIT_SAVE_HOTFIX_V54 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let pendingGoogleUpdate = false;
  let pendingTimer = 0;

  function eventId() {
    return String($('#eventId')?.value || '');
  }

  function isExistingGoogleEvent() {
    const id = eventId();
    return Boolean(id && !id.startsWith('local-'));
  }

  function isGoogleConnected() {
    return Boolean($('#connectionBadge')?.classList.contains('online'));
  }

  function notify(message, type = 'error') {
    if (typeof showToast === 'function') showToast(message, type);
  }

  function syncActionLabels() {
    const id = eventId();
    const editing = Boolean(id);
    const sticky = $('#v50StickyActions .v50-submit');
    const submit = $('#submitBtn');

    if (sticky) {
      if (editing && isExistingGoogleEvent() && !isGoogleConnected()) sticky.textContent = 'Подключить Google и обновить';
      else sticky.textContent = editing ? 'Обновить заявку' : (isGoogleConnected() ? 'Создать в календаре' : 'Сохранить заявку');
    }

    if (submit && editing) {
      submit.textContent = isExistingGoogleEvent() && !isGoogleConnected()
        ? 'Подключить Google и обновить'
        : 'Обновить заявку';
    }

    document.querySelectorAll('.v50-editor-save').forEach(button => {
      button.textContent = 'Готово';
    });
  }

  function submitForm() {
    const form = $('#requestForm');
    const submit = $('#submitBtn');
    if (!form || !submit) return;
    if (typeof form.requestSubmit === 'function') form.requestSubmit(submit);
    else submit.click();
  }

  function waitForReconnectAndRetry() {
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      if (!pendingGoogleUpdate) return;
      pendingGoogleUpdate = false;
      notify('Google не подключился. Нажмите «Подключить Google» и повторите сохранение.', 'error');
      syncActionLabels();
    }, 20000);
  }

  function interceptOfflineGoogleEdit(event) {
    if (!isExistingGoogleEvent() || isGoogleConnected()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    pendingGoogleUpdate = true;
    notify('Для обновления существующей заявки нужно восстановить подключение Google. После подключения сохранение продолжится автоматически.', 'error');
    $('#connectGoogleBtn')?.click();
    waitForReconnectAndRetry();
    syncActionLabels();
  }

  function install() {
    const form = $('#requestForm');
    if (!form || form.dataset.pmkEditSaveV54 === '1') return Boolean(form);
    form.dataset.pmkEditSaveV54 = '1';

    form.addEventListener('submit', interceptOfflineGoogleEdit, true);

    const sticky = $('#v50StickyActions .v50-submit');
    if (sticky && sticky.dataset.pmkEditSaveV54 !== '1') {
      sticky.dataset.pmkEditSaveV54 = '1';
      sticky.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitForm();
      }, true);
    }

    const badge = $('#connectionBadge');
    if (badge) {
      new MutationObserver(() => {
        syncActionLabels();
        if (!pendingGoogleUpdate || !isGoogleConnected()) return;
        pendingGoogleUpdate = false;
        clearTimeout(pendingTimer);
        notify('Google подключён. Обновляем заявку…', 'success');
        setTimeout(submitForm, 150);
      }).observe(badge, { attributes: true, childList: true, characterData: true, subtree: true });
    }

    form.addEventListener('input', syncActionLabels);
    form.addEventListener('change', syncActionLabels);
    document.addEventListener('click', () => setTimeout(syncActionLabels, 0));
    syncActionLabels();
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 160) clearInterval(timer);
    }, 50);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();