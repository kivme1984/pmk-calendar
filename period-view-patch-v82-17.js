'use strict';

(() => {
  if (globalThis.PMK_PERIOD_VIEW_PATCH_V82_17) return;
  globalThis.PMK_PERIOD_VIEW_PATCH_V82_17 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let scheduled = false;

  function currentView() {
    return typeof state !== 'undefined' ? state.currentView : '';
  }

  function clearPatch(board) {
    board.classList.remove('pmk-week-view-v82-17', 'pmk-month-view-v82-17');
    $('#pmkMonthWeekdaysV8217')?.remove();
    $$('.pmk-month-count-v82-17', board).forEach(node => node.remove());
    $$('.day-column', board).forEach(column => column.style.removeProperty('grid-column-start'));
  }

  function clearOlderMonthDecorations(board) {
    $('#pmkMonthWeekdays')?.remove();
    $$('.pmk-month-count-v82-9,.pmk-month-count-v82-10,.pmk-month-count-v82-13,.pmk-month-count-v82-16', board)
      .forEach(node => node.remove());
    board.classList.remove(
      'pmk-month-table-v82-7',
      'pmk-month-counter-grid-v82-9',
      'pmk-month-board-v82-10',
      'pmk-month-board-v82-13',
      'pmk-month-only-v82-16'
    );
  }

  function firstColumn(dateKey) {
    const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return weekday === 0 ? 7 : weekday;
  }

  function countFromHeading(openButton) {
    const text = $('span', openButton)?.textContent || '';
    const match = text.match(/\d+/);
    return Number(match?.[0] || 0);
  }

  function pointWord(total) {
    const mod10 = total % 10;
    const mod100 = total % 100;
    if (mod10 === 1 && mod100 !== 11) return 'точка';
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'точки';
    return 'точек';
  }

  function addMonthHeader(board) {
    const header = document.createElement('div');
    header.id = 'pmkMonthWeekdaysV8217';
    header.className = 'pmk-month-weekdays-v82-17';
    header.innerHTML = '<span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>';
    board.insertAdjacentElement('beforebegin', header);
  }

  function decorateMonth(board) {
    board.classList.add('pmk-month-view-v82-17');
    addMonthHeader(board);

    $$('.day-column', board).forEach((column, index) => {
      const openButton = $('[data-open-day]', column);
      const dateKey = openButton?.dataset.openDay || '';
      if (!dateKey) return;
      if (index === 0) column.style.gridColumnStart = String(firstColumn(dateKey));

      const total = countFromHeading(openButton);
      const counter = document.createElement('button');
      counter.type = 'button';
      counter.className = 'pmk-month-count-v82-17';
      counter.innerHTML = `<strong>${total}</strong><small>${pointWord(total)}</small>`;
      counter.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openButton.click();
      });
      column.appendChild(counter);
    });
  }

  function apply() {
    scheduled = false;
    const board = $('#weekEvents');
    if (!board) return;

    clearPatch(board);
    clearOlderMonthDecorations(board);

    const view = currentView();
    if (view === 'week') {
      board.classList.add('pmk-week-view-v82-17');
      return;
    }
    if (view === 'month') decorateMonth(board);
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(apply));
  }

  function installRenderHook() {
    if (typeof renderAll !== 'function' || renderAll.__pmkPeriodViewV8217) return;
    const previous = renderAll;
    const wrapped = function renderAllPeriodV8217(...args) {
      const result = previous(...args);
      scheduleApply();
      return result;
    };
    wrapped.__pmkPeriodViewV8217 = true;
    globalThis.renderAll = wrapped;
  }

  function boot() {
    installRenderHook();
    apply();

    document.addEventListener('click', event => {
      if (event.target.closest('.nav-item[data-view="week"],.nav-item[data-view="month"],#prevPeriodBtn,#nextPeriodBtn,[data-open-day]')) {
        setTimeout(scheduleApply, 0);
        setTimeout(scheduleApply, 180);
      }
    }, true);

    ['pmk-calendar-sync-done', 'pmk-yandex-sync-done', 'pmk-yandex-sync-error', 'popstate']
      .forEach(name => globalThis.addEventListener(name, scheduleApply));

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installRenderHook();
      if (['week', 'month'].includes(currentView())) apply();
      if (attempts >= 30) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
