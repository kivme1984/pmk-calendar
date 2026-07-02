'use strict';

(() => {
  if (globalThis.PMK_FINAL_UI_V82_10) return;
  globalThis.PMK_FINAL_UI_V82_10 = true;
  document.documentElement.dataset.pmkCandidate = '82.10';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const CURRENT_VERSION = '82.10';
  const SCHEDULE_KEY = 'pmk-working-schedule-v82-10';
  const GOOGLE_STATUS_KEY = 'pmk-calendar-sync-status-v1';
  const YANDEX_STATUS_KEY = 'pmk-yandex-provider-status-v1';
  const YANDEX_CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  let scheduled = false;
  let activeSummaryFilter = 'all';
  let syncing = false;
  let releaseChecked = false;

  function readJson(key, fallback = {}) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function currentView() {
    return typeof state !== 'undefined' ? state.currentView : '';
  }

  function selectedDayKey() {
    if (typeof state !== 'undefined' && state.selectedDayKey) return state.selectedDayKey;
    if (typeof businessTodayKey === 'function') return businessTodayKey();
    return new Date().toISOString().slice(0, 10);
  }

  function districtsForDate(dateKey) {
    const date = typeof dateKeyForDisplay === 'function'
      ? dateKeyForDisplay(dateKey)
      : new Date(`${dateKey}T12:00:00Z`);
    return ({
      1: ['Автозаводский', 'Ленинский', 'Канавинский'],
      2: ['Московский', 'Сормовский'],
      3: ['Нижегородский', 'Советский', 'Приокский'],
      4: ['Автозаводский', 'Ленинский', 'Канавинский'],
      5: ['Московский', 'Сормовский'],
      6: ['Нижегородский', 'Советский', 'Приокский'],
    })[date.getUTCDay()] || [];
  }

  function removeThreeDays() {
    $('.nav-item[data-view="three-days"]')?.remove();
    if (currentView() === 'three-days' && typeof setView === 'function') setView('week');
  }

  function configureQuickStart() {
    const panel = $('#pmkManagerLaunchpad');
    if (!panel) return;
    panel.classList.add('pmk-quick-actions-v82-10');
    $('[data-workspace-action="drafts"]', panel)?.remove();
    $$('[data-workspace-action]', panel).forEach(button => {
      button.removeAttribute('data-pmk-hidden-quick');
      button.hidden = false;
    });
    const title = $('.pmk-launchpad-title span', panel);
    const heading = $('.pmk-launchpad-title strong', panel);
    if (title) title.textContent = 'Быстрые действия';
    if (heading) heading.textContent = 'Работа с заявкой';
    panel.hidden = !['day', 'week', 'month'].includes(currentView());
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

  function compareVersions(a, b) {
    const left = String(a).split('.').map(Number);
    const right = String(b).split('.').map(Number);
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      const diff = (left[index] || 0) - (right[index] || 0);
      if (diff) return diff;
    }
    return 0;
  }

  function ensureVersionIndicator() {
    const brand = $('.app-header .brand');
    if (!brand) return null;
    let indicator = $('#pmkVersionIndicator');
    if (!indicator) {
      indicator = document.createElement('a');
      indicator.id = 'pmkVersionIndicator';
      indicator.className = 'pmk-version-indicator-v82-10 is-checking';
      indicator.href = '#';
      indicator.innerHTML = '<i></i><span>Проверка версии</span>';
      brand.appendChild(indicator);
    }
    return indicator;
  }

  async function checkRelease() {
    const indicator = ensureVersionIndicator();
    if (!indicator || releaseChecked) return;
    releaseChecked = true;
    try {
      const response = await fetch(`./pmk-release.json?check=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('release');
      const release = await response.json();
      const hasUpdate = compareVersions(release.version, CURRENT_VERSION) > 0;
      indicator.className = `pmk-version-indicator-v82-10 ${hasUpdate ? 'has-update' : 'is-current'}`;
      indicator.innerHTML = `<i></i><span>${hasUpdate ? `Обновление v${release.version}` : `Актуальная v${CURRENT_VERSION}`}</span>`;
      indicator.href = hasUpdate ? (release.testUrl || release.updateUrl || '#') : '#';
      indicator.title = hasUpdate ? `Доступна версия ${release.version}` : `Установлена актуальная версия ${CURRENT_VERSION}`;
    } catch {
      indicator.className = 'pmk-version-indicator-v82-10 is-unknown';
      indicator.innerHTML = '<i></i><span>Версия не проверена</span>';
    }
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
    header.classList.add('pmk-minimal-header-v82-10');
    ['#connectionBadge', '#connectGoogleBtn', '#pmkProviderStatusPanel', '#pmkHeaderSync', '#refreshBtn']
      .forEach(selector => $(selector)?.setAttribute('hidden', ''));

    ensureVersionIndicator();
    checkRelease();

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
    panel.innerHTML = `${providerButton('google', 'G')}${providerButton('yandex', 'Я')}<button type="button" id="pmkMiniRefresh" class="pmk-mini-refresh${syncing ? ' is-syncing' : ''}" aria-label="Обновить календари" ${syncing ? 'disabled' : ''}>↻</button>`;
  }

  function clearOldPeriodDecorations(board) {
    if (!board) return;
    board.classList.remove('pmk-month-table-v82-7', 'pmk-month-counter-grid-v82-9', 'pmk-fast-three-days', 'pmk-fast-week');
    $('#pmkMonthWeekdays')?.remove();
    $$('.pmk-month-count-v82-9,.pmk-month-count-v82-10', board).forEach(node => node.remove());
    $$('.day-column', board).forEach(column => column.style.removeProperty('grid-column-start'));
  }

  function monthFirstColumn(dateKey) {
    const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return day === 0 ? 7 : day;
  }

  function renderPeriodViews() {
    const board = $('#weekEvents');
    if (!board) return;
    clearOldPeriodDecorations(board);
    const view = currentView();
    board.classList.toggle('pmk-week-board-v82-10', view === 'week');
    board.classList.toggle('pmk-month-board-v82-10', view === 'month');
    $('#view-week')?.classList.toggle('pmk-period-view-v82-10', ['week', 'month'].includes(view));

    if (view !== 'month') return;
    const columns = $$('.day-column', board);
    columns.forEach((column, index) => {
      const open = $('[data-open-day]', column);
      const dateKey = open?.dataset.openDay || '';
      if (!dateKey) return;
      if (index === 0) column.style.gridColumnStart = String(monthFirstColumn(dateKey));
      const nativeCount = $('span', open)?.textContent?.match(/\d+/)?.[0] || '0';
      const count = document.createElement('button');
      count.type = 'button';
      count.className = 'pmk-month-count-v82-10';
      count.innerHTML = `<strong>${nativeCount}</strong><small>точек</small>`;
      count.addEventListener('click', () => {
        if (typeof openDay === 'function') openDay(dateKey);
        else if (typeof setView === 'function') setView('day', dateKey);
      });
      column.appendChild(count);
    });
  }

  function renderDistricts() {
    if (currentView() === 'day') {
      const subtitle = $('#todaySubtitle');
      const districts = districtsForDate(selectedDayKey());
      if (subtitle) subtitle.textContent = districts.length
        ? `Районы по графику: ${districts.join(', ')}.`
        : 'Выходной: маршрутов нет.';
    }

    $$('.day-column').forEach(column => {
      const heading = $('.day-heading', column);
      const dateKey = $('[data-open-day]', column)?.dataset.openDay;
      if (!heading || !dateKey) return;
      let line = $('small', heading);
      if (!line) {
        line = document.createElement('small');
        heading.appendChild(line);
      }
      const districts = districtsForDate(dateKey);
      line.classList.add('pmk-day-districts-v82-10');
      line.textContent = districts.length ? districts.join(' · ') : 'Выходной';
    });
  }

  function eventForCard(card) {
    const id = String(card?.dataset?.eventCard || '');
    if (!id || typeof getAllEvents !== 'function') return null;
    return getAllEvents().find(event => String(event.id) === id) || null;
  }

  function applySummaryFilter() {
    $$('#todayEvents .event-card[data-event-card]').forEach(card => {
      const event = eventForCard(card);
      if (!event || typeof eventMeta !== 'function') {
        card.hidden = false;
        return;
      }
      const data = eventMeta(event);
      const attention = !data.phone || !(typeof displayAddress === 'function' ? displayAddress(data, event) : data.address);
      card.hidden = !(activeSummaryFilter === 'all'
        || (activeSummaryFilter === 'pickup' && data.visitType === 'pickup')
        || (activeSummaryFilter === 'delivery' && data.visitType === 'delivery')
        || (activeSummaryFilter === 'attention' && attention));
    });
  }

  function makeSummaryClickable() {
    [
      ['#summaryTotal', 'all'],
      ['#summaryPickup', 'pickup'],
      ['#summaryDelivery', 'delivery'],
      ['#summaryAttention', 'attention'],
    ].forEach(([selector, filter]) => {
      const card = $(selector)?.closest('.summary-card');
      if (!card) return;
      card.dataset.summaryFilter = filter;
      card.classList.toggle('is-active', activeSummaryFilter === filter);
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      if (card.dataset.pmkBound === '1') return;
      card.dataset.pmkBound = '1';
      const activate = () => {
        activeSummaryFilter = filter;
        makeSummaryClickable();
        applySummaryFilter();
      };
      card.addEventListener('click', activate);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
    });
  }

  function scheduleFor(dateKey) {
    return readJson(SCHEDULE_KEY, {})[dateKey] || { dayOff: false, start: '', end: '', note: '' };
  }

  function saveSchedule(dateKey, value) {
    const all = readJson(SCHEDULE_KEY, {});
    if (!value.dayOff && !value.start && !value.end && !value.note) delete all[dateKey];
    else all[dateKey] = value;
    writeJson(SCHEDULE_KEY, all);
  }

  function ensureDayModeModal() {
    if ($('#pmkDayModeModal')) return;
    const modal = document.createElement('div');
    modal.id = 'pmkDayModeModal';
    modal.className = 'pmk-day-mode-modal-v82-10';
    modal.hidden = true;
    modal.innerHTML = `<div class="pmk-day-mode-dialog-v82-10" role="dialog" aria-modal="true">
      <button type="button" class="pmk-day-mode-close-v82-10" aria-label="Закрыть">×</button>
      <h3>Режим рабочего дня</h3><p id="pmkDayModeDate"></p>
      <label class="pmk-day-mode-check-v82-10"><input type="checkbox" id="pmkDayOff"><span>Выходной весь день</span></label>
      <div class="pmk-day-mode-period-v82-10"><label>Не работаем с<input type="time" id="pmkDayBlockStart"></label><label>до<input type="time" id="pmkDayBlockEnd"></label></div>
      <label>Комментарий<input type="text" id="pmkDayBlockNote" placeholder="Например: ремонт оборудования"></label>
      <div class="pmk-day-mode-actions-v82-10"><button type="button" id="pmkDayModeClear">Очистить</button><button type="button" id="pmkDayModeSave">Сохранить</button></div>
    </div>`;
    document.body.appendChild(modal);
    const close = () => { modal.hidden = true; };
    $('.pmk-day-mode-close-v82-10', modal).addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    $('#pmkDayModeSave', modal).addEventListener('click', () => {
      saveSchedule(modal.dataset.dateKey, {
        dayOff: $('#pmkDayOff', modal).checked,
        start: $('#pmkDayBlockStart', modal).value,
        end: $('#pmkDayBlockEnd', modal).value,
        note: $('#pmkDayBlockNote', modal).value.trim(),
      });
      close();
      applyAll();
    });
    $('#pmkDayModeClear', modal).addEventListener('click', () => {
      saveSchedule(modal.dataset.dateKey, { dayOff: false, start: '', end: '', note: '' });
      close();
      applyAll();
    });
  }

  function openDayMode() {
    ensureDayModeModal();
    const modal = $('#pmkDayModeModal');
    const dateKey = selectedDayKey();
    const value = scheduleFor(dateKey);
    modal.dataset.dateKey = dateKey;
    $('#pmkDayModeDate', modal).textContent = typeof formatDateLong === 'function' ? formatDateLong(dateKey) : dateKey;
    $('#pmkDayOff', modal).checked = Boolean(value.dayOff);
    $('#pmkDayBlockStart', modal).value = value.start || '';
    $('#pmkDayBlockEnd', modal).value = value.end || '';
    $('#pmkDayBlockNote', modal).value = value.note || '';
    modal.hidden = false;
  }

  function renderDayMode() {
    if (currentView() !== 'day') return;
    const toolbar = $('.date-toolbar') || $('#view-today .page-heading');
    if (!toolbar) return;
    let button = $('#pmkDayModeButton');
    if (!button) {
      button = document.createElement('button');
      button.id = 'pmkDayModeButton';
      button.type = 'button';
      button.className = 'pmk-day-mode-button-v82-10';
      button.addEventListener('click', openDayMode);
      toolbar.appendChild(button);
    }
    const value = scheduleFor(selectedDayKey());
    button.textContent = value.dayOff ? 'Выходной' : (value.start && value.end ? `${value.start}–${value.end} не работаем` : 'Режим дня');
    button.classList.toggle('is-active', Boolean(value.dayOff || (value.start && value.end)));
    const add = $('#addTodayBtn');
    if (add) add.disabled = Boolean(value.dayOff);
  }

  function restoreCardLayout() {
    $$('.event-card').forEach(card => {
      const actions = $('.event-actions', card);
      const row = $('.manage-row', card);
      if (!actions || !row) return;
      card.classList.add('pmk-card-layout-v82-10');
      actions.classList.add('pmk-card-footer-v82-10');
      row.classList.add('pmk-card-footer-row-v82-10');
      const call = $('.call-button', row);
      if (call && !call.disabled && !/позвонить/i.test(call.textContent || '')) call.innerHTML = '<span>☎</span><span>Позвонить</span>';
    });
  }

  function hidePlanningTopAdd() {
    const planning = ['week', 'month'].includes(currentView());
    $('#view-week')?.classList.toggle('pmk-hide-top-add-v82-10', planning);
  }

  function applyAll() {
    scheduled = false;
    removeThreeDays();
    configureQuickStart();
    renderHeader();
    renderPeriodViews();
    renderDistricts();
    makeSummaryClickable();
    applySummaryFilter();
    renderDayMode();
    restoreCardLayout();
    hidePlanningTopAdd();
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyAll);
  }

  function installWrappers() {
    if (typeof renderAll === 'function' && !renderAll.__pmkFinalV8210) {
      const previous = renderAll;
      globalThis.renderAll = function renderAllV8210(...args) {
        const result = previous(...args);
        scheduleApply();
        return result;
      };
      globalThis.renderAll.__pmkFinalV8210 = true;
    }
    if (typeof setView === 'function' && !setView.__pmkFinalV8210) {
      const previous = setView;
      globalThis.setView = function setViewV8210(...args) {
        const result = previous(...args);
        scheduleApply();
        return result;
      };
      globalThis.setView.__pmkFinalV8210 = true;
    }
  }

  function boot() {
    ensureDayModeModal();
    installWrappers();
    applyAll();
    document.addEventListener('click', event => {
      if (event.target.closest('.nav-item,#prevDayBtn,#nextDayBtn,#prevPeriodBtn,#nextPeriodBtn,[data-open-day],[data-add-day]')) setTimeout(scheduleApply, 0);
    }, true);
    ['resize', 'popstate', 'storage', 'pmk-calendar-sync-done', 'pmk-yandex-sync-done', 'pmk-yandex-sync-error', 'pmk-status-ledger-updated']
      .forEach(name => globalThis.addEventListener(name, scheduleApply));
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installWrappers();
      applyAll();
      if (($('#pmkManagerLaunchpad') && $('#pmkMinimalSyncPanel') && $('.nav-item[data-view="month"]')) || attempts >= 25) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
