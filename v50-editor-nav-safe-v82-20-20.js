'use strict';

(() => {
  if (globalThis.PMK_V50_EDITOR_NAV_SAFE_V82_20_20) return;
  globalThis.PMK_V50_EDITOR_NAV_SAFE_V82_20_20 = true;

  const ORDER = [
    { type: 'client', label: 'Адрес' },
    { type: 'date', label: 'Дата' },
    { type: 'rugs', label: 'Ковры' },
    { type: 'cost', label: 'Стоимость' },
  ];

  function injectStyle() {
    if (document.getElementById('pmkV50EditorNavSafeV822020Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkV50EditorNavSafeV822020Styles';
    style.textContent = `
      body.v50-modal-active .v50-editor-bar{
        grid-template-columns:40px minmax(64px,1fr) auto auto auto!important;
        gap:5px!important;
        padding:0 8px!important;
      }
      body.v50-modal-active .v50-editor-bar strong{
        min-width:0!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
        font-size:16px!important;
      }
      body.v50-modal-active .v50-editor-done{
        min-height:32px!important;
        height:32px!important;
        padding:0 9px!important;
        border-radius:9px!important;
        background:rgba(255,196,0,.14)!important;
        color:#ffc400!important;
        font-size:12px!important;
        line-height:1!important;
        white-space:nowrap!important;
      }
      .v50-editor-step-btn-v82-20-20{
        min-height:32px!important;
        height:32px!important;
        padding:0 8px!important;
        border:1px solid rgba(255,196,0,.55)!important;
        border-radius:9px!important;
        background:#ffc400!important;
        color:#111!important;
        font:inherit!important;
        font-size:11px!important;
        font-weight:900!important;
        line-height:1!important;
        white-space:nowrap!important;
        -webkit-tap-highlight-color:transparent!important;
      }
      .v50-editor-step-btn-v82-20-20.prev{
        background:rgba(255,255,255,.12)!important;
        color:#fff!important;
        border-color:rgba(255,255,255,.28)!important;
      }
      .v50-editor-step-btn-v82-20-20:active,
      body.v50-modal-active .v50-editor-done:active{
        transform:scale(.96)!important;
      }
      @media(max-width:420px){
        body.v50-modal-active .v50-editor-bar{
          grid-template-columns:34px minmax(42px,1fr) auto auto auto!important;
          gap:4px!important;
          padding:0 6px!important;
        }
        body.v50-modal-active .v50-editor-bar strong{font-size:13px!important;}
        body.v50-modal-active .v50-editor-back{font-size:22px!important;}
        body.v50-modal-active .v50-editor-done,
        .v50-editor-step-btn-v82-20-20{
          min-height:30px!important;
          height:30px!important;
          padding:0 6px!important;
          border-radius:8px!important;
          font-size:10px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function activeType() {
    return document.querySelector('.v50-editor-open[data-v50-editor]')?.dataset?.v50Editor || '';
  }

  function openSection(type) {
    const target = document.querySelector(`#v50Summary [data-v50-open="${type}"]`);
    if (!target) return;
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    setTimeout(decorateOpenEditor, 80);
  }

  function makeStepButton(item, kind) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `v50-editor-step-btn-v82-20-20 ${kind}`;
    button.textContent = item.label;
    button.setAttribute('aria-label', `Перейти: ${item.label}`);
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openSection(item.type);
    });
    return button;
  }

  function decorateOpenEditor() {
    injectStyle();
    const section = document.querySelector('.v50-editor-open[data-v50-editor]');
    const bar = section?.querySelector('.v50-editor-bar');
    const done = bar?.querySelector('.v50-editor-done');
    if (!section || !bar || !done) return;

    bar.querySelectorAll('.v50-editor-step-btn-v82-20-20').forEach(node => node.remove());

    const type = activeType();
    const index = ORDER.findIndex(item => item.type === type);
    if (index < 0) return;

    const prev = ORDER[index - 1];
    const next = ORDER[index + 1];

    if (prev) done.insertAdjacentElement('beforebegin', makeStepButton(prev, 'prev'));
    if (next) done.insertAdjacentElement('afterend', makeStepButton(next, 'next'));
  }

  function boot() {
    injectStyle();
    document.addEventListener('click', event => {
      if (event.target.closest('[data-v50-open]') || event.target.closest('.v50-editor-back, .v50-editor-done, .v50-editor-save')) {
        setTimeout(decorateOpenEditor, 90);
      }
    }, false);
    setTimeout(decorateOpenEditor, 400);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
