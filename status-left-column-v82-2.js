'use strict';

(() => {
  globalThis.PMK_STATUS_LEFT_COLUMN_V82_2 = true;
  globalThis.PMK_STATUS_LEFT_COLUMN_DISABLED_V82_39 = true;
  globalThis.PMK_STATUS_UNDER_DATE_ROW_V82_41 = true;
  globalThis.PMK_STATUS_IN_DATE_COLUMN_V82_42 = true;
  globalThis.PMK_DAY_CARD_TIGHT_V82_43 = true;
  globalThis.PMK_DAY_CARD_THIN_STATUS_V82_45 = true;
  globalThis.PMK_DAY_CARD_1_5X_BUTTONS_V82_46 = true;
  globalThis.PMK_BOTTOM_ACTIONS_THINNER_V82_46 = true;
  globalThis.PMK_STATUS_LEFT_NO_JUMP_V82_20_7 = true;

  function injectStyle() {
    if (document.getElementById('pmkDayCardButtonsCorrectV8246Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkDayCardButtonsCorrectV8246Styles';
    style.textContent = `
      .event-card.pmk-card-tight-v82-43{align-items:start!important;gap:10px!important;padding:12px!important;margin-bottom:12px!important}
      .event-card.pmk-card-tight-v82-43>.event-time{display:grid!important;align-content:start!important;justify-content:stretch!important;gap:1px!important;min-height:0!important;height:auto!important;padding-top:12px!important;padding-bottom:10px!important}
      .event-card.pmk-card-tight-v82-43>.event-main{gap:7px!important;min-width:0!important}
      .event-card.pmk-card-tight-v82-43 .event-card-header{gap:7px!important;margin:0!important}
      .event-card.pmk-card-tight-v82-43 .event-card-header h3{margin:0!important;line-height:1.12!important}
      .event-card.pmk-card-tight-v82-43 .contract-chip{min-height:34px!important;padding:6px 11px!important}
      .event-card.pmk-card-tight-v82-43 .event-quick-badges{gap:5px!important;margin:0!important}
      .event-card.pmk-card-tight-v82-43 .quick-badge{min-height:26px!important;padding:4px 9px!important;line-height:1.05!important}
      .event-card.pmk-card-tight-v82-43 .address-block{min-height:38px!important;padding:8px 11px!important;margin:0!important;line-height:1.15!important}
      .event-card.pmk-card-tight-v82-43 .event-comment{padding:8px 10px!important;margin:0!important;gap:6px!important;min-height:0!important}
      .event-card.pmk-card-tight-v82-43 .event-comment p{margin:0!important;line-height:1.18!important;max-height:42px!important;overflow:hidden!important}
      .event-card.pmk-card-tight-v82-43 .event-actions{margin-top:5px!important;gap:5px!important}
      .event-card.pmk-card-tight-v82-43 .action-row{gap:6px!important;margin:0!important}
      .event-card.pmk-card-tight-v82-43 .mini-button,.event-card.pmk-card-tight-v82-43 .menu-button,.event-card.pmk-card-tight-v82-43 .primary-card-action,.event-card.pmk-card-tight-v82-43 .secondary-card-action,.event-card.pmk-card-tight-v82-43 .card-menu summary{min-height:34px!important;height:34px!important;max-height:34px!important;padding-top:0!important;padding-bottom:0!important;border-radius:12px!important;line-height:1!important}
      .event-card.pmk-card-tight-v82-43 .event-actions>.status-row{display:none!important}
      .event-card.pmk-card-tight-v82-43>.pmk-status-under-date-row-v82-41{display:none!important}
      .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46{display:flex!important;flex-direction:column!important;justify-content:flex-start!important;align-content:flex-start!important;align-items:stretch!important;gap:4px!important;row-gap:4px!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;flex:0 0 auto!important;justify-self:stretch!important;align-self:start!important;margin:9px 0 0!important;padding:0!important;border:0!important;grid-template-columns:none!important;grid-template-rows:none!important}
      .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46 .status-action{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;min-height:27px!important;height:27px!important;max-height:27px!important;flex:0 0 27px!important;margin:0!important;padding:0 6px!important;border-radius:8px!important;font-size:8.6px!important;line-height:1!important;font-weight:900!important;white-space:normal!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:center!important}
      @media(max-width:760px){
        .event-card.pmk-card-tight-v82-43{grid-template-columns:90px minmax(0,1fr)!important;gap:8px!important;padding:10px!important;margin-bottom:10px!important}
        .event-card.pmk-card-tight-v82-43>.event-time{width:90px!important;min-width:90px!important;min-height:0!important;height:auto!important;padding-top:10px!important;padding-bottom:8px!important}
        .event-card.pmk-card-tight-v82-43>.event-main{gap:6px!important}
        .event-card.pmk-card-tight-v82-43 .event-card-header{gap:6px!important}
        .event-card.pmk-card-tight-v82-43 .contract-chip{min-height:31px!important;padding:5px 9px!important}
        .event-card.pmk-card-tight-v82-43 .quick-badge{min-height:24px!important;padding:4px 7px!important}
        .event-card.pmk-card-tight-v82-43 .address-block{min-height:34px!important;padding:7px 9px!important}
        .event-card.pmk-card-tight-v82-43 .event-comment{padding:7px 9px!important}
        .event-card.pmk-card-tight-v82-43 .event-actions{margin-top:4px!important;gap:4px!important}
        .event-card.pmk-card-tight-v82-43 .mini-button,.event-card.pmk-card-tight-v82-43 .menu-button,.event-card.pmk-card-tight-v82-43 .primary-card-action,.event-card.pmk-card-tight-v82-43 .secondary-card-action,.event-card.pmk-card-tight-v82-43 .card-menu summary{min-height:34px!important;height:34px!important;max-height:34px!important;padding-top:0!important;padding-bottom:0!important;border-radius:10px!important}
        .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46{display:flex!important;flex-direction:column!important;justify-content:flex-start!important;align-items:stretch!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;gap:4px!important;row-gap:4px!important;margin-top:8px!important;flex:0 0 auto!important}
        .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46 .status-action{min-height:26px!important;height:26px!important;max-height:26px!important;flex:0 0 26px!important;font-size:8px!important;border-radius:7px!important;padding:0 5px!important;margin:0!important}
      }
    `;
    document.head.appendChild(style);
  }

  function moveStatuses(card) {
    if (!card || card.closest('#weekEvents')) return;
    const time = card.querySelector('.event-time');
    const statusRow = card.querySelector('.status-row');
    if (!time || !statusRow || statusRow.parentElement === time) return;
    card.classList.add('pmk-status-in-date-column-v82-42', 'pmk-card-tight-v82-43');
    statusRow.classList.add('pmk-status-in-date-row-v82-46');
    time.appendChild(statusRow);
  }

  function applyAll() {
    injectStyle();
    document.querySelectorAll('.event-card:not(.pmk-card-tight-v82-43)').forEach(moveStatuses);
  }

  function boot() {
    injectStyle();
    requestAnimationFrame(applyAll);
    ['pmk-calendar-sync-done', 'pmk-calendar-sync-error', 'popstate'].forEach(name => globalThis.addEventListener(name, () => requestAnimationFrame(applyAll)));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
