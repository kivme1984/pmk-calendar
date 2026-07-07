'use strict';

(() => {
  if (globalThis.PMK_ADDRESS_SEARCH_CLEAN_STRICT_V82_20_24) return;
  globalThis.PMK_ADDRESS_SEARCH_CLEAN_V82_20_23 = true;
  globalThis.PMK_ADDRESS_SEARCH_CLEAN_STRICT_V82_20_24 = true;

  function injectStyle() {
    if (document.getElementById('pmkAddressSearchCleanStrictV822024Styles')) return;
    document.getElementById('pmkAddressSearchCleanV822023Styles')?.remove();
    const style = document.createElement('style');
    style.id = 'pmkAddressSearchCleanStrictV822024Styles';
    style.textContent = `
      #addressSearchWrap.address-search-wrap{
        margin-top:4px!important;
        margin-bottom:10px!important;
      }
      #addressSearchWrap::before{
        content:none!important;
        display:none!important;
      }
      #addressSearchWrap .pmk-address-title-v82-20-24{
        display:block!important;
        margin:0 0 7px!important;
        color:#2a2a2a!important;
        font-size:18px!important;
        font-weight:950!important;
        line-height:1.15!important;
      }
      #addressSearchWrap .address-search-field{
        display:block!important;
        margin:0!important;
        padding:0!important;
        color:transparent!important;
        font-size:0!important;
        line-height:0!important;
      }
      #addressSearchWrap .address-search-field > :not(.address-search-input-wrap){
        display:none!important;
      }
      #addressSearchWrap .address-search-input-wrap{
        display:block!important;
        margin:0!important;
        color:#111!important;
        line-height:normal!important;
        font-size:16px!important;
      }
      #addressSearchWrap #addressSearch{
        border:2px solid #ffc400!important;
        box-shadow:0 0 0 1px rgba(255,196,0,.18)!important;
        background:#fff!important;
        color:#111!important;
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
        #addressSearchWrap .pmk-address-title-v82-20-24{
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

    let title = wrap.querySelector('.pmk-address-title-v82-20-24');
    if (!title) {
      title = document.createElement('div');
      title.className = 'pmk-address-title-v82-20-24';
      title.textContent = 'Адрес клиента (автопоиск и вставка)';
      wrap.insertBefore(title, wrap.firstChild);
    }

    const label = wrap.querySelector('.address-search-field');
    const inputWrap = wrap.querySelector('.address-search-input-wrap');
    if (label && inputWrap) {
      for (const node of Array.from(label.childNodes)) {
        if (node !== inputWrap) node.remove();
      }
      if (!label.contains(inputWrap)) label.appendChild(inputWrap);
    }

    const status = document.getElementById('addressSearchStatus');
    if (status) {
      const text = (status.textContent || '').trim().toLowerCase();
      const isEmptyHelp = text.startsWith('введите минимум') || text.includes('минимум 3 символ') || text.startsWith('автопоиск:') || text.includes('выберите адрес — он вставится');
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
    setInterval(cleanAddressBlock, 700);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
