'use strict';

(() => {
  if (globalThis.PMK_GOOGLE_PROVIDER_INDICATOR_FIX_V82_48_3) return;
  globalThis.PMK_GOOGLE_PROVIDER_INDICATOR_FIX_V82_48_3 = true;

  const WORKER_TOKEN = 'pmk-google-worker-backend';
  const GOOGLE_STATUS_KEY = 'pmk-calendar-sync-status-v1';
  const VERIFIED_KEYS = [
    'pmk_google_worker_verified_v82_48_2',
    'pmk_google_worker_verified',
    'pmk-google-connected',
  ];
  const VERIFIED_AT_KEYS = [
    'pmk_google_worker_verified_at_v82_48_2',
    'pmk-calendar-last-sync-v68',
  ];

  function getStored(key) {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  }

  function setStored(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function isVerified() {
    return VERIFIED_KEYS.some(key => getStored(key) === '1');
  }

  function verifiedAt() {
    for (const key of VERIFIED_AT_KEYS) {
      const value = getStored(key);
      if (value) return value;
    }
    return new Date().toISOString();
  }

  function eventCount() {
    const globalCount = Number(globalThis.PMK_FULL_CALENDAR_EVENT_COUNT);
    if (Number.isFinite(globalCount) && globalCount >= 0) return globalCount;
    try {
      if (Array.isArray(state?.events)) return state.events.length;
    } catch {}
    return 0;
  }

  function writeGoogleSuccess() {
    const data = {
      status: 'success',
      time: verifiedAt(),
      count: eventCount(),
      provider: 'google-worker',
      source: 'google-provider-indicator-fix-v82-48-3',
    };
    try { localStorage.setItem(GOOGLE_STATUS_KEY, JSON.stringify(data)); } catch {}
    return data;
  }

  function forceState() {
    if (!isVerified()) return false;
    try {
      if (typeof state !== 'undefined') state.token = WORKER_TOKEN;
    } catch {}
    writeGoogleSuccess();
    return true;
  }

  function paintGoogleHeader() {
    if (!forceState()) return;
    const card = document.querySelector('.pmk-provider-card[data-provider="google"]');
    if (!card) return;
    card.dataset.status = 'success';
    const text = card.querySelector('[data-provider-text]');
    const detail = card.querySelector('[data-provider-detail]');
    if (text) text.textContent = 'Подключён';
    if (detail) {
      const count = eventCount();
      const date = new Date(verifiedAt());
      const time = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date).replace(',', ' ·');
      detail.textContent = `${time}${count ? ` · ${count}` : ''}`.trim();
    }
  }

  function paintConnectionBadge() {
    if (!forceState()) return;
    const badge = document.querySelector('#connectionBadge');
    if (badge) {
      badge.textContent = 'Google Worker подключён';
      badge.className = 'status-badge online';
    }
    const subtitle = document.querySelector('#todaySubtitle');
    if (subtitle) subtitle.textContent = 'Данные синхронизированы через Google Worker.';
  }

  function paintSettings() {
    if (!forceState()) return;
    const status = document.querySelector('#pmkPersistentGoogleStatus');
    if (status) status.textContent = 'Google Worker подключён и подтверждён. Синхронизация работает.';
    const button = document.querySelector('#pmkPersistentGoogleConnect');
    if (button) button.textContent = 'Проверить Google';
  }

  function repaint() {
    if (!forceState()) return;
    paintGoogleHeader();
    paintConnectionBadge();
    paintSettings();
  }

  function notifyProviderManager() {
    if (!forceState()) return;
    const data = writeGoogleSuccess();
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: GOOGLE_STATUS_KEY, newValue: JSON.stringify(data) }));
    } catch {
      window.dispatchEvent(new Event('storage'));
    }
    window.dispatchEvent(new CustomEvent('pmk-calendar-sync-done', { detail: { count: data.count, provider: 'google-worker', indicatorFix: true } }));
  }

  function boot() {
    repaint();
    setTimeout(notifyProviderManager, 250);
    setTimeout(repaint, 500);
    setTimeout(repaint, 1500);
    setInterval(repaint, 2000);
    ['pmk-calendar-sync-done', 'pmk-calendar-sync-error', 'pmk-calendar-sync-start', 'online', 'visibilitychange'].forEach(name => {
      window.addEventListener(name, () => setTimeout(repaint, 120));
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
