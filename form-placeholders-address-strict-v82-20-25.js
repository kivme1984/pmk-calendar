'use strict';

(() => {
  if (globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_25) return;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_25 = true;

  function injectStyle() {
    if (document.getElementById('pmkFormPlaceholdersAddressStrictV822025Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkFormPlaceholdersAddressStrictV822025Styles';
    style.textContent = `
      #addressSearchWrap.address-search-wrap{
        margin-top:4px!important;
        margin-bottom:10px!important;
      }
      #addressSearchWrap::before{
        content:none!important;
        display:none!important;
      }
      #addressSearchWrap .pmk-address-title-v82-20-25{
        display:block!important;
        margin:0 0 7px!important;
        color:#2a2a2a!important;
        font-size:18px!important;
        font-weight:950!important;
        line-height:1.15!important;
      }
      #addressSearchWrap .address-search-field,
      #addressSearchWrap .pmk-address-title-v82-20-24{
        display:none!important;
      }
      #addressSearchWrap .address-search-input-wrap{
        display:block!important;
        margin:0!important;
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
      #view-form input::placeholder,
      #view-form textarea::placeholder,
      #reminderForm input::placeholder,
      #reminderForm textarea::placeholder{
        color:transparent!important;
        opacity:0!important;
      }
      @media(max-width:760px){
        #addressSearchWrap .pmk-address-title-v82-20-25{
          font-size:17px!important;
          margin-bottom:6px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function removeFieldPlaceholders() {
    document.querySelectorAll('#view-form input[placeholder], #view-form textarea[placeholder], #reminderForm input[placeholder], #reminderForm textarea[placeholder]').forEach(element => {
      element.dataset.pmkOldPlaceholder = element.getAttribute('placeholder') || '';
      element.setAttribute('placeholder', '');
    });

    document.querySelectorAll('#view-form select option[value=""]').forEach(option => {
      const text = (option.textContent || '').trim();
      if (/^выберите\s/i.test(text) || /^например/i.test(text)) {
        option.dataset.pmkOldText = text;
        option.textContent = '';
      }
    });
  }

  function cleanAddressSearchBlock() {
    injectStyle();
    const wrap = document.getElementById('addressSearchWrap');
    if (!wrap) return;

    wrap.querySelectorAll('.pmk-address-title-v82-20-24').forEach(node => node.remove());

    const oldLabel = wrap.querySelector('label.address-search-field');
    const inputWrap = wrap.querySelector('.address-search-input-wrap');
    const suggestions = document.getElementById('addressSuggestions');

    if (inputWrap && inputWrap.parentElement !== wrap) {
      wrap.insertBefore(inputWrap, suggestions || oldLabel?.nextSibling || null);
    }
    oldLabel?.remove();

    let title = wrap.querySelector('.pmk-address-title-v82-20-25');
    if (!title) {
      title = document.createElement('div');
      title.className = 'pmk-address-title-v82-20-25';
      title.textContent = 'Адрес клиента (автопоиск и вставка)';
      wrap.insertBefore(title, inputWrap || wrap.firstChild);
    }

    const input = document.getElementById('addressSearch');
    if (input) input.setAttribute('placeholder', '');

    const status = document.getElementById('addressSearchStatus');
    if (status) {
      const text = (status.textContent || '').trim().toLowerCase();
      const help = text.startsWith('введите минимум') || text.includes('минимум 3 символ') || text.startsWith('автопоиск:') || text.includes('выберите адрес — он вставится') || text.includes('выберите адрес - он вставится');
      status.classList.toggle('pmk-address-empty-help-hidden', help || !text);
    }
  }

  function applyAll() {
    removeFieldPlaceholders();
    cleanAddressSearchBlock();
  }

  function boot() {
    applyAll();
    document.addEventListener('input', event => {
      if (event.target?.closest?.('#view-form, #reminderForm, #addressSearchWrap')) setTimeout(applyAll, 30);
    }, true);
    document.addEventListener('click', event => {
      if (event.target?.closest?.('#view-form, #reminderForm, [data-v50-open]')) setTimeout(applyAll, 80);
    }, true);
    setInterval(applyAll, 700);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
