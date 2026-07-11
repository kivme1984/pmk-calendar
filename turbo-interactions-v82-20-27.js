'use strict';

(() => {
  if (globalThis.PMK_TURBO_INTERACTIONS_V82_20_28) return;
  globalThis.PMK_TURBO_INTERACTIONS_V82_20_27 = true;
  globalThis.PMK_TURBO_INTERACTIONS_V82_20_28 = true;

  function injectStyle() {
    document.getElementById('pmkTurboInteractionsV822027Styles')?.remove();
    if (document.getElementById('pmkTurboInteractionsV822028Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkTurboInteractionsV822028Styles';
    style.textContent = `
      button,a,summary,input,textarea,select,[role="button"],[data-open-form],[data-v50-open]{
        touch-action:manipulation!important;
        -webkit-tap-highlight-color:transparent!important;
      }
      .event-card,.form-card,.v50-summary-card{
        contain:layout style!important;
      }
      .address-suggestions,.sidebar,.modal{
        contain:layout style paint!important;
      }
      body.v50-manager-preview .v50-source-section.v50-editor-open,
      body.v50-modal-active .v50-source-section.v50-editor-open{
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        touch-action:pan-y!important;
        overscroll-behavior-y:contain!important;
        contain:none!important;
        will-change:scroll-position!important;
        max-height:100dvh!important;
      }
      body.v50-manager-preview .v50-source-section.v50-editor-open *,
      body.v50-modal-active .v50-source-section.v50-editor-open *{
        touch-action:auto!important;
      }
      body.v50-manager-preview .v50-source-section.v50-editor-open input,
      body.v50-manager-preview .v50-source-section.v50-editor-open textarea,
      body.v50-manager-preview .v50-source-section.v50-editor-open select,
      body.v50-modal-active .v50-source-section.v50-editor-open input,
      body.v50-modal-active .v50-source-section.v50-editor-open textarea,
      body.v50-modal-active .v50-source-section.v50-editor-open select{
        touch-action:manipulation!important;
      }
      .v50-editor-bottom-nav-v82-20-21,
      .v50-editor-bar{
        touch-action:manipulation!important;
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    injectStyle();
    document.documentElement.classList.add('pmk-turbo-v82-20-28');
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
