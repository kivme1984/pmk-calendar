'use strict';

(() => {
  if (globalThis.PMK_TODAY_FINAL_RELEASE_V82_20_30) return;
  globalThis.PMK_TODAY_FINAL_RELEASE_V82_20_30 = true;

  const DRAFT_KEY = 'pmk-form-autodraft-v1';
  let scheduled = false;

  function draftCount() {
    try {
      if (typeof pmkDraftRead === 'function') return pmkDraftRead() ? 1 : 0;
      const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return value?.data && Date.now() - value.savedAt < 604800000 ? 1 : 0;
    } catch { return 0; }
  }

  function injectStyle() {
    if (document.getElementById('pmkTodayFinalReleaseV822030Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkTodayFinalReleaseV822030Styles';
    style.textContent = `
      /* 1. Menu cleanup */
      .nav-list .nav-item[data-view="search"],
      .nav-list .nav-item[data-view="draft"],
      .nav-list .nav-item[data-view="drafts"],
      .nav-list .nav-item[data-view="local-drafts"],
      .nav-list .nav-item[data-view="local"],
      .nav-list .nav-item.pmk-hidden-draft-menu-v82-20-10{display:none!important;}

      /* 2. Header search: yellow loupe, no square */
      .app-header .brand{display:flex!important;align-items:center!important;gap:7px!important;min-width:0!important;}
      .pmk-header-search-v82-20-8{width:32px!important;height:32px!important;min-width:32px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#f5b800!important;font-size:26px!important;font-weight:950!important;display:inline-grid!important;place-items:center!important;margin:0!important;padding:0!important;line-height:1!important;touch-action:manipulation!important;}

      /* 3. Day header drafts next to new request + counter */
      .pmk-day-heading-actions-v82-20-9{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;flex-wrap:nowrap!important;width:100%!important;}
      #view-today .page-heading>.pmk-day-heading-actions-v82-20-9>[data-open-form]{min-width:0!important;flex:1 1 auto!important;}
      .pmk-day-draft-btn-v82-20-9{height:52px!important;min-height:52px!important;padding:0 12px!important;border-radius:16px!important;font-size:14px!important;font-weight:900!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;white-space:nowrap!important;touch-action:manipulation!important;}
      .pmk-draft-count-v82-20-12{min-width:21px!important;height:21px!important;padding:0 6px!important;border-radius:999px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;background:#d8d8d8!important;color:#555!important;font-size:12px!important;font-weight:950!important;line-height:1!important;}
      .pmk-day-draft-btn-v82-20-9.has-draft .pmk-draft-count-v82-20-12{background:#f5b800!important;color:#111!important;}

      /* 4. Day card lower buttons height lock */
      #todayEvents .event-card .event-actions .manage-row > a,
      #todayEvents .event-card .event-actions .manage-row > button,
      #todayEvents .event-card .event-actions .manage-row > details,
      #todayEvents .event-card .event-actions .mini-button,
      #todayEvents .event-card .event-actions .call-button,
      #todayEvents .event-card .event-actions .open-button,
      #todayEvents .event-card .event-actions .menu-button,
      #todayEvents .event-card .event-actions .card-menu > summary,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row > a,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row > button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .manage-row > details,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .mini-button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .call-button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .open-button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .menu-button,
      .event-card.pmk-approved-card-v82-20-1 .event-actions .card-menu > summary{
        min-height:38px!important;height:38px!important;max-height:38px!important;padding-top:0!important;padding-bottom:0!important;display:flex!important;align-items:center!important;justify-content:center!important;line-height:1!important;box-sizing:border-box!important;
      }

      /* 5. New request title + cancel in one row */
      #view-form .page-heading.compact{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:8px!important;margin-bottom:14px!important;}
      #view-form .page-heading.compact .eyebrow,
      #view-form .page-heading.compact>div>p:not(.eyebrow){display:none!important;}
      #view-form #formTitle{margin:0!important;font-size:clamp(31px,8.6vw,42px)!important;line-height:1.02!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
      #view-form #cancelEditBtn{width:auto!important;min-width:84px!important;max-width:108px!important;height:38px!important;min-height:38px!important;padding:0 11px!important;border-radius:11px!important;font-size:13px!important;font-weight:850!important;line-height:1!important;}

      /* 6. Quick paste compact */
      #smartPasteCard.smart-paste-card,.smart-paste-card{margin:0 0 9px!important;padding:9px!important;border-width:1px!important;border-radius:13px!important;}
      .smart-paste-heading{gap:7px!important;margin-bottom:6px!important;align-items:center!important;}
      .smart-paste-heading>span{min-width:26px!important;width:26px!important;height:26px!important;border-radius:8px!important;font-size:14px!important;}
      .smart-paste-heading h2{font-size:16px!important;line-height:1.08!important;margin:0!important;}
      .smart-paste-heading p{display:none!important;}
      .smart-paste-card .field{gap:4px!important;margin:0!important;font-size:12px!important;}
      .smart-paste-card textarea#smartPasteInput{min-height:64px!important;height:64px!important;max-height:90px!important;padding:7px 9px!important;font-size:12px!important;line-height:1.25!important;}
      .smart-paste-actions{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:5px!important;margin-top:6px!important;}
      .smart-paste-actions .button,#smartPasteParseBtn,#smartPasteClipboardBtn,#smartPasteClearBtn{width:100%!important;min-height:38px!important;height:38px!important;max-height:38px!important;padding:0 5px!important;border-radius:9px!important;font-size:10.8px!important;line-height:1.05!important;display:flex!important;align-items:center!important;justify-content:center!important;white-space:normal!important;box-sizing:border-box!important;}

      /* 7. Preview cards: aligned icons, compact rugs/cost */
      body.v50-manager-preview .v50-summary-card{grid-template-columns:42px minmax(0,1fr) auto!important;padding:15px!important;align-items:center!important;}
      body.v50-manager-preview .v50-card-icon{width:38px!important;height:38px!important;min-width:38px!important;justify-self:start!important;align-self:center!important;margin:0!important;border-radius:12px!important;font-size:20px!important;transform:none!important;}
      body.v50-manager-preview .v50-rugs-summary{padding:0!important;}
      body.v50-manager-preview .v50-rugs-summary .v50-card-head{display:grid!important;grid-template-columns:42px minmax(0,1fr) auto!important;gap:12px!important;align-items:center!important;padding:15px!important;}
      body.v50-manager-preview .v50-rugs-summary .v50-card-head .v50-card-icon{grid-column:1!important;justify-self:start!important;align-self:center!important;margin:0!important;transform:none!important;}
      body.v50-manager-preview .v50-rug-row{grid-template-columns:22px minmax(0,1fr) 14px!important;gap:8px!important;padding:12px 15px!important;align-items:center!important;}
      body.v50-manager-preview .v50-rug-number{display:inline!important;width:auto!important;min-width:0!important;height:auto!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#ffc400!important;font-size:20px!important;font-weight:950!important;line-height:1!important;text-align:center!important;}
      body.v50-manager-preview .v50-price-card .v50-card-body strong{font-size:22px!important;line-height:1.12!important;color:#177229!important;}
      body.v50-manager-preview .v50-price-card .v50-card-body b{font-size:15px!important;line-height:1.15!important;}
      body.v50-manager-preview .v50-price-card .v50-card-body small{font-size:14px!important;line-height:1.2!important;}

      /* 8. Address autocomplete: one title, one field, centered CSS loupe */
      #addressSearchWrap.address-search-wrap{margin-top:4px!important;margin-bottom:10px!important;display:block!important;}
      #addressSearchWrap::before,#addressSearchWrap .pmk-address-title-v82-20-24,#addressSearchWrap .pmk-address-title-v82-20-25,#addressSearchWrap .pmk-address-title-v82-20-26,#addressSearchWrap .address-search-field{content:none!important;display:none!important;}
      #addressSearchWrap .pmk-address-title-v82-20-30{display:block!important;margin:0 0 7px!important;color:#2a2a2a!important;font-size:18px!important;font-weight:950!important;line-height:1.15!important;}
      #addressSearchWrap .address-search-input-wrap{display:block!important;position:relative!important;margin:0!important;color:#111!important;line-height:normal!important;font-size:16px!important;}
      #addressSearchWrap #addressSearch{width:100%!important;min-height:54px!important;height:54px!important;padding-right:56px!important;border:2px solid #ffc400!important;border-radius:14px!important;box-shadow:0 0 0 1px rgba(255,196,0,.18)!important;background:#fff!important;color:#111!important;box-sizing:border-box!important;}
      #addressSearchWrap #addressSearch:focus{border-color:#f5b800!important;box-shadow:0 0 0 3px rgba(255,196,0,.24)!important;outline:none!important;}
      #addressSearchWrap .address-search-icon{position:absolute!important;right:12px!important;top:0!important;bottom:0!important;width:38px!important;height:100%!important;margin:0!important;font-size:0!important;line-height:0!important;pointer-events:none!important;transform:none!important;color:transparent!important;}
      #addressSearchWrap .address-search-icon::before{content:''!important;position:absolute!important;left:4px!important;top:50%!important;width:17px!important;height:17px!important;border:4px solid #7a6400!important;border-radius:50%!important;transform:translateY(-58%)!important;box-sizing:border-box!important;}
      #addressSearchWrap .address-search-icon::after{content:''!important;position:absolute!important;left:22px!important;top:50%!important;width:15px!important;height:4px!important;background:#7a6400!important;border-radius:999px!important;transform:translateY(5px) rotate(45deg)!important;transform-origin:left center!important;}
      #addressSearchWrap .address-search-status{display:none!important;}
      #view-form input::placeholder,#view-form textarea::placeholder,#reminderForm input::placeholder,#reminderForm textarea::placeholder{color:transparent!important;opacity:0!important;}

      /* 9. Editor bottom navigation and scroll */
      body.v50-manager-preview .v50-source-section.v50-editor-open,body.v50-modal-active .v50-source-section.v50-editor-open{overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;overscroll-behavior-y:contain!important;contain:none!important;max-height:100dvh!important;padding-bottom:calc(74px + env(safe-area-inset-bottom))!important;}
      .v50-editor-bottom-nav-v82-20-21{position:fixed!important;left:8px!important;right:8px!important;bottom:calc(7px + env(safe-area-inset-bottom))!important;z-index:230!important;display:grid!important;grid-template-columns:minmax(60px,.72fr) minmax(98px,1.35fr) minmax(60px,.72fr)!important;gap:5px!important;align-items:stretch!important;pointer-events:auto!important;touch-action:manipulation!important;}
      .v50-editor-bottom-nav-v82-20-21.only-next{grid-template-columns:minmax(104px,1.35fr) minmax(68px,.8fr)!important;}
      .v50-editor-bottom-nav-v82-20-21.only-prev{grid-template-columns:minmax(68px,.8fr) minmax(104px,1.35fr)!important;}
      .v50-editor-bottom-nav-v82-20-21 .v50-editor-save,.v50-editor-bottom-step-v82-20-21{min-height:39px!important;height:39px!important;max-height:39px!important;border-radius:11px!important;font-size:11.2px!important;padding:0 5px!important;}

      /* 10. Fast taps */
      button,a,summary,input,textarea,select,[role="button"],[data-open-form],[data-v50-open]{touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;}
    `;
    document.head.appendChild(style);
  }

  function removeMenuDuplicates() {
    document.querySelectorAll('.nav-list .nav-item').forEach(item => {
      const text = (item.textContent || '').trim().toLowerCase();
      if (text.includes('поиск') || text.includes('черновик')) item.classList.add('pmk-hidden-draft-menu-v82-20-10');
    });
  }

  function clearPlaceholders() {
    document.querySelectorAll('#view-form input[placeholder],#view-form textarea[placeholder],#reminderForm input[placeholder],#reminderForm textarea[placeholder]').forEach(element => {
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

  function rebuildAddress() {
    const wrap = document.getElementById('addressSearchWrap');
    if (!wrap) return;
    const inputWrap = wrap.querySelector('.address-search-input-wrap');
    if (!inputWrap) return;
    const suggestions = document.getElementById('addressSuggestions') || wrap.querySelector('.address-suggestions') || document.createElement('div');
    const status = document.getElementById('addressSearchStatus') || wrap.querySelector('.address-search-status') || document.createElement('div');
    suggestions.id ||= 'addressSuggestions';
    suggestions.classList.add('address-suggestions');
    status.id ||= 'addressSearchStatus';
    status.classList.add('address-search-status','pmk-address-empty-help-hidden');
    let title = wrap.querySelector('.pmk-address-title-v82-20-30');
    if (!title) {
      title = document.createElement('div');
      title.className = 'pmk-address-title-v82-20-30';
    }
    title.textContent = 'Адрес клиента (автопоиск и вставка)';
    wrap.replaceChildren(title, inputWrap, suggestions, status);
    const input = document.getElementById('addressSearch');
    if (input?.getAttribute('placeholder')) input.setAttribute('placeholder', '');
    const icon = wrap.querySelector('.address-search-icon');
    if (icon?.textContent) icon.textContent = '';
  }

  function refreshDraftButton() {
    const button = document.getElementById('pmkDayDraftBtn');
    if (!button) return;
    const count = draftCount();
    button.classList.toggle('has-draft', count > 0);
    button.title = count > 0 ? `Черновиков: ${count}` : 'Черновиков пока нет';
    button.innerHTML = `Черновики <span class="pmk-draft-count-v82-20-12" aria-label="${count} черновиков">${count}</span>`;
  }

  function applyAll() {
    scheduled = false;
    injectStyle();
    removeMenuDuplicates();
    clearPlaceholders();
    rebuildAddress();
    refreshDraftButton();
  }

  function scheduleApply(delay = 0) {
    if (scheduled) return;
    scheduled = true;
    setTimeout(applyAll, delay);
  }

  function boot() {
    applyAll();
    [120, 600, 1400].forEach(delay => setTimeout(applyAll, delay));
    document.addEventListener('click', event => {
      if (event.target?.closest?.('#view-form,#view-today,#sidebar,[data-open-form],[data-v50-open],#pmkDayDraftBtn')) scheduleApply(60);
    }, true);
    document.addEventListener('input', event => {
      if (event.target?.closest?.('#view-form,#requestForm,#addressSearchWrap')) scheduleApply(16);
    }, true);
    window.addEventListener('storage', () => scheduleApply(80));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
