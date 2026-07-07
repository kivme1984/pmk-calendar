'use strict';

(() => {
  if (globalThis.PMK_HEADER_SEARCH_V82_20_10) return;
  globalThis.PMK_HEADER_SEARCH_V82_20_8 = true;
  globalThis.PMK_HEADER_SEARCH_V82_20_9 = true;
  globalThis.PMK_HEADER_SEARCH_V82_20_10 = true;

  const DRAFT_KEY = 'pmk-form-autodraft-v1';

  function hasDraft() {
    try {
      if (typeof pmkDraftRead === 'function') return !!pmkDraftRead();
      const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return !!(value?.data && Date.now() - value.savedAt < 604800000);
    } catch { return false; }
  }

  function injectStyle() {
    if (document.getElementById('pmkHeaderSearchV82210Styles')) return;
    document.getElementById('pmkHeaderSearchV82208Styles')?.remove();
    document.getElementById('pmkHeaderSearchV82209Styles')?.remove();
    const style = document.createElement('style');
    style.id = 'pmkHeaderSearchV82210Styles';
    style.textContent = `
      .nav-list .nav-item[data-view="search"]{display:none!important;}
      .nav-list .nav-item[data-view="draft"],
      .nav-list .nav-item[data-view="drafts"],
      .nav-list .nav-item[data-view="local-drafts"],
      .nav-list .nav-item[data-view="local"]{display:none!important;}
      .nav-list .nav-item.pmk-hidden-draft-menu-v82-20-10{display:none!important;}

      .pmk-header-search-v82-20-8{
        width:34px!important;height:34px!important;min-width:34px!important;
        border:0!important;border-radius:0!important;display:inline-grid!important;place-items:center!important;
        margin-left:2px!important;padding:0!important;color:#f5b800!important;background:transparent!important;
        box-shadow:none!important;font-size:26px!important;font-weight:950!important;line-height:1!important;cursor:pointer!important;
        -webkit-tap-highlight-color:transparent!important;
      }
      .pmk-header-search-v82-20-8:active{transform:scale(.93)!important;}
      .app-header .brand{display:flex!important;align-items:center!important;gap:8px!important;min-width:0!important;}
      .app-header .brand .pmk-header-search-v82-20-8{flex:0 0 34px!important;}

      .pmk-day-heading-actions-v82-20-9{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;flex-wrap:nowrap!important;}
      .pmk-day-draft-btn-v82-20-9{
        min-height:54px!important;height:54px!important;padding:0 18px!important;border:1px solid rgba(17,17,17,.12)!important;
        border-radius:18px!important;background:#fff!important;color:#111!important;font-weight:900!important;font-size:15px!important;
        box-shadow:0 8px 20px rgba(0,0,0,.08)!important;white-space:nowrap!important;
      }
      .pmk-day-draft-btn-v82-20-9:not(.has-draft){opacity:.58!important;}
      .pmk-day-draft-btn-v82-20-9.has-draft{border-color:#f5b800!important;box-shadow:0 0 0 2px rgba(245,184,0,.16),0 8px 20px rgba(0,0,0,.08)!important;}
      .pmk-day-draft-btn-v82-20-9:active{transform:scale(.985)!important;}
      #view-today .page-heading>[data-open-form]{flex:1 1 auto!important;}
      @media(max-width:760px){
        .pmk-header-search-v82-20-8{width:30px!important;height:30px!important;min-width:30px!important;margin-left:0!important;font-size:24px!important;}
        .app-header .brand{gap:6px!important;}
        #view-today .page-heading{gap:12px!important;}
        .pmk-day-heading-actions-v82-20-9{width:100%!important;gap:8px!important;}
        #view-today .page-heading>.pmk-day-heading-actions-v82-20-9>[data-open-form]{min-width:0!important;flex:1 1 auto!important;}
        .pmk-day-draft-btn-v82-20-9{height:52px!important;min-height:52px!important;padding:0 13px!important;border-radius:16px!important;font-size:14px!important;}
      }
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
      if (typeof pmkDraftRestore === 'function') {
        pmkDraftRestore();
        return;
      }
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!raw?.data) return showToast?.('Черновик не найден.', 'error');
      if (typeof fillForm === 'function') fillForm({ ...raw.data, eventId: '', pmkId: typeof makeId === 'function' ? makeId() : String(Date.now()) });
      const eventId = document.getElementById('eventId');
      if (eventId) eventId.value = '';
      document.getElementById('deleteEventBtn')?.classList?.add('hidden');
      const title = document.getElementById('formTitle');
      if (title) title.textContent = 'Новая заявка — восстановленный черновик';
      if (typeof setView === 'function') setView('form');
    } catch { showToast?.('Черновик не найден.', 'error'); }
  }

  function refreshDraftButton() {
    const button = document.getElementById('pmkDayDraftBtn');
    if (!button) return;
    const exists = hasDraft();
    button.classList.toggle('has-draft', exists);
    button.title = exists ? 'Восстановить незавершённую заявку' : 'Черновиков пока нет';
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
    button.addEventListener('click', openSearch);
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
    draft.textContent = 'Черновики';
    draft.setAttribute('aria-label', 'Открыть сохранённые черновики');
    wrap.appendChild(draft);
    draft.addEventListener('click', openDrafts);
    refreshDraftButton();
  }

  function boot() {
    injectStyle();
    hideDraftMenuItems();
    mountSearchButton();
    mountDraftButton();
    setInterval(refreshDraftButton, 2500);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
