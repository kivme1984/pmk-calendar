'use strict';

(() => {
  if (globalThis.PMK_GOOGLE_WORKER_READY_RESTORE_V82_48_4) return;
  globalThis.PMK_GOOGLE_WORKER_READY_RESTORE_V82_48_4 = true;

  const CONFIG_URL = './pmk-google-auth-config.json';
  const WORKER_TOKEN = 'pmk-google-worker-backend';
  const CONNECTED_KEY = 'pmk-google-connected';
  let config = null;
  let nativeGoogleRequest = typeof googleRequest === 'function' ? googleRequest : null;
  let nativeConnectGoogle = typeof connectGoogle === 'function' ? connectGoogle : null;
  let nativeReconnect = typeof scheduleGoogleAutoReconnect === 'function' ? scheduleGoogleAutoReconnect : null;
  let nativeUpdateUi = typeof updateConnectionUI === 'function' ? updateConnectionUI : null;

  const toast = (message, type = '') => typeof showToast === 'function' ? showToast(message, type) : console[type === 'error' ? 'error' : 'log'](message);
  const cleanKey = value => String(value || '').trim().replace(/^Bearer\s+/i, '').trim();

  function normalizeUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.origin : '';
    } catch { return ''; }
  }

  async function loadConfig(force = false) {
    if (config && !force) return config;
    const raw = await fetch(`${CONFIG_URL}?worker-ready=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}));
    config = {
      enabled: raw?.enabled === true,
      mode: String(raw?.mode || '').toLowerCase(),
      apiUrl: normalizeUrl(raw?.apiUrl),
      apiKeyStorageKey: String(raw?.apiKeyStorageKey || 'pmk_google_api_key'),
    };
    return config;
  }

  function isWorker(active = config) {
    return Boolean(active?.enabled && active?.apiUrl && (!active.mode || active.mode === 'worker'));
  }

  function keyName(active = config) { return active?.apiKeyStorageKey || 'pmk_google_api_key'; }
  function savedKey(active = config) { try { return cleanKey(localStorage.getItem(keyName(active)) || ''); } catch { return ''; } }
  function saveKey(value, active = config) { const key = cleanKey(value); if (key) { try { localStorage.setItem(keyName(active), key); } catch {} } return key; }

  function getKey(active = config) {
    let key = savedKey(active);
    if (!key) {
      key = prompt('Введите ключ подключения ПМК. Ключ сохранится только на этом устройстве.');
      if (!key) throw new Error('Ключ подключения не введён. Заявка не отправлена в Google Calendar.');
      key = saveKey(key, active);
    }
    return key;
  }

  function endpointFromPath(path) {
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
    throw new Error(`Worker Google path не поддержан: ${raw}`);
  }

  async function workerGoogleRequest(path, options = {}) {
    const active = await loadConfig();
    if (!isWorker(active)) {
      if (nativeGoogleRequest) return nativeGoogleRequest(path, options);
      throw new Error('Google Worker не настроен.');
    }
    const key = getKey(active);
    const response = await fetch(`${active.apiUrl.replace(/\/$/, '')}${endpointFromPath(path)}`, {
      method: options.method || 'GET',
      body: options.body,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-PMK-KEY': key,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 || payload.error === 'unauthorized') {
      try { localStorage.removeItem(active.apiKeyStorageKey); } catch {}
      updateWorkerUi();
      throw new Error('Ключ подключения не принят. Введите актуальный ключ.');
    }
    if (!response.ok || payload.ok === false) throw new Error(`Google Worker: ${payload.error || payload.message || `HTTP ${response.status}`}`);
    if ((options.method || 'GET').toUpperCase() === 'DELETE') return null;
    if (payload.raw) return payload.raw;
    if (payload.items) return { items: payload.items };
    if (payload.event) return payload.event;
    return payload;
  }

  async function connectWorkerGoogle() {
    const active = await loadConfig(true);
    if (!isWorker(active)) return nativeConnectGoogle?.();
    try {
      getKey(active);
      if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
      try { localStorage.setItem(CONNECTED_KEY, '1'); } catch {}
      updateWorkerUi();
      await refreshEvents?.();
      toast('Google Calendar подключён через Worker. Повторный вход Google не нужен.', 'success');
    } catch (error) { toast(error.message || 'Не удалось подключить Google Worker.', 'error'); }
  }

  function updateWorkerUi() {
    if (!isWorker()) return nativeUpdateUi?.();
    if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
    const hasKey = Boolean(savedKey());
    const badge = document.querySelector('#connectionBadge');
    if (badge) {
      badge.textContent = hasKey ? 'Google Worker подключён' : 'Нужен ключ ПМК';
      badge.className = `status-badge ${hasKey ? 'online' : 'offline'}`;
    }
    const button = document.querySelector('#connectGoogleBtn');
    if (button) button.textContent = hasKey ? 'Сменить ключ ПМК' : 'Ввести ключ ПМК';
  }

  function install() {
    googleRequest = workerGoogleRequest;
    connectGoogle = connectWorkerGoogle;
    scheduleGoogleAutoReconnect = () => {
      if (!isWorker()) return nativeReconnect?.();
      if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
      try { localStorage.setItem(CONNECTED_KEY, '1'); } catch {}
      updateWorkerUi();
      if (savedKey()) refreshEvents?.();
    };
    updateConnectionUI = () => { try { nativeUpdateUi?.(); } catch {}; updateWorkerUi(); };
    loadConfig(true).then(active => {
      if (isWorker(active)) {
        if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
        try { localStorage.setItem(CONNECTED_KEY, '1'); } catch {}
        updateWorkerUi();
        if (savedKey(active)) refreshEvents?.();
      }
    });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#connectGoogleBtn,#pmkPersistentGoogleConnect');
    if (!button || !isWorker()) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    connectWorkerGoogle();
  }, true);

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install, { once: true }) : install();
})();
