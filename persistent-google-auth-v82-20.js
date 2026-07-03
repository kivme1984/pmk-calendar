'use strict';

(() => {
  if (globalThis.PMK_PERSISTENT_GOOGLE_AUTH_V82_20) return;
  globalThis.PMK_PERSISTENT_GOOGLE_AUTH_V82_20 = true;

  const CONFIG_URL = './pmk-google-auth-config.json';
  const SESSION_KEY = 'pmk-google-persistent-session-v1';
  const SESSION_EXP_KEY = 'pmk-google-persistent-session-exp-v1';
  const DEVICE_KEY = 'pmk-google-device-id-v1';
  const PREVIOUS_VIEW_KEY = 'pmk-google-return-view-v1';
  const GOOGLE_CONNECTED_KEY_LOCAL = 'pmk-google-connected';
  let config = null;
  let configPromise = null;
  let refreshTimer = 0;
  let refreshing = null;
  let nativeConnectGoogle = typeof connectGoogle === 'function' ? connectGoogle : null;

  function readSession() {
    try { return localStorage.getItem(SESSION_KEY) || ''; }
    catch { return ''; }
  }

  function writeSession(token, expiresAt = 0) {
    try {
      if (token) localStorage.setItem(SESSION_KEY, token);
      else localStorage.removeItem(SESSION_KEY);
      if (expiresAt) localStorage.setItem(SESSION_EXP_KEY, String(expiresAt));
      else localStorage.removeItem(SESSION_EXP_KEY);
    } catch {}
  }

  function deviceId() {
    try {
      let value = localStorage.getItem(DEVICE_KEY) || '';
      if (!value) {
        value = globalThis.crypto?.randomUUID?.() || `pmk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        localStorage.setItem(DEVICE_KEY, value);
      }
      return value;
    } catch {
      return `pmk-${Date.now()}`;
    }
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
          apiUrl: normalizeApiUrl(value?.apiUrl),
          label: String(value?.label || 'Постоянный вход Google'),
        };
        return config;
      })
      .finally(() => { configPromise = null; });
    return configPromise;
  }

  function parseAuthReturn() {
    const raw = String(location.hash || '').replace(/^#/, '');
    if (!raw.startsWith('pmk-google-')) return false;
    const params = new URLSearchParams(raw);
    const token = params.get('pmk-google-auth') || '';
    const expiresAt = Number(params.get('pmk-google-auth-exp') || 0);
    const error = params.get('pmk-google-error') || '';
    if (token) writeSession(token, expiresAt);
    let previous = 'day';
    try { previous = localStorage.getItem(PREVIOUS_VIEW_KEY) || 'day'; } catch {}
    const safeView = /^[a-z-]+$/i.test(previous) ? previous : 'day';
    history.replaceState(history.state || {}, '', `${location.pathname}${location.search}#${safeView}`);
    if (error) setTimeout(() => showMessage(`Google не подключён: ${error}`, 'error'), 0);
    return Boolean(token);
  }

  const returnedWithSession = parseAuthReturn();

  function showMessage(message, type = '') {
    if (typeof showToast === 'function') showToast(message, type);
    else console[type === 'error' ? 'error' : 'log'](message);
  }

  function currentReturnUrl() {
    const url = new URL('./', location.href);
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  function rememberView() {
    try {
      const value = typeof state !== 'undefined' && state.currentView ? state.currentView : 'day';
      localStorage.setItem(PREVIOUS_VIEW_KEY, value);
    } catch {}
  }

  async function startPersistentAuthorization() {
    const active = await loadConfig(true);
    if (!active.enabled || !active.apiUrl) {
      if (nativeConnectGoogle) return nativeConnectGoogle();
      return showMessage('Сервер постоянного входа Google ещё не настроен.', 'error');
    }
    rememberView();
    const url = new URL(`${active.apiUrl}/auth/start`);
    url.searchParams.set('return_to', currentReturnUrl());
    url.searchParams.set('device_id', deviceId());
    location.assign(url.toString());
  }

  function scheduleRefresh(expiresIn = 3600) {
    clearTimeout(refreshTimer);
    const seconds = Math.max(300, Number(expiresIn || 3600) - 300);
    refreshTimer = setTimeout(() => refreshAccessToken({ quiet: true }), seconds * 1000);
  }

  async function refreshAccessToken(options = {}) {
    if (refreshing) return refreshing;
    const session = readSession();
    if (!session) return false;

    refreshing = (async () => {
      const active = await loadConfig(options.forceConfig === true);
      if (!active.enabled || !active.apiUrl) return false;
      try {
        if (typeof state !== 'undefined') state.autoReconnectTried = true;
        const response = await fetch(`${active.apiUrl}/token`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ device_id: deviceId() }),
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.access_token) {
          if (response.status === 401 || payload.reconnect) {
            writeSession('', 0);
            if (typeof clearSavedToken === 'function') clearSavedToken();
            try { localStorage.removeItem(GOOGLE_CONNECTED_KEY_LOCAL); } catch {}
            updatePersistentUi();
            if (!options.quiet) showMessage('Нужно один раз заново подключить Google.', 'error');
          }
          return false;
        }

        if (typeof state !== 'undefined') {
          state.token = payload.access_token;
          state.autoReconnectTried = true;
          state.silentReconnect = false;
        }
        if (typeof saveToken === 'function') saveToken(payload);
        try { localStorage.setItem(GOOGLE_CONNECTED_KEY_LOCAL, '1'); } catch {}
        if (typeof updateConnectionUI === 'function') updateConnectionUI();
        updatePersistentUi();
        scheduleRefresh(payload.expires_in);
        if (typeof refreshEvents === 'function') await refreshEvents();
        if (!options.quiet) showMessage('Google подключён постоянно.', 'success');
        return true;
      } catch (error) {
        if (!options.quiet) showMessage('Не удалось восстановить Google автоматически.', 'error');
        console.warn('Persistent Google auth refresh failed', error);
        return false;
      }
    })().finally(() => { refreshing = null; });

    return refreshing;
  }

  async function disconnectPersistentGoogle() {
    const session = readSession();
    const active = await loadConfig();
    if (session && active.enabled && active.apiUrl) {
      await fetch(`${active.apiUrl}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session}` },
        cache: 'no-store',
      }).catch(() => null);
    }
    clearTimeout(refreshTimer);
    writeSession('', 0);
    if (typeof clearSavedToken === 'function') clearSavedToken();
    try { localStorage.removeItem(GOOGLE_CONNECTED_KEY_LOCAL); } catch {}
    if (typeof updateConnectionUI === 'function') updateConnectionUI();
    updatePersistentUi();
    showMessage('Постоянное подключение Google отключено.', 'success');
  }

  function statusText() {
    if (readSession()) {
      return typeof state !== 'undefined' && state.token
        ? 'Подключено постоянно. Повторный вход после закрытия приложения не нужен.'
        : 'Подключение сохранено. Восстанавливаем доступ автоматически.';
    }
    return 'Подключите аккаунт один раз — дальше доступ будет восстанавливаться автоматически.';
  }

  function ensureSettingsCard() {
    const grid = document.querySelector('#view-settings .settings-grid');
    if (!grid) return null;
    let card = document.querySelector('#pmkPersistentGoogleCard');
    if (!card) {
      card = document.createElement('section');
      card.id = 'pmkPersistentGoogleCard';
      card.className = 'form-card pmk-persistent-google-card';
      card.innerHTML = `
        <h2>Google без повторного входа</h2>
        <p id="pmkPersistentGoogleStatus"></p>
        <div class="pmk-persistent-google-actions">
          <button type="button" id="pmkPersistentGoogleConnect" class="button button-primary">Подключить один раз</button>
          <button type="button" id="pmkPersistentGoogleDisconnect" class="button button-secondary">Отключить</button>
        </div>`;
      grid.prepend(card);
      card.querySelector('#pmkPersistentGoogleConnect')?.addEventListener('click', startPersistentAuthorization);
      card.querySelector('#pmkPersistentGoogleDisconnect')?.addEventListener('click', disconnectPersistentGoogle);
    }
    return card;
  }

  function updatePersistentUi() {
    const card = ensureSettingsCard();
    if (!card) return;
    const connected = Boolean(readSession());
    const status = card.querySelector('#pmkPersistentGoogleStatus');
    const connect = card.querySelector('#pmkPersistentGoogleConnect');
    const disconnect = card.querySelector('#pmkPersistentGoogleDisconnect');
    if (status) status.textContent = statusText();
    if (connect) connect.textContent = connected ? 'Переподключить аккаунт' : 'Подключить один раз';
    if (disconnect) disconnect.hidden = !connected;
    card.classList.toggle('is-connected', connected);
  }

  function installOverrides() {
    if (typeof connectGoogle === 'function' && !connectGoogle.__pmkPersistentAuth) {
      nativeConnectGoogle = connectGoogle;
      const wrapped = function connectGooglePersistentV8220() {
        return loadConfig().then(active => {
          if (active.enabled && active.apiUrl) return startPersistentAuthorization();
          return nativeConnectGoogle?.();
        });
      };
      wrapped.__pmkPersistentAuth = true;
      globalThis.connectGoogle = wrapped;
    }

    if (readSession() && typeof scheduleGoogleAutoReconnect === 'function' && !scheduleGoogleAutoReconnect.__pmkPersistentAuth) {
      const wrapped = function scheduleGoogleAutoReconnectPersistentV8220() {
        refreshAccessToken({ quiet: true });
      };
      wrapped.__pmkPersistentAuth = true;
      globalThis.scheduleGoogleAutoReconnect = wrapped;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#connectGoogleBtn,#pmkPersistentGoogleConnect');
    if (!button) return;
    loadConfig().then(active => {
      if (!active.enabled || !active.apiUrl) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      startPersistentAuthorization();
    });
  }, true);

  function boot() {
    installOverrides();
    updatePersistentUi();
    loadConfig().then(active => {
      updatePersistentUi();
      if (active.enabled && active.apiUrl && readSession()) refreshAccessToken({ quiet: !returnedWithSession });
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && readSession()) refreshAccessToken({ quiet: true });
    });
    globalThis.addEventListener('online', () => {
      if (readSession()) refreshAccessToken({ quiet: true });
    });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-view="settings"],.nav-settings')) setTimeout(updatePersistentUi, 0);
    }, true);
  }

  installOverrides();
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();

  globalThis.PMK_PERSISTENT_GOOGLE_AUTH = {
    connect: startPersistentAuthorization,
    refresh: refreshAccessToken,
    disconnect: disconnectPersistentGoogle,
    hasSession: () => Boolean(readSession()),
  };
})();
