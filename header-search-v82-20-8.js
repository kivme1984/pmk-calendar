'use strict';

(() => {
  if (globalThis.PMK_HEADER_SEARCH_V82_20_9) return;
  globalThis.PMK_HEADER_SEARCH_V82_20_8 = true;
  globalThis.PMK_HEADER_SEARCH_V82_20_9 = true;

  function injectStyle() {
    if (document.getElementById('pmkHeaderSearchV82209Styles')) return;
    document.getElementById('pmkHeaderSearchV82208Styles')?.remove();
    const style = document.createElement('style');
    style.id = 'pmkHeaderSearchV82209Styles';
    style.textContent = `
      .nav-list .nav-item[data-view="search"]{display:none!important;}
      .pmk-header-search-v82-20-8{
        width:34px!important;
        height:34px!important;
        min-width:34px!important;
        border:0!important;
        border-radius:0!important;
        display:inline-grid!important;
        place-items:center!important;
        margin-left:2px!important;
        padding:0!important;
        color:#f5b800!important;
        background:transparent!important;
        box-shadow:none!important;
        font-size:26px!important;
        font-weight:950!important;
        line-height:1!important;
        cursor:pointer!important;
        -webkit-tap-highlight-color:transparent!important;
      }
      .pmk-header-search-v82-20-8:active{transform:scale(.93)!important;}
      .app-header .brand{display:flex!important;align-items:center!important;gap:8px!important;min-width:0!important;}
      .app-header .brand .pmk-header-search-v82-20-8{flex:0 0 34px!important;}

      .pmk-day-heading-actions-v82-20-9{
        display:flex!important;
        align-items:center!important;
        justify-content:flex-end!important;
        gap:8px!important;
        flex-wrap:nowrap!important;
      }
      .pmk-day-draft-btn-v82-20-9{
        min-height:54px!important;
        height:54px!important;
        padding:0 18px!important;
        border:1px solid rgba(17,17,17,.12)!important;
        border-radius:18px!important;
        background:#fff!important;
        color:#111!important;
        font-weight:900!important;
        font-size:15px!important;
        box-shadow:0 8px 20px rgba(0,0,0,.08)!important;
        white-space:nowrap!important;
      }
      .pmk-day-draft-btn-v82-20-9:active{transform:scale(.985)!important;}
      #view-today .page-heading>[data-open-form]{flex:1 1 auto!important;}
      @media(max-width:760px){
        .pmk-header-search-v82-20-8{
          width:30px!important;
          height:30px!important;
          min-width:30px!important;
          margin-left:0!important;
          font-size:24px!important;
        }
        .app-header .brand{gap:6px!important;}
        #view-today .page-heading{gap:12px!important;}
        .pmk-day-heading-actions-v82-20-9{width:100%!important;gap:8px!important;}
        #view-today .page-heading>.pmk-day-heading-actions-v82-20-9>[data-open-form]{min-width:0!important;flex:1 1 auto!important;}
        .pmk-day-draft-btn-v82-20-9{height:52px!important;min-height:52px!important;padding:0 13px!important;border-radius:16px!important;font-size:14px!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function openSearch() {
    try {
      if (typeof setView === 'function') setView('search');
      document.getElementById('sidebar')?.classList?.remove('open');
      setTimeout(() => document.getElementById('globalSearch')?.focus({ preventScroll: false }), 80);
    } catch {}
  }

  function openDraft() {
    try {
      if (typeof resetForm === 'function') resetForm();
      if (typeof setView === 'function') setView('form', { returnView: 'day' });
      setTimeout(() => {
        const draft = document.getElementById('saveDraftBtn');
        if (draft) {
          draft.textContent = 'Сохранить черновик';
          draft.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          draft.classList.add('pmk-draft-highlight-v82-20-9');
        }
      }, 180);
    } catch {}
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
    draft.textContent = 'Черновик';
    draft.setAttribute('aria-label', 'Открыть новую заявку как черновик');
    wrap.appendChild(draft);
    draft.addEventListener('click', openDraft);
  }

  function boot() {
    injectStyle();
    mountSearchButton();
    mountDraftButton();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
