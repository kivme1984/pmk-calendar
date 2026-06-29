'use strict';

(() => {
  if (window.PMK_REMINDER_SAVE_CONFIRM_V66) return;
  window.PMK_REMINDER_SAVE_CONFIRM_V66 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let saving = false;

  function formatReminderDate(dateKey, time) {
    if (!dateKey) return '';
    const date = new Date(`${dateKey}T12:00:00`);
    const dateText = Number.isNaN(date.getTime())
      ? dateKey
      : new Intl.DateTimeFormat('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(date);
    return `${dateText} в ${time || '—'}`;
  }

  function ensureDialog() {
    let dialog = $('#pmkReminderConfirmDialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'pmkReminderConfirmDialog';
    dialog.className = 'pmk-reminder-confirm-dialog';
    dialog.innerHTML = `
      <form method="dialog" class="pmk-reminder-confirm-card">
        <div class="pmk-reminder-confirm-icon">✓</div>
        <h2>Добавить напоминание?</h2>
        <p id="pmkReminderConfirmText"></p>
        <div class="pmk-reminder-confirm-actions">
          <button type="button" id="pmkReminderConfirmCancel" class="button button-secondary">Отмена</button>
          <button type="button" id="pmkReminderConfirmSave" class="button button-primary">Добавить в календарь</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);

    $('#pmkReminderConfirmCancel', dialog).addEventListener('click', () => {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    });

    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    });

    return dialog;
  }

  function readData() {
    return {
      date: $('#reminderDate')?.value || '',
      time: $('#reminderTime')?.value || '',
      duration: Number($('#reminderDuration')?.value || 30),
      text: $('#reminderText')?.value?.trim() || '',
    };
  }

  function validate(data) {
    const fields = [
      ['#reminderDate', data.date],
      ['#reminderTime', data.time],
      ['#reminderText', data.text],
    ];
    fields.forEach(([selector, value]) => $(selector)?.classList.toggle('invalid', !value));
    if (fields.some(([, value]) => !value)) {
      if (typeof showToast === 'function') showToast('Заполните дату, время и текст напоминания.', 'error');
      return false;
    }
    return true;
  }

  function updateButtonText() {
    const button = $('#pmkReminderSaveButton');
    if (!button) return;
    const connected = typeof state !== 'undefined' && Boolean(state?.token);
    button.textContent = connected ? 'Добавить в Google Calendar' : 'Сохранить напоминание';
  }

  async function confirmAndSave(data, dialog) {
    if (saving) return;
    saving = true;
    const confirmButton = $('#pmkReminderConfirmSave', dialog);
    const mainButton = $('#pmkReminderSaveButton');
    if (confirmButton) {
      confirmButton.disabled = true;
      confirmButton.textContent = 'Сохраняем…';
    }
    if (mainButton) mainButton.disabled = true;

    try {
      if (typeof saveReminder !== 'function') throw new Error('Функция сохранения напоминания недоступна.');
      await saveReminder(data);
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      if (typeof showToast === 'function') {
        const connected = typeof state !== 'undefined' && Boolean(state?.token);
        showToast(connected ? 'Напоминание добавлено в Google Calendar.' : 'Напоминание сохранено на устройстве.', 'success');
      }
    } catch (error) {
      if (typeof showToast === 'function') showToast(error?.message || 'Не удалось сохранить напоминание.', 'error');
    } finally {
      saving = false;
      if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = 'Добавить в календарь';
      }
      if (mainButton) mainButton.disabled = false;
      updateButtonText();
    }
  }

  function openConfirmation(data) {
    const dialog = ensureDialog();
    const summary = $('#pmkReminderConfirmText', dialog);
    const connected = typeof state !== 'undefined' && Boolean(state?.token);
    if (summary) {
      summary.innerHTML = `
        <strong>${formatReminderDate(data.date, data.time)}</strong>
        <span>${data.text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))}</span>
        <small>${connected ? 'Будет добавлено в Google Calendar' : 'Google не подключён — сохранится на устройстве'}</small>`;
    }

    const saveButton = $('#pmkReminderConfirmSave', dialog);
    saveButton.onclick = () => confirmAndSave(data, dialog);

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function install() {
    const form = $('#reminderForm');
    if (!form) return false;
    if (form.dataset.pmkReminderConfirm === '1') return true;
    form.dataset.pmkReminderConfirm = '1';

    const actions = $('.form-actions', form) || (() => {
      const element = document.createElement('div');
      element.className = 'form-actions';
      form.appendChild(element);
      return element;
    })();

    let button = $('button[type="submit"]', actions);
    if (!button) {
      button = document.createElement('button');
      button.type = 'submit';
      button.className = 'button button-primary';
      actions.appendChild(button);
    }
    button.id = 'pmkReminderSaveButton';
    button.classList.add('pmk-reminder-save-button');
    updateButtonText();

    if (!$('#pmkReminderSaveHint', form)) {
      const hint = document.createElement('p');
      hint.id = 'pmkReminderSaveHint';
      hint.className = 'pmk-reminder-save-hint';
      hint.textContent = 'После нажатия появится подтверждение даты, времени и текста напоминания.';
      actions.insertBefore(hint, button);
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const data = readData();
      if (!validate(data)) return;
      openConfirmation(data);
    }, true);

    window.addEventListener('pmk-calendar-sync-done', updateButtonText);
    $('#connectGoogleBtn')?.addEventListener('click', () => setTimeout(updateButtonText, 1200));
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 100) clearInterval(timer);
    }, 50);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();