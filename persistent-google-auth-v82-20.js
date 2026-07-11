'use strict';

(() => {
  if (globalThis.PMK_PERSISTENT_GOOGLE_OAUTH_V82_21_6) return;
  globalThis.PMK_PERSISTENT_GOOGLE_OAUTH_V82_21_6 = true;
  globalThis.PMK_PERSISTENT_GOOGLE_AUTH_V82_20 = true;

  const CONFIG_URL = './pmk-google-auth-config.json';
  const SESSION_KEY = 'pmk-google-persistent-session-v1';
  const SESSION_EXP_KEY = 'pmk-google-persistent-session-exp-v1';
  const DEVICE_KEY = 'pmk-google-device-id-v1';
  const RETURN_VIEW_KEY = 'pmk-google-return-view-v1';
  const CONNECTED_KEY = 'pmk-google-connected';
  let config = null;
  let loadingConfig = null;
  let refreshing = null;
  let refreshTimer = 0;

  const native = {
    connectGoogle: typeof connectGoogle === 'function' ? connectGoogle : null,
    scheduleGoogleAutoReconnect: typeof scheduleGoogleAutoReconnect === 'function' ? scheduleGoogleAutoReconnect : null,
    updateConnectionUI: typeof updateConnectionUI === 'function' ? updateConnectionUI : null,
    refreshEvents: typeof refreshEvents === 'function' ? refreshEvents : null,
  };

  function toast(message, type = '') {
    if (typeof showToast === 'function') showToast(message, type);
    else console[type === 'error' ? 'error' : 'log'](message);
  }

  function readSession() {
    try { return localStorage.getItem(SESSION_KEY) || ''; }
    catch { return ''; }
  }

  function writeSession(value, expiresAt = 0) {
    try {
      if (value) localStorage.setItem(SESSION_KEY, value);
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
      const url = new URL(String(value || '').trim());
      return url.protocol === 'https:' ? url.origin : '';
    } catch { return ''; }
  }

  async function loadConfig(force = false) {
    if (config && !force) return config;
    if (loadingConfig && !force) return loadingConfig;
    loadingConfig = fetch(`${CONFIG_URL}?oauth=${Date.now()}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : {})
      .catch(() => ({}))
      .then(raw => {
        config = {
          enabled: raw?.enabled === true,
          apiUrl: normalizeApiUrl(raw?.apiUrl),
          label: String(raw?.label || 'Google без повторного входа'),
        };
        return config;
      })
      .finally(() => { loadingConfig = null; });
    return loadingConfig;
  }

  function parseAuthReturn() {
    const raw = String(location.hash || '').replace(/^#/, '');
    if (!raw.startsWith('pmk-google-')) return false;
    const params = new URLSearchParams(raw);
    const session = params.get('pmk-google-auth') || '';
    const expiresAt = Number(params.get('pmk-google-auth-exp') || 0);
    const error = params.get('pmk-google-error') || '';
    if (session) writeSession(session, expiresAt);
    let returnView = 'day';
    try { returnView = localStorage.getItem(RETURN_VIEW_KEY) || 'day'; } catch {}
    if (!/^[a-z-]+$/i.test(returnView)) returnView = 'day';
    history.replaceState(history.state || {}, '', `${location.pathname}${location.search}#${returnView}`);
    if (error) setTimeout(() => toast(`Google не подключён: ${error}`, 'error'), 0);
    return Boolean(session);
  }

  const returnedWithSession = parseAuthReturn();

  function currentReturnUrl() {
    const url = new URL('./', location.href);
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  function rememberView() {
    try {
      const current = typeof state !== 'undefined' && state.currentView ? state.currentView : 'day';
      localStorage.setItem(RETURN_VIEW_KEY, current);
    } catch {}
  }

  async function startAuthorization() {
    const active = await loadConfig(true);
    if (!active.enabled || !active.apiUrl) {
      if (native.connectGoogle) return native.connectGoogle();
      return toast('Сервер постоянного входа Google не настроен.', 'error');
    }
    rememberView();
    const target = new URL(`${active.apiUrl}/auth/start`);
    target.searchParams.set('return_to', currentReturnUrl());
    target.searchParams.set('device_id', deviceId());
    location.assign(target.toString());
  }

  function scheduleRefresh(expiresIn = 3600) {
    clearTimeout(refreshTimer);
    const delay = Math.max(300, Number(expiresIn || 3600) - 300) * 1000;
    refreshTimer = setTimeout(() => refreshAccessToken({ quiet: true, refresh: false }), delay);
  }

  async function refreshAccessToken(options = {}) {
    if (refreshing) return refreshing;
    const session = readSession();
    if (!session) return false;

    refreshing = (async () => {
      const active = await loadConfig(options.forceConfig === true);
      if (!active.enabled || !active.apiUrl) return false;
      try {
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
            try { localStorage.removeItem(CONNECTED_KEY); } catch {}
            updateUi();
            if (!options.quiet) toast('Нужно один раз заново подключить Google.', 'error');
          } else if (!options.quiet) {
            toast(`Google Worker: ${payload.error || response.status}`, 'error');
          }
          return false;
        }

        if (typeof state !== 'undefined') {
          state.token = payload.access_token;
          state.autoReconnectTried = true;
          state.silentReconnect = false;
        }
        if (typeof saveToken === 'function') saveToken(payload);
        try { localStorage.setItem(CONNECTED_KEY, '1'); } catch {}
        scheduleRefresh(payload.expires_in);
        try { native.updateConnectionUI?.(); } catch {}
        updateUi();
        if (options.refresh !== false) await native.refreshEvents?.();
        if (!options.quiet) toast('Google подключён постоянно.', 'success');
        return true;
      } catch (error) {
        console.warn('PMK persistent Google refresh failed', error);
        if (!options.quiet) toast('Не удалось связаться с Google Worker.', 'error');
        return false;
      }
    })().finally(() => { refreshing = null; });

    return refreshing;
  }

  async function disconnect() {
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
    try { localStorage.removeItem(CONNECTED_KEY); } catch {}
    try { native.updateConnectionUI?.(); } catch {}
    updateUi();
    toast('Постоянное подключение Google отключено.', 'success');
  }

  function ensureSettingsCard() {
    if (!config?.enabled || !config?.apiUrl) {
      document.querySelector('#pmkPersistentGoogleCard')?.remove();
      return null;
    }
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
          <button type="button" id="pmkPersistentGoogleConnect" class="button button-primary">Подключить Google один раз</button>
          <button type="button" id="pmkPersistentGoogleDisconnect" class="button button-secondary">Отключить</button>
        </div>`;
      grid.prepend(card);
    }
    return card;
  }

  function updateUi() {
    const hasSession = Boolean(readSession());
    const hasAccess = Boolean(typeof state !== 'undefined' && state.token);
    const badge = document.querySelector('#connectionBadge');
    if (badge && config?.enabled && config?.apiUrl) {
      badge.textContent = hasAccess ? 'Google подключён' : (hasSession ? 'Google: восстановление…' : 'Google не подключён');
      badge.className = `status-badge ${hasAccess ? 'online' : 'offline'}`;
    }
    const headerButton = document.querySelector('#connectGoogleBtn');
    if (headerButton && config?.enabled && config?.apiUrl) {
      headerButton.textContent = hasSession ? 'Переподключить Google' : 'Подключить Google';
    }
    const card = ensureSettingsCard();
    if (!card) return;
    const status = card.querySelector('#pmkPersistentGoogleStatus');
    const connect = card.querySelector('#pmkPersistentGoogleConnect');
    const disconnectButton = card.querySelector('#pmkPersistentGoogleDisconnect');
    if (status) status.textContent = hasAccess
      ? 'Подключено постоянно. После закрытия приложения вход повторять не нужно.'
      : (hasSession ? 'Сессия сохранена. Восстанавливаем доступ автоматически.' : 'Нажмите один раз и войдите в Google. PMK API KEY больше не нужен.');
    if (connect) connect.textContent = hasSession ? 'Переподключить аккаунт' : 'Подключить Google один раз';
    if (disconnectButton) disconnectButton.hidden = !hasSession;
    card.classList.toggle('is-connected', hasSession);
  }

  function installOverrides() {
    globalThis.connectGoogle = startAuthorization;
    globalThis.scheduleGoogleAutoReconnect = () => {
      if (readSession()) refreshAccessToken({ quiet: true, refresh: true });
      else native.scheduleGoogleAutoReconnect?.();
    };
    globalThis.updateConnectionUI = function updateConnectionUIPersistentOAuth() {
      try { native.updateConnectionUI?.(); } catch {}
      updateUi();
    };
  }

  function bindClicks() {
    document.addEventListener('click', event => {
      const target = event.target.closest('#connectGoogleBtn,#pmkPersistentGoogleConnect,#pmkPersistentGoogleDisconnect');
      if (!target || !config?.enabled || !config?.apiUrl) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (target.id === 'pmkPersistentGoogleDisconnect') disconnect();
      else startAuthorization();
    }, true);
  }

  async function boot() {
    installOverrides();
    bindClicks();
    await loadConfig(true);
    updateUi();
    if (readSession()) await refreshAccessToken({ quiet: !returnedWithSession, refresh: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && readSession()) refreshAccessToken({ quiet: true, refresh: true });
    });
    globalThis.addEventListener('online', () => {
      if (readSession()) refreshAccessToken({ quiet: true, refresh: true });
    });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-view="settings"],.nav-settings')) setTimeout(updateUi, 0);
    }, true);
  }

  globalThis.PMK_PERSISTENT_GOOGLE_AUTH = {
    connect: startAuthorization,
    refresh: refreshAccessToken,
    disconnect,
    hasSession: () => Boolean(readSession()),
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
