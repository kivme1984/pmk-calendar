'use strict';

(() => {
  if (globalThis.PMK_ADDRESS_SEARCH_CLEAN_V82_20_23) return;
  globalThis.PMK_ADDRESS_SEARCH_CLEAN_V82_20_23 = true;

  function injectStyle() {
    if (document.getElementById('pmkAddressSearchCleanV822023Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkAddressSearchCleanV822023Styles';
    style.textContent = `
      #addressSearchWrap.address-search-wrap{
        margin-top:4px!important;
        margin-bottom:10px!important;
      }
      #addressSearchWrap::before{
        content:'Адрес клиента (автопоиск и вставка)';
        display:block!important;
        margin:0 0 7px!important;
        color:#2a2a2a!important;
        font-size:18px!important;
        font-weight:950!important;
        line-height:1.15!important;
      }
      #addressSearchWrap .address-search-field{
        font-size:0!important;
        margin:0!important;
        line-height:0!important;
      }
      #addressSearchWrap .address-search-input-wrap{
        margin:0!important;
        line-height:normal!important;
        font-size:16px!important;
      }
      #addressSearchWrap #addressSearch{
        border:2px solid #ffc400!important;
        box-shadow:0 0 0 1px rgba(255,196,0,.18)!important;
        background:#fff!important;
      }
      #addressSearchWrap #addressSearch:focus{
        border-color:#f5b800!important;
        box-shadow:0 0 0 3px rgba(255,196,0,.24)!important;
        outline:none!important;
      }
      #addressSearchWrap .address-search-icon{
        color:#7a6400!important;
      }
      #addressSearchWrap .address-search-status.pmk-address-empty-help-hidden{
        display:none!important;
      }
      @media(max-width:760px){
        #addressSearchWrap::before{
          font-size:17px!important;
          margin-bottom:6px!important;
        }
        #addressSearchWrap #addressSearch{
          border-width:2px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function cleanAddressBlock() {
    injectStyle();
    const wrap = document.getElementById('addressSearchWrap');
    if (!wrap) return;

    const label = wrap.querySelector('.address-search-field');
    if (label) {
      for (const node of Array.from(label.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = '';
      }
    }

    const status = document.getElementById('addressSearchStatus');
    if (status) {
      const text = (status.textContent || '').trim().toLowerCase();
      const isEmptyHelp = text.startsWith('введите минимум') || text.includes('минимум 3 символ');
      status.classList.toggle('pmk-address-empty-help-hidden', isEmptyHelp || !text);
    }
  }

  function boot() {
    cleanAddressBlock();
    document.addEventListener('input', event => {
      if (event.target?.id === 'addressSearch') setTimeout(cleanAddressBlock, 40);
    }, true);
    document.addEventListener('click', event => {
      if (event.target?.closest?.('#addressSearchWrap, [data-v50-open="client"]')) setTimeout(cleanAddressBlock, 80);
    }, true);
    setInterval(cleanAddressBlock, 1000);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
