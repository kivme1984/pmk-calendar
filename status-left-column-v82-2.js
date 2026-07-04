'use strict';

(() => {
  globalThis.PMK_STATUS_LEFT_COLUMN_V82_2 = true;
  globalThis.PMK_STATUS_LEFT_COLUMN_DISABLED_V82_39 = true;

  function restoreCard(card) {
    if (!card) return;
    const time = card.querySelector('.event-time');
    const actions = card.querySelector('.event-actions');
    const statusRow = card.querySelector('.status-row');
    if (actions && statusRow && statusRow.parentElement !== actions) {
      actions.insertBefore(statusRow, actions.firstChild);
    }
    card.classList.remove('pmk-status-left-card-v82-2');
    time?.classList.remove('pmk-status-left-time-v82-2');
    actions?.classList.remove('pmk-status-left-actions-v82-2');
    statusRow?.classList.remove('pmk-status-left-stack-v82-2');
  }

  function restoreAll() {
    document.getElementById('pmkV822Badge')?.remove();
    document.querySelectorAll('.event-card').forEach(restoreCard);
  }

  function boot() {
    restoreAll();
    const root = document.querySelector('.main-content') || document.body;
    const observer = new MutationObserver(() => requestAnimationFrame(restoreAll));
    observer.observe(root, { childList: true, subtree: true });
    ['pmk-calendar-sync-done', 'pmk-calendar-sync-error', 'resize', 'popstate'].forEach(name => {
      globalThis.addEventListener(name, restoreAll);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
