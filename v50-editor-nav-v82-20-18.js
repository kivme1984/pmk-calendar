'use strict';

(() => {
  if (globalThis.PMK_V50_EDITOR_NAV_V82_20_18) return;
  globalThis.PMK_V50_EDITOR_NAV_V82_20_18 = true;

  const ORDER = [
    { type: 'client', label: 'Адрес' },
    { type: 'date', label: 'Дата' },
    { type: 'rugs', label: 'Ковры' },
    { type: 'cost', label: 'Стоимость' },
  ];

  function injectStyle() {
    if (document.getElementById('pmkV50EditorNavV822018Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkV50EditorNavV822018Styles';
    style.textContent = `
      body.v50-modal-active .v50-editor-bar{
        grid-template-columns:42px minmax(0,1fr) auto!important;
        gap:6px!important;
      }
      body.v50-modal-active .v50-editor-bar strong{
        min-width:0!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
        font-size:18px!important;
      }
      .v50-editor-nav-pack-v82-20-18{
        display:flex!important;
        align-items:center!important;
        justify-content:flex-end!important;
        gap:5px!important;
        min-width:0!important;
      }
      .v50-editor-nav-btn-v82-20-18{
        min-height:34px!important;
        height:34px!important;
        max-height:34px!important;
        padding:0 10px!important;
        border:1px solid rgba(255,196,0,.5)!important;
        border-radius:10px!important;
        background:rgba(255,196,0,.12)!important;
        color:#ffc400!important;
        font:inherit!important;
        font-size:12px!important;
        font-weight:900!important;
        line-height:1!important;
        white-space:nowrap!important;
      }
      .v50-editor-nav-btn-v82-20-18.prev{
        color:#fff!important;
        background:rgba(255,255,255,.12)!important;
        border-color:rgba(255,255,255,.22)!important;
      }
      .v50-editor-nav-btn-v82-20-18.next{
        background:#ffc400!important;
        color:#111!important;
        border-color:#ffc400!important;
      }
      .v50-editor-nav-btn-v82-20-18:active,
      .v50-editor-done:active{transform:scale(.96)!important;}
      body.v50-modal-active .v50-editor-done{
        min-height:34px!important;
        height:34px!important;
        max-height:34px!important;
        padding:0 10px!important;
        border-radius:10px!important;
        background:rgba(255,255,255,.08)!important;
        font-size:12px!important;
        line-height:1!important;
        white-space:nowrap!important;
      }
      @media(max-width:420px){
        body.v50-modal-active .v50-editor-bar{
          grid-template-columns:38px minmax(70px,1fr) auto!important;
          padding:0 8px!important;
          gap:4px!important;
        }
        body.v50-modal-active .v50-editor-bar strong{font-size:15px!important;}
        .v50-editor-nav-pack-v82-20-18{gap:4px!important;}
        .v50-editor-nav-btn-v82-20-18,
        body.v50-modal-active .v50-editor-done{
          min-height:32px!important;
          height:32px!important;
          max-height:32px!important;
          padding:0 7px!important;
          font-size:10.5px!important;
          border-radius:9px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function currentType() {
    const open = document.querySelector('.v50-editor-open[data-v50-editor]');
    return open?.dataset?.v50Editor || '';
  }

  function openType(type) {
    const summary = document.getElementById('v50Summary');
    const target = summary?.querySelector(`[data-v50-open="${type}"]`);
    if (target) {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      setTimeout(decorate, 60);
    }
  }

  function decorate() {
    injectStyle();
    const bar = document.querySelector('.v50-editor-open .v50-editor-bar');
    if (!bar) return;
    const type = currentType();
    const index = ORDER.findIndex(item => item.type === type);
    if (index < 0) return;

    const done = bar.querySelector('.v50-editor-done');
    if (!done) return;

    let pack = bar.querySelector('.v50-editor-nav-pack-v82-20-18');
    if (!pack) {
      pack = document.createElement('div');
      pack.className = 'v50-editor-nav-pack-v82-20-18';
      done.replaceWith(pack);
    } else {
      pack.innerHTML = '';
    }

    const prev = ORDER[index - 1];
    const next = ORDER[index + 1];

    if (prev) {
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'v50-editor-nav-btn-v82-20-18 prev';
      prevBtn.textContent = prev.label;
      prevBtn.setAttribute('aria-label', `Перейти назад: ${prev.label}`);
      prevBtn.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openType(prev.type);
      });
      pack.append(prevBtn);
    }

    pack.append(done);

    if (next) {
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'v50-editor-nav-btn-v82-20-18 next';
      nextBtn.textContent = next.label;
      nextBtn.setAttribute('aria-label', `Перейти дальше: ${next.label}`);
      nextBtn.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openType(next.type);
      });
      pack.append(nextBtn);
    }
  }

  function boot() {
    injectStyle();
    document.addEventListener('click', () => setTimeout(decorate, 80), true);
    const observer = new MutationObserver(() => decorate());
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-v50-editor'] });
    decorate();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
