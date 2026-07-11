'use strict';

(() => {
  if (globalThis.PMK_HEADER_SEARCH_V82_20_27) return;
  globalThis.PMK_HEADER_SEARCH_V82_20_8 = true;
  globalThis.PMK_HEADER_SEARCH_V82_20_9 = true;
  globalThis.PMK_HEADER_SEARCH_V82_20_10 = true;
  globalThis.PMK_HEADER_SEARCH_V82_20_11 = true;
  globalThis.PMK_HEADER_SEARCH_V82_20_12 = true;
  globalThis.PMK_HEADER_SEARCH_V82_20_27 = true;
  globalThis.PMK_BOTTOM_ACTIONS_HEIGHT_LOCK_V82_20_11 = true;
  globalThis.PMK_DRAFT_COUNTER_V82_20_12 = true;
  globalThis.PMK_DRAFT_COUNTER_NO_INTERVAL_V82_20_27 = true;

  const DRAFT_KEY = 'pmk-form-autodraft-v1';
  let draftRefreshScheduled = false;

  function draftCount() {
    try {
      if (typeof pmkDraftRead === 'function') return pmkDraftRead() ? 1 : 0;
      const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return value?.data && Date.now() - value.savedAt < 604800000 ? 1 : 0;
    } catch { return 0; }
  }

  function injectStyle() {
    if (document.getElementById('pmkHeaderSearchV82227Styles')) return;
    ['pmkHeaderSearchV82208Styles','pmkHeaderSearchV82209Styles','pmkHeaderSearchV82210Styles','pmkHeaderSearchV82211Styles','pmkHeaderSearchV82212Styles'].forEach(id => document.getElementById(id)?.remove());
    const style = document.createElement('style');
    style.id = 'pmkHeaderSearchV82227Styles';
    style.textContent = `
      .nav-list .nav-item[data-view="search"]{display:none!important;}
      .nav-list .nav-item[data-view="draft"],.nav-list .nav-item[data-view="drafts"],.nav-list .nav-item[data-view="local-drafts"],.nav-list .nav-item[data-view="local"]{display:none!important;}
      .nav-list .nav-item.pmk-hidden-draft-menu-v82-20-10{display:none!important;}
      .pmk-header-search-v82-20-8{width:34px!important;height:34px!important;min-width:34px!important;border:0!important;border-radius:0!important;display:inline-grid!important;place-items:center!important;margin-left:2px!important;padding:0!important;color:#f5b800!important;background:transparent!important;box-shadow:none!important;font-size:26px!important;font-weight:950!important;line-height:1!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent!important;touch-action:manipulation!important;}
      .pmk-header-search-v82-20-8:active{transform:scale(.93)!important;}
      .app-header .brand{display:flex!important;align-items:center!important;gap:8px!important;min-width:0!important;}
      .app-header .brand .pmk-header-search-v82-20-8{flex:0 0 34px!important;}
      .pmk-day-heading-actions-v82-20-9{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;flex-wrap:nowrap!important;}
      .pmk-day-draft-btn-v82-20-9{min-height:54px!important;height:54px!important;padding:0 14px!important;border:1px solid rgba(17,17,17,.12)!important;border-radius:18px!important;background:#fff!important;color:#111!important;font-weight:900!important;font-size:15px!important;box-shadow:0 8px 20px rgba(0,0,0,.08)!important;white-space:nowrap!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;touch-action:manipulation!important;}
      .pmk-day-draft-btn-v82-20-9:not(.has-draft){opacity:.68!important;}
      .pmk-day-draft-btn-v82-20-9.has-draft{border-color:#f5b800!important;box-shadow:0 0 0 2px rgba(245,184,0,.16),0 8px 20px rgba(0,0,0,.08)!important;}
      .pmk-day-draft-btn-v82-20-9:active{transform:scale(.985)!important;}
      .pmk-draft-count-v82-20-12{min-width:22px!important;height:22px!important;padding:0 7px!important;border-radius:999px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;background:#d8d8d8!important;color:#555!important;font-size:13px!important;font-weight:950!important;line-height:1!important;}
      .pmk-day-draft-btn-v82-20-9.has-draft .pmk-draft-count-v82-20-12{background:#f5b800!important;color:#111!important;}
      #view-today .page-heading>[data-open-form]{flex:1 1 auto!important;}
      #todayEvents .event-card .event-actions .manage-row,#view-today #todayEvents .event-card .event-actions .manage-row,#view-day #todayEvents .event-card .event-actions .manage-row,.event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row,.event-card.pmk-card-tight-v82-43 .event-actions .manage-row{align-items:stretch!important;}
      #todayEvents .event-card .event-actions .manage-row > a,#todayEvents .event-card .event-actions .manage-row > button,#todayEvents .event-card .event-actions .manage-row > details,#todayEvents .event-card .event-actions .mini-button,#todayEvents .event-card .event-actions .call-button,#todayEvents .event-card .event-actions .open-button,#todayEvents .event-card .event-actions .menu-button,#todayEvents .event-card .event-actions .card-menu > summary,.event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row > a,.event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row > button,.event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row > details,.event-card.pmk-approved-card-v82-20-1 .event-actions .mini-button,.event-card.pmk-approved-card-v82-20-1 .event-actions .call-button,.event-card.pmk-approved-card-v82-20-1 .event-actions .open-button,.event-card.pmk-approved-card-v82-20-1 .event-actions .menu-button,.event-card.pmk-approved-card-v82-20-1 .event-actions .card-menu > summary,.event-card.pmk-card-tight-v82-43 .event-actions .manage-row > a,.event-card.pmk-card-tight-v82-43 .event-actions .manage-row > button,.event-card.pmk-card-tight-v82-43 .event-actions .manage-row > details,.event-card.pmk-card-tight-v82-43 .event-actions .mini-button,.event-card.pmk-card-tight-v82-43 .event-actions .call-button,.event-card.pmk-card-tight-v82-43 .event-actions .open-button,.event-card.pmk-card-tight-v82-43 .event-actions .menu-button,.event-card.pmk-card-tight-v82-43 .event-actions .card-menu > summary{min-height:36px!important;height:36px!important;max-height:36px!important;padding-top:0!important;padding-bottom:0!important;display:flex!important;align-items:center!important;justify-content:center!important;line-height:1!important;box-sizing:border-box!important;}
      @media(max-width:760px){.pmk-header-search-v82-20-8{width:30px!important;height:30px!important;min-width:30px!important;margin-left:0!important;font-size:24px!important;}.app-header .brand{gap:6px!important;}#view-today .page-heading{gap:12px!important;}.pmk-day-heading-actions-v82-20-9{width:100%!important;gap:8px!important;}#view-today .page-heading>.pmk-day-heading-actions-v82-20-9>[data-open-form]{min-width:0!important;flex:1 1 auto!important;}.pmk-day-draft-btn-v82-20-9{height:52px!important;min-height:52px!important;padding:0 12px!important;border-radius:16px!important;font-size:14px!important;gap:7px!important;}.pmk-draft-count-v82-20-12{min-width:21px!important;height:21px!important;font-size:12px!important;padding:0 6px!important;}}
    `;
    document.head.appendChild(style);
  }

  function hideDraftMenuItems() {
    document.querySelectorAll('.nav-list .nav-item').forEach(item => {
      const text = (item.textContent || '').trim().toLowerCase();
      if (text.includes('черновик')) item.classList.add('pmk-hidden-draft-menu-v82-20-10');
    });
  }

  function openSearch() {
    try {
      if (typeof setView === 'function') setView('search');
      document.getElementById('sidebar')?.classList?.remove('open');
      setTimeout(() => document.getElementById('globalSearch')?.focus({ preventScroll: false }), 80);
    } catch {}
  }

  function openDrafts() {
    try {
      if (typeof pmkDraftRestore === 'function') { pmkDraftRestore(); scheduleDraftRefresh(); return; }
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!raw?.data) return showToast?.('Черновик не найден.', 'error');
      if (typeof fillForm === 'function') fillForm({ ...raw.data, eventId: '', pmkId: typeof makeId === 'function' ? makeId() : String(Date.now()) });
      const eventId = document.getElementById('eventId');
      if (eventId) eventId.value = '';
      document.getElementById('deleteEventBtn')?.classList?.add('hidden');
      const title = document.getElementById('formTitle');
      if (title) title.textContent = 'Новая заявка — восстановленный черновик';
      if (typeof setView === 'function') setView('form');
      scheduleDraftRefresh();
    } catch { showToast?.('Черновик не найден.', 'error'); }
  }

  function refreshDraftButton() {
    draftRefreshScheduled = false;
    const button = document.getElementById('pmkDayDraftBtn');
    if (!button) return;
    const count = draftCount();
    button.classList.toggle('has-draft', count > 0);
    button.title = count > 0 ? `Черновиков: ${count}` : 'Черновиков пока нет';
    button.innerHTML = `Черновики <span class="pmk-draft-count-v82-20-12" aria-label="${count} черновиков">${count}</span>`;
  }

  function scheduleDraftRefresh(delay = 80) {
    if (draftRefreshScheduled) return;
    draftRefreshScheduled = true;
    setTimeout(refreshDraftButton, delay);
  }

  function mountSearchButton() {
    const brand = document.querySelector('.app-header .brand');
    const mark = brand?.querySelector('.brand-mark');
    if (!brand || !mark || brand.querySelector('.pmk-header-search-v82-20-8')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmk-header-search-v82-20-8';
    button.id = 'pmkHeaderSearchBtn';
    button.setAttribute('aria-label', 'Поиск заявок');
    button.title = 'Поиск заявок';
    button.textContent = '⌕';
    mark.insertAdjacentElement('afterend', button);
    button.addEventListener('click', openSearch, { passive: true });
  }

  function mountDraftButton() {
    const addButton = document.querySelector('#view-today .page-heading > [data-open-form]');
    if (!addButton || document.getElementById('pmkDayDraftBtn')) return;
    const wrap = document.createElement('div');
    wrap.className = 'pmk-day-heading-actions-v82-20-9';
    addButton.parentElement.insertBefore(wrap, addButton);
    wrap.appendChild(addButton);
    const draft = document.createElement('button');
    draft.type = 'button';
    draft.id = 'pmkDayDraftBtn';
    draft.className = 'pmk-day-draft-btn-v82-20-9';
    draft.setAttribute('aria-label', 'Открыть сохранённые черновики');
    wrap.appendChild(draft);
    draft.addEventListener('click', openDrafts, { passive: true });
    refreshDraftButton();
  }

  function boot() {
    injectStyle();
    hideDraftMenuItems();
    mountSearchButton();
    mountDraftButton();
    window.addEventListener('storage', scheduleDraftRefresh);
    document.addEventListener('input', event => { if (event.target?.closest?.('#requestForm')) scheduleDraftRefresh(350); }, true);
    document.addEventListener('click', event => { if (event.target?.closest?.('#pmkDayDraftBtn,[data-open-form],#saveDraftBtn')) scheduleDraftRefresh(120); }, true);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
