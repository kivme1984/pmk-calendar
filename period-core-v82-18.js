'use strict';

(() => {
  if (globalThis.PMK_PERIOD_CORE_V82_18) return;
  globalThis.PMK_PERIOD_CORE_V82_18 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const PERIOD_VIEWS = new Set(['week', 'month']);
  let renderFrame = 0;

  function activeView() {
    return typeof state !== 'undefined' ? state.currentView : '';
  }

  function ensureAnchor() {
    if (typeof state === 'undefined') return;
    if (!state.periodAnchorKey) {
      state.periodAnchorKey = state.selectedDayKey
        || (typeof businessTodayKey === 'function' ? businessTodayKey() : new Date().toISOString().slice(0, 10));
    }
  }

  function showPlanningView(mode) {
    $$('.view').forEach(section => section.classList.toggle('active', section.id === 'view-week'));
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === mode));
    $('#sidebar')?.classList.remove('open');
  }

  function removePeriodDecorations(board) {
    if (!board) return;
    board.classList.remove(
      'pmk-week-v82-18', 'pmk-month-v82-18',
      'pmk-fast-three-days', 'pmk-fast-week',
      'pmk-month-table-v82-7', 'pmk-month-counter-grid-v82-9',
      'pmk-month-board-v82-10', 'pmk-week-board-v82-10'
    );
    $('#pmkMonthWeekdays')?.remove();
    $('#pmkMonthWeekdaysV8218')?.remove();
    $$('.pmk-month-count-v82-9,.pmk-month-count-v82-10,.pmk-month-count-v82-18', board).forEach(node => node.remove());
    $$('.day-column', board).forEach(column => column.style.removeProperty('grid-column-start'));
    $('#view-week')?.classList.remove('pmk-month-shell-v82-18');
  }

  function firstMonthColumn(dateKey) {
    const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return weekday === 0 ? 7 : weekday;
  }

  function pointsFromHeading(openButton) {
    const text = $('span', openButton)?.textContent || '';
    return Number(text.match(/\d+/)?.[0] || 0);
  }

  function pointWord(total) {
    const mod10 = total % 10;
    const mod100 = total % 100;
    if (mod10 === 1 && mod100 !== 11) return 'точка';
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'точки';
    return 'точек';
  }

  function renderMonthCounters(board) {
    const weekdays = document.createElement('div');
    weekdays.id = 'pmkMonthWeekdaysV8218';
    weekdays.className = 'pmk-month-weekdays-v82-18';
    weekdays.innerHTML = '<span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>';
    board.insertAdjacentElement('beforebegin', weekdays);

    $$('.day-column', board).forEach((column, index) => {
      const openButton = $('[data-open-day]', column);
      const dateKey = openButton?.dataset.openDay || '';
      if (!dateKey) return;
      if (index === 0) column.style.gridColumnStart = String(firstMonthColumn(dateKey));

      const total = pointsFromHeading(openButton);
      const counter = document.createElement('button');
      counter.type = 'button';
      counter.className = 'pmk-month-count-v82-18';
      counter.innerHTML = `<strong>${total}</strong><small>${pointWord(total)}</small>`;
      counter.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof openDay === 'function') openDay(dateKey);
        else {
          if (typeof state !== 'undefined') {
            state.selectedDayKey = dateKey;
            state.periodAnchorKey = dateKey;
          }
          if (typeof setView === 'function') setView('day');
        }
      });
      column.appendChild(counter);
    });
  }

  function applyPeriodLayout() {
    renderFrame = 0;
    const mode = activeView();
    if (!PERIOD_VIEWS.has(mode)) return;

    const board = $('#weekEvents');
    if (!board) return;
    showPlanningView(mode);
    removePeriodDecorations(board);

    if (mode === 'week') {
      board.classList.add('pmk-week-v82-18');
      return;
    }

    $('#view-week')?.classList.add('pmk-month-shell-v82-18');
    board.classList.add('pmk-month-v82-18');
    renderMonthCounters(board);
  }

  function scheduleLayout() {
    if (renderFrame) return;
    renderFrame = requestAnimationFrame(() => requestAnimationFrame(applyPeriodLayout));
  }

  function openPeriod(mode) {
    if (!PERIOD_VIEWS.has(mode) || typeof state === 'undefined') return;
    ensureAnchor();
    state.currentView = mode;
    showPlanningView(mode);
    if (typeof renderAll === 'function') renderAll();
    showPlanningView(mode);
    applyPeriodLayout();
    if (typeof pushAppHistory === 'function') pushAppHistory(mode);
    setTimeout(scheduleLayout, 100);
    setTimeout(scheduleLayout, 500);
  }

  // This handler is registered BEFORE final-hotfix-v82-11.js.
  // It therefore becomes the only controller for Week and Month clicks.
  document.addEventListener('click', event => {
    const item = event.target.closest('.nav-item[data-view="week"],.nav-item[data-view="month"]');
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openPeriod(item.dataset.view);
  }, true);

  document.addEventListener('click', event => {
    if (event.target.closest('#prevPeriodBtn,#nextPeriodBtn,[data-open-day],[data-add-day]')) {
      setTimeout(scheduleLayout, 0);
      setTimeout(scheduleLayout, 180);
    }
  }, true);

  function installRenderHook() {
    if (typeof renderAll !== 'function' || renderAll.__pmkPeriodCoreV8218) return;
    const previous = renderAll;
    const wrapped = function renderAllV8218(...args) {
      const result = previous(...args);
      scheduleLayout();
      return result;
    };
    wrapped.__pmkPeriodCoreV8218 = true;
    wrapped.__pmkFinalV8210 = true;
    wrapped.__pmkFinalV829 = true;
    wrapped.__pmkFastV827 = true;
    globalThis.renderAll = wrapped;
  }

  function boot() {
    installRenderHook();
    scheduleLayout();
    ['pmk-calendar-sync-done', 'pmk-yandex-sync-done', 'pmk-yandex-sync-error', 'popstate']
      .forEach(name => globalThis.addEventListener(name, scheduleLayout));

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installRenderHook();
      if (PERIOD_VIEWS.has(activeView())) scheduleLayout();
      if (attempts >= 40) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
