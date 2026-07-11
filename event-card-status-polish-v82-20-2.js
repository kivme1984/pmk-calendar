'use strict';
// CSS-only to stop element jumping + PMK_SUMMARY_COUNTERS_V82_20_7

(() => {
  if (globalThis.PMK_EVENT_CARD_STATUS_POLISH_V82_20_2) return;
  globalThis.PMK_EVENT_CARD_STATUS_POLISH_V82_20_2 = true;
  globalThis.PMK_SUMMARY_COUNTERS_V82_20_7 = true;

  let activeFilter = sessionStorage.getItem('pmk-summary-filter-v82-20-7') || 'all';

  function injectStyle() {
    if (document.getElementById('pmkEventCardStatusPolishV82202')) return;
    const style = document.createElement('style');
    style.id = 'pmkEventCardStatusPolishV82202';
    style.textContent = `
      .event-card.pmk-approved-card-v82-20-1,.event-card.pmk-card-tight-v82-43{position:relative!important;}
      .event-card.pmk-status-edge-v82-20-2::before,.event-card.status-pending-pickup::before,.event-card.status-picked-up::before,.event-card.status-pending-delivery::before,.event-card.status-completed::before{content:""!important;position:absolute!important;left:0!important;top:0!important;bottom:0!important;width:5px!important;border-radius:18px 0 0 18px!important;background:var(--pmk-card-status-color,#2d9cdb)!important;z-index:3!important;pointer-events:none!important;}
      .event-card.status-pending-pickup,.event-card.pmk-state-pending-pickup{--pmk-card-status-color:#2d9cdb!important;}
      .event-card.status-picked-up,.event-card.pmk-state-picked-up{--pmk-card-status-color:#f4c430!important;}
      .event-card.status-pending-delivery,.event-card.pmk-state-pending-delivery{--pmk-card-status-color:#9b7ae6!important;}
      .event-card.status-completed,.event-card.pmk-state-completed{--pmk-card-status-color:#168a4a!important;}
      .event-card.pmk-approved-card-v82-20-1 .pmk-status-in-date-row-v82-46,.event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46,#view-today #todayEvents .event-card.pmk-approved-card-v82-20-1 .pmk-status-in-date-row-v82-46,#view-day #todayEvents .event-card.pmk-approved-card-v82-20-1 .pmk-status-in-date-row-v82-46{display:flex!important;flex-direction:column!important;justify-content:flex-start!important;align-items:stretch!important;align-content:flex-start!important;gap:4px!important;row-gap:4px!important;height:auto!important;min-height:0!important;max-height:none!important;flex:0 0 auto!important;}
      .event-card.pmk-approved-card-v82-20-1 .pmk-status-in-date-row-v82-46 .status-action,.event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46 .status-action{margin:0!important;font-weight:900!important;background:#f1f3f2!important;color:#555b60!important;border-color:#e3e6e4!important;box-shadow:none!important;}
      .event-card .status-action.active,.event-card .status-action.pmk-current-status{box-shadow:0 2px 7px rgba(0,0,0,.10)!important;}
      .event-card .status-action.active.status-pending-pickup,.event-card .status-action.pmk-current-status.pmk-status-pending-pickup{background:#bfe6ff!important;color:#064b78!important;border-color:#7fc8f4!important;}
      .event-card .status-action.active.status-picked-up,.event-card .status-action.pmk-current-status.pmk-status-picked-up{background:#ffe58a!important;color:#5f4300!important;border-color:#f4c430!important;}
      .event-card .status-action.active.status-pending-delivery,.event-card .status-action.pmk-current-status.pmk-status-pending-delivery{background:#cbbcff!important;color:#4b2a86!important;border-color:#a990ee!important;}
      .event-card .status-action.active.status-completed,.event-card .status-action.pmk-current-status.pmk-status-completed{background:#168a4a!important;color:#fff!important;border-color:#168a4a!important;}
      .event-card.pmk-approved-card-v82-20-1 .event-time,.event-card.pmk-card-tight-v82-43>.event-time{gap:1px!important;}
      .event-card.pmk-approved-card-v82-20-1 .event-date,.event-card.pmk-card-tight-v82-43 .event-date{margin:0!important;line-height:1.04!important;}
      .event-card.pmk-approved-card-v82-20-1 .event-weekday,.event-card.pmk-card-tight-v82-43 .event-weekday{margin:0 0 -3px!important;line-height:1.02!important;}
      .event-card.pmk-approved-card-v82-20-1 .event-time>strong,.event-card.pmk-card-tight-v82-43>.event-time>strong{margin-top:0!important;line-height:1.05!important;}
      .event-card.pmk-approved-card-v82-20-1 .event-time>span,.event-card.pmk-card-tight-v82-43>.event-time>span{font-weight:850!important;}
      .event-card.pmk-approved-card-v82-20-1 .manage-row .mini-button,.event-card.pmk-approved-card-v82-20-1 .manage-row .call-button,.event-card.pmk-approved-card-v82-20-1 .manage-row .open-button,.event-card.pmk-approved-card-v82-20-1 .manage-row .menu-button,.event-card.pmk-approved-card-v82-20-1 .card-menu>summary,.event-card.pmk-card-tight-v82-43 .mini-button,.event-card.pmk-card-tight-v82-43 .menu-button,.event-card.pmk-card-tight-v82-43 .primary-card-action,.event-card.pmk-card-tight-v82-43 .secondary-card-action,.event-card.pmk-card-tight-v82-43 .card-menu summary{min-height:34px!important;height:34px!important;max-height:34px!important;}

      .summary-card{cursor:pointer!important;transition:border-color .12s ease,box-shadow .12s ease,transform .12s ease!important;}
      .summary-card:active{transform:scale(.985)!important;}
      .summary-card.pmk-summary-active{border-color:#f5b800!important;box-shadow:0 0 0 2px rgba(245,184,0,.18),0 10px 24px rgba(0,0,0,.08)!important;}
      #summaryTotal{color:#111!important;}
      #summaryPickup{color:#2d9cdb!important;}
      #summaryDelivery{color:#7b55c7!important;}
      #summaryAttention{color:#d97706!important;}
      .summary-card[data-pmk-summary="all"].pmk-summary-active strong{color:#111!important;}
      .summary-card[data-pmk-summary="pickup"].pmk-summary-active strong{color:#2d9cdb!important;}
      .summary-card[data-pmk-summary="delivery"].pmk-summary-active strong{color:#7b55c7!important;}
      .summary-card[data-pmk-summary="attention"].pmk-summary-active strong{color:#d97706!important;}
    `;
    document.head.appendChild(style);
  }

  function meta(event) { try { return eventMeta(event); } catch { return {}; } }
  function hasAttention(event) {
    const data = meta(event);
    try { return !data.phone || !displayAddress(data, event); } catch { return !data.phone; }
  }
  function filtered(events) {
    const list = [...events];
    if (activeFilter === 'pickup') return list.filter(event => meta(event).visitType === 'pickup');
    if (activeFilter === 'delivery') return list.filter(event => meta(event).visitType === 'delivery');
    if (activeFilter === 'attention') return list.filter(hasAttention);
    return list;
  }

  function patchRenderToday() {
    if (typeof renderToday !== 'function' || renderToday.__pmkSummaryV82207) return;
    const original = renderToday;
    renderToday = function renderTodayWithSummaryFilter(events) {
      const next = filtered(events);
      return original(next);
    };
    renderToday.__pmkSummaryV82207 = true;
  }

  function decorateSummary() {
    const pairs = [['summaryTotal','all'],['summaryPickup','pickup'],['summaryDelivery','delivery'],['summaryAttention','attention']];
    pairs.forEach(([id, key]) => {
      const number = document.getElementById(id);
      const card = number?.closest('.summary-card');
      if (!card) return;
      card.dataset.pmkSummary = key;
      card.classList.toggle('pmk-summary-active', activeFilter === key);
      if (card.__pmkSummaryBound) return;
      card.__pmkSummaryBound = true;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.addEventListener('click', () => {
        activeFilter = activeFilter === key ? 'all' : key;
        sessionStorage.setItem('pmk-summary-filter-v82-20-7', activeFilter);
        decorateSummary();
        if (typeof renderAll === 'function') renderAll();
      });
    });
  }

  function boot() {
    injectStyle();
    patchRenderToday();
    decorateSummary();
    ['pmk-calendar-sync-done','pmk-calendar-sync-error','popstate'].forEach(name => window.addEventListener(name, decorateSummary));
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
