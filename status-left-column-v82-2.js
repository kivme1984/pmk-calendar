'use strict';

(() => {
  if (globalThis.PMK_STATUS_LEFT_COLUMN_V82_2) return;
  globalThis.PMK_STATUS_LEFT_COLUMN_V82_2 = true;

  const CARD_SELECTOR = '.event-card';
  let scheduled = false;
  let observer = null;

  function installBadge() {
    let badge = document.querySelector('#pmkV822Badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'pmkV822Badge';
      badge.className = 'pmk-v82-2-badge';
      document.body.appendChild(badge);
    }
    badge.textContent = globalThis.PMK_WORKFLOW_CARDS_V82_3 ? 'ТЕСТ 82.3' : 'ТЕСТ 82.2';
  }

  function moveStatuses(card) {
    if (!card || card.closest('#weekEvents')) return;
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
    installBadge();
    document.querySelectorAll(CARD_SELECTOR).forEach(moveStatuses);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyAll);
  }

  function watch() {
    if (observer) return;
    const root = document.querySelector('.main-content') || document.body;
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

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      applyAll();
      if (document.querySelector('.pmk-status-left-card-v82-2') || attempts > 120) clearInterval(timer);
    }, 80);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
