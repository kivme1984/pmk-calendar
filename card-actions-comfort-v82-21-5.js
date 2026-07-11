'use strict';

(() => {
  if (globalThis.PMK_CARD_ACTIONS_EQUAL_V82_21_5) return;
  globalThis.PMK_CARD_ACTIONS_EQUAL_V82_21_5 = true;

  function inject() {
    document.getElementById('pmkCardActionsEqualV8215')?.remove();
    const style = document.createElement('style');
    style.id = 'pmkCardActionsEqualV8215';
    style.textContent = `
      .event-card .event-actions .manage-row,
      #todayEvents .event-card .event-actions .manage-row,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row{
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:8px!important;
        align-items:stretch!important;
        width:100%!important;
        margin:10px 0 0!important;
        padding:0!important;
        box-sizing:border-box!important;
      }

      .event-card .event-actions .manage-row > a,
      .event-card .event-actions .manage-row > button,
      .event-card .event-actions .manage-row > details,
      #todayEvents .event-card .event-actions .manage-row > a,
      #todayEvents .event-card .event-actions .manage-row > button,
      #todayEvents .event-card .event-actions .manage-row > details,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row > a,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row > button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row > details{
        width:100%!important;
        min-width:0!important;
        max-width:none!important;
        height:54px!important;
        min-height:54px!important;
        max-height:54px!important;
        margin:0!important;
        padding:0!important;
        box-sizing:border-box!important;
      }

      .event-card .event-actions .manage-row .mini-button,
      .event-card .event-actions .manage-row .call-button,
      .event-card .event-actions .manage-row .open-button,
      .event-card .event-actions .manage-row .menu-button,
      .event-card .event-actions .manage-row .card-menu > summary,
      #todayEvents .event-card .event-actions .manage-row .mini-button,
      #todayEvents .event-card .event-actions .manage-row .call-button,
      #todayEvents .event-card .event-actions .manage-row .open-button,
      #todayEvents .event-card .event-actions .manage-row .menu-button,
      #todayEvents .event-card .event-actions .manage-row .card-menu > summary,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row .mini-button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row .call-button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row .open-button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row .menu-button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row .card-menu > summary{
        width:100%!important;
        min-width:0!important;
        max-width:none!important;
        height:54px!important;
        min-height:54px!important;
        max-height:54px!important;
        padding:0 8px!important;
        border-radius:15px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        box-sizing:border-box!important;
        line-height:1!important;
        font-size:clamp(15px,3.7vw,18px)!important;
        font-weight:950!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
      }

      .event-card .event-actions .manage-row .card-menu,
      #todayEvents .event-card .event-actions .manage-row .card-menu,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row .card-menu{
        display:block!important;
        position:relative!important;
        height:54px!important;
        min-height:54px!important;
        max-height:54px!important;
      }

      .event-card .event-actions .manage-row .menu-button,
      #todayEvents .event-card .event-actions .manage-row .menu-button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row .menu-button{
        font-size:32px!important;
        letter-spacing:0!important;
        padding:0!important;
      }

      @media(max-width:420px){
        .event-card .event-actions .manage-row,
        #todayEvents .event-card .event-actions .manage-row,
        .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row{gap:6px!important;}
        .event-card .event-actions .manage-row .mini-button,
        .event-card .event-actions .manage-row .call-button,
        .event-card .event-actions .manage-row .open-button,
        .event-card .event-actions .manage-row .menu-button,
        .event-card .event-actions .manage-row .card-menu > summary{font-size:14px!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function applyClass() {
    document.querySelectorAll('.event-card .event-actions .manage-row').forEach(row => row.classList.add('pmk-card-actions-equal-v82-21-5'));
  }

  function boot() {
    inject();
    applyClass();
    setTimeout(applyClass, 250);
    setTimeout(applyClass, 900);
    document.addEventListener('click', () => setTimeout(applyClass, 80), true);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
