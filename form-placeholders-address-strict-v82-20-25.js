'use strict';

(() => {
  if (globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_29) return;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_25 = true;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_26 = true;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_27 = true;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_29 = true;

  let scheduled = false;

  function injectStyle() {
    if (document.getElementById('pmkFormPlaceholdersAddressStrictV822029Styles')) return;
    [
      'pmkFormPlaceholdersAddressStrictV822027Styles',
      'pmkFormPlaceholdersAddressStrictV822026Styles',
      'pmkFormPlaceholdersAddressStrictV822025Styles',
      'pmkAddressSearchCleanStrictV822024Styles',
      'pmkAddressSearchCleanV822023Styles',
    ].forEach(id => document.getElementById(id)?.remove());
    const style = document.createElement('style');
    style.id = 'pmkFormPlaceholdersAddressStrictV822029Styles';
    style.textContent = `
      #addressSearchWrap.address-search-wrap{margin-top:4px!important;margin-bottom:10px!important;display:block!important;}
      #addressSearchWrap::before,
      #addressSearchWrap .pmk-address-title-v82-20-24,
      #addressSearchWrap .pmk-address-title-v82-20-25,
      #addressSearchWrap .pmk-address-title-v82-20-26,
      #addressSearchWrap .address-search-field{content:none!important;display:none!important;}
      #addressSearchWrap .pmk-address-title-v82-20-29{display:block!important;margin:0 0 7px!important;color:#2a2a2a!important;font-size:18px!important;font-weight:950!important;line-height:1.15!important;}
      #addressSearchWrap .address-search-input-wrap{display:block!important;position:relative!important;margin:0!important;color:#111!important;line-height:normal!important;font-size:16px!important;}
      #addressSearchWrap #addressSearch{width:100%!important;min-height:54px!important;height:54px!important;padding-right:56px!important;border:2px solid #ffc400!important;border-radius:14px!important;box-shadow:0 0 0 1px rgba(255,196,0,.18)!important;background:#fff!important;color:#111!important;box-sizing:border-box!important;}
      #addressSearchWrap #addressSearch:focus{border-color:#f5b800!important;box-shadow:0 0 0 3px rgba(255,196,0,.24)!important;outline:none!important;}
      #addressSearchWrap .address-search-icon{position:absolute!important;right:12px!important;top:0!important;bottom:0!important;width:38px!important;height:100%!important;margin:0!important;font-size:0!important;line-height:0!important;pointer-events:none!important;transform:none!important;}
      #addressSearchWrap .address-search-icon::before{content:''!important;position:absolute!important;left:4px!important;top:50%!important;width:17px!important;height:17px!important;border:4px solid #7a6400!important;border-radius:50%!important;transform:translateY(-58%)!important;box-sizing:border-box!important;}
      #addressSearchWrap .address-search-icon::after{content:''!important;position:absolute!important;left:22px!important;top:50%!important;width:15px!important;height:4px!important;background:#7a6400!important;border-radius:999px!important;transform:translateY(5px) rotate(45deg)!important;transform-origin:left center!important;}
      #addressSearchWrap .address-search-status{display:none!important;}
      #view-form input::placeholder,#view-form textarea::placeholder,#reminderForm input::placeholder,#reminderForm textarea::placeholder{color:transparent!important;opacity:0!important;}
      @media(max-width:760px){
        #addressSearchWrap .pmk-address-title-v82-20-29{font-size:17px!important;}
        #addressSearchWrap #addressSearch{min-height:52px!important;height:52px!important;padding-right:52px!important;}
        #addressSearchWrap .address-search-icon{right:10px!important;width:36px!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function removeFieldPlaceholders() {
    document.querySelectorAll('#view-form input[placeholder], #view-form textarea[placeholder], #reminderForm input[placeholder], #reminderForm textarea[placeholder]').forEach(element => {
      if (!element.dataset.pmkOldPlaceholder) element.dataset.pmkOldPlaceholder = element.getAttribute('placeholder') || '';
      if (element.getAttribute('placeholder')) element.setAttribute('placeholder', '');
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

    const inputWrap = wrap.querySelector('.address-search-input-wrap');
    const suggestions = document.getElementById('addressSuggestions') || wrap.querySelector('.address-suggestions');
    const status = document.getElementById('addressSearchStatus') || wrap.querySelector('.address-search-status');
    if (!inputWrap) return;

    let title = wrap.querySelector('.pmk-address-title-v82-20-29');
    if (!title) {
      title = document.createElement('div');
      title.className = 'pmk-address-title-v82-20-29';
      title.textContent = 'Адрес клиента (автопоиск и вставка)';
    } else {
      title.textContent = 'Адрес клиента (автопоиск и вставка)';
    }

    wrap.replaceChildren(title, inputWrap, suggestions || document.createElement('div'), status || document.createElement('div'));

    const input = document.getElementById('addressSearch');
    if (input && input.getAttribute('placeholder')) input.setAttribute('placeholder', '');

    const icon = wrap.querySelector('.address-search-icon');
    if (icon && icon.textContent) icon.textContent = '';
    if (status) status.classList.add('pmk-address-empty-help-hidden');
  }

  function applyAll() {
    scheduled = false;
    removeFieldPlaceholders();
    cleanAddressSearchBlock();
  }

  function scheduleApply(delay = 0) {
    if (scheduled) return;
    scheduled = true;
    setTimeout(applyAll, delay);
  }

  function boot() {
    applyAll();
    document.addEventListener('input', event => {
      if (event.target?.closest?.('#view-form, #reminderForm, #addressSearchWrap')) scheduleApply(16);
    }, true);
    document.addEventListener('click', event => {
      if (event.target?.closest?.('#view-form, #reminderForm, [data-v50-open]')) scheduleApply(60);
    }, true);
    document.addEventListener('pmk-form-opened', () => scheduleApply(16), true);
    document.addEventListener('pmk-address-ready', () => scheduleApply(16), true);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
