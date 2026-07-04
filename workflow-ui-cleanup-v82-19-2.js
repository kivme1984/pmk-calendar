'use strict';

(() => {
  if (globalThis.PMK_WORKFLOW_UI_CLEANUP_V82_19_2) return;
  globalThis.PMK_WORKFLOW_UI_CLEANUP_V82_19_2 = true;
  globalThis.PMK_FULL_FORM_DONE_FIX_V82_20 = true;
  globalThis.PMK_ADD_RUG_FOCUS_FIX_V82_20 = true;
  globalThis.PMK_COMPACT_ADDRESS_FIELDS_V82_20 = true;
  globalThis.PMK_ADDRESS_AUTOFILL_LABEL_V82_20 = true;
  globalThis.PMK_SEARCH_FREEZE_GUARD_V82_20 = true;
  globalThis.PMK_DADATA_ADDRESS_LABEL_V82_21 = true;

  let scheduled = false;
  let observer = null;
  let doneFixBound = false;
  let addRugFocusBound = false;
  let searchGuardBound = false;
  let searchRenderTimer = null;

  function isSettingsView() {
    return Boolean(document.querySelector('#view-settings.active'));
  }

  function isFullFormOpen() {
    return document.body?.classList?.contains('v50-full-form');
  }

  function ensureDoneFixStyles() {
    if (document.getElementById('pmkFullFormDoneFixV8220Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkFullFormDoneFixV8220Styles';
    style.textContent = `
      body.v50-manager-preview .v50-editor-bar,
      body.v50-manager-preview .v50-editor-done,
      body.v50-manager-preview .v50-editor-back,
      body.v50-manager-preview .v50-editor-save{pointer-events:auto!important;touch-action:manipulation}
      body.v50-manager-preview .v50-source-section.v50-editor-open{padding-bottom:calc(170px + env(safe-area-inset-bottom))!important}
      body.v50-manager-preview.v50-full-form #requestForm .form-actions{display:flex!important;visibility:visible!important;opacity:1!important}
      body.v50-manager-preview.v50-full-form #v50StickyActions{display:none!important}
      body.v50-manager-preview.v50-full-form #addRugBtn{margin-bottom:18px}
      body.v50-manager-preview #rugsContainer .rug-card.pmk-new-rug-focus-v82-20{outline:2px solid #ffc400;outline-offset:4px}
      body.v50-manager-preview .pmk-client-address-card-v82-20 .field-grid{gap:7px 8px!important}
      body.v50-manager-preview .pmk-client-address-card-v82-20 .field{gap:4px!important;min-width:0!important}
      body.v50-manager-preview .pmk-client-address-card-v82-20 input,
      body.v50-manager-preview .pmk-client-address-card-v82-20 select{min-height:44px!important;padding-top:8px!important;padding-bottom:8px!important}
      body.v50-manager-preview .pmk-address-compact-grid-v82-20{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px 8px!important}
      body.v50-manager-preview .pmk-address-house-v82-20{order:1}
      body.v50-manager-preview .pmk-address-apartment-v82-20{order:2}
      body.v50-manager-preview .pmk-address-entrance-v82-20{order:3}
      body.v50-manager-preview .pmk-address-floor-v82-20{order:4}
      body.v50-manager-preview .pmk-address-autofill-hint-v82-20{display:block;margin-top:4px;font-size:11px;line-height:1.2;font-weight:800;color:#6b7280}
      body.v50-manager-preview [data-v50-action="address"].pmk-address-autofill-label-v82-20 b{line-height:1.08!important}
      body.v50-manager-preview [data-v50-action="address"].pmk-address-autofill-label-v82-20 small{display:block;margin-top:2px;font-size:10px;line-height:1.05;font-weight:800;opacity:.82}
      #eventDetailsDialog[open]{z-index:99999!important}
      #eventDetailsDialog .details-close{pointer-events:auto!important;touch-action:manipulation!important}
      @media(max-width:420px){
        body.v50-manager-preview .pmk-address-compact-grid-v82-20{grid-template-columns:1fr 1fr!important;gap:6px!important}
        body.v50-manager-preview .pmk-client-address-card-v82-20 .field-grid{gap:6px!important}
        body.v50-manager-preview .pmk-client-address-card-v82-20 input,
        body.v50-manager-preview .pmk-client-address-card-v82-20 select{font-size:16px!important;min-height:42px!important}
        body.v50-manager-preview [data-v50-action="address"].pmk-address-autofill-label-v82-20 small{font-size:9px}
      }
    `;
    document.head.appendChild(style);
  }

  function syncSummaryAfterEditorClose() {
    const form = document.querySelector('#requestForm');
    if (!form) return;
    try {
      form.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('change', { bubbles: true }));
    } catch {}
  }

  function closeManagerEditor() {
    const opened = [...document.querySelectorAll('.v50-editor-open')];
    if (!opened.length) return false;
    try { document.activeElement?.blur?.(); } catch {}
    opened.forEach(section => section.classList.remove('v50-editor-open'));
    document.body.classList.remove('v50-modal-active');
    syncSummaryAfterEditorClose();
    scheduleClean();
    return true;
  }

  function closeFullForm() {
    if (!isFullFormOpen()) return false;
    try { document.activeElement?.blur?.(); } catch {}
    document.body.classList.remove('v50-full-form');
    const button = document.querySelector('#v50Summary [data-v50-action="full"]');
    if (button) button.textContent = 'Открыть полную форму';
    syncSummaryAfterEditorClose();
    scheduleClean();
    requestAnimationFrame(() => document.querySelector('#v50Summary')?.scrollIntoView({ block: 'start' }));
    return true;
  }

  function installDoneFix() {
    if (doneFixBound) return;
    doneFixBound = true;
    document.addEventListener('click', event => {
      const button = event.target.closest('.v50-editor-done,.v50-editor-back,.v50-editor-save');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!closeManagerEditor()) closeFullForm();
    }, true);
  }

  function lastRugCard() {
    const cards = [...document.querySelectorAll('#rugsContainer .rug-card')];
    return cards[cards.length - 1] || null;
  }

  function focusNewRug(previousCount = 0) {
    const card = lastRugCard();
    const currentCount = document.querySelectorAll('#rugsContainer .rug-card').length;
    if (!card || currentCount <= previousCount) return;

    document.querySelectorAll('#rugsContainer .rug-card.pmk-new-rug-focus-v82-20')
      .forEach(node => node.classList.remove('pmk-new-rug-focus-v82-20'));
    card.classList.add('pmk-new-rug-focus-v82-20');

    const scroller = card.closest('.v50-editor-open') || document.querySelector('#view-form.active') || document.scrollingElement || document.documentElement;
    try {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      card.scrollIntoView();
    }

    if (scroller && scroller !== document.scrollingElement && scroller !== document.documentElement && scroller.scrollHeight > scroller.clientHeight) {
      const top = card.offsetTop - Math.max(80, Math.round(scroller.clientHeight * 0.18));
      scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }

    const firstInput = card.querySelector('.rug-length,.rug-width,.rug-material,input,select,textarea');
    setTimeout(() => firstInput?.focus?.({ preventScroll: true }), 260);
    setTimeout(() => card.classList.remove('pmk-new-rug-focus-v82-20'), 1800);
  }

  function installAddRugFocusFix() {
    if (addRugFocusBound) return;
    addRugFocusBound = true;
    document.addEventListener('click', event => {
      const button = event.target.closest('#addRugBtn');
      if (!button) return;
      const previousCount = document.querySelectorAll('#rugsContainer .rug-card').length;
      setTimeout(() => focusNewRug(previousCount), 0);
      setTimeout(() => focusNewRug(previousCount), 160);
      setTimeout(() => focusNewRug(previousCount), 420);
    }, true);
  }

  function addClassForField(selector, className) {
    const field = document.querySelector(selector)?.closest('.field');
    field?.classList.add(className);
    return field;
  }

  function installCompactAddressLayout() {
    const house = addClassForField('#houseNumber', 'pmk-address-house-v82-20');
    const apartment = addClassForField('#apartmentNumber', 'pmk-address-apartment-v82-20');
    const entrance = addClassForField('#entrance', 'pmk-address-entrance-v82-20');
    const floor = addClassForField('#floor', 'pmk-address-floor-v82-20');
    const addressGrid = house?.parentElement;
    if (addressGrid && apartment?.parentElement === addressGrid && entrance?.parentElement === addressGrid && floor?.parentElement === addressGrid) {
      addressGrid.classList.add('pmk-address-compact-grid-v82-20');
    }
    const card = document.querySelector('#customerName')?.closest('.form-card');
    card?.classList.add('pmk-client-address-card-v82-20');
  }

  function replaceFieldText(field, text) {
    if (!field) return;
    const node = [...field.childNodes].find(item => item.nodeType === Node.TEXT_NODE && item.nodeValue.trim());
    if (node) node.nodeValue = text;
    else field.insertBefore(document.createTextNode(text), field.firstChild);
  }

  function ensureDefaultSettlement() {
    const settlement = document.querySelector('#settlement');
    if (!settlement) return;
    if (!settlement.value.trim()) settlement.value = 'Нижний Новгород';
    settlement.placeholder = 'Нижний Новгород';
  }

  function installStreetFieldHelp() {
    const street = document.querySelector('#street');
    const field = street?.closest('.field');
    if (!street || !field) return;
    replaceFieldText(field, 'Улица *');
    street.placeholder = 'Например, Большая Покровская';
    street.title = 'Обычное поле улицы. Автопоиск находится выше в поле «Адрес клиента». Сюда улица вставляется после выбора адреса.';
    street.setAttribute('aria-label', 'Улица');
    field.querySelectorAll('.pmk-address-autofill-hint-v82-20').forEach(node => node.remove());
  }

  function installDadataAddressHelp() {
    const candidates = [...document.querySelectorAll('label,.field,div')]
      .filter(node => /Адрес клиента/i.test(node.textContent || '') && node.querySelector?.('input'));
    const field = candidates.find(node => !node.querySelector('#street') && !node.querySelector('#settlement'));
    if (!field) return;
    replaceFieldText(field, 'Адрес клиента (автопоиск и вставка)');
    const input = field.querySelector('input');
    if (input) {
      input.placeholder = 'Введите минимум 3 символа и выберите адрес из списка';
      input.title = 'DaData: автопоиск адреса. После выбора адрес вставится в населённый пункт, улицу, дом, квартиру, подъезд и этаж.';
      input.setAttribute('aria-label', 'Адрес клиента: автопоиск и вставка во все поля адреса');
    }
    let hint = field.querySelector('.pmk-address-autofill-hint-v82-20');
    if (!hint && input) {
      hint = document.createElement('small');
      hint.className = 'pmk-address-autofill-hint-v82-20';
      input.insertAdjacentElement('afterend', hint);
    }
    if (hint) hint.textContent = 'Автопоиск: выберите адрес — он вставится в поля ниже.';
  }

  function installAddressAutofillLabel() {
    document.querySelectorAll('[data-v50-action="address"]').forEach(button => {
      if (button.dataset.pmkAddressAutofillLabel === '1') return;
      button.dataset.pmkAddressAutofillLabel = '1';
      button.classList.add('pmk-address-autofill-label-v82-20');
      button.title = 'Автопоиск адреса и вставка улицы, дома, квартиры, подъезда и этажа по полям';
      button.setAttribute('aria-label', 'Адрес: автопоиск и вставка во все поля адреса');
      const icon = button.querySelector('span')?.outerHTML || '<span>📍</span>';
      button.innerHTML = `${icon}<b>Адрес<small>(автопоиск<br>и вставка)</small></b>`;
    });
  }

  function closeDetailsDialog() {
    const dialog = document.querySelector('#eventDetailsDialog');
    if (!dialog) return false;
    try {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
    } catch {
      dialog.removeAttribute('open');
    }
    return true;
  }

  function runSearchRender() {
    const container = document.querySelector('#searchResults');
    try {
      if (typeof globalThis.renderSearch === 'function') globalThis.renderSearch();
    } catch (error) {
      if (container) container.innerHTML = '<div class="empty-state"><strong>Поиск временно сбросился.</strong><br>Повторите запрос короче или нажмите обновить.</div>';
      return;
    }
    const cards = [...document.querySelectorAll('#searchResults .event-card')];
    if (cards.length > 80) {
      cards.slice(80).forEach(card => card.remove());
      container?.insertAdjacentHTML('beforeend', '<div class="empty-state"><strong>Показаны первые 80 результатов.</strong><br>Уточните имя, телефон, улицу или номер договора.</div>');
    }
  }

  function installSearchFreezeGuard() {
    if (searchGuardBound) return;
    searchGuardBound = true;

    document.addEventListener('input', event => {
      if (event.target?.id !== 'globalSearch') return;
      event.stopPropagation();
      event.stopImmediatePropagation();
      clearTimeout(searchRenderTimer);
      searchRenderTimer = setTimeout(runSearchRender, 180);
    }, true);

    document.addEventListener('keydown', event => {
      if (event.target?.id === 'globalSearch' && event.key === 'Enter') {
        event.preventDefault();
        clearTimeout(searchRenderTimer);
        runSearchRender();
      }
      if (event.key === 'Escape') closeDetailsDialog();
    }, true);

    document.addEventListener('click', event => {
      const closeButton = event.target.closest('[data-details-close],.details-close');
      if (closeButton) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        closeDetailsDialog();
        return;
      }
      const dialog = document.querySelector('#eventDetailsDialog');
      if (dialog?.open && event.target === dialog) closeDetailsDialog();
    }, true);
  }

  function clean() {
    scheduled = false;
    ensureDoneFixStyles();
    installDoneFix();
    installAddRugFocusFix();
    installSearchFreezeGuard();
    installCompactAddressLayout();
    ensureDefaultSettlement();
    installStreetFieldHelp();
    installDadataAddressHelp();
    installAddressAutofillLabel();
    document.documentElement.dataset.pmkWorkflowCleanup = '82.19.2';
    document.documentElement.dataset.pmkFullFormDoneFix = '82.20';
    document.documentElement.dataset.pmkAddRugFocusFix = '82.20';
    document.documentElement.dataset.pmkCompactAddressFields = '82.20';
    document.documentElement.dataset.pmkAddressAutofillLabel = '82.20';
    document.documentElement.dataset.pmkSearchFreezeGuard = '82.20';
    document.documentElement.dataset.pmkDadataAddressLabel = '82.21';

    document.querySelectorAll('#pmkStableBuildBadgeV8219,.pmk-stable-build-badge-v82-19')
      .forEach(node => node.remove());

    const indicator = document.querySelector('#pmkVersionIndicator');
    if (indicator && !isSettingsView()) indicator.remove();

    const fullForm = isFullFormOpen();
    document.querySelectorAll('#requestForm .form-actions').forEach(row => {
      if (fullForm) {
        row.hidden = false;
        row.removeAttribute('aria-hidden');
        row.style.removeProperty('display');
      } else {
        row.hidden = true;
        row.setAttribute('aria-hidden', 'true');
        row.style.setProperty('display', 'none', 'important');
      }
    });

    const sticky = document.querySelector('#v50StickyActions');
    if (sticky) {
      sticky.hidden = fullForm;
      sticky.setAttribute('aria-hidden', fullForm ? 'true' : 'false');
      if (fullForm) sticky.style.setProperty('display', 'none', 'important');
      else sticky.style.removeProperty('display');
    }
  }

  function scheduleClean() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(clean);
  }

  function installObserver() {
    if (observer) return;
    observer = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => {
        if (mutation.type === 'attributes') {
          const element = mutation.target;
          return element?.id === 'pmkVersionIndicator'
            || element?.id === 'pmkStableBuildBadgeV8219'
            || element?.id === 'v50StickyActions'
            || element?.classList?.contains('form-actions')
            || element?.classList?.contains('view')
            || element === document.body;
        }
        return [...mutation.addedNodes].some(node => node.nodeType === 1 && (
          node.matches?.('#pmkVersionIndicator,#pmkStableBuildBadgeV8219,.pmk-stable-build-badge-v82-19,#v50StickyActions,#requestForm .form-actions,.v50-editor-bar,.v50-editor-save,#rugsContainer .rug-card,.field-grid,.field,[data-v50-action="address"],#eventDetailsDialog')
          || node.querySelector?.('#pmkVersionIndicator,#pmkStableBuildBadgeV8219,.pmk-stable-build-badge-v82-19,#v50StickyActions,#requestForm .form-actions,.v50-editor-bar,.v50-editor-save,#rugsContainer .rug-card,.field-grid,.field,[data-v50-action="address"],#eventDetailsDialog')
        ));
      });
      if (relevant) scheduleClean();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'style'],
    });
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  }

  function boot() {
    clean();
    installObserver();
    document.addEventListener('click', event => {
      if (event.target.closest('.nav-item,[data-view],[data-v50-action="full"],#addRugBtn,.v50-editor-done,.v50-editor-back,.v50-editor-save')) {
        setTimeout(scheduleClean, 0);
        setTimeout(scheduleClean, 180);
      }
    }, true);
    ['popstate', 'resize', 'pmk-version-ready']
      .forEach(name => globalThis.addEventListener(name, scheduleClean));
    setTimeout(scheduleClean, 250);
    setTimeout(scheduleClean, 1000);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();