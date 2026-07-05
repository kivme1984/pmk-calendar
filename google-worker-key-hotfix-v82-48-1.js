'use strict';

(() => {
  if (globalThis.PMK_GOOGLE_WORKER_KEY_HOTFIX_V82_48_1) return;
  globalThis.PMK_GOOGLE_WORKER_KEY_HOTFIX_V82_48_1 = true;

  const CONFIG_URL = './pmk-google-auth-config.json';
  const WORKER_TOKEN = 'pmk-google-worker-backend';
  const DEFAULT_KEY_NAME = 'pmk_google_api_key';
  const VERIFIED_KEY = 'pmk_google_worker_verified';
  const CONNECTED_KEY = 'pmk-google-connected';
  let config = null;

  const nativeGoogleRequest = typeof googleRequest === 'function' ? googleRequest : null;
  const nativeConnectGoogle = typeof connectGoogle === 'function' ? connectGoogle : null;

  function toast(message, type = '') {
    if (typeof showToast === 'function') showToast(message, type);
    else console[type === 'error' ? 'error' : 'log'](message);
  }

  function normalizeApiUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.origin : '';
    } catch { return ''; }
  }

  function normalizeKey(value) {
    return String(value || '').trim().replace(/^Bearer\s+/i, '').replace(/^['"]|['"]$/g, '').trim();
  }

  async function loadConfig(force = false) {
    if (config && !force) return config;
    const raw = await fetch(`${CONFIG_URL}?hotfix=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}));
    config = {
      enabled: raw?.enabled === true,
      mode: String(raw?.mode || '').toLowerCase(),
      apiUrl: normalizeApiUrl(raw?.apiUrl),
      apiKeyStorageKey: String(raw?.apiKeyStorageKey || DEFAULT_KEY_NAME),
    };
    return config;
  }

  function isWorkerConfig(active = config) {
    return Boolean(active?.enabled && active?.apiUrl && (!active.mode || active.mode === 'worker'));
  }

  function keyName(active = config) {
    return active?.apiKeyStorageKey || DEFAULT_KEY_NAME;
  }

  function savedKey(active = config) {
    try { return normalizeKey(localStorage.getItem(keyName(active)) || ''); } catch { return ''; }
  }

  function saveKey(key, active = config) {
    const clean = normalizeKey(key);
    if (!clean) return '';
    try { localStorage.setItem(keyName(active), clean); } catch {}
    return clean;
  }

  function getKey(active = config, forcePrompt = false) {
    let key = forcePrompt ? '' : savedKey(active);
    if (!key) {
      key = prompt('Введите ключ ПМК для Google Worker. Можно вставить PMK_API_KEY или BRIDGE_KEY.');
      if (!key) throw new Error('Ключ ПМК не введён.');
      key = saveKey(key, active);
      try { localStorage.removeItem(VERIFIED_KEY); } catch {}
    }
    return key;
  }

  function parsePath(path) {
    const raw = String(path || '');
    const [pathname, search = ''] = raw.split('?');
    const params = new URLSearchParams(search);
    const cleanPath = pathname.replace(/^https:\/\/www\.googleapis\.com\/calendar\/v3/i, '');
    const list = cleanPath.match(/^\/calendars\/([^/]+)\/events$/);
    const event = cleanPath.match(/^\/calendars\/([^/]+)\/events\/([^/]+)$/);
    if (list) {
      params.set('calendarId', decodeURIComponent(list[1]));
      return `/api/events?${params.toString()}`;
    }
    if (event) {
      params.set('calendarId', decodeURIComponent(event[1]));
      return `/api/events/${encodeURIComponent(decodeURIComponent(event[2]))}?${params.toString()}`;
    }
    throw new Error(`Worker Google path не поддержан: ${raw}`);
  }

  async function requestWorker(path, options = {}) {
    const active = await loadConfig();
    if (!isWorkerConfig(active)) {
      if (nativeGoogleRequest) return nativeGoogleRequest(path, options);
      throw new Error('Google Worker не настроен.');
    }
    const endpoint = parsePath(path);
    const key = getKey(active, false);
    const response = await fetch(`${active.apiUrl.replace(/\/$/, '')}${endpoint}`, {
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
    const payload = await response.json().catch(() => ({}));

    if (response.status === 401 || payload.error === 'unauthorized') {
      try { localStorage.removeItem(VERIFIED_KEY); } catch {}
      updateUi();
      throw new Error('Ключ сохранён, но Worker его не принял. Проверьте, что это именно PMK_API_KEY / BRIDGE_KEY для Google Worker, а не PMK_SYNC_TOKEN.');
    }
    if (!response.ok || payload.ok === false) {
      const detail = payload.error || payload.message || `HTTP ${response.status}`;
      try { localStorage.removeItem(VERIFIED_KEY); } catch {}
      updateUi();
      throw new Error(`Google Worker: ${detail}`);
    }

    try {
      localStorage.setItem(VERIFIED_KEY, '1');
      localStorage.setItem(CONNECTED_KEY, '1');
    } catch {}
    updateUi();

    if ((options.method || 'GET').toUpperCase() === 'DELETE') return null;
    if (payload.raw) return payload.raw;
    if (payload.items) return { items: payload.items };
    if (payload.event) return payload.event;
    return payload;
  }

  async function connectWorker(forcePrompt = false) {
    const active = await loadConfig(true);
    if (!isWorkerConfig(active)) return nativeConnectGoogle?.();
    try {
      getKey(active, forcePrompt);
      if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
      updateUi();
      await refreshEvents?.();
      toast('Google Worker проверен. Синхронизация работает.', 'success');
    } catch (error) {
      updateUi();
      toast(error.message || 'Не удалось проверить Google Worker.', 'error');
    }
  }

  function updateUi() {
    const active = config;
    const hasKey = Boolean(savedKey(active));
    let verified = false;
    try { verified = localStorage.getItem(VERIFIED_KEY) === '1'; } catch {}
    if (typeof state !== 'undefined' && isWorkerConfig(active)) state.token = WORKER_TOKEN;

    const badge = document.querySelector('#connectionBadge');
    if (badge && isWorkerConfig(active)) {
      badge.textContent = verified ? 'Google Worker подключён' : (hasKey ? 'Ключ ПМК сохранён' : 'Нужен ключ ПМК');
      badge.className = `status-badge ${verified ? 'online' : 'offline'}`;
    }
    const connectButton = document.querySelector('#connectGoogleBtn');
    if (connectButton && isWorkerConfig(active)) connectButton.textContent = hasKey ? 'Сменить ключ ПМК' : 'Ввести ключ ПМК';
    const card = document.querySelector('#pmkPersistentGoogleCard');
    if (card) {
      const status = card.querySelector('#pmkPersistentGoogleStatus');
      const connect = card.querySelector('#pmkPersistentGoogleConnect');
      const reset = card.querySelector('#pmkPersistentGoogleReset');
      if (status) status.textContent = verified
        ? 'Google Worker проверен. Повторный вход в Google не нужен.'
        : (hasKey ? 'Ключ сохранён. Нажмите «Проверить подключение» или синхронизацию.' : 'Введите PMK_API_KEY / BRIDGE_KEY для Google Worker.');
      if (connect) connect.textContent = hasKey ? 'Проверить подключение' : 'Ввести ключ ПМК';
      if (reset) reset.hidden = !hasKey;
      card.classList.toggle('is-connected', verified);
    }
  }

  function install() {
    googleRequest = requestWorker;
    connectGoogle = () => connectWorker(true);
    globalThis.PMK_GOOGLE_WORKER_KEY_HOTFIX = { connect: () => connectWorker(true), refresh: () => refreshEvents?.(), updateUi };
    loadConfig(true).then(active => {
      if (isWorkerConfig(active)) {
        if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
        updateUi();
      }
    });
  }

  window.addEventListener('click', event => {
    const button = event.target.closest('#connectGoogleBtn,#pmkPersistentGoogleConnect,#pmkPersistentGoogleReset');
    if (!button || !isWorkerConfig()) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (button.id === 'pmkPersistentGoogleReset') {
      try {
        localStorage.removeItem(keyName());
        localStorage.removeItem(VERIFIED_KEY);
      } catch {}
      updateUi();
      toast('Ключ удалён. Введите новый ключ ПМК.', 'success');
      return;
    }
    connectWorker(true);
  }, true);

  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateUi(); });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install, { once: true }) : install();
})();
