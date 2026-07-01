'use strict';

(() => {
  if (globalThis.PMK_STATUS_LEFT_COLUMN_V82_2) return;
  globalThis.PMK_STATUS_LEFT_COLUMN_V82_2 = true;

  const CARD_SELECTOR = '.event-card[data-event-card]';
  let scheduled = false;
  let observer = null;

  function moveStatuses(card) {
    if (!card) return;
    const time = card.querySelector('.event-time');
    const actions = card.querySelector('.event-actions');
    const statusRow = card.querySelector('.status-row');
    if (!time || !actions || !statusRow) return;

    card.classList.add('pmk-status-left-card-v82-2');
    time.classList.add('pmk-status-left-time-v82-2');
    actions.classList.add('pmk-status-left-actions-v82-2');
    statusRow.classList.add('pmk-status-left-stack-v82-2');

    if (statusRow.parentElement !== time) time.appendChild(statusRow);
  }

  function applyAll() {
    scheduled = false;
    document.querySelectorAll(CARD_SELECTOR).forEach(moveStatuses);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyAll);
  }

  function watch() {
    if (observer) return;
    const root = document.querySelector('#todayEvents') || document.querySelector('.main-content') || document.body;
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
  }

  function boot() {
    applyAll();
    watch();
    [
      'pmk-calendar-sync-done',
      'pmk-calendar-sync-error',
      'pmk-status-ledger-updated',
      'resize',
      'popstate',
    ].forEach(name => globalThis.addEventListener(name, schedule));

    document.addEventListener('click', event => {
      if (event.target.closest('[data-status-event],.nav-item,[data-open-day]')) setTimeout(schedule, 0);
    }, true);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
