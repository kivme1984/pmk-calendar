'use strict';

(() => {
  globalThis.PMK_STATUS_LEFT_COLUMN_V82_2 = true;
  globalThis.PMK_STATUS_LEFT_COLUMN_DISABLED_V82_39 = true;
  globalThis.PMK_STATUS_UNDER_DATE_ROW_V82_41 = true;

  function injectStyle() {
    if (document.getElementById('pmkStatusUnderDateV8241Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkStatusUnderDateV8241Styles';
    style.textContent = `
      .event-card.pmk-status-under-date-card-v82-41{align-items:start!important;grid-template-columns:110px minmax(0,1fr) auto!important;grid-template-areas:"time main actions" "status status status"!important;row-gap:10px!important}
      .event-card.pmk-status-under-date-card-v82-41>.event-time{grid-area:time!important}
      .event-card.pmk-status-under-date-card-v82-41>.event-main{grid-area:main!important}
      .event-card.pmk-status-under-date-card-v82-41>.event-actions{grid-area:actions!important;min-width:260px!important}
      .event-card.pmk-status-under-date-card-v82-41>.pmk-status-under-date-row-v82-41{grid-area:status!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;width:100%!important;margin:0!important;padding:8px 0 0!important;border-top:1px solid var(--line)!important}
      .event-card.pmk-status-under-date-card-v82-41>.pmk-status-under-date-row-v82-41 .status-action{min-height:34px!important;padding:6px 8px!important;border-radius:11px!important;font-size:11px!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .event-card.pmk-status-under-date-card-v82-41 .pmk-status-left-stack-v82-2{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important}
      .event-card.pmk-status-under-date-card-v82-41 .event-actions>.status-row{display:none!important}
      @media(max-width:760px){
        .event-card.pmk-status-under-date-card-v82-41{grid-template-columns:96px minmax(0,1fr)!important;grid-template-areas:"time main" "status status" "actions actions"!important;gap:10px!important;row-gap:8px!important}
        .event-card.pmk-status-under-date-card-v82-41>.event-actions{min-width:0!important;width:100%!important}
        .event-card.pmk-status-under-date-card-v82-41>.pmk-status-under-date-row-v82-41{gap:4px!important;padding-top:7px!important}
        .event-card.pmk-status-under-date-card-v82-41>.pmk-status-under-date-row-v82-41 .status-action{min-height:31px!important;padding:5px 5px!important;border-radius:9px!important;font-size:9.5px!important}
      }
      @media(max-width:390px){
        .event-card.pmk-status-under-date-card-v82-41{grid-template-columns:88px minmax(0,1fr)!important}
        .event-card.pmk-status-under-date-card-v82-41>.pmk-status-under-date-row-v82-41 .status-action{font-size:8.8px!important;padding-left:3px!important;padding-right:3px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function moveStatuses(card) {
    if (!card || card.closest('#weekEvents')) return;
    const time = card.querySelector('.event-time');
    const main = card.querySelector('.event-main');
    const actions = card.querySelector('.event-actions');
    const statusRow = card.querySelector('.status-row');
    if (!time || !main || !actions || !statusRow) return;

    document.getElementById('pmkV822Badge')?.remove();
    card.classList.remove('pmk-status-left-card-v82-2');
    time.classList.remove('pmk-status-left-time-v82-2');
    actions.classList.remove('pmk-status-left-actions-v82-2');
    statusRow.classList.remove('pmk-status-left-stack-v82-2');

    card.classList.add('pmk-status-under-date-card-v82-41');
    statusRow.classList.add('pmk-status-under-date-row-v82-41');
    if (statusRow.parentElement !== card) {
      actions.insertAdjacentElement('afterend', statusRow);
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
