'use strict';

(() => {
  if (globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_27) return;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_25 = true;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_26 = true;
  globalThis.PMK_FORM_PLACEHOLDERS_ADDRESS_STRICT_V82_20_27 = true;

  let scheduled = false;

  function injectStyle() {
    if (document.getElementById('pmkFormPlaceholdersAddressStrictV822027Styles')) return;
    document.getElementById('pmkFormPlaceholdersAddressStrictV822026Styles')?.remove();
    document.getElementById('pmkFormPlaceholdersAddressStrictV822025Styles')?.remove();
    document.getElementById('pmkAddressSearchCleanStrictV822024Styles')?.remove();
    document.getElementById('pmkAddressSearchCleanV822023Styles')?.remove();
    const style = document.createElement('style');
    style.id = 'pmkFormPlaceholdersAddressStrictV822027Styles';
    style.textContent = `
      #addressSearchWrap.address-search-wrap{margin-top:4px!important;margin-bottom:10px!important;}
      #addressSearchWrap::before,
      #addressSearchWrap .pmk-address-title-v82-20-24,
      #addressSearchWrap .pmk-address-title-v82-20-25,
      #addressSearchWrap .pmk-address-title-v82-20-26{content:none!important;display:none!important;}
      #addressSearchWrap .address-search-field{display:block!important;margin:0!important;padding:0!important;color:#2a2a2a!important;font-size:18px!important;font-weight:950!important;line-height:1.15!important;}
      #addressSearchWrap .address-search-input-wrap{display:block!important;position:relative!important;margin:7px 0 0!important;color:#111!important;line-height:normal!important;font-size:16px!important;}
      #addressSearchWrap #addressSearch{width:100%!important;min-height:54px!important;height:54px!important;padding-right:56px!important;border:2px solid #ffc400!important;box-shadow:0 0 0 1px rgba(255,196,0,.18)!important;background:#fff!important;color:#111!important;box-sizing:border-box!important;}
      #addressSearchWrap #addressSearch:focus{border-color:#f5b800!important;box-shadow:0 0 0 3px rgba(255,196,0,.24)!important;outline:none!important;}
      #addressSearchWrap .address-search-icon{
        position:absolute!important;
        right:12px!important;
        top:0!important;
        bottom:0!important;
        transform:none!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        width:38px!important;
        height:auto!important;
        min-height:100%!important;
        margin:0!important;
        color:#7a6400!important;
        font-size:26px!important;
        line-height:1!important;
        pointer-events:none!important;
      }
      #addressSearchWrap .address-search-status{display:none!important;}
      #view-form input::placeholder,#view-form textarea::placeholder,#reminderForm input::placeholder,#reminderForm textarea::placeholder{color:transparent!important;opacity:0!important;}
      @media(max-width:760px){
        #addressSearchWrap .address-search-field{font-size:17px!important;}
        #addressSearchWrap #addressSearch{min-height:52px!important;height:52px!important;padding-right:52px!important;}
        #addressSearchWrap .address-search-icon{right:10px!important;width:36px!important;font-size:25px!important;}
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

    wrap.querySelectorAll('.pmk-address-title-v82-20-24, .pmk-address-title-v82-20-25, .pmk-address-title-v82-20-26').forEach(node => node.remove());

    const inputWrap = wrap.querySelector('.address-search-input-wrap');
    const label = wrap.querySelector('label.address-search-field');
    const input = document.getElementById('addressSearch');

    if (label && inputWrap && !label.contains(inputWrap)) label.appendChild(inputWrap);
    if (label && !label.dataset.pmkSingleAddressLabel) {
      for (const node of Array.from(label.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = 'Адрес клиента (автопоиск и вставка)';
      }
      if (!Array.from(label.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) {
        label.insertBefore(document.createTextNode('Адрес клиента (автопоиск и вставка)'), label.firstChild);
      }
      label.dataset.pmkSingleAddressLabel = '1';
    }

    const icon = wrap.querySelector('.address-search-icon');
    if (icon && icon.textContent.trim() !== '🔍') icon.textContent = '🔍';
    if (input && input.getAttribute('placeholder')) input.setAttribute('placeholder', '');

    const status = document.getElementById('addressSearchStatus');
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
