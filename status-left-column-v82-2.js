'use strict';

(() => {
  globalThis.PMK_STATUS_LEFT_COLUMN_V82_2 = true;
  globalThis.PMK_STATUS_LEFT_COLUMN_DISABLED_V82_39 = true;
  globalThis.PMK_STATUS_UNDER_DATE_ROW_V82_41 = true;
  globalThis.PMK_STATUS_IN_DATE_COLUMN_V82_42 = true;
  globalThis.PMK_DAY_CARD_TIGHT_V82_43 = true;
  globalThis.PMK_DAY_CARD_THIN_STATUS_V82_45 = true;
  globalThis.PMK_DAY_CARD_1_5X_BUTTONS_V82_46 = true;

  function injectStyle() {
    document.getElementById('pmkStatusUnderDateV8241Styles')?.remove();
    document.getElementById('pmkStatusInDateColumnV8242Styles')?.remove();
    document.getElementById('pmkDayCardTightV8243Styles')?.remove();
    document.getElementById('pmkDayCardThinStatusV8245Styles')?.remove();
    if (document.getElementById('pmkDayCardButtons15xV8246Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkDayCardButtons15xV8246Styles';
    style.textContent = `
      .event-card.pmk-card-tight-v82-43{align-items:start!important;gap:10px!important;padding:12px!important;margin-bottom:12px!important}
      .event-card.pmk-card-tight-v82-43>.event-time{display:grid!important;align-content:start!important;gap:2px!important;min-height:100%!important;padding-top:12px!important;padding-bottom:10px!important}
      .event-card.pmk-card-tight-v82-43>.event-main{gap:7px!important;min-width:0!important}
      .event-card.pmk-card-tight-v82-43 .event-card-header{gap:7px!important;margin:0!important}
      .event-card.pmk-card-tight-v82-43 .event-card-header h3{margin:0!important;line-height:1.12!important}
      .event-card.pmk-card-tight-v82-43 .contract-chip{min-height:34px!important;padding:6px 11px!important}
      .event-card.pmk-card-tight-v82-43 .event-quick-badges{gap:5px!important;margin:0!important}
      .event-card.pmk-card-tight-v82-43 .quick-badge{min-height:26px!important;padding:4px 9px!important;line-height:1.05!important}
      .event-card.pmk-card-tight-v82-43 .address-block{min-height:38px!important;padding:8px 11px!important;margin:0!important;line-height:1.15!important}
      .event-card.pmk-card-tight-v82-43 .event-comment{padding:8px 10px!important;margin:0!important;gap:6px!important;min-height:0!important}
      .event-card.pmk-card-tight-v82-43 .event-comment p{margin:0!important;line-height:1.18!important;max-height:42px!important;overflow:hidden!important}
      .event-card.pmk-card-tight-v82-43 .event-actions{margin-top:6px!important;gap:6px!important}
      .event-card.pmk-card-tight-v82-43 .action-row{gap:6px!important;margin:0!important}
      .event-card.pmk-card-tight-v82-43 .mini-button,.event-card.pmk-card-tight-v82-43 .menu-button{min-height:45px!important;height:45px!important;padding:0 12px!important}
      .event-card.pmk-card-tight-v82-43 .event-actions>.status-row{display:none!important}
      .event-card.pmk-card-tight-v82-43>.pmk-status-under-date-row-v82-41{display:none!important}
      .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46{display:grid!important;grid-template-columns:1fr!important;gap:4px!important;width:100%!important;justify-self:stretch!important;margin:9px 0 0!important;padding:0!important;border:0!important}
      .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46 .status-action{width:100%!important;min-height:27px!important;height:27px!important;padding:0 6px!important;border-radius:8px!important;font-size:8.6px!important;line-height:1!important;font-weight:900!important;white-space:normal!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:center!important}
      @media(max-width:760px){
        .event-card.pmk-card-tight-v82-43{grid-template-columns:90px minmax(0,1fr)!important;gap:8px!important;padding:10px!important;margin-bottom:10px!important}
        .event-card.pmk-card-tight-v82-43>.event-time{width:90px!important;min-width:90px!important;padding-top:10px!important;padding-bottom:8px!important}
        .event-card.pmk-card-tight-v82-43>.event-main{gap:6px!important}
        .event-card.pmk-card-tight-v82-43 .event-card-header{gap:6px!important}
        .event-card.pmk-card-tight-v82-43 .contract-chip{min-height:31px!important;padding:5px 9px!important}
        .event-card.pmk-card-tight-v82-43 .quick-badge{min-height:24px!important;padding:4px 7px!important}
        .event-card.pmk-card-tight-v82-43 .address-block{min-height:34px!important;padding:7px 9px!important}
        .event-card.pmk-card-tight-v82-43 .event-comment{padding:7px 9px!important}
        .event-card.pmk-card-tight-v82-43 .event-actions{margin-top:5px!important;gap:5px!important}
        .event-card.pmk-card-tight-v82-43 .mini-button,.event-card.pmk-card-tight-v82-43 .menu-button{min-height:42px!important;height:42px!important;padding:0 10px!important}
        .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46{width:100%!important;gap:4px!important;margin-top:8px!important}
        .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46 .status-action{min-height:26px!important;height:26px!important;font-size:8px!important;border-radius:7px!important;padding:0 5px!important}
      }
      @media(max-width:390px){
        .event-card.pmk-card-tight-v82-43{grid-template-columns:84px minmax(0,1fr)!important;gap:7px!important;padding:9px!important}
        .event-card.pmk-card-tight-v82-43>.event-time{width:84px!important;min-width:84px!important}
        .event-card.pmk-card-tight-v82-43 .mini-button,.event-card.pmk-card-tight-v82-43 .menu-button{min-height:39px!important;height:39px!important;padding:0 8px!important}
        .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46{width:100%!important;gap:3px!important;margin-top:7px!important}
        .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46 .status-action{font-size:7.5px!important;min-height:25px!important;height:25px!important;padding:0 5px!important}
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
    card.classList.remove('pmk-status-left-card-v82-2', 'pmk-status-under-date-card-v82-41', 'pmk-status-in-date-column-v82-42');
    time.classList.remove('pmk-status-left-time-v82-2');
    actions.classList.remove('pmk-status-left-actions-v82-2');
    statusRow.classList.remove('pmk-status-left-stack-v82-2', 'pmk-status-under-date-row-v82-41', 'pmk-status-in-date-row-v82-42', 'pmk-status-in-date-row-v82-43', 'pmk-status-in-date-row-v82-44');

    card.classList.add('pmk-status-in-date-column-v82-42', 'pmk-card-tight-v82-43');
    statusRow.classList.add('pmk-status-in-date-row-v82-46');
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
