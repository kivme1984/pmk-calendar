'use strict';

(() => {
  if (globalThis.PMK_FINAL_PERIOD_LOCK_V82_13) return;
  globalThis.PMK_FINAL_PERIOD_LOCK_V82_13 = true;
  document.documentElement.dataset.pmkCandidate = '82.13';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const PERIOD_VIEWS = new Set(['week', 'month']);
  let frame = 0;
  let observer = null;
  let switching = false;
  let mutating = false;

  function currentView() {
    return typeof state !== 'undefined' ? state.currentView : 'day';
  }

  function ensureAnchor() {
    if (typeof state === 'undefined') return;
    if (!state.periodAnchorKey) state.periodAnchorKey = state.selectedDayKey || (typeof businessTodayKey === 'function' ? businessTodayKey() : new Date().toISOString().slice(0, 10));
  }

  function setVisiblePeriodView(view) {
    $$('.view').forEach(section => section.classList.toggle('active', section.id === 'view-week'));
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
    $('#sidebar')?.classList.remove('open');
  }

  function monthOffset(dateKey) {
    const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return day === 0 ? 7 : day;
  }

  function eventCountForDay(dateKey) {
    try {
      if (typeof getAllEvents !== 'function' || typeof eventDateKey !== 'function') return 0;
      return getAllEvents().filter(event => eventDateKey(event) === dateKey).length;
    } catch {
      return 0;
    }
  }

  function countLabel(total) {
    const mod10 = total % 10;
    const mod100 = total % 100;
    if (mod10 === 1 && mod100 !== 11) return 'точка';
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'точки';
    return 'точек';
  }

  function clearForeignDecorations(board) {
    board.classList.remove(
      'pmk-fast-three-days', 'pmk-fast-week',
      'pmk-month-table-v82-7', 'pmk-month-counter-grid-v82-9', 'pmk-month-board-v82-10',
      'pmk-week-board-v82-10'
    );
    $('#pmkMonthWeekdays')?.remove();
    $$('.pmk-month-count-v82-9,.pmk-month-count-v82-10', board).forEach(node => node.remove());
  }

  function clearMonthV8213(board) {
    $('#pmkMonthWeekdaysV8213')?.remove();
    $$('.pmk-month-count-v82-13', board).forEach(node => node.remove());
    $$('.day-column', board).forEach(column => column.style.removeProperty('grid-column-start'));
    board.classList.remove('pmk-month-board-v82-13');
    $('#view-week')?.classList.remove('pmk-month-view-v82-13');
  }

  function renderWeek(board) {
    const alreadyReady = board.classList.contains('pmk-week-board-v82-13')
      && !$('#pmkMonthWeekdaysV8213')
      && !$('.pmk-month-count-v82-13', board);
    if (alreadyReady) return;

    mutating = true;
    clearForeignDecorations(board);
    clearMonthV8213(board);
    board.classList.add('pmk-week-board-v82-13');
    $('#view-week')?.classList.remove('pmk-month-view-v82-7', 'pmk-month-counter-view-v82-9');
    setTimeout(() => { mutating = false; }, 0);
  }

  function ensureMonthWeekdays(board) {
    let weekdays = $('#pmkMonthWeekdaysV8213');
    if (weekdays) return weekdays;
    weekdays = document.createElement('div');
    weekdays.id = 'pmkMonthWeekdaysV8213';
    weekdays.className = 'pmk-month-weekdays-v82-13';
    weekdays.innerHTML = '<span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>';
    board.insertAdjacentElement('beforebegin', weekdays);
    return weekdays;
  }

  function buildMonthCounts(board) {
    const columns = $$('.day-column', board);
    columns.forEach((column, index) => {
      const open = $('[data-open-day]', column);
      const dateKey = open?.dataset.openDay || '';
      if (!dateKey) return;
      if (index === 0) column.style.gridColumnStart = String(monthOffset(dateKey));
      else column.style.removeProperty('grid-column-start');

      let count = $('.pmk-month-count-v82-13', column);
      if (!count) {
        count = document.createElement('button');
        count.type = 'button';
        count.className = 'pmk-month-count-v82-13';
        count.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          const key = count.dataset.dateKey;
          if (typeof state !== 'undefined') {
            state.selectedDayKey = key;
            state.periodAnchorKey = key;
          }
          if (typeof setView === 'function') setView('day');
        });
        column.appendChild(count);
      }
      count.dataset.dateKey = dateKey;
      const total = eventCountForDay(dateKey);
      const signature = `${dateKey}:${total}`;
      if (count.dataset.signature !== signature) {
        count.dataset.signature = signature;
        count.innerHTML = `<strong>${total}</strong><small>${countLabel(total)}</small>`;
      }
    });
  }

  function renderMonth(board) {
    const columns = $$('.day-column', board);
    const ready = board.classList.contains('pmk-month-board-v82-13')
      && Boolean($('#pmkMonthWeekdaysV8213'))
      && $$('.pmk-month-count-v82-13', board).length === columns.length;

    if (!ready) {
      mutating = true;
      clearForeignDecorations(board);
      board.classList.remove('pmk-week-board-v82-13');
      clearMonthV8213(board);
      board.classList.add('pmk-month-board-v82-13');
      $('#view-week')?.classList.add('pmk-month-view-v82-13');
      ensureMonthWeekdays(board);
      buildMonthCounts(board);
      setTimeout(() => { mutating = false; }, 0);
      return;
    }

    buildMonthCounts(board);
  }

  function enforcePeriod() {
    frame = 0;
    const view = currentView();
    if (!PERIOD_VIEWS.has(view)) return;
    setVisiblePeriodView(view);
    const board = $('#weekEvents');
    if (!board) return;
    if (view === 'month') renderMonth(board);
    else renderWeek(board);
  }

  function scheduleEnforce() {
    if (frame) return;
    frame = requestAnimationFrame(enforcePeriod);
  }

  function openPeriod(view, pushHistory = true) {
    if (!PERIOD_VIEWS.has(view) || switching) return;
    switching = true;
    try {
      ensureAnchor();
      if (typeof state !== 'undefined') state.currentView = view;
      setVisiblePeriodView(view);
      if (typeof renderAll === 'function') renderAll();
      setVisiblePeriodView(view);
      enforcePeriod();
      if (pushHistory && typeof pushAppHistory === 'function') pushAppHistory(view);
    } finally {
      switching = false;
    }
    setTimeout(scheduleEnforce, 0);
    setTimeout(scheduleEnforce, 120);
    setTimeout(scheduleEnforce, 500);
  }

  function bindNavigation() {
    if (document.documentElement.dataset.pmkPeriodV8213Bound === '1') return;
    document.documentElement.dataset.pmkPeriodV8213Bound = '1';

    document.addEventListener('click', event => {
      const item = event.target.closest('.nav-item[data-view="week"],.nav-item[data-view="month"]');
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openPeriod(item.dataset.view);
    }, true);

    window.addEventListener('popstate', () => {
      const view = String(location.hash || '').replace('#', '');
      if (PERIOD_VIEWS.has(view)) setTimeout(() => openPeriod(view, false), 0);
    });

    document.addEventListener('click', event => {
      if (event.target.closest('#prevPeriodBtn,#nextPeriodBtn,[data-add-day],[data-open-day]')) {
        setTimeout(scheduleEnforce, 0);
        setTimeout(scheduleEnforce, 180);
      }
    }, true);
  }

  function installSetViewHook() {
    if (typeof setView !== 'function' || setView.__pmkPeriodLockV8213) return;
    const previous = setView;
    const wrapped = function setViewV8213(view, ...args) {
      if (PERIOD_VIEWS.has(view)) {
        openPeriod(view);
        return;
      }
      const result = previous(view, ...args);
      scheduleEnforce();
      return result;
    };
    wrapped.__pmkPeriodLockV8213 = true;
    wrapped.__pmkFinalV829 = true;
    wrapped.__pmkFastV827 = true;
    globalThis.setView = wrapped;
  }

  function watchBoard() {
    if (observer) return;
    const root = $('#view-week') || $('.main-content') || document.body;
    observer = new MutationObserver(mutations => {
      if (mutating || !PERIOD_VIEWS.has(currentView())) return;
      const relevant = mutations.some(mutation => mutation.type === 'childList' && (
        mutation.target.id === 'weekEvents' ||
        mutation.target.closest?.('#weekEvents') ||
        [...mutation.addedNodes].some(node => node.nodeType === 1 && (node.id === 'weekEvents' || node.querySelector?.('#weekEvents,.day-column')))
      ));
      if (relevant) scheduleEnforce();
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  function boot() {
    bindNavigation();
    installSetViewHook();
    watchBoard();
    scheduleEnforce();

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installSetViewHook();
      if (PERIOD_VIEWS.has(currentView())) enforcePeriod();
      if (attempts >= 80) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
