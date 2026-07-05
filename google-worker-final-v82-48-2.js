'use strict';

(() => {
  if (globalThis.PMK_GOOGLE_WORKER_FINAL_V82_48_2) return;
  globalThis.PMK_GOOGLE_WORKER_FINAL_V82_48_2 = true;

  const CONFIG_URL = './pmk-google-auth-config.json';
  const WORKER_TOKEN = 'pmk-google-worker-backend';
  const KEY_NAME_DEFAULT = 'pmk_google_api_key';
  const VERIFIED_KEY = 'pmk_google_worker_verified_v82_48_2';
  const VERIFIED_AT_KEY = 'pmk_google_worker_verified_at_v82_48_2';
  const LAST_ERROR_KEY = 'pmk_google_worker_last_error_v82_48_2';
  const CONNECTED_KEY = 'pmk-google-connected';
  const TOKEN_STORAGE_KEY = 'pmk-google-token';
  const FETCH_TIMEOUT = 18000;

  const native = {
    googleRequest: typeof googleRequest === 'function' ? googleRequest : null,
    connectGoogle: typeof connectGoogle === 'function' ? connectGoogle : null,
    updateConnectionUI: typeof updateConnectionUI === 'function' ? updateConnectionUI : null,
    refreshEvents: typeof refreshEvents === 'function' ? refreshEvents : null,
    scheduleGoogleAutoReconnect: typeof scheduleGoogleAutoReconnect === 'function' ? scheduleGoogleAutoReconnect : null,
  };

  let config = null;
  let verifying = null;
  let refreshing = false;

  function toast(message, type = '') {
    if (typeof showToast === 'function') showToast(message, type);
    else console[type === 'error' ? 'error' : 'log'](message);
  }

  function normalizeApiUrl(value) {
    try {
      const url = new URL(String(value || '').trim());
      return url.protocol === 'https:' ? url.origin : '';
    } catch { return ''; }
  }

  function normalizeKey(value) {
    return String(value || '')
      .trim()
      .replace(/^Bearer\s+/i, '')
      .replace(/^['"]|['"]$/g, '')
      .trim();
  }

  async function loadConfig(force = false) {
    if (config && !force) return config;
    const raw = await fetch(`${CONFIG_URL}?final=${Date.now()}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : {})
      .catch(() => ({}));
    config = {
      enabled: raw?.enabled === true,
      mode: String(raw?.mode || '').toLowerCase(),
      apiUrl: normalizeApiUrl(raw?.apiUrl),
      apiKeyStorageKey: String(raw?.apiKeyStorageKey || KEY_NAME_DEFAULT),
      label: String(raw?.label || 'Google Calendar через Worker'),
    };
    return config;
  }

  function isWorker(active = config) {
    return Boolean(active?.enabled && active?.apiUrl && (!active.mode || active.mode === 'worker'));
  }

  function keyName(active = config) {
    return active?.apiKeyStorageKey || KEY_NAME_DEFAULT;
  }

  function getSavedKey(active = config) {
    try { return normalizeKey(localStorage.getItem(keyName(active)) || ''); }
    catch { return ''; }
  }

  function setSavedKey(value, active = config) {
    const key = normalizeKey(value);
    if (!key) return '';
    try { localStorage.setItem(keyName(active), key); } catch {}
    return key;
  }

  function clearVerified() {
    try {
      localStorage.removeItem(VERIFIED_KEY);
      localStorage.removeItem(VERIFIED_AT_KEY);
      localStorage.removeItem(CONNECTED_KEY);
      if (state?.token === WORKER_TOKEN) state.token = null;
    } catch {}
  }

  function setVerified() {
    try {
      localStorage.setItem(VERIFIED_KEY, '1');
      localStorage.setItem(VERIFIED_AT_KEY, new Date().toISOString());
      localStorage.removeItem(LAST_ERROR_KEY);
      localStorage.setItem(CONNECTED_KEY, '1');
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
    if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
  }

  function isVerified() {
    try { return localStorage.getItem(VERIFIED_KEY) === '1'; }
    catch { return false; }
  }

  function setLastError(message) {
    try { localStorage.setItem(LAST_ERROR_KEY, String(message || 'Ошибка Google Worker')); } catch {}
  }

  function lastError() {
    try { return localStorage.getItem(LAST_ERROR_KEY) || ''; }
    catch { return ''; }
  }

  function ensureTokenState() {
    if (!isWorker()) return;
    if (isVerified()) {
      if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
    } else if (typeof state !== 'undefined' && state.token === WORKER_TOKEN) {
      state.token = null;
    }
  }

  function endpointFromGooglePath(path) {
    const raw = String(path || '');
    const [pathname, search = ''] = raw.split('?');
    const params = new URLSearchParams(search);
    const clean = pathname.replace(/^https:\/\/www\.googleapis\.com\/calendar\/v3/i, '');
    const list = clean.match(/^\/calendars\/([^/]+)\/events$/);
    const event = clean.match(/^\/calendars\/([^/]+)\/events\/([^/]+)$/);
    if (list) {
      params.set('calendarId', decodeURIComponent(list[1]));
      return `/api/events?${params.toString()}`;
    }
    if (event) {
      params.set('calendarId', decodeURIComponent(event[1]));
      return `/api/events/${encodeURIComponent(decodeURIComponent(event[2]))}?${params.toString()}`;
    }
    throw new Error(`Google Worker не поддерживает путь: ${raw}`);
  }

  async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Google Worker не ответил за 18 секунд. Проверьте адрес Worker и интернет.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function requestGoogle(path, options = {}) {
    const active = await loadConfig();
    if (!isWorker(active)) {
      if (native.googleRequest) return native.googleRequest(path, options);
      throw new Error('Google Worker не настроен.');
    }

    const key = getSavedKey(active) || askKey(active);
    const endpoint = endpointFromGooglePath(path);
    const url = `${active.apiUrl.replace(/\/$/, '')}${endpoint}`;
    let response;
    try {
      response = await fetchWithTimeout(url, {
        method: options.method || 'GET',
        body: options.body,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'X-PMK-KEY': key,
          'X-Bridge-Key': key,
          'Authorization': `Bearer ${key}`,
          ...(options.headers || {}),
        },
      });
    } catch (error) {
      clearVerified();
      setLastError(error.message || 'Google Worker недоступен.');
      updateUi();
      throw error;
    }

    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; }
    catch { payload = text ? { error: text } : {}; }

    if (response.status === 401 || response.status === 403 || payload.error === 'unauthorized') {
      clearVerified();
      const message = 'Ключ сохранён, но Worker его не принял. Нужен именно PMK_API_KEY / BRIDGE_KEY для Google Worker, не PMK_SYNC_TOKEN от Яндекса.';
      setLastError(message);
      updateUi();
      throw new Error(message);
    }

    if (!response.ok || payload.ok === false) {
      clearVerified();
      const detail = payload.error || payload.message || `HTTP ${response.status}`;
      const message = `Google Worker: ${detail}`;
      setLastError(message);
      updateUi();
      throw new Error(message);
    }

    setVerified();
    updateUi();

    if ((options.method || 'GET').toUpperCase() === 'DELETE') return null;
    if (payload.raw) return payload.raw;
    if (payload.items) return { items: payload.items };
    if (payload.event) return payload.event;
    return payload;
  }

  function askKey(active = config) {
    const value = prompt('Введите ключ ПМК для Google Worker. Нужен PMK_API_KEY / BRIDGE_KEY. Не используйте PMK_SYNC_TOKEN от Яндекса.');
    if (!value) throw new Error('Ключ ПМК не введён.');
    clearVerified();
    return setSavedKey(value, active);
  }

  async function verifyGoogle(forcePrompt = false, options = {}) {
    if (verifying) return verifying;
    verifying = (async () => {
      const active = await loadConfig(true);
      if (!isWorker(active)) {
        if (native.connectGoogle) return native.connectGoogle();
        throw new Error('Google Worker не настроен.');
      }
      if (forcePrompt || !getSavedKey(active)) askKey(active);
      const start = new Date();
      start.setUTCDate(start.getUTCDate() - 30);
      const params = new URLSearchParams({ timeMin: start.toISOString(), maxResults: '1', singleEvents: 'true', orderBy: 'startTime' });
      const calendarId = encodeURIComponent(state?.settings?.calendarId || 'primary');
      await requestGoogle(`/calendars/${calendarId}/events?${params.toString()}`, { method: 'GET' });
      setVerified();
      updateUi();
      if (!options.silent) toast('Google Worker подключён и проверен.', 'success');
      if (options.refresh !== false && typeof refreshEvents === 'function') setTimeout(() => refreshEvents(), 0);
      return true;
    })().finally(() => { verifying = null; });
    return verifying;
  }

  async function refreshWithVerifiedGoogle() {
    if (refreshing) return native.refreshEvents?.();
    refreshing = true;
    try {
      await loadConfig();
      ensureTokenState();
      if (isWorker() && getSavedKey() && !isVerified()) {
        try { await verifyGoogle(false, { silent: true, refresh: false }); }
        catch (error) { toast(error.message, 'error'); }
      }
      ensureTokenState();
      return await native.refreshEvents?.();
    } finally {
      refreshing = false;
      updateUi();
    }
  }

  function injectSettingsCard() {
    const grid = document.querySelector('#view-settings .settings-grid');
    if (!grid || !isWorker()) return;
    let card = document.querySelector('#pmkPersistentGoogleCard');
    if (!card) {
      card = document.createElement('section');
      card.id = 'pmkPersistentGoogleCard';
      card.className = 'form-card pmk-persistent-google-card is-worker';
      card.innerHTML = `
        <h2>Google без постоянного входа</h2>
        <p id="pmkPersistentGoogleStatus"></p>
        <div class="pmk-persistent-google-actions" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          <button type="button" id="pmkPersistentGoogleConnect" class="button button-primary">Ввести ключ ПМК</button>
          <button type="button" id="pmkPersistentGoogleReset" class="button button-secondary">Сменить ключ</button>
        </div>
        <p class="helper-text">Для этого блока нужен PMK_API_KEY / BRIDGE_KEY от Google Worker. Ключ Яндекс PMK_SYNC_TOKEN сюда не подходит.</p>`;
      grid.prepend(card);
    }
  }

  function updateUi() {
    if (!config) return;
    ensureTokenState();
    injectSettingsCard();
    const hasKey = Boolean(getSavedKey());
    const verified = isVerified();
    const error = lastError();

    const badge = document.querySelector('#connectionBadge');
    if (badge && isWorker()) {
      badge.textContent = verified ? 'Google Worker подключён' : (hasKey ? 'Google: ключ не проверен' : 'Нужен ключ ПМК');
      badge.className = `status-badge ${verified ? 'online' : 'offline'}`;
    }

    const headerButton = document.querySelector('#connectGoogleBtn');
    if (headerButton && isWorker()) headerButton.textContent = verified ? 'Google подключён' : (hasKey ? 'Проверить Google' : 'Ввести ключ ПМК');

    const card = document.querySelector('#pmkPersistentGoogleCard');
    if (card) {
      const status = card.querySelector('#pmkPersistentGoogleStatus');
      const connect = card.querySelector('#pmkPersistentGoogleConnect');
      const reset = card.querySelector('#pmkPersistentGoogleReset');
      if (status) {
        status.textContent = verified
          ? 'Google Worker проверен. Заявки должны синхронизироваться без повторного входа.'
          : (hasKey ? `Ключ сохранён, но Google ещё не подтверждён.${error ? ' Последняя ошибка: ' + error : ' Нажмите «Проверить Google». '}` : 'Введите PMK_API_KEY / BRIDGE_KEY для Google Worker.');
      }
      if (connect) connect.textContent = verified ? 'Проверить Google' : (hasKey ? 'Проверить Google' : 'Ввести ключ ПМК');
      if (reset) reset.hidden = !hasKey;
      card.classList.toggle('is-connected', verified);
    }

    const subtitle = document.querySelector('#todaySubtitle');
    if (subtitle && isWorker() && !verified && hasKey) {
      subtitle.textContent = 'Ключ ПМК сохранён, но Google Worker ещё не подтверждён. Нажмите «Проверить Google» в настройках.';
    }
  }

  function installOverrides() {
    googleRequest = requestGoogle;
    connectGoogle = () => verifyGoogle(true, { refresh: true });
    scheduleGoogleAutoReconnect = () => {
      loadConfig(true).then(() => {
        ensureTokenState();
        if (isWorker() && getSavedKey() && isVerified()) refreshEvents?.();
        updateUi();
      });
    };
    updateConnectionUI = function updateConnectionUIFinalGoogleWorker() {
      try { native.updateConnectionUI?.(); } catch {}
      updateUi();
    };
    refreshEvents = refreshWithVerifiedGoogle;
  }

  function bindClicks() {
    document.addEventListener('click', event => {
      const target = event.target.closest('#connectGoogleBtn,#pmkPersistentGoogleConnect,#pmkPersistentGoogleReset');
      if (!target || !isWorker()) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (target.id === 'pmkPersistentGoogleReset') {
        try {
          localStorage.removeItem(keyName());
          localStorage.removeItem(VERIFIED_KEY);
          localStorage.removeItem(VERIFIED_AT_KEY);
          localStorage.removeItem(LAST_ERROR_KEY);
          localStorage.removeItem(CONNECTED_KEY);
        } catch {}
        clearVerified();
        updateUi();
        toast('Ключ ПМК удалён. Введите новый ключ.', 'success');
        return;
      }
      verifyGoogle(target.id !== 'pmkPersistentGoogleConnect' ? false : !getSavedKey(), { refresh: true });
    }, true);
  }

  function updateVersionLabel() {
    const value = document.querySelector('#settingsVersionValue');
    const release = document.querySelector('#settingsVersionRelease');
    if (value) value.textContent = 'v82.48.2';
    if (release) release.textContent = 'Google Worker final fix · 2026-07-05';
  }

  async function boot() {
    installOverrides();
    bindClicks();
    await loadConfig(true);
    ensureTokenState();
    updateUi();
    updateVersionLabel();
    setInterval(() => { updateUi(); updateVersionLabel(); }, 1500);
  }

  const api = {
    connect: () => verifyGoogle(true, { refresh: true }),
    verify: () => verifyGoogle(false, { refresh: true }),
    request: requestGoogle,
    updateUi,
    reset: () => {
      try {
        localStorage.removeItem(keyName());
        localStorage.removeItem(VERIFIED_KEY);
        localStorage.removeItem(VERIFIED_AT_KEY);
        localStorage.removeItem(LAST_ERROR_KEY);
      } catch {}
      clearVerified();
      updateUi();
    },
  };
  globalThis.PMK_GOOGLE_WORKER_FINAL = api;
  globalThis.PMK_PERSISTENT_GOOGLE_AUTH = api;

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
