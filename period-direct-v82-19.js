'use strict';

(() => {
  if (globalThis.PMK_PERIOD_DIRECT_V82_19) return;
  globalThis.PMK_PERIOD_DIRECT_V82_19 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const MODES = new Set(['week', 'month']);
  let renderFrame = 0;
  let directRendering = false;

  function activeMode() {
    return typeof state !== 'undefined' ? state.currentView : '';
  }

  function ensureAnchor() {
    if (!state.periodAnchorKey) {
      state.periodAnchorKey = state.selectedDayKey || businessTodayKey();
    }
  }

  function showPlanning(mode) {
    $$('.view').forEach((section) => {
      section.classList.toggle('active', section.id === 'view-week');
    });
    $$('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === mode);
    });
    $('#sidebar')?.classList.remove('open');
  }

  function clearDecorations(board) {
    board.classList.remove(
      'pmk-fast-three-days',
      'pmk-fast-week',
      'pmk-month-table-v82-7',
      'pmk-month-counter-grid-v82-9',
      'pmk-month-board-v82-10',
      'pmk-week-board-v82-10',
      'pmk-week-v82-19',
      'pmk-month-v82-19',
    );
    $('#pmkMonthWeekdays')?.remove();
    $('#pmkMonthWeekdaysV8219')?.remove();
    $$('.pmk-month-count-v82-9,.pmk-month-count-v82-10,.pmk-month-count-v82-19', board)
      .forEach((node) => node.remove());
    $$('.day-column', board).forEach((column) => {
      column.style.removeProperty('grid-column-start');
    });
    $('#view-week')?.classList.remove('pmk-month-shell-v82-19');
  }

  function firstMonthColumn(dateKey) {
    const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return day === 0 ? 7 : day;
  }

  function pointWord(total) {
    const mod10 = total % 10;
    const mod100 = total % 100;
    if (mod10 === 1 && mod100 !== 11) return 'точка';
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'точки';
    return 'точек';
  }

  function decorateMonth(board) {
    $('#view-week')?.classList.add('pmk-month-shell-v82-19');
    board.classList.add('pmk-month-v82-19');

    const weekdays = document.createElement('div');
    weekdays.id = 'pmkMonthWeekdaysV8219';
    weekdays.className = 'pmk-month-weekdays-v82-19';
    weekdays.innerHTML = '<span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>';
    board.insertAdjacentElement('beforebegin', weekdays);

    $$('.day-column', board).forEach((column, index) => {
      const openButton = $('[data-open-day]', column);
      const dateKey = openButton?.dataset.openDay || '';
      if (!dateKey) return;
      if (index === 0) column.style.gridColumnStart = String(firstMonthColumn(dateKey));

      const text = $('span', openButton)?.textContent || '';
      const total = Number(text.match(/\d+/)?.[0] || 0);
      const counter = document.createElement('button');
      counter.type = 'button';
      counter.className = 'pmk-month-count-v82-19';
      counter.innerHTML = `<strong>${total}</strong><small>${pointWord(total)}</small>`;
      counter.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openDay(dateKey);
      });
      column.appendChild(counter);
    });
  }

  function renderMode(mode) {
    if (!MODES.has(mode) || directRendering) return;
    directRendering = true;
    try {
      const previousBoard = $('#weekEvents');
      const previousLeft = mode === 'week' ? Number(previousBoard?.scrollLeft || 0) : 0;
      ensureAnchor();
      state.currentView = mode;
      showPlanning(mode);

      const keys = periodKeys(mode);
      const events = getAllEvents().filter((event) => keys.includes(eventDateKey(event)));
      const labels = PERIOD_LABELS[mode] || PERIOD_LABELS.week;
      $('#periodTitle').textContent = labels[0];
      $('#periodSubtitle').textContent = labels[1];
      renderPeriod(events, keys, mode);
      syncDateControls();

      const board = $('#weekEvents');
      clearDecorations(board);
      if (mode === 'week') {
        board.classList.add('pmk-week-v82-19');
        if (previousLeft > 0) board.scrollLeft = previousLeft;
      } else decorateMonth(board);
    } finally {
      directRendering = false;
    }
  }

  function scheduleRender(mode = activeMode()) {
    if (!MODES.has(mode)) return;
    if (renderFrame) cancelAnimationFrame(renderFrame);
    renderFrame = requestAnimationFrame(() => {
      renderFrame = requestAnimationFrame(() => {
        renderFrame = 0;
        if (activeMode() === mode) renderMode(mode);
      });
    });
  }

  function stabilize(mode) {
    renderMode(mode);
    [80, 240, 700, 1600].forEach((delay) => {
      setTimeout(() => {
        if (activeMode() === mode) renderMode(mode);
      }, delay);
    });
  }

  function openMode(mode) {
    stabilize(mode);
    if (typeof pushAppHistory === 'function') pushAppHistory(mode);
  }

  function shiftMode(direction) {
    const mode = activeMode();
    if (!MODES.has(mode)) return;
    ensureAnchor();
    if (mode === 'week') {
      state.periodAnchorKey = addDaysToKey(state.periodAnchorKey, direction * 7);
    } else {
      const date = new Date(`${state.periodAnchorKey}T12:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() + direction, 1);
      state.periodAnchorKey = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-01`;
    }
    stabilize(mode);
    if (typeof pushAppHistory === 'function') pushAppHistory(mode);
  }

  function installRenderHook() {
    if (typeof renderAll !== 'function' || renderAll.__pmkPeriodDirectV8219) return;
    const previous = renderAll;
    const wrapped = function renderAllV8219(...args) {
      const result = previous(...args);
      if (MODES.has(activeMode())) scheduleRender(activeMode());
      return result;
    };
    wrapped.__pmkPeriodDirectV8219 = true;
    wrapped.__pmkFinalV8210 = true;
    wrapped.__pmkFinalV829 = true;
    wrapped.__pmkFastV827 = true;
    globalThis.renderAll = wrapped;
  }

  document.addEventListener('click', (event) => {
    const item = event.target.closest('.nav-item[data-view="week"],.nav-item[data-view="month"]');
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openMode(item.dataset.view);
  }, true);

  document.addEventListener('click', (event) => {
    if (!MODES.has(activeMode())) return;
    if (event.target.closest('#prevPeriodBtn')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      shiftMode(-1);
    } else if (event.target.closest('#nextPeriodBtn')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      shiftMode(1);
    }
  }, true);

  document.addEventListener('change', (event) => {
    if (event.target.id !== 'jumpPeriodDate' || !MODES.has(activeMode())) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    state.periodAnchorKey = event.target.value || businessTodayKey();
    stabilize(activeMode());
  }, true);

  ['pmk-calendar-sync-done', 'pmk-yandex-sync-done', 'pmk-yandex-sync-error', 'popstate'].forEach((name) => {
    globalThis.addEventListener(name, () => scheduleRender(activeMode()));
  });

  function boot() {
    installRenderHook();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installRenderHook();
      if (MODES.has(activeMode())) scheduleRender(activeMode());
      if (attempts >= 40) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
