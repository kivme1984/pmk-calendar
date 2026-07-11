'use strict';

(() => {
  if (globalThis.PMK_CARD_ACTIONS_FORCE_HEIGHT_V82_21_8) return;
  globalThis.PMK_CARD_ACTIONS_FORCE_HEIGHT_V82_21_8 = true;

  const HEIGHT = '58px';
  let scheduled = false;

  function isBottomAction(element) {
    if (!(element instanceof Element) || !element.closest('.event-card')) return false;
    if (element.matches('.status-action,.contract-control,.pmk-rug-inline-badge,[data-rug-event]')) return false;

    if (element.matches([
      '.call-button',
      '.open-button',
      '.menu-button',
      '.mini-button',
      '.primary-card-action',
      '.secondary-card-action',
      '.card-menu > summary',
      'a[href^="tel:"]'
    ].join(','))) return true;

    const text = String(element.textContent || '').trim().toLowerCase();
    const label = String(element.getAttribute('aria-label') || '').trim().toLowerCase();
    return text === 'позвонить' || text === 'открыть' || text === '⋮' || label.includes('меню');
  }

  function setImportant(element, property, value) {
    element.style.setProperty(property, value, 'important');
  }

  function applyCard(card) {
    const actions = [...card.querySelectorAll('a,button,summary')].filter(isBottomAction);
    if (!actions.length) return;

    actions.forEach(action => {
      setImportant(action, 'height', HEIGHT);
      setImportant(action, 'min-height', HEIGHT);
      setImportant(action, 'max-height', HEIGHT);
      setImportant(action, 'padding-top', '0');
      setImportant(action, 'padding-bottom', '0');
      setImportant(action, 'display', 'flex');
      setImportant(action, 'align-items', 'center');
      setImportant(action, 'justify-content', 'center');
      setImportant(action, 'box-sizing', 'border-box');
      setImportant(action, 'line-height', '1.1');
      setImportant(action, 'border-radius', '15px');

      const details = action.closest('details.card-menu');
      if (details) {
        setImportant(details, 'height', HEIGHT);
        setImportant(details, 'min-height', HEIGHT);
        setImportant(details, 'max-height', HEIGHT);
      }
    });

    const row = actions[0].closest('.manage-row') || (() => {
      const parent = actions[0].parentElement;
      return parent && actions.every(action => action.parentElement === parent || action.closest('details')?.parentElement === parent)
        ? parent
        : null;
    })();

    if (row && actions.length >= 3) {
      setImportant(row, 'display', 'grid');
      setImportant(row, 'grid-template-columns', 'repeat(3,minmax(0,1fr))');
      setImportant(row, 'align-items', 'stretch');
      setImportant(row, 'gap', matchMedia('(max-width:420px)').matches ? '6px' : '8px');
      setImportant(row, 'width', '100%');
      setImportant(row, 'min-height', HEIGHT);
      setImportant(row, 'box-sizing', 'border-box');
    }
  }

  function applyAll() {
    scheduled = false;
    document.querySelectorAll('.event-card').forEach(applyCard);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyAll);
  }

  function injectFallbackCss() {
    document.getElementById('pmkCardActionsForceHeightV82218')?.remove();
    const style = document.createElement('style');
    style.id = 'pmkCardActionsForceHeightV82218';
    style.textContent = `
      .event-card .event-actions .manage-row > a,
      .event-card .event-actions .manage-row > button,
      .event-card .event-actions .manage-row > details,
      .event-card .event-actions .call-button,
      .event-card .event-actions .open-button,
      .event-card .event-actions .menu-button,
      .event-card .event-actions .mini-button,
      .event-card .event-actions .primary-card-action,
      .event-card .event-actions .secondary-card-action,
      .event-card .event-actions .card-menu > summary,
      .event-card .primary-card-action,
      .event-card .secondary-card-action,
      .event-card .card-menu > summary,
      .event-card a[href^="tel:"] {
        height:58px!important;
        min-height:58px!important;
        max-height:58px!important;
        box-sizing:border-box!important;
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    injectFallbackCss();
    schedule();
    setTimeout(schedule, 120);
    setTimeout(schedule, 500);
    setTimeout(schedule, 1200);

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', () => setTimeout(schedule, 40), true);
    ['pmk-calendar-sync-done', 'pmk-calendar-sync-error', 'popstate'].forEach(name => addEventListener(name, schedule));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
