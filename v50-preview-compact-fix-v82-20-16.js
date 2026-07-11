'use strict';

(() => {
  if (globalThis.PMK_V50_PREVIEW_COMPACT_FIX_V82_20_16) return;
  globalThis.PMK_V50_PREVIEW_COMPACT_FIX_V82_20_16 = true;

  function injectStyle() {
    if (document.getElementById('pmkV50PreviewCompactFixV822016Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkV50PreviewCompactFixV822016Styles';
    style.textContent = `
      body.v50-manager-preview .v50-summary-card{
        grid-template-columns:42px minmax(0,1fr) auto!important;
      }
      body.v50-manager-preview .v50-card-icon{
        width:38px!important;
        height:38px!important;
        min-width:38px!important;
        justify-self:start!important;
        align-self:start!important;
        margin:0!important;
        border-radius:12px!important;
        font-size:20px!important;
      }
      body.v50-manager-preview .v50-rugs-summary{
        padding:0!important;
      }
      body.v50-manager-preview .v50-rugs-summary .v50-card-head{
        display:grid!important;
        grid-template-columns:42px minmax(0,1fr) auto!important;
        gap:12px!important;
        align-items:center!important;
        padding:15px!important;
      }
      body.v50-manager-preview .v50-rugs-summary .v50-card-head .v50-card-icon{
        grid-column:1!important;
        justify-self:start!important;
        margin:0!important;
        transform:none!important;
      }
      body.v50-manager-preview .v50-rugs-summary .v50-card-head strong{
        font-size:18px!important;
        line-height:1.12!important;
      }
      body.v50-manager-preview .v50-rugs-summary .v50-card-head button{
        font-size:13px!important;
      }
      body.v50-manager-preview .v50-rug-row{
        grid-template-columns:22px minmax(0,1fr) 14px!important;
        gap:8px!important;
        padding:12px 15px!important;
        align-items:center!important;
      }
      body.v50-manager-preview .v50-rug-number{
        display:inline!important;
        place-items:unset!important;
        width:auto!important;
        min-width:0!important;
        height:auto!important;
        padding:0!important;
        margin:0!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
        color:#ffc400!important;
        font-size:20px!important;
        font-weight:950!important;
        line-height:1!important;
        text-align:center!important;
      }
      body.v50-manager-preview .v50-rug-row strong{
        font-size:16px!important;
        line-height:1.12!important;
      }
      body.v50-manager-preview .v50-rug-row b{
        font-size:15px!important;
        line-height:1.12!important;
      }
      body.v50-manager-preview .v50-rug-row small{
        font-size:13px!important;
        line-height:1.18!important;
      }
      body.v50-manager-preview .v50-rug-row i{
        font-size:24px!important;
      }
      body.v50-manager-preview .v50-price-card .v50-card-body em{
        font-size:16px!important;
        line-height:1.12!important;
      }
      body.v50-manager-preview .v50-price-card .v50-card-body strong{
        font-size:24px!important;
        line-height:1.12!important;
        color:#177229!important;
      }
      body.v50-manager-preview .v50-price-card .v50-card-body b{
        font-size:15px!important;
        line-height:1.15!important;
      }
      body.v50-manager-preview .v50-price-card .v50-card-body small{
        font-size:14px!important;
        line-height:1.2!important;
      }
      @media(max-width:720px){
        body.v50-manager-preview .v50-summary-card{
          grid-template-columns:42px minmax(0,1fr) auto!important;
          padding:15px!important;
        }
        body.v50-manager-preview .v50-rugs-summary .v50-card-head{
          grid-template-columns:42px minmax(0,1fr) auto!important;
          padding:15px!important;
        }
        body.v50-manager-preview .v50-price-card .v50-card-body strong{
          font-size:22px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', injectStyle, { once: true })
    : injectStyle();
})();
