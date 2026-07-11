'use strict';

(() => {
  if (globalThis.PMK_FORM_RUG_NUMBER_FIX_V82_20_15) return;
  globalThis.PMK_FORM_RUG_NUMBER_FIX_V82_20_15 = true;

  function injectStyle() {
    if (document.getElementById('pmkFormRugNumberFixV822015Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkFormRugNumberFixV822015Styles';
    style.textContent = `
      #view-form .rug-card-header strong{
        display:inline-flex!important;
        align-items:baseline!important;
        gap:4px!important;
        font-size:12px!important;
        line-height:1.05!important;
      }
      #view-form .rug-card-header .rug-number{
        display:inline!important;
        min-width:0!important;
        width:auto!important;
        height:auto!important;
        padding:0!important;
        margin:0!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
        color:#f5b800!important;
        font-size:12px!important;
        font-weight:950!important;
        line-height:1!important;
        vertical-align:baseline!important;
      }
      #view-form .rug-card-header .rug-card-actions,
      #view-form .rug-card-actions{
        display:flex!important;
        align-items:center!important;
        gap:5px!important;
      }
      #view-form .rug-card-header .remove-rug,
      #view-form .remove-rug{
        min-height:26px!important;
        height:26px!important;
        max-height:26px!important;
        padding:0 8px!important;
        border-radius:8px!important;
        font-size:10.5px!important;
        line-height:1!important;
      }

      #view-form .form-card .section-heading{
        display:grid!important;
        grid-template-columns:24px minmax(0,1fr)!important;
        align-items:center!important;
        gap:7px!important;
      }
      #view-form .form-card .section-heading>span{
        width:24px!important;
        min-width:24px!important;
        height:24px!important;
        align-self:center!important;
        justify-self:center!important;
        display:grid!important;
        place-items:center!important;
        font-size:12px!important;
        line-height:1!important;
      }
      #view-form .form-card .section-heading h2{
        font-size:15.5px!important;
        line-height:1.05!important;
      }
      #view-form .form-card .section-heading p{
        font-size:10px!important;
        line-height:1.1!important;
      }

      #view-form .form-card:nth-of-type(3) .section-heading,
      #view-form .form-column:last-child .form-card:first-child .section-heading{
        grid-template-columns:24px minmax(0,1fr)!important;
        align-items:center!important;
      }
      #view-form .form-card:nth-of-type(3) .section-heading>span,
      #view-form .form-column:last-child .form-card:first-child .section-heading>span{
        align-self:center!important;
        justify-self:center!important;
      }
      #view-form .form-card:nth-of-type(3) .section-heading h2,
      #view-form .form-column:last-child .form-card:first-child .section-heading h2{
        font-size:15px!important;
      }
      #view-form .form-card:nth-of-type(3) .section-heading p,
      #view-form .form-column:last-child .form-card:first-child .section-heading p{
        font-size:9.8px!important;
      }
      #view-form .rug-card .field,
      #view-form .rug-card .field-label,
      #view-form .form-column:last-child .form-card:first-child .field,
      #view-form .form-column:last-child .form-card:first-child .toggle-row strong,
      #view-form .form-column:last-child .form-card:first-child .toggle-row small{
        font-size:10.8px!important;
      }
      @media(max-width:760px){
        #view-form .rug-card-header strong,
        #view-form .rug-card-header .rug-number{
          font-size:11.5px!important;
        }
        #view-form .form-card .section-heading{
          grid-template-columns:22px minmax(0,1fr)!important;
          gap:6px!important;
        }
        #view-form .form-card .section-heading>span{
          width:22px!important;
          min-width:22px!important;
          height:22px!important;
          font-size:11px!important;
        }
        #view-form .form-card .section-heading h2{
          font-size:14.5px!important;
        }
        #view-form .form-card .section-heading p{
          font-size:9.5px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', injectStyle, { once: true })
    : injectStyle();
})();
