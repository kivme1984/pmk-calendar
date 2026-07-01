'use strict';

(() => {
  if (globalThis.PMK_DAY_ROUTE_HEADER_V82_4) return;
  globalThis.PMK_DAY_ROUTE_HEADER_V82_4 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let scheduled = false;
  let observer = null;

  function readJson(key, fallback = {}) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function selectedDateKey() {
    if (typeof state !== 'undefined' && state.selectedDayKey) return state.selectedDayKey;
    if (typeof businessTodayKey === 'function') return businessTodayKey();
    return new Date().toISOString().slice(0, 10);
  }

  function districtsForDate(dateKey) {
    const date = typeof dateKeyForDisplay === 'function'
      ? dateKeyForDisplay(dateKey)
      : new Date(`${dateKey}T12:00:00Z`);
    const weekday = date.getUTCDay();
    let rows = [];
    try {
      rows = typeof PICKUP_SCHEDULE !== 'undefined' ? (PICKUP_SCHEDULE[weekday] || []) : [];
    } catch {
      rows = [];
    }
    if (rows.length) return [...new Set(rows.map(row => String(row?.[2] || '').trim()).filter(Boolean))];
    const fallback = {
      1: ['Автозаводский', 'Ленинский', 'Канавинский'],
      2: ['Московский', 'Сормовский'],
      3: ['Приокский', 'Советский', 'Нижегородский'],
      4: ['Автозаводский', 'Ленинский', 'Канавинский'],
      5: ['Московский', 'Сормовский'],
      6: ['Приокский', 'Советский', 'Нижегородский'],
    };
    return fallback[weekday] || [];
  }

  function applyRouteSubtitle() {
    const subtitle = $('#todaySubtitle');
    if (!subtitle) return;
    const dateKey = selectedDateKey();
    const districts = districtsForDate(dateKey);
    const next = districts.length
      ? `Районы по графику: ${districts.join(', ')}.`
      : 'Выходной: маршрутов забора и доставки нет.';
    if (subtitle.textContent !== next) subtitle.textContent = next;
    subtitle.classList.add('pmk-route-subtitle-v82-4');
  }

  function yandexConfigured() {
    const config = readJson('pmk-yandex-calendar-config-v1', {});
    return Boolean(config && config.enabled !== false && config.apiUrl && config.syncToken);
  }

  function providerMarkup(provider, title, letter) {
    return `<button type="button" class="pmk-provider-card" data-provider="${provider}" aria-label="Статус ${title}">
      <span class="pmk-provider-logo pmk-provider-logo-${provider}" aria-hidden="true">${letter}</span>
      <span class="pmk-provider-copy"><strong>${title}</strong><small data-provider-text>Проверяем…</small><em data-provider-detail></em></span>
      <span class="pmk-provider-dot" aria-hidden="true"></span>
    </button>`;
  }

  async function refreshProviders() {
    const button = $('#pmkProvidersSyncBtn');
    if (button?.disabled) return;
    if (button) button.disabled = true;
    try {
      const refresh = globalThis.PMK_FULL_CALENDAR_SYNC?.refresh
        || globalThis.PMK_YANDEX_PRIMARY_REFRESH_V72_API?.refresh
        || globalThis.refreshEvents;
      if (typeof refresh !== 'function') throw new Error('Модуль обновления не найден');
      await refresh();
      if (typeof showToast === 'function') showToast('Календари обновлены.', 'success');
    } catch (error) {
      if (typeof showToast === 'function') showToast(error?.message || 'Не удалось обновить календари.', 'error');
    } finally {
      if (button) button.disabled = false;
      schedule();
    }
  }

  function bindHeaderPanel(panel) {
    if (!panel || panel.dataset.pmkRouteHeaderBound === '1') return;
    panel.dataset.pmkRouteHeaderBound = '1';
    panel.addEventListener('click', async event => {
      const provider = event.target.closest('[data-provider]')?.dataset.provider;
      if (provider === 'google') {
        if (typeof state !== 'undefined' && state.token) await refreshProviders();
        else if (typeof connectGoogle === 'function') connectGoogle();
        return;
      }
      if (provider === 'yandex') {
        if (yandexConfigured()) await refreshProviders();
        else if (typeof setView === 'function') setView('settings');
        return;
      }
      if (event.target.closest('#pmkProvidersSyncBtn')) await refreshProviders();
    });
  }

  function ensureHeaderPanel() {
    const header = $('.app-header');
    const actions = $('.app-header .header-actions');
    if (!header || !actions) return;
    header.classList.add('pmk-test-header-v1', 'pmk-route-header-v82-4');

    let panel = $('#pmkProviderStatusPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'pmkProviderStatusPanel';
      panel.className = 'pmk-provider-status-panel';
      panel.innerHTML = `${providerMarkup('google', 'Google', 'G')}${providerMarkup('yandex', 'Яндекс', 'Я')}<button type="button" id="pmkProvidersSyncBtn" class="pmk-provider-sync-button" aria-label="Обновить календари" title="Обновить календари">↻</button>`;
      actions.prepend(panel);
    }
    panel.classList.add('pmk-test-provider-panel', 'pmk-route-provider-panel-v82-4');
    bindHeaderPanel(panel);

    const google = $('.pmk-provider-card[data-provider="google"]', panel);
    const yandex = $('.pmk-provider-card[data-provider="yandex"]', panel);
    const googleConnected = Boolean(typeof state !== 'undefined' && state.token);
    const yandexReady = yandexConfigured();

    if (google && !google.dataset.status) google.dataset.status = googleConnected ? 'success' : 'offline';
    if (yandex && !yandex.dataset.status) yandex.dataset.status = yandexReady ? 'pending' : 'offline';
    const googleText = $('[data-provider-text]', google || panel);
    const yandexText = $('[data-provider-text]', yandex || panel);
    if (googleText && !googleText.textContent.trim()) googleText.textContent = googleConnected ? 'Подключён' : 'Не подключён';
    if (yandexText && !yandexText.textContent.trim()) yandexText.textContent = yandexReady ? 'Настроен' : 'Не настроен';
  }

  function removeDuplicateWorkflowStrip() {
    $('#pmkWorkflowStrip')?.remove();
  }

  function apply() {
    scheduled = false;
    applyRouteSubtitle();
    ensureHeaderPanel();
    removeDuplicateWorkflowStrip();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  function boot() {
    apply();
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    ['resize', 'popstate', 'pmk-calendar-sync-done', 'pmk-yandex-sync-done', 'pmk-yandex-sync-error'].forEach(name => globalThis.addEventListener(name, schedule));
    document.addEventListener('click', event => {
      if (event.target.closest('#prevDayBtn,#nextDayBtn,.nav-item,[data-open-day]')) setTimeout(schedule, 0);
    }, true);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
