'use strict';

(() => {
  if (globalThis.PMK_MINIMAL_HEADER_MENU_MONTH_V82_5) return;
  globalThis.PMK_MINIMAL_HEADER_MENU_MONTH_V82_5 = true;
  document.documentElement.dataset.pmkCandidate = '82.5';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const GOOGLE_STATUS_KEY = 'pmk-calendar-sync-status-v1';
  const YANDEX_STATUS_KEY = 'pmk-yandex-provider-status-v1';
  const YANDEX_CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
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

  function providerState(provider) {
    const saved = readJson(provider === 'google' ? GOOGLE_STATUS_KEY : YANDEX_STATUS_KEY, {});
    const connected = provider === 'google'
      ? Boolean(typeof state !== 'undefined' && state.token)
      : yandexConfigured();
    const parts = syncParts(saved.time);
    const status = saved.status === 'error' ? 'error' : connected ? 'connected' : 'offline';
    return { connected, status, parts };
  }

  function compactProvider(provider, letter) {
    const info = providerState(provider);
    const title = provider === 'google' ? 'Google' : 'Яндекс';
    const stateText = info.connected ? 'подключён' : 'не подключён';
    return `<button type="button" class="pmk-mini-provider pmk-mini-${provider} is-${info.status}" data-mini-provider="${provider}" aria-label="${title}: ${stateText}. Последняя синхронизация ${info.parts.date} ${info.parts.time}" title="${title}: ${stateText}">
      <span class="pmk-mini-provider-letter">${letter}</span>
      <span class="pmk-mini-provider-time"><b>${info.parts.date}</b><small>${info.parts.time}</small></span>
    </button>`;
  }

  async function refreshProviders() {
    const button = $('#pmkMiniRefresh');
    if (button?.disabled) return;
    if (button) {
      button.disabled = true;
      button.classList.add('is-syncing');
    }
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
      if (button) {
        button.disabled = false;
        button.classList.remove('is-syncing');
      }
      setTimeout(schedule, 20);
    }
  }

  function bindMiniPanel(panel) {
    if (!panel || panel.dataset.pmkMiniBound === '1') return;
    panel.dataset.pmkMiniBound = '1';
    panel.addEventListener('click', async event => {
      const provider = event.target.closest('[data-mini-provider]')?.dataset.miniProvider;
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
      if (event.target.closest('#pmkMiniRefresh')) await refreshProviders();
    });
  }

  function renderMinimalHeader() {
    const header = $('.app-header');
    const actions = $('.app-header .header-actions');
    if (!header || !actions) return;
    header.classList.add('pmk-minimal-header-v82-5');

    $('#connectionBadge')?.setAttribute('hidden', '');
    $('#connectGoogleBtn')?.setAttribute('hidden', '');
    $('#pmkProviderStatusPanel')?.setAttribute('hidden', '');
    $('#pmkHeaderSync')?.setAttribute('hidden', '');

    let panel = $('#pmkMinimalSyncPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'pmkMinimalSyncPanel';
      panel.className = 'pmk-minimal-sync-panel';
      actions.appendChild(panel);
    }
    const google = providerState('google');
    const yandex = providerState('yandex');
    const signature = `${google.status}:${google.parts.date}:${google.parts.time}|${yandex.status}:${yandex.parts.date}:${yandex.parts.time}`;
    if (panel.dataset.signature !== signature) {
      panel.dataset.signature = signature;
      panel.innerHTML = `${compactProvider('google', 'G')}${compactProvider('yandex', 'Я')}<button type="button" id="pmkMiniRefresh" class="pmk-mini-refresh" aria-label="Обновить календари" title="Обновить календари">↻</button>`;
      panel.dataset.pmkMiniBound = '';
      bindMiniPanel(panel);
    } else {
      bindMiniPanel(panel);
    }
  }

  function ensureWorkflowDivider(navList) {
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
    const navList = $('.nav-list');
    if (!navList) return;
    const search = $('.nav-item[data-view="search"]', navList);
    const day = $('.nav-item[data-view="day"]', navList);
    const three = $('.nav-item[data-view="three-days"]', navList);
    const week = $('.nav-item[data-view="week"]', navList);
    const month = $('.nav-item[data-view="month"]', navList);
    const inWork = $('.nav-item[data-view="in-work"]', navList);
    const delivery = $('.nav-item[data-view="delivery-waiting"]', navList);
    const completed = $('.nav-item[data-view="completed"]', navList);
    const archive = $('.nav-item[data-view="archive"]', navList);
    const form = $('.nav-item[data-view="form"]', navList);
    const reminder = $('.nav-item[data-view="reminder"]', navList);
    const settings = $('.nav-item[data-view="settings"]', navList);
    const divider = ensureWorkflowDivider(navList);

    if (delivery) {
      const label = $('span', delivery);
      if (label && label.textContent !== 'К выдаче') label.textContent = 'К выдаче';
    }

    [search, day, three, week, month, divider, inWork, delivery, completed, archive, form, reminder, settings]
      .filter(Boolean)
      .forEach(node => navList.appendChild(node));
  }

  function updateDeliveryHeading() {
    if (typeof state === 'undefined' || state.currentView !== 'delivery-waiting') return;
    const title = $('#todayTitle');
    const subtitle = $('#todaySubtitle');
    if (title) title.textContent = 'К выдаче';
    if (subtitle) subtitle.textContent = 'Готовые ковры, которые нужно вернуть клиентам.';
  }

  function monthOffset(dateKey) {
    const date = new Date(`${dateKey}T12:00:00Z`);
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
  }

  function renderMonthTable() {
    const board = $('#weekEvents');
    const view = $('#view-week');
    const isMonth = Boolean(typeof state !== 'undefined' && state.currentView === 'month');
    view?.classList.toggle('pmk-month-view-v82-5', isMonth);
    if (!board) return;
    board.classList.toggle('pmk-month-table-v82-5', isMonth);

    let weekdays = $('#pmkMonthWeekdays');
    if (!isMonth) {
      weekdays?.remove();
      board.style.removeProperty('--pmk-month-first-column');
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
    const firstColumn = firstDay ? monthOffset(firstDay) : 1;
    board.style.setProperty('--pmk-month-first-column', String(firstColumn));
    const firstCell = $('.day-column', board);
    if (firstCell) firstCell.style.gridColumnStart = String(firstColumn);
  }

  function apply() {
    scheduled = false;
    renderMinimalHeader();
    orderMenu();
    updateDeliveryHeading();
    renderMonthTable();
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
    ['resize', 'popstate', 'storage', 'pmk-calendar-sync-done', 'pmk-yandex-sync-done', 'pmk-yandex-sync-error', 'pmk-status-ledger-updated']
      .forEach(name => globalThis.addEventListener(name, schedule));
    document.addEventListener('click', event => {
      if (event.target.closest('.nav-item,#prevPeriodBtn,#nextPeriodBtn,#jumpPeriodDate')) setTimeout(schedule, 0);
    }, true);
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      apply();
      if (($('#pmkMinimalSyncPanel') && $('.nav-item[data-view="archive"]')) || attempts > 120) clearInterval(timer);
    }, 80);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
