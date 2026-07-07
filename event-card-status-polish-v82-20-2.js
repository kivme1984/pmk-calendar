'use strict';

(() => {
  if (globalThis.PMK_EVENT_CARD_STATUS_POLISH_V82_20_2) return;
  globalThis.PMK_EVENT_CARD_STATUS_POLISH_V82_20_2 = true;

  const STATUS_BY_TEXT = [
    ['pending-pickup', /ожидает\s*забора/i],
    ['picked-up', /(забрали|в\s*работе)/i],
    ['pending-delivery', /ожидает\s*доставки/i],
    ['completed', /выполнено/i],
  ];

  function injectStyle() {
    if (document.getElementById('pmkEventCardStatusPolishV82202')) return;
    const style = document.createElement('style');
    style.id = 'pmkEventCardStatusPolishV82202';
    style.textContent = `
      .event-card.pmk-approved-card-v82-20-1,
      .event-card.pmk-card-tight-v82-43{
        position:relative!important;
      }
      .event-card.pmk-status-edge-v82-20-2::before{
        content:""!important;
        position:absolute!important;
        left:0!important;
        top:0!important;
        bottom:0!important;
        width:5px!important;
        border-radius:18px 0 0 18px!important;
        background:var(--pmk-card-status-color,#2d9cdb)!important;
        z-index:3!important;
        pointer-events:none!important;
      }
      .event-card.pmk-state-pending-pickup{--pmk-card-status-color:#2d9cdb!important;}
      .event-card.pmk-state-picked-up{--pmk-card-status-color:#f4c430!important;}
      .event-card.pmk-state-pending-delivery{--pmk-card-status-color:#7b55c7!important;}
      .event-card.pmk-state-completed{--pmk-card-status-color:#168a4a!important;}

      .event-card.pmk-approved-card-v82-20-1 .pmk-status-in-date-row-v82-46,
      .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46,
      #view-today #todayEvents .event-card.pmk-approved-card-v82-20-1 .pmk-status-in-date-row-v82-46,
      #view-day #todayEvents .event-card.pmk-approved-card-v82-20-1 .pmk-status-in-date-row-v82-46{
        display:flex!important;
        flex-direction:column!important;
        justify-content:flex-start!important;
        align-items:stretch!important;
        align-content:flex-start!important;
        gap:4px!important;
        row-gap:4px!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        flex:0 0 auto!important;
      }

      .event-card.pmk-approved-card-v82-20-1 .pmk-status-in-date-row-v82-46 .status-action,
      .event-card.pmk-card-tight-v82-43 .pmk-status-in-date-row-v82-46 .status-action{
        margin:0!important;
        font-weight:900!important;
        color:#3d4248!important;
      }
      .event-card .status-action.pmk-status-pending-pickup{background:#dff1ff!important;color:#096aa8!important;border-color:#9fd3fb!important;}
      .event-card .status-action.pmk-status-picked-up{background:#fff1b8!important;color:#7a5200!important;border-color:#f1ce4f!important;}
      .event-card .status-action.pmk-status-pending-delivery{background:#e7ddff!important;color:#5b31a8!important;border-color:#bda4f2!important;}
      .event-card .status-action.pmk-status-completed{background:#dff4e9!important;color:#08733d!important;border-color:#9ad5b2!important;}
      .event-card .status-action.pmk-current-status{color:#fff!important;box-shadow:0 2px 7px rgba(0,0,0,.12)!important;}
      .event-card .status-action.pmk-current-status.pmk-status-pending-pickup{background:#2d9cdb!important;border-color:#2d9cdb!important;}
      .event-card .status-action.pmk-current-status.pmk-status-picked-up{background:#f4c430!important;color:#2b2100!important;border-color:#f4c430!important;}
      .event-card .status-action.pmk-current-status.pmk-status-pending-delivery{background:#7b55c7!important;border-color:#7b55c7!important;}
      .event-card .status-action.pmk-current-status.pmk-status-completed{background:#168a4a!important;border-color:#168a4a!important;}

      .event-card.pmk-approved-card-v82-20-1 .event-time,
      .event-card.pmk-card-tight-v82-43>.event-time{
        gap:1px!important;
      }
      .event-card.pmk-approved-card-v82-20-1 .event-date,
      .event-card.pmk-card-tight-v82-43 .event-date{
        margin:0!important;
        line-height:1.04!important;
      }
      .event-card.pmk-approved-card-v82-20-1 .event-weekday,
      .event-card.pmk-card-tight-v82-43 .event-weekday{
        margin:0 0 -3px!important;
        line-height:1.02!important;
      }
      .event-card.pmk-approved-card-v82-20-1 .event-time>strong,
      .event-card.pmk-card-tight-v82-43>.event-time>strong{
        margin-top:0!important;
        line-height:1.05!important;
      }
      .event-card.pmk-approved-card-v82-20-1 .event-time>span,
      .event-card.pmk-card-tight-v82-43>.event-time>span{
        font-weight:850!important;
      }

      .event-card.pmk-approved-card-v82-20-1 .manage-row .mini-button,
      .event-card.pmk-approved-card-v82-20-1 .manage-row .call-button,
      .event-card.pmk-approved-card-v82-20-1 .manage-row .open-button,
      .event-card.pmk-approved-card-v82-20-1 .manage-row .menu-button,
      .event-card.pmk-approved-card-v82-20-1 .card-menu>summary,
      .event-card.pmk-card-tight-v82-43 .mini-button,
      .event-card.pmk-card-tight-v82-43 .menu-button,
      .event-card.pmk-card-tight-v82-43 .primary-card-action,
      .event-card.pmk-card-tight-v82-43 .secondary-card-action,
      .event-card.pmk-card-tight-v82-43 .card-menu summary{
        min-height:30px!important;
        height:30px!important;
        max-height:30px!important;
      }
      @media(min-width:761px){
        .event-card.pmk-approved-card-v82-20-1 .manage-row .mini-button,
        .event-card.pmk-approved-card-v82-20-1 .manage-row .call-button,
        .event-card.pmk-approved-card-v82-20-1 .manage-row .open-button,
        .event-card.pmk-approved-card-v82-20-1 .manage-row .menu-button,
        .event-card.pmk-approved-card-v82-20-1 .card-menu>summary,
        .event-card.pmk-card-tight-v82-43 .mini-button,
        .event-card.pmk-card-tight-v82-43 .menu-button,
        .event-card.pmk-card-tight-v82-43 .primary-card-action,
        .event-card.pmk-card-tight-v82-43 .secondary-card-action,
        .event-card.pmk-card-tight-v82-43 .card-menu summary{
          min-height:32px!important;
          height:32px!important;
          max-height:32px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function cardStatus(card) {
    const classes = [...card.classList];
    const fromClass = classes.find(name => name.startsWith('status-'));
    if (fromClass) return fromClass.replace(/^status-/, '');
    const current = card.querySelector('.status-action.active,.status-action.is-active,.status-action[aria-pressed="true"]');
    const text = current?.textContent || '';
    const found = STATUS_BY_TEXT.find(([, rx]) => rx.test(text));
    return found?.[0] || '';
  }

  function buttonStatus(button) {
    const value = button.textContent || '';
    return STATUS_BY_TEXT.find(([, rx]) => rx.test(value))?.[0] || '';
  }

  function applyCard(card) {
    if (!card || card.closest('#weekEvents')) return;
    const current = cardStatus(card);
    card.classList.add('pmk-status-edge-v82-20-2');
    card.classList.remove('pmk-state-pending-pickup','pmk-state-picked-up','pmk-state-pending-delivery','pmk-state-completed');
    if (current) card.classList.add(`pmk-state-${current}`);
    card.querySelectorAll('.status-action').forEach(button => {
      const key = buttonStatus(button);
      button.classList.remove('pmk-status-pending-pickup','pmk-status-picked-up','pmk-status-pending-delivery','pmk-status-completed','pmk-current-status');
      if (!key) return;
      button.classList.add(`pmk-status-${key}`);
      if (key === current) button.classList.add('pmk-current-status');
    });
  }

  function applyAll() {
    injectStyle();
    document.querySelectorAll('.event-card').forEach(applyCard);
  }

  document.addEventListener('click', event => {
    if (event.target.closest('.status-action')) setTimeout(applyAll, 120);
  }, true);

  function boot() {
    applyAll();
    const root = document.querySelector('#todayEvents') || document.querySelector('.main-content') || document.body;
    new MutationObserver(mutations => {
      if (!mutations.some(mutation => [...mutation.addedNodes].some(node => node.nodeType === 1 && (node.matches?.('.event-card') || node.querySelector?.('.event-card'))))) return;
      requestAnimationFrame(applyAll);
    }).observe(root, { childList: true, subtree: true });
    ['pmk-calendar-sync-done', 'pmk-calendar-sync-error', 'popstate'].forEach(name => window.addEventListener(name, applyAll));
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
