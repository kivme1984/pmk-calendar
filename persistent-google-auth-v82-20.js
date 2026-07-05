'use strict';

(() => {
  if (globalThis.PMK_PERSISTENT_GOOGLE_AUTH_V82_20) return;
  globalThis.PMK_PERSISTENT_GOOGLE_AUTH_V82_20 = true;

  const CONFIG_URL = './pmk-google-auth-config.json';
  const WORKER_TOKEN = 'pmk-google-worker-backend';
  const GOOGLE_CONNECTED_KEY = 'pmk-google-connected';
  let config = null;
  let configPromise = null;
  let nativeGoogleRequest = typeof googleRequest === 'function' ? googleRequest : null;
  let nativeConnectGoogle = typeof connectGoogle === 'function' ? connectGoogle : null;
  let nativeScheduleGoogleAutoReconnect = typeof scheduleGoogleAutoReconnect === 'function' ? scheduleGoogleAutoReconnect : null;
  let nativeUpdateConnectionUI = typeof updateConnectionUI === 'function' ? updateConnectionUI : null;

  function showMessage(message, type = '') {
    if (typeof showToast === 'function') showToast(message, type);
    else console[type === 'error' ? 'error' : 'log'](message);
  }

  function normalizeApiUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.origin : '';
    } catch {
      return '';
    }
  }

  async function loadConfig(force = false) {
    if (config && !force) return config;
    if (configPromise && !force) return configPromise;
    configPromise = fetch(`${CONFIG_URL}?v=${Date.now()}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : {})
      .catch(() => ({}))
      .then(value => {
        config = {
          enabled: value?.enabled === true,
          mode: String(value?.mode || '').toLowerCase(),
          apiUrl: normalizeApiUrl(value?.apiUrl),
          apiKeyStorageKey: String(value?.apiKeyStorageKey || 'pmk_google_api_key'),
          label: String(value?.label || 'Google Calendar через Worker'),
        };
        return config;
      })
      .finally(() => { configPromise = null; });
    return configPromise;
  }

  function isWorkerConfig(active = config) {
    return Boolean(active?.enabled && active?.apiUrl && (!active.mode || active.mode === 'worker'));
  }

  function hasApiKey(active = config) {
    try { return Boolean(localStorage.getItem(active?.apiKeyStorageKey || 'pmk_google_api_key')); }
    catch { return false; }
  }

  function getApiKey(active = config) {
    const keyName = active?.apiKeyStorageKey || 'pmk_google_api_key';
    let key = '';
    try { key = localStorage.getItem(keyName) || ''; } catch {}
    if (!key) {
      key = prompt('Введите ключ подключения ПМК. Ключ сохранится только на этом устройстве.');
      if (!key) throw new Error('Ключ подключения не введён. Заявка не отправлена в Google Calendar.');
      key = String(key).trim();
      try { localStorage.setItem(keyName, key); } catch {}
    }
    return key;
  }

  function resetApiKey() {
    const keyName = config?.apiKeyStorageKey || 'pmk_google_api_key';
    try { localStorage.removeItem(keyName); } catch {}
    showMessage('Ключ подключения удалён с этого устройства. При следующей отправке приложение попросит ключ заново.', 'success');
    updatePersistentUi();
  }

  function parseGoogleCalendarPath(path) {
    const raw = String(path || '');
    const [pathname, search = ''] = raw.split('?');
    const params = new URLSearchParams(search);
    const decodedPath = pathname.replace(/^https:\/\/www\.googleapis\.com\/calendar\/v3/i, '');
    const listMatch = decodedPath.match(/^\/calendars\/([^/]+)\/events$/);
    const eventMatch = decodedPath.match(/^\/calendars\/([^/]+)\/events\/([^/]+)$/);
    if (listMatch) {
      params.set('calendarId', decodeURIComponent(listMatch[1]));
      return { endpoint: `/api/events?${params.toString()}`, eventId: '', action: 'list' };
    }
    if (eventMatch) {
      params.set('calendarId', decodeURIComponent(eventMatch[1]));
      return { endpoint: `/api/events/${encodeURIComponent(decodeURIComponent(eventMatch[2]))}?${params.toString()}`, eventId: decodeURIComponent(eventMatch[2]), action: 'event' };
    }
    throw new Error(`Worker Google path не поддержан: ${raw}`);
  }

  async function workerGoogleRequest(path, options = {}) {
    const active = await loadConfig();
    if (!isWorkerConfig(active)) {
      if (nativeGoogleRequest) return nativeGoogleRequest(path, options);
      throw new Error('Google Worker не настроен.');
    }

    const { endpoint } = parseGoogleCalendarPath(path);
    const apiKey = getApiKey(active);
    const response = await fetch(`${active.apiUrl.replace(/\/$/, '')}${endpoint}`, {
      method: options.method || 'GET',
      body: options.body,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-PMK-KEY': apiKey,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (response.status === 401 || payload.error === 'unauthorized') {
      try { localStorage.removeItem(active.apiKeyStorageKey); } catch {}
      updatePersistentUi();
      throw new Error('Ключ подключения не принят. Введите актуальный ключ.');
    }
    if (!response.ok || payload.ok === false) {
      const detail = payload.error || payload.message || `HTTP ${response.status}`;
      throw new Error(`Google Worker: ${detail}`);
    }

    if ((options.method || 'GET').toUpperCase() === 'DELETE') return null;
    if (payload.raw) return payload.raw;
    if (payload.items) return { items: payload.items };
    if (payload.event) return payload.event;
    return payload;
  }

  async function connectWorkerGoogle() {
    const active = await loadConfig(true);
    if (!isWorkerConfig(active)) {
      if (nativeConnectGoogle) return nativeConnectGoogle();
      return showMessage('Google Worker ещё не настроен.', 'error');
    }
    try {
      getApiKey(active);
      if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
      try { localStorage.setItem(GOOGLE_CONNECTED_KEY, '1'); } catch {}
      updatePersistentUi();
      await refreshEvents?.();
      showMessage('Google Calendar подключён через Worker. Повторный вход Google не нужен.', 'success');
    } catch (error) {
      showMessage(error.message || 'Не удалось подключить Google Worker.', 'error');
    }
  }

  function scheduleWorkerReconnect() {
    if (!isWorkerConfig()) {
      return nativeScheduleGoogleAutoReconnect?.();
    }
    if (typeof state !== 'undefined') {
      state.token = WORKER_TOKEN;
      state.autoReconnectTried = true;
      state.silentReconnect = false;
    }
    try { localStorage.setItem(GOOGLE_CONNECTED_KEY, '1'); } catch {}
    updatePersistentUi();
    if (hasApiKey()) {
      refreshEvents?.();
    }
  }

  function workerStatusText() {
    if (!isWorkerConfig()) return '';
    return hasApiKey()
      ? 'Google подключён через Worker. Повторный вход в Google не нужен.'
      : 'Сервер Google готов. Введите ключ ПМК один раз на этом устройстве.';
  }

  function updatePersistentUi() {
    if (!isWorkerConfig()) {
      nativeUpdateConnectionUI?.();
      document.querySelector('#pmkPersistentGoogleCard')?.remove();
      return;
    }

    if (typeof state !== 'undefined') state.token = WORKER_TOKEN;

    const badge = document.querySelector('#connectionBadge');
    if (badge) {
      badge.textContent = hasApiKey() ? 'Google Worker подключён' : 'Нужен ключ ПМК';
      badge.className = `status-badge ${hasApiKey() ? 'online' : 'offline'}`;
    }
    const connectButton = document.querySelector('#connectGoogleBtn');
    if (connectButton) connectButton.textContent = hasApiKey() ? 'Сменить ключ ПМК' : 'Ввести ключ ПМК';
    const submitButton = document.querySelector('#submitBtn');
    const eventId = document.querySelector('#eventId')?.value || '';
    if (submitButton) submitButton.textContent = eventId ? 'Обновить в Google Calendar' : 'Создать в Google Calendar';

    ensureSettingsCard();
  }

  function ensureSettingsCard() {
    const grid = document.querySelector('#view-settings .settings-grid');
    if (!grid || !isWorkerConfig()) return null;
    let card = document.querySelector('#pmkPersistentGoogleCard');
    if (!card) {
      card = document.createElement('section');
      card.id = 'pmkPersistentGoogleCard';
      card.className = 'form-card pmk-persistent-google-card is-worker';
      card.innerHTML = `
        <h2>Google без постоянного входа</h2>
        <p id="pmkPersistentGoogleStatus"></p>
        <div class="pmk-persistent-google-actions">
          <button type="button" id="pmkPersistentGoogleConnect" class="button button-primary">Ввести ключ ПМК</button>
          <button type="button" id="pmkPersistentGoogleReset" class="button button-secondary">Сменить ключ</button>
        </div>
        <p class="helper-text">Ключ хранится только в браузере менеджера. Серверная авторизация находится в Cloudflare Worker.</p>`;
      grid.prepend(card);
      card.querySelector('#pmkPersistentGoogleConnect')?.addEventListener('click', connectWorkerGoogle);
      card.querySelector('#pmkPersistentGoogleReset')?.addEventListener('click', resetApiKey);
    }
    const status = card.querySelector('#pmkPersistentGoogleStatus');
    const connect = card.querySelector('#pmkPersistentGoogleConnect');
    const reset = card.querySelector('#pmkPersistentGoogleReset');
    if (status) status.textContent = workerStatusText();
    if (connect) connect.textContent = hasApiKey() ? 'Проверить подключение' : 'Ввести ключ ПМК';
    if (reset) reset.hidden = !hasApiKey();
    card.classList.toggle('is-connected', hasApiKey());
    return card;
  }

  function installOverrides() {
    if (typeof googleRequest === 'function' && !googleRequest.__pmkWorkerBackend) {
      nativeGoogleRequest = googleRequest;
      workerGoogleRequest.__pmkWorkerBackend = true;
      googleRequest = workerGoogleRequest;
    }

    if (typeof connectGoogle === 'function' && !connectGoogle.__pmkWorkerBackend) {
      nativeConnectGoogle = connectGoogle;
      connectWorkerGoogle.__pmkWorkerBackend = true;
      connectGoogle = connectWorkerGoogle;
    }

    if (typeof scheduleGoogleAutoReconnect === 'function' && !scheduleGoogleAutoReconnect.__pmkWorkerBackend) {
      nativeScheduleGoogleAutoReconnect = scheduleGoogleAutoReconnect;
      scheduleWorkerReconnect.__pmkWorkerBackend = true;
      scheduleGoogleAutoReconnect = scheduleWorkerReconnect;
    }

    if (typeof updateConnectionUI === 'function' && !updateConnectionUI.__pmkWorkerBackend) {
      nativeUpdateConnectionUI = updateConnectionUI;
      const wrappedUpdate = function updateConnectionUiWorkerV8220() {
        if (isWorkerConfig()) return updatePersistentUi();
        return nativeUpdateConnectionUI?.();
      };
      wrappedUpdate.__pmkWorkerBackend = true;
      updateConnectionUI = wrappedUpdate;
    }
  }

  function boot() {
    installOverrides();
    loadConfig(true).then(active => {
      if (isWorkerConfig(active)) {
        if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
        try { localStorage.setItem(GOOGLE_CONNECTED_KEY, '1'); } catch {}
      }
      updatePersistentUi();
      if (isWorkerConfig(active) && hasApiKey(active)) refreshEvents?.();
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('#connectGoogleBtn,#pmkPersistentGoogleConnect');
      if (!button || !isWorkerConfig()) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      connectWorkerGoogle();
    }, true);

    document.addEventListener('click', event => {
      if (event.target.closest('[data-view="settings"],.nav-settings')) setTimeout(updatePersistentUi, 0);
    }, true);
  }

  installOverrides();
  loadConfig();
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();

  globalThis.PMK_PERSISTENT_GOOGLE_AUTH = {
    connect: connectWorkerGoogle,
    refresh: () => refreshEvents?.(),
    disconnect: resetApiKey,
    hasSession: () => isWorkerConfig() && hasApiKey(),
    resetApiKey,
  };
})();
