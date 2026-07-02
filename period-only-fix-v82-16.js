'use strict';

(() => {
  if (globalThis.PMK_PERIOD_ONLY_FIX_V82_16) return;
  globalThis.PMK_PERIOD_ONLY_FIX_V82_16 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const PERIODS = new Set(['week', 'month']);
  let busy = false;
  let frame = 0;
  let observer = null;

  function view() {
    return typeof state !== 'undefined' ? state.currentView : '';
  }

  function ensureAnchor() {
    if (typeof state === 'undefined') return;
    if (!state.periodAnchorKey) {
      state.periodAnchorKey = state.selectedDayKey
        || (typeof businessTodayKey === 'function' ? businessTodayKey() : new Date().toISOString().slice(0, 10));
    }
  }

  function showPeriodScreen(mode) {
    $$('.view').forEach(section => section.classList.toggle('active', section.id === 'view-week'));
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === mode));
    $('#sidebar')?.classList.remove('open');
  }

  function cleanup(board) {
    if (!board) return;
    board.classList.remove(
      'pmk-fast-three-days','pmk-fast-week','pmk-month-table-v82-7',
      'pmk-month-counter-grid-v82-9','pmk-month-board-v82-10','pmk-week-board-v82-10',
      'pmk-week-only-v82-16','pmk-month-only-v82-16'
    );
    $('#pmkMonthWeekdays')?.remove();
    $('#pmkMonthWeekdaysV8216')?.remove();
    $$('.pmk-month-count-v82-9,.pmk-month-count-v82-10,.pmk-month-count-v82-16', board).forEach(node => node.remove());
    $$('.day-column', board).forEach(column => column.style.removeProperty('grid-column-start'));
  }

  function dayCount(dateKey) {
    try {
      if (typeof getAllEvents !== 'function' || typeof eventDateKey !== 'function') return 0;
      return getAllEvents().filter(event => eventDateKey(event) === dateKey).length;
    } catch {
      return 0;
    }
  }

  function countWord(total) {
    const mod10 = total % 10;
    const mod100 = total % 100;
    if (mod10 === 1 && mod100 !== 11) return 'точка';
    if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return 'точки';
    return 'точек';
  }

  function firstColumn(dateKey) {
    const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return day === 0 ? 7 : day;
  }

  function renderWeek() {
    const board = $('#weekEvents');
    if (!board) return;
    cleanup(board);
    board.classList.add('pmk-week-only-v82-16');
    $('#view-week')?.classList.remove('pmk-month-only-view-v82-16');
  }

  function renderMonth() {
    const board = $('#weekEvents');
    if (!board) return;
    cleanup(board);
    board.classList.add('pmk-month-only-v82-16');
    $('#view-week')?.classList.add('pmk-month-only-view-v82-16');

    const weekdays = document.createElement('div');
    weekdays.id = 'pmkMonthWeekdaysV8216';
    weekdays.className = 'pmk-month-weekdays-v82-16';
    weekdays.innerHTML = '<span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>';
    board.insertAdjacentElement('beforebegin', weekdays);

    const columns = $$('.day-column', board);
    columns.forEach((column, index) => {
      const open = $('[data-open-day]', column);
      const dateKey = open?.dataset.openDay || '';
      if (!dateKey) return;
      if (index === 0) column.style.gridColumnStart = String(firstColumn(dateKey));

      const total = dayCount(dateKey);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pmk-month-count-v82-16';
      button.innerHTML = `<strong>${total}</strong><small>${countWord(total)}</small>`;
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof state !== 'undefined') {
          state.selectedDayKey = dateKey;
          state.periodAnchorKey = dateKey;
        }
        if (typeof setView === 'function') setView('day');
      });
      column.appendChild(button);
    });
  }

  function enforce() {
    frame = 0;
    const mode = view();
    if (!PERIODS.has(mode)) return;
    showPeriodScreen(mode);
    if (mode === 'month') renderMonth();
    else renderWeek();
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(enforce);
  }

  function open(mode, push = true) {
    if (!PERIODS.has(mode) || busy) return;
    busy = true;
    try {
      ensureAnchor();
      if (typeof state !== 'undefined') state.currentView = mode;
      showPeriodScreen(mode);
      if (typeof renderAll === 'function') renderAll();
      showPeriodScreen(mode);
      enforce();
      if (push && typeof pushAppHistory === 'function') pushAppHistory(mode);
    } finally {
      busy = false;
    }
    setTimeout(schedule, 0);
    setTimeout(schedule, 150);
    setTimeout(schedule, 500);
  }

  function bind() {
    document.addEventListener('click', event => {
      const item = event.target.closest('.nav-item[data-view="week"],.nav-item[data-view="month"]');
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      open(item.dataset.view);
    }, true);

    document.addEventListener('click', event => {
      if (event.target.closest('#prevPeriodBtn,#nextPeriodBtn,[data-add-day],[data-open-day]')) {
        setTimeout(schedule, 0);
        setTimeout(schedule, 180);
      }
    }, true);
  }

  function hookSetView() {
    if (typeof setView !== 'function' || setView.__pmkPeriodOnlyV8216) return;
    const previous = setView;
    const wrapped = function setViewV8216(mode, ...args) {
      if (PERIODS.has(mode)) {
        open(mode);
        return;
      }
      const result = previous(mode, ...args);
      schedule();
      return result;
    };
    wrapped.__pmkPeriodOnlyV8216 = true;
    wrapped.__pmkFinalV829 = true;
    wrapped.__pmkFastV827 = true;
    globalThis.setView = wrapped;
  }

  function watch() {
    if (observer) return;
    const root = $('#view-week') || $('.main-content') || document.body;
    observer = new MutationObserver(mutations => {
      if (!PERIODS.has(view())) return;
      const changed = mutations.some(mutation => mutation.type === 'childList' && (
        mutation.target.id === 'weekEvents'
        || mutation.target.closest?.('#weekEvents')
        || [...mutation.addedNodes].some(node => node.nodeType === 1 && node.querySelector?.('#weekEvents,.day-column'))
      ));
      if (changed) schedule();
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  function boot() {
    bind();
    hookSetView();
    watch();
    schedule();
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      hookSetView();
      if (PERIODS.has(view())) enforce();
      if (tries >= 80) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
