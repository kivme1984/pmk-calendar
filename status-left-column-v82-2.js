'use strict';

(() => {
  globalThis.PMK_STATUS_LEFT_COLUMN_V82_2 = true;
  globalThis.PMK_STATUS_LEFT_COLUMN_DISABLED_V82_39 = true;
  globalThis.PMK_STATUS_UNDER_DATE_ROW_V82_41 = true;
  globalThis.PMK_STATUS_IN_DATE_COLUMN_V82_42 = true;

  function injectStyle() {
    document.getElementById('pmkStatusUnderDateV8241Styles')?.remove();
    if (document.getElementById('pmkStatusInDateColumnV8242Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkStatusInDateColumnV8242Styles';
    style.textContent = `
      .event-card.pmk-status-in-date-column-v82-42{align-items:start!important}
      .event-card.pmk-status-in-date-column-v82-42>.event-time{display:grid!important;align-content:start!important;gap:4px!important;min-height:100%!important}
      .event-card.pmk-status-in-date-column-v82-42 .pmk-status-in-date-row-v82-42{display:grid!important;grid-template-columns:1fr!important;gap:6px!important;width:100%!important;margin:16px 0 0!important;padding:0!important;border:0!important}
      .event-card.pmk-status-in-date-column-v82-42 .pmk-status-in-date-row-v82-42 .status-action{width:100%!important;min-height:34px!important;padding:5px 4px!important;border-radius:8px!important;font-size:10px!important;line-height:1.05!important;font-weight:900!important;white-space:normal!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:center!important}
      .event-card.pmk-status-in-date-column-v82-42 .event-actions>.status-row{display:none!important}
      .event-card.pmk-status-in-date-column-v82-42>.pmk-status-under-date-row-v82-41{display:none!important}
      @media(max-width:760px){
        .event-card.pmk-status-in-date-column-v82-42{grid-template-columns:96px minmax(0,1fr)!important;gap:10px!important}
        .event-card.pmk-status-in-date-column-v82-42>.event-time{width:96px!important;min-width:96px!important}
        .event-card.pmk-status-in-date-column-v82-42 .pmk-status-in-date-row-v82-42{gap:6px!important;margin-top:14px!important}
        .event-card.pmk-status-in-date-column-v82-42 .pmk-status-in-date-row-v82-42 .status-action{min-height:31px!important;font-size:9px!important;border-radius:7px!important;padding:4px 3px!important}
      }
      @media(max-width:390px){
        .event-card.pmk-status-in-date-column-v82-42{grid-template-columns:88px minmax(0,1fr)!important}
        .event-card.pmk-status-in-date-column-v82-42>.event-time{width:88px!important;min-width:88px!important}
        .event-card.pmk-status-in-date-column-v82-42 .pmk-status-in-date-row-v82-42 .status-action{font-size:8px!important;min-height:29px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function moveStatuses(card) {
    if (!card || card.closest('#weekEvents')) return;
    const time = card.querySelector('.event-time');
    const actions = card.querySelector('.event-actions');
    const statusRow = card.querySelector('.status-row');
    if (!time || !actions || !statusRow) return;

    document.getElementById('pmkV822Badge')?.remove();
    card.classList.remove('pmk-status-left-card-v82-2', 'pmk-status-under-date-card-v82-41');
    time.classList.remove('pmk-status-left-time-v82-2');
    actions.classList.remove('pmk-status-left-actions-v82-2');
    statusRow.classList.remove('pmk-status-left-stack-v82-2', 'pmk-status-under-date-row-v82-41');

    card.classList.add('pmk-status-in-date-column-v82-42');
    statusRow.classList.add('pmk-status-in-date-row-v82-42');
    if (statusRow.parentElement !== time) {
      time.appendChild(statusRow);
    }
  }

  function applyAll() {
    injectStyle();
    document.querySelectorAll('.event-card').forEach(moveStatuses);
  }

  function boot() {
    applyAll();
    const root = document.querySelector('.main-content') || document.body;
    const observer = new MutationObserver(() => requestAnimationFrame(applyAll));
    observer.observe(root, { childList: true, subtree: true });
    ['pmk-calendar-sync-done', 'pmk-calendar-sync-error', 'resize', 'popstate'].forEach(name => {
      globalThis.addEventListener(name, applyAll);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
