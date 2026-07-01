'use strict';

(() => {
  if (globalThis.PMK_DIRECT_STATUS_LAYOUT_V92) return;
  globalThis.PMK_DIRECT_STATUS_LAYOUT_V92 = true;

  const media = globalThis.matchMedia?.('(max-width: 760px)');
  let scheduled = false;

  function apply() {
    scheduled = false;
    if (!(media?.matches ?? globalThis.innerWidth <= 760)) return;

    document.querySelectorAll('.event-card[data-event-card]').forEach(card => {
      const time = card.querySelector('.event-time');
      const status = card.querySelector('.event-status-grid-v85, .event-time-statuses, .status-row');
      if (!time || !status) return;
      if (status.parentElement !== time) time.append(status);
      status.classList.add('pmk-direct-status-column-v92');
      card.classList.add('pmk-direct-status-card-v92');
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  function install() {
    apply();
    const root = document.querySelector('#todayEvents') || document.body;
    if (root) new MutationObserver(schedule).observe(root, { childList:true, subtree:true });
    media?.addEventListener?.('change', schedule);
    globalThis.addEventListener('pmk-calendar-sync-done', schedule);
    globalThis.addEventListener('pmk-yandex-sync-done', schedule);
    globalThis.addEventListener('pmk-status-ledger-updated', schedule);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
