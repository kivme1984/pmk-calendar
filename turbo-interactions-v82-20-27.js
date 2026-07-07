'use strict';

(() => {
  if (globalThis.PMK_TURBO_INTERACTIONS_V82_20_27) return;
  globalThis.PMK_TURBO_INTERACTIONS_V82_20_27 = true;

  function injectStyle() {
    if (document.getElementById('pmkTurboInteractionsV822027Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkTurboInteractionsV822027Styles';
    style.textContent = `
      button,a,summary,input,textarea,select,[role="button"],[data-open-form],[data-v50-open]{
        touch-action:manipulation!important;
        -webkit-tap-highlight-color:transparent!important;
      }
      .view,.v50-source-section,.event-card,.form-card{
        contain:layout style!important;
      }
      .address-suggestions,.sidebar,.modal,.v50-editor-open{
        contain:layout style paint!important;
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    injectStyle();
    document.documentElement.classList.add('pmk-turbo-v82-20-27');
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
