'use strict';

(() => {
  if (globalThis.PMK_V50_EDITOR_NAV_BOTTOM_V82_20_21) return;
  globalThis.PMK_V50_EDITOR_NAV_BOTTOM_V82_20_21 = true;

  const ORDER = [
    { type: 'client', label: 'Адрес' },
    { type: 'date', label: 'Дата' },
    { type: 'rugs', label: 'Ковры' },
    { type: 'cost', label: 'Стоимость' },
  ];

  function injectStyle() {
    if (document.getElementById('pmkV50EditorNavBottomV822021Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkV50EditorNavBottomV822021Styles';
    style.textContent = `
      body.v50-modal-active .v50-editor-bar{
        grid-template-columns:48px minmax(0,1fr)!important;
        gap:8px!important;
        padding:0 12px!important;
      }
      body.v50-modal-active .v50-editor-bar .v50-editor-done,
      body.v50-modal-active .v50-editor-bar .v50-editor-step-btn-v82-20-20{
        display:none!important;
      }
      body.v50-manager-preview .v50-source-section.v50-editor-open{
        padding-bottom:calc(96px + env(safe-area-inset-bottom))!important;
      }
      .v50-editor-bottom-nav-v82-20-21{
        position:fixed!important;
        left:10px!important;
        right:10px!important;
        bottom:calc(10px + env(safe-area-inset-bottom))!important;
        z-index:230!important;
        display:grid!important;
        grid-template-columns:minmax(78px,.75fr) minmax(122px,1.35fr) minmax(78px,.75fr)!important;
        gap:7px!important;
        align-items:stretch!important;
        padding:0!important;
        pointer-events:auto!important;
      }
      .v50-editor-bottom-nav-v82-20-21.only-next{
        grid-template-columns:minmax(122px,1.35fr) minmax(92px,.8fr)!important;
      }
      .v50-editor-bottom-nav-v82-20-21.only-prev{
        grid-template-columns:minmax(92px,.8fr) minmax(122px,1.35fr)!important;
      }
      .v50-editor-bottom-nav-v82-20-21 .v50-editor-save{
        position:static!important;
        left:auto!important;
        right:auto!important;
        bottom:auto!important;
        width:100%!important;
        min-height:54px!important;
        height:54px!important;
        max-height:54px!important;
        margin:0!important;
        border-radius:15px!important;
        font-size:16px!important;
        font-weight:950!important;
        background:#ffc400!important;
        color:#111!important;
        box-shadow:0 10px 26px rgba(0,0,0,.18)!important;
      }
      .v50-editor-bottom-step-v82-20-21{
        width:100%!important;
        min-height:54px!important;
        height:54px!important;
        max-height:54px!important;
        padding:0 8px!important;
        border-radius:15px!important;
        border:1px solid rgba(0,0,0,.13)!important;
        background:#fff!important;
        color:#111!important;
        box-shadow:0 10px 26px rgba(0,0,0,.12)!important;
        font:inherit!important;
        font-size:14px!important;
        font-weight:950!important;
        line-height:1!important;
        white-space:nowrap!important;
        -webkit-tap-highlight-color:transparent!important;
      }
      .v50-editor-bottom-step-v82-20-21.next{
        background:#fff7d0!important;
        border-color:#ffc400!important;
      }
      .v50-editor-bottom-step-v82-20-21.placeholder{
        visibility:hidden!important;
        pointer-events:none!important;
      }
      .v50-editor-bottom-step-v82-20-21:active,
      .v50-editor-bottom-nav-v82-20-21 .v50-editor-save:active{
        transform:scale(.975)!important;
      }
      @media(max-width:420px){
        .v50-editor-bottom-nav-v82-20-21{
          left:8px!important;
          right:8px!important;
          bottom:calc(8px + env(safe-area-inset-bottom))!important;
          gap:6px!important;
          grid-template-columns:minmax(68px,.72fr) minmax(108px,1.35fr) minmax(68px,.72fr)!important;
        }
        .v50-editor-bottom-nav-v82-20-21.only-next{grid-template-columns:minmax(118px,1.35fr) minmax(78px,.8fr)!important;}
        .v50-editor-bottom-nav-v82-20-21.only-prev{grid-template-columns:minmax(78px,.8fr) minmax(118px,1.35fr)!important;}
        .v50-editor-bottom-nav-v82-20-21 .v50-editor-save,
        .v50-editor-bottom-step-v82-20-21{
          min-height:52px!important;
          height:52px!important;
          max-height:52px!important;
          border-radius:14px!important;
          font-size:12.5px!important;
          padding:0 6px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function activeSection() {
    return document.querySelector('.v50-editor-open[data-v50-editor]');
  }

  function openSection(type) {
    const target = document.querySelector(`#v50Summary [data-v50-open="${type}"]`);
    if (!target) return;
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    setTimeout(decorateBottomNav, 90);
  }

  function makeButton(item, kind) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `v50-editor-bottom-step-v82-20-21 ${kind}`;
    button.textContent = item.label;
    button.setAttribute('aria-label', `Перейти: ${item.label}`);
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openSection(item.type);
    });
    return button;
  }

  function decorateBottomNav() {
    injectStyle();
    const section = activeSection();
    if (!section) return;

    const type = section.dataset.v50Editor || '';
    const index = ORDER.findIndex(item => item.type === type);
    const save = section.querySelector('.v50-editor-save');
    if (index < 0 || !save) return;

    section.querySelectorAll('.v50-editor-bottom-nav-v82-20-21').forEach(node => node.remove());

    const prev = ORDER[index - 1];
    const next = ORDER[index + 1];
    const nav = document.createElement('div');
    nav.className = 'v50-editor-bottom-nav-v82-20-21';
    if (!prev && next) nav.classList.add('only-next');
    if (prev && !next) nav.classList.add('only-prev');

    save.textContent = 'Готово';

    if (prev) nav.append(makeButton(prev, 'prev'));
    nav.append(save);
    if (next) nav.append(makeButton(next, 'next'));

    section.append(nav);
  }

  function boot() {
    injectStyle();
    document.addEventListener('click', event => {
      if (event.target.closest('[data-v50-open], .v50-editor-back, .v50-editor-done, .v50-editor-save')) {
        setTimeout(decorateBottomNav, 100);
      }
    }, false);
    setTimeout(decorateBottomNav, 500);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
