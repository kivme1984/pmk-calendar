'use strict';

(() => {
  if (window.PMK_PROVIDER_STATUS_MANAGER_V70) return;
  window.PMK_PROVIDER_STATUS_MANAGER_V70 = true;

  const CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const GOOGLE_STATUS_KEY = 'pmk-calendar-sync-status-v1';
  const YANDEX_STATUS_KEY = 'pmk-yandex-provider-status-v1';
  const APP_URL = 'https://kivme1984.github.io/pmk-calendar/';
  const DEFAULT_WORKER_URL = 'https://lucky-math-8e63pmk-address.standart-media.workers.dev/calendar';

  const runtime = {
    google: 'idle',
    yandex: 'idle',
    googleMessage: '',
    yandexMessage: '',
  };

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function readJson(key, fallback = null) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function yandexConfig() {
    return {
      enabled: true,
      apiUrl: DEFAULT_WORKER_URL,
      syncToken: '',
      ...(readJson(CONFIG_KEY, {}) || {}),
    };
  }

  function yandexConfigured() {
    const config = yandexConfig();
    return Boolean(config.enabled && config.apiUrl && config.syncToken);
  }

  function queueCount(provider = '') {
    const items = readJson(QUEUE_KEY, []);
    if (!Array.isArray(items)) return 0;
    return provider ? items.filter(item => item?.provider === provider).length : items.length;
  }

  function timeLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date).replace(',', ' ·');
  }

  function providerSnapshot(provider) {
    if (provider === 'google') {
      const connected = typeof state !== 'undefined' && Boolean(state?.token);
      const saved = readJson(GOOGLE_STATUS_KEY, {}) || {};
      const queued = queueCount('google');
      if (runtime.google === 'syncing') return { state: 'syncing', text: 'Синхронизация…', detail: runtime.googleMessage || '' };
      if (!connected) return { state: queued ? 'warning' : 'offline', text: 'Не подключён', detail: queued ? `В очереди: ${queued}` : 'Нажмите для подключения' };
      if (runtime.google === 'error' || saved.status === 'error') return { state: 'error', text: 'Ошибка связи', detail: runtime.googleMessage || timeLabel(saved.time) };
      if (saved.status === 'success') return { state: queued ? 'warning' : 'success', text: queued ? 'Подключён, есть очередь' : 'Подключён', detail: `${timeLabel(saved.time)}${saved.count != null ? ` · ${saved.count}` : ''}` };
      return { state: queued ? 'warning' : 'success', text: 'Подключён', detail: queued ? `В очереди: ${queued}` : 'Ожидает первой синхронизации' };
    }

    const configured = yandexConfigured();
    const saved = readJson(YANDEX_STATUS_KEY, {}) || {};
    const queued = queueCount('yandex');
    if (runtime.yandex === 'syncing') return { state: 'syncing', text: 'Синхронизация…', detail: runtime.yandexMessage || '' };
    if (!configured) return { state: 'offline', text: 'Не настроен', detail: 'Откройте настройки' };
    if (runtime.yandex === 'error' || saved.status === 'error') return { state: 'error', text: 'Ошибка связи', detail: runtime.yandexMessage || saved.message || timeLabel(saved.time) };
    if (saved.status === 'success') return { state: queued ? 'warning' : 'success', text: queued ? 'Подключён, есть очередь' : 'Подключён', detail: `${timeLabel(saved.time)}${saved.count != null ? ` · ${saved.count}` : ''}` };
    return { state: queued ? 'warning' : 'pending', text: 'Настроен', detail: queued ? `В очереди: ${queued}` : 'Нужно проверить подключение' };
  }

  function cardHtml(provider, title, letter) {
    return `
      <button type="button" class="pmk-provider-card" data-provider="${provider}" aria-label="Статус ${title}">
        <span class="pmk-provider-logo pmk-provider-logo-${provider}" aria-hidden="true">${letter}</span>
        <span class="pmk-provider-copy">
          <strong>${title}</strong>
          <small data-provider-text>Проверяем…</small>
          <em data-provider-detail></em>
        </span>
        <span class="pmk-provider-dot" aria-hidden="true"></span>
      </button>`;
  }

  function installHeader() {
    const actions = $('.app-header .header-actions');
    if (!actions || $('#pmkProviderStatusPanel')) return Boolean(actions);

    const panel = document.createElement('div');
    panel.id = 'pmkProviderStatusPanel';
    panel.className = 'pmk-provider-status-panel';
    panel.innerHTML = `
      ${cardHtml('google', 'Google', 'G')}
      ${cardHtml('yandex', 'Яндекс', 'Я')}
      <button type="button" id="pmkProvidersSyncBtn" class="pmk-provider-sync-button" aria-label="Синхронизировать оба календаря" title="Синхронизировать оба календаря">↻</button>`;
    actions.insertBefore(panel, actions.firstChild);

    panel.addEventListener('click', async event => {
      const providerButton = event.target.closest('[data-provider]');
      if (providerButton) {
        const provider = providerButton.dataset.provider;
        if (provider === 'google') {
          if (!(typeof state !== 'undefined' && state?.token)) {
            if (typeof connectGoogle === 'function') connectGoogle();
          } else {
            await syncAll();
          }
        } else if (!yandexConfigured()) {
          openYandexSettings();
        } else {
          runtime.yandex = 'syncing';
          render();
          try {
            if (typeof window.PMK_YANDEX_CALENDAR?.test === 'function') await window.PMK_YANDEX_CALENDAR.test();
            await syncAll();
          } catch (error) {
            runtime.yandex = 'error';
            runtime.yandexMessage = error?.message || 'Не удалось проверить Яндекс';
            writeJson(YANDEX_STATUS_KEY, { status: 'error', time: new Date().toISOString(), message: runtime.yandexMessage });
            render();
          }
        }
        return;
      }
      if (event.target.closest('#pmkProvidersSyncBtn')) await syncAll();
    });
    return true;
  }

  async function syncAll() {
    const button = $('#pmkProvidersSyncBtn');
    if (button) button.disabled = true;
    runtime.google = (typeof state !== 'undefined' && state?.token) ? 'syncing' : 'idle';
    runtime.yandex = yandexConfigured() ? 'syncing' : 'idle';
    render();
    try {
      if (typeof refreshEvents === 'function') await refreshEvents();
    } catch (error) {
      if (typeof showToast === 'function') showToast(error?.message || 'Ошибка синхронизации.', 'error');
    } finally {
      runtime.google = 'idle';
      runtime.yandex = 'idle';
      if (button) button.disabled = false;
      render();
    }
  }

  function openYandexSettings() {
    if (typeof setView === 'function') setView('settings');
    setTimeout(() => {
      const card = $('#pmkYandexSettings');
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#pmkYandexSyncToken')?.focus();
    }, 120);
  }

  function renderProvider(provider) {
    const card = $(`.pmk-provider-card[data-provider="${provider}"]`);
    if (!card) return;
    const snapshot = providerSnapshot(provider);
    card.dataset.status = snapshot.state;
    $('[data-provider-text]', card).textContent = snapshot.text;
    $('[data-provider-detail]', card).textContent = snapshot.detail || '';
  }

  function render() {
    installHeader();
    renderProvider('google');
    renderProvider('yandex');
    const queue = queueCount();
    const syncButton = $('#pmkProvidersSyncBtn');
    if (syncButton) {
      syncButton.dataset.queue = String(queue);
      syncButton.title = queue ? `Синхронизировать оба календаря. В очереди: ${queue}` : 'Синхронизировать оба календаря';
    }
  }

  function managerSetupText(includeSecret = true) {
    const config = yandexConfig();
    const token = includeSecret ? config.syncToken : 'введите технический ключ PMK_SYNC_TOKEN';
    return [
      'Подключение ПМК Календаря на устройстве менеджера',
      '',
      `1. Откройте: ${APP_URL}`,
      '2. Перейдите: Настройки → Яндекс.Календарь.',
      `3. Адрес Worker: ${config.apiUrl || DEFAULT_WORKER_URL}`,
      `4. Ключ синхронизации: ${token}`,
      '5. Включите «Дублировать заявки в Яндекс».',
      '6. Нажмите «Сохранить настройки», затем «Проверить Яндекс».',
      '',
      'Логин Яндекса и пароль приложения менеджеру не передаются.',
    ].join('\n');
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      if (typeof showToast === 'function') showToast(successMessage, 'success');
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      if (typeof showToast === 'function') showToast(successMessage, 'success');
    }
  }

  function installManagerSetup() {
    const settingsGrid = $('#view-settings .settings-grid');
    const yandexCard = $('#pmkYandexSettings');
    if (!settingsGrid || !yandexCard || $('#pmkManagerDeviceSetup')) return Boolean(settingsGrid && yandexCard);

    const card = document.createElement('section');
    card.id = 'pmkManagerDeviceSetup';
    card.className = 'form-card pmk-manager-device-card';
    card.innerHTML = `
      <div class="pmk-manager-device-heading">
        <div>
          <h2>Подключение устройства менеджера</h2>
          <p>На телефоне или компьютере менеджера вводится только технический ключ. Пароль Яндекса остаётся в Cloudflare.</p>
        </div>
        <span class="pmk-manager-safe-badge">Без пароля Яндекса</span>
      </div>
      <div class="pmk-manager-device-grid">
        <label class="field">Адрес приложения<input id="pmkManagerAppUrl" value="${APP_URL}" readonly></label>
        <label class="field">Адрес Worker<input id="pmkManagerWorkerUrl" readonly></label>
        <label class="field pmk-manager-token-field">Ключ подключения PMK_SYNC_TOKEN
          <span class="pmk-manager-token-wrap">
            <input id="pmkManagerSyncToken" type="password" readonly autocomplete="off">
            <button type="button" id="pmkManagerToggleToken" class="mini-button">Показать</button>
          </span>
        </label>
      </div>
      <div class="pmk-manager-device-actions">
        <button type="button" id="pmkManagerCopyLink" class="button button-secondary">Скопировать ссылку</button>
        <button type="button" id="pmkManagerCopySetup" class="button button-primary">Скопировать данные для менеджера</button>
      </div>
      <div class="info-box pmk-manager-security-note">Передавайте технический ключ только сотрудникам, которым разрешена работа с заявками. При увольнении сотрудника замените PMK_SYNC_TOKEN в Cloudflare и на действующих устройствах.</div>`;
    yandexCard.insertAdjacentElement('afterend', card);

    function fill() {
      const config = yandexConfig();
      $('#pmkManagerWorkerUrl').value = config.apiUrl || DEFAULT_WORKER_URL;
      $('#pmkManagerSyncToken').value = config.syncToken || '';
      $('#pmkManagerCopySetup').disabled = !config.syncToken;
    }

    $('#pmkManagerToggleToken').addEventListener('click', () => {
      const input = $('#pmkManagerSyncToken');
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      $('#pmkManagerToggleToken').textContent = showing ? 'Показать' : 'Скрыть';
    });
    $('#pmkManagerCopyLink').addEventListener('click', () => copyText(APP_URL, 'Ссылка на календарь скопирована.'));
    $('#pmkManagerCopySetup').addEventListener('click', async () => {
      if (!yandexConfig().syncToken) return openYandexSettings();
      if (!confirm('Скопировать технический ключ подключения в буфер обмена? Передавайте его только доверенному менеджеру.')) return;
      await copyText(managerSetupText(true), 'Данные для устройства менеджера скопированы.');
    });
    $('#saveSettingsBtn')?.addEventListener('click', () => setTimeout(() => { fill(); render(); }, 0));
    fill();
    return true;
  }

  function bindEvents() {
    window.addEventListener('pmk-calendar-sync-start', () => {
      runtime.google = 'syncing';
      render();
    });
    window.addEventListener('pmk-calendar-sync-progress', event => {
      runtime.google = 'syncing';
      runtime.googleMessage = event.detail?.count != null ? `${event.detail.count} событий` : '';
      render();
    });
    window.addEventListener('pmk-calendar-sync-done', () => {
      runtime.google = 'idle';
      runtime.googleMessage = '';
      render();
    });
    window.addEventListener('pmk-calendar-sync-error', event => {
      runtime.google = 'error';
      runtime.googleMessage = event.detail?.message || 'Ошибка Google';
      render();
    });
    window.addEventListener('pmk-yandex-sync-done', event => {
      const data = { status: 'success', time: new Date().toISOString(), count: Number(event.detail?.count || 0) };
      writeJson(YANDEX_STATUS_KEY, data);
      runtime.yandex = 'idle';
      runtime.yandexMessage = '';
      render();
    });
    window.addEventListener('pmk-yandex-sync-error', event => {
      const data = { status: 'error', time: new Date().toISOString(), message: event.detail?.message || 'Ошибка Яндекс' };
      writeJson(YANDEX_STATUS_KEY, data);
      runtime.yandex = 'error';
      runtime.yandexMessage = data.message;
      render();
    });
    window.addEventListener('online', render);
    window.addEventListener('offline', render);
    window.addEventListener('storage', event => {
      if ([CONFIG_KEY, QUEUE_KEY, GOOGLE_STATUS_KEY, YANDEX_STATUS_KEY].includes(event.key)) render();
    });
  }

  function boot() {
    installHeader();
    installManagerSetup();
    bindEvents();
    render();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installHeader();
      installManagerSetup();
      render();
      if (($('#pmkProviderStatusPanel') && $('#pmkManagerDeviceSetup')) || attempts > 120) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
