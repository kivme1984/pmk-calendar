'use strict';

(() => {
  if (globalThis.PMK_HEADER_SEARCH_V82_20_8) return;
  globalThis.PMK_HEADER_SEARCH_V82_20_8 = true;

  function injectStyle() {
    if (document.getElementById('pmkHeaderSearchV82208Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkHeaderSearchV82208Styles';
    style.textContent = `
      .nav-list .nav-item[data-view="search"]{display:none!important;}
      .pmk-header-search-v82-20-8{
        width:42px!important;
        height:42px!important;
        min-width:42px!important;
        border:0!important;
        border-radius:14px!important;
        display:inline-grid!important;
        place-items:center!important;
        margin-left:8px!important;
        color:#111!important;
        background:linear-gradient(135deg,#ffcf24,#f5b800)!important;
        box-shadow:0 8px 20px rgba(245,184,0,.22)!important;
        font-size:22px!important;
        font-weight:900!important;
        line-height:1!important;
        cursor:pointer!important;
      }
      .pmk-header-search-v82-20-8:active{transform:scale(.96)!important;}
      .app-header .brand{display:flex!important;align-items:center!important;gap:10px!important;min-width:0!important;}
      .app-header .brand .pmk-header-search-v82-20-8{flex:0 0 42px!important;}
      @media(max-width:760px){
        .pmk-header-search-v82-20-8{
          width:38px!important;
          height:38px!important;
          min-width:38px!important;
          border-radius:13px!important;
          margin-left:4px!important;
          font-size:20px!important;
        }
        .app-header .brand{gap:7px!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function openSearch() {
    try {
      if (typeof setView === 'function') setView('search');
      const sidebar = document.getElementById('sidebar');
      sidebar?.classList?.remove('open');
      setTimeout(() => {
        const input = document.getElementById('globalSearch');
        if (input) input.focus({ preventScroll: false });
      }, 80);
    } catch {}
  }

  function mountButton() {
    injectStyle();
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

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mountButton, { once: true })
    : mountButton();
})();
