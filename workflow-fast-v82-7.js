'use strict';

(() => {
  if (globalThis.PMK_WORKFLOW_FAST_V82_7) return;
  globalThis.PMK_WORKFLOW_FAST_V82_7 = true;
  document.documentElement.dataset.pmkCandidate = '82.7';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const GOOGLE_STATUS_KEY = 'pmk-calendar-sync-status-v1';
  const YANDEX_STATUS_KEY = 'pmk-yandex-provider-status-v1';
  const YANDEX_CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  let lastSource = null;
  let lastUnique = null;
  let swipeBoard = null;
  let suppressClickUntil = 0;
  let syncing = false;

  function readJson(key, fallback = {}) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function explicitPmkId(event) {
    let data = null;
    try { data = decodePmkData(event) || event?.pmkData || null; } catch { data = event?.pmkData || null; }
    return String(data?.pmkId || event?._pmkId || '').trim();
  }

  function installDeduplication() {
    if (typeof getAllEvents !== 'function' || getAllEvents.__pmkUniqueV827) return;
    const original = getAllEvents;
    const uniqueGetAllEvents = function getAllEventsUniqueV827() {
      const source = original();
      if (source === lastSource && lastUnique) return lastUnique;
      const map = new Map();
      source.forEach(event => {
        const pmkId = explicitPmkId(event);
        const key = pmkId ? `pmk:${pmkId}` : `id:${String(event?.id || '')}`;
        const current = map.get(key);
        const stamp = new Date(event?.updated || event?.created || event?.start?.dateTime || event?.start || 0).getTime() || 0;
        const currentStamp = current ? (new Date(current?.updated || current?.created || current?.start?.dateTime || current?.start || 0).getTime() || 0) : -1;
        if (!current || stamp >= currentStamp) map.set(key, event);
      });
      lastSource = source;
      lastUnique = [...map.values()].sort((a, b) => new Date(a.start?.dateTime || a.start || 0) - new Date(b.start?.dateTime || b.start || 0));
      return lastUnique;
    };
    uniqueGetAllEvents.__pmkUniqueV827 = true;
    globalThis.getAllEvents = uniqueGetAllEvents;
  }

  function syncParts(value) {
    const date = new Date(value || 0);
    if (!value || Number.isNaN(date.getTime())) return { date: 'нет', time: 'синхр.' };
    const parts = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { date: `${map.day}.${map.month}`, time: `${map.hour}:${map.minute}` };
  }

  function yandexConfigured() {
    const config = readJson(YANDEX_CONFIG_KEY, {});
    return Boolean(config && config.enabled !== false && config.apiUrl && config.syncToken);
  }

  function providerInfo(provider) {
    const saved = readJson(provider === 'google' ? GOOGLE_STATUS_KEY : YANDEX_STATUS_KEY, {});
    const connected = provider === 'google'
      ? Boolean(typeof state !== 'undefined' && state.token)
      : yandexConfigured();
    return {
      connected,
      error: saved.status === 'error',
      parts: syncParts(saved.time),
    };
  }

  function providerButton(provider, letter) {
    const info = providerInfo(provider);
    const title = provider === 'google' ? 'Google' : 'Яндекс';
    const className = info.error ? 'is-error' : info.connected ? 'is-connected' : 'is-offline';
    return `<button type="button" class="pmk-mini-provider pmk-mini-${provider} ${className}" data-mini-provider="${provider}" aria-label="${title}: ${info.connected ? 'подключён' : 'не подключён'}. Синхронизация ${info.parts.date} ${info.parts.time}">
      <span class="pmk-mini-provider-letter">${letter}</span>
      <span class="pmk-mini-provider-time"><b>${info.parts.date}</b><small>${info.parts.time}</small></span>
    </button>`;
  }

  async function refreshProviders() {
    if (syncing) return;
    syncing = true;
    renderHeader();
    try {
      const refresh = globalThis.PMK_FULL_CALENDAR_SYNC?.refresh
        || globalThis.PMK_YANDEX_PRIMARY_REFRESH_V72_API?.refresh
        || globalThis.PMK_YANDEX_CALENDAR?.refresh
        || globalThis.refreshEvents;
      if (typeof refresh !== 'function') throw new Error('Модуль обновления не найден');
      await refresh();
      if (typeof showToast === 'function') showToast('Календари обновлены.', 'success');
    } catch (error) {
      if (typeof showToast === 'function') showToast(error?.message || 'Не удалось обновить календари.', 'error');
    } finally {
      syncing = false;
      renderHeader();
    }
  }

  function renderHeader() {
    const header = $('.app-header');
    const actions = $('.app-header .header-actions');
    if (!header || !actions) return;
    header.classList.add('pmk-minimal-header-v82-7');
    ['#connectionBadge', '#connectGoogleBtn', '#pmkProviderStatusPanel', '#pmkHeaderSync', '#refreshBtn']
      .forEach(selector => $(selector)?.setAttribute('hidden', ''));

    let panel = $('#pmkMinimalSyncPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'pmkMinimalSyncPanel';
      panel.className = 'pmk-minimal-sync-panel';
      actions.appendChild(panel);
      panel.addEventListener('click', event => {
        const provider = event.target.closest('[data-mini-provider]')?.dataset.miniProvider;
        if (provider === 'google') {
          if (typeof state !== 'undefined' && state.token) refreshProviders();
          else if (typeof connectGoogle === 'function') connectGoogle();
          return;
        }
        if (provider === 'yandex') {
          if (yandexConfigured()) refreshProviders();
          else if (typeof setView === 'function') setView('settings');
          return;
        }
        if (event.target.closest('#pmkMiniRefresh')) refreshProviders();
      });
    }

    const google = providerInfo('google');
    const yandex = providerInfo('yandex');
    const signature = `${google.connected}:${google.error}:${google.parts.date}:${google.parts.time}|${yandex.connected}:${yandex.error}:${yandex.parts.date}:${yandex.parts.time}|${syncing}`;
    if (panel.dataset.signature === signature) return;
    panel.dataset.signature = signature;
    panel.innerHTML = `${providerButton('google', 'G')}${providerButton('yandex', 'Я')}<button type="button" id="pmkMiniRefresh" class="pmk-mini-refresh${syncing ? ' is-syncing' : ''}" aria-label="Обновить календари" title="Обновить календари" ${syncing ? 'disabled' : ''}>↻</button>`;
  }

  function ensureDivider(navList) {
    let divider = $('#pmkWorkflowNavDivider', navList);
    if (!divider) {
      divider = document.createElement('div');
      divider.id = 'pmkWorkflowNavDivider';
      divider.className = 'pmk-nav-section-label';
      divider.textContent = 'Работа с коврами';
    }
    return divider;
  }

  function orderMenu() {
    const nav = $('.nav-list');
    if (!nav) return false;
    const nodes = {
      search: $('.nav-item[data-view="search"]', nav),
      day: $('.nav-item[data-view="day"]', nav),
      three: $('.nav-item[data-view="three-days"]', nav),
      week: $('.nav-item[data-view="week"]', nav),
      month: $('.nav-item[data-view="month"]', nav),
      work: $('.nav-item[data-view="in-work"]', nav),
      delivery: $('.nav-item[data-view="delivery-waiting"]', nav),
      completed: $('.nav-item[data-view="completed"]', nav),
      archive: $('.nav-item[data-view="archive"]', nav),
      form: $('.nav-item[data-view="form"]', nav),
      reminder: $('.nav-item[data-view="reminder"]', nav),
      settings: $('.nav-item[data-view="settings"]', nav),
    };
    if (nodes.delivery) $('span', nodes.delivery).textContent = 'К выдаче';
    const divider = ensureDivider(nav);
    [nodes.search, nodes.day, nodes.three, nodes.week, nodes.month, divider, nodes.work, nodes.delivery, nodes.completed, nodes.archive, nodes.form, nodes.reminder, nodes.settings]
      .filter(Boolean)
      .forEach(node => nav.appendChild(node));
    return Boolean(nodes.work && nodes.completed && nodes.archive);
  }

  function districtsForDate(dateKey) {
    const date = typeof dateKeyForDisplay === 'function' ? dateKeyForDisplay(dateKey) : new Date(`${dateKey}T12:00:00Z`);
    const day = date.getUTCDay();
    const fallback = {
      1: ['Автозаводский', 'Ленинский', 'Канавинский'],
      2: ['Московский', 'Сормовский'],
      3: ['Нижегородский', 'Советский', 'Приокский'],
      4: ['Автозаводский', 'Ленинский', 'Канавинский'],
      5: ['Московский', 'Сормовский'],
      6: ['Нижегородский', 'Советский', 'Приокский'],
    };
    return fallback[day] || [];
  }

  function renderRouteSubtitle() {
    if (typeof state === 'undefined' || state.currentView !== 'day') return;
    const subtitle = $('#todaySubtitle');
    if (!subtitle) return;
    const districts = districtsForDate(state.selectedDayKey || businessTodayKey());
    subtitle.textContent = districts.length ? `Районы по графику: ${districts.join(', ')}.` : 'Выходной: маршрутов нет.';
  }

  function monthOffset(dateKey) {
    const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return day === 0 ? 7 : day;
  }

  function renderMonthTable() {
    const board = $('#weekEvents');
    const view = $('#view-week');
    const active = Boolean(typeof state !== 'undefined' && state.currentView === 'month');
    view?.classList.toggle('pmk-month-view-v82-7', active);
    if (!board) return;
    board.classList.toggle('pmk-month-table-v82-7', active);
    let weekdays = $('#pmkMonthWeekdays');
    if (!active) {
      weekdays?.remove();
      return;
    }
    if (!weekdays) {
      weekdays = document.createElement('div');
      weekdays.id = 'pmkMonthWeekdays';
      weekdays.className = 'pmk-month-weekdays';
      weekdays.innerHTML = '<span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>';
      board.insertAdjacentElement('beforebegin', weekdays);
    }
    const firstDay = $('.day-column [data-open-day]', board)?.dataset.openDay;
    const firstCell = $('.day-column', board);
    if (firstCell && firstDay) firstCell.style.gridColumnStart = String(monthOffset(firstDay));
  }

  function bindSwipe() {
    const board = $('#weekEvents');
    if (!board || board === swipeBoard) return;
    swipeBoard = board;
    let startX = 0;
    let startY = 0;
    let horizontal = false;
    board.addEventListener('touchstart', event => {
      const touch = event.touches?.[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      horizontal = false;
    }, { passive: true });
    board.addEventListener('touchmove', event => {
      const touch = event.touches?.[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.08) horizontal = true;
    }, { passive: true });
    board.addEventListener('touchend', () => {
      if (horizontal) suppressClickUntil = Date.now() + 350;
      horizontal = false;
    }, { passive: true });
    board.addEventListener('click', event => {
      if (Date.now() > suppressClickUntil) return;
      if (!event.target.closest('button,a')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function applyPeriodClasses() {
    const board = $('#weekEvents');
    if (!board || typeof state === 'undefined') return;
    board.classList.toggle('pmk-fast-three-days', state.currentView === 'three-days');
    board.classList.toggle('pmk-fast-week', state.currentView === 'week');
    bindSwipe();
  }

  function apply() {
    renderHeader();
    orderMenu();
    renderRouteSubtitle();
    renderMonthTable();
    applyPeriodClasses();
  }

  function installWrappers() {
    if (typeof renderAll === 'function' && !renderAll.__pmkFastV827) {
      const previous = renderAll;
      const wrapped = function renderAllFastV827(...args) {
        const result = previous(...args);
        requestAnimationFrame(apply);
        return result;
      };
      wrapped.__pmkFastV827 = true;
      globalThis.renderAll = wrapped;
    }
    if (typeof setView === 'function' && !setView.__pmkFastV827) {
      const previous = setView;
      const wrapped = function setViewFastV827(...args) {
        const result = previous(...args);
        requestAnimationFrame(apply);
        return result;
      };
      wrapped.__pmkFastV827 = true;
      globalThis.setView = wrapped;
    }
  }

  function boot() {
    installDeduplication();
    installWrappers();
    apply();
    ['pmk-calendar-sync-done', 'pmk-yandex-sync-done', 'pmk-yandex-sync-error', 'pmk-status-ledger-updated', 'popstate', 'storage']
      .forEach(name => globalThis.addEventListener(name, () => requestAnimationFrame(apply)));
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installWrappers();
      apply();
      if (orderMenu() || attempts >= 30) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
