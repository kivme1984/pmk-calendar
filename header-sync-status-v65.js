'use strict';

(() => {
  if (window.PMK_HEADER_SYNC_STATUS_V65) return;
  window.PMK_HEADER_SYNC_STATUS_V65 = true;

  const STORAGE_KEY = 'pmk-calendar-sync-status-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  let manualSync = false;
  let syncing = false;

  function nowIso() {
    return new Date().toISOString();
  }

  function formatDateTime(iso) {
    if (!iso) return 'Дата и время отсутствуют';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Дата и время отсутствуют';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date).replace(',', ' ·');
  }

  function readSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function saveStatus(status, extra = {}) {
    const data = { status, time: nowIso(), ...extra };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    return data;
  }

  function render(status, data = {}) {
    const panel = $('#pmkHeaderSync');
    const label = $('#pmkSyncStatus');
    const time = $('#pmkSyncTime');
    const button = $('#pmkSyncButton');
    if (!panel || !label || !time || !button) return;

    panel.dataset.status = status;
    button.disabled = status === 'syncing';
    button.setAttribute('aria-busy', String(status === 'syncing'));

    if (status === 'syncing') {
      label.textContent = data.count != null ? `Синхронизация · ${data.count}` : 'Синхронизация…';
      time.textContent = 'Получаем данные Google Calendar';
      return;
    }

    if (status === 'success') {
      label.textContent = 'Синхронизировано';
      time.textContent = `${formatDateTime(data.time)}${data.count != null ? ` · ${data.count} событий` : ''}`;
      return;
    }

    if (status === 'error') {
      label.textContent = 'Ошибка синхронизации';
      time.textContent = formatDateTime(data.time);
      return;
    }

    if (status === 'disconnected') {
      label.textContent = 'Google не подключён';
      time.textContent = 'Синхронизация недоступна';
      return;
    }

    label.textContent = 'Не синхронизировано';
    time.textContent = 'Нажмите кнопку синхронизации';
  }

  function install() {
    const actions = $('.app-header .header-actions');
    if (!actions) return false;
    if ($('#pmkHeaderSync')) return true;

    const panel = document.createElement('div');
    panel.id = 'pmkHeaderSync';
    panel.className = 'pmk-header-sync';
    panel.innerHTML = `
      <button type="button" id="pmkSyncButton" class="pmk-sync-button" aria-label="Синхронизировать Google Calendar">
        <span class="pmk-sync-icon" aria-hidden="true">↻</span>
        <span class="pmk-sync-button-text">Синхронизация</span>
      </button>
      <div class="pmk-sync-info" aria-live="polite">
        <strong id="pmkSyncStatus">Не синхронизировано</strong>
        <small id="pmkSyncTime">Нажмите кнопку синхронизации</small>
      </div>`;

    actions.insertBefore(panel, actions.firstChild);

    const saved = readSaved();
    if (saved?.status === 'success' || saved?.status === 'error') render(saved.status, saved);
    else render('idle');

    $('#pmkSyncButton').addEventListener('click', async () => {
      if (syncing) return;
      if (!window.state?.token) {
        const failed = saveStatus('error', { message: 'Google Calendar не подключён' });
        render('disconnected', failed);
        if (typeof showToast === 'function') showToast('Сначала подключите Google Calendar.', 'error');
        return;
      }

      manualSync = true;
      syncing = true;
      render('syncing');
      try {
        const sync = window.PMK_FULL_CALENDAR_SYNC?.refresh || window.refreshEvents;
        if (typeof sync !== 'function') throw new Error('Модуль синхронизации недоступен');
        await sync();
      } catch (error) {
        const failed = saveStatus('error', { message: error?.message || String(error) });
        render('error', failed);
        syncing = false;
        manualSync = false;
      }
    });

    window.addEventListener('pmk-calendar-sync-start', () => {
      syncing = true;
      render('syncing');
    });

    window.addEventListener('pmk-calendar-sync-progress', event => {
      render('syncing', { count: Number(event.detail?.count || 0) });
    });

    window.addEventListener('pmk-calendar-sync-done', event => {
      const success = saveStatus('success', { count: Number(event.detail?.count || 0), manual: manualSync });
      render('success', success);
      syncing = false;
      manualSync = false;
    });

    window.addEventListener('pmk-calendar-sync-error', event => {
      const failed = saveStatus('error', { message: event.detail?.message || 'Неизвестная ошибка', manual: manualSync });
      render('error', failed);
      syncing = false;
      manualSync = false;
    });

    window.addEventListener('online', () => {
      const savedOnline = readSaved();
      if (savedOnline?.status === 'success' || savedOnline?.status === 'error') render(savedOnline.status, savedOnline);
    });

    window.addEventListener('offline', () => {
      const savedOffline = readSaved();
      if (savedOffline?.status === 'success') {
        render('success', savedOffline);
        $('#pmkSyncTime').textContent += ' · сейчас нет сети';
      } else {
        render('error', { time: nowIso() });
        $('#pmkSyncTime').textContent = 'Нет подключения к интернету';
      }
    });

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