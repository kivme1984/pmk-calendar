'use strict';

(() => {
  if (globalThis.PMK_FORM_COMPACT_V82_20_14) return;
  globalThis.PMK_FORM_COMPACT_V82_20_14 = true;

  function injectStyle() {
    if (document.getElementById('pmkFormCompactV822014Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkFormCompactV822014Styles';
    style.textContent = `
      #view-form .page-heading.compact{
        display:grid!important;
        grid-template-columns:minmax(0,1fr) auto!important;
        align-items:center!important;
        gap:8px!important;
        margin-bottom:10px!important;
      }
      #view-form .page-heading.compact>div{
        display:flex!important;
        align-items:center!important;
        gap:8px!important;
        min-width:0!important;
        flex-wrap:wrap!important;
      }
      #view-form .page-heading.compact .eyebrow{
        display:none!important;
      }
      #view-form #formTitle{
        margin:0!important;
        font-size:22px!important;
        line-height:1.05!important;
        white-space:nowrap!important;
      }
      #view-form .page-heading.compact>div>p:not(.eyebrow){
        margin:0!important;
        font-size:12px!important;
        line-height:1.15!important;
        opacity:.62!important;
        max-width:320px!important;
      }
      #cancelEditBtn{
        min-height:34px!important;
        height:34px!important;
        max-height:34px!important;
        padding:0 12px!important;
        border-radius:10px!important;
        font-size:12px!important;
        line-height:1!important;
        white-space:nowrap!important;
      }

      #view-form .form-card{
        padding:12px!important;
        border-radius:15px!important;
      }
      #view-form .form-column{
        gap:10px!important;
      }
      #view-form .form-card .section-heading{
        display:grid!important;
        grid-template-columns:28px minmax(0,1fr)!important;
        align-items:center!important;
        gap:8px!important;
        margin-bottom:9px!important;
      }
      #view-form .form-card .section-heading>span{
        width:28px!important;
        min-width:28px!important;
        height:28px!important;
        border-radius:9px!important;
        display:grid!important;
        place-items:center!important;
        align-self:center!important;
        justify-self:start!important;
        font-size:13px!important;
        line-height:1!important;
      }
      #view-form .form-card .section-heading h2{
        margin:0!important;
        font-size:18px!important;
        line-height:1.08!important;
      }
      #view-form .form-card .section-heading p{
        margin:2px 0 0!important;
        font-size:11.5px!important;
        line-height:1.18!important;
        opacity:.62!important;
      }
      #view-form .form-card .field-grid{
        gap:8px!important;
        margin-bottom:8px!important;
      }
      #view-form .form-card .field{
        gap:5px!important;
        font-size:12px!important;
        margin-bottom:8px!important;
      }
      #view-form .form-card input,
      #view-form .form-card select{
        min-height:38px!important;
        height:38px!important;
        padding:0 10px!important;
        border-radius:10px!important;
        font-size:13px!important;
      }
      #view-form .form-card textarea{
        min-height:70px!important;
        padding:8px 10px!important;
        border-radius:10px!important;
        font-size:13px!important;
        line-height:1.25!important;
      }
      #view-form #managerComment{
        min-height:78px!important;
        height:78px!important;
      }

      #view-form #rugsContainer.rug-list{
        gap:8px!important;
      }
      #view-form .rug-card{
        padding:9px!important;
        border-radius:13px!important;
        gap:7px!important;
      }
      #view-form .rug-card-header{
        margin-bottom:6px!important;
        min-height:24px!important;
      }
      #view-form .rug-card-header strong{
        font-size:13px!important;
      }
      #view-form .rug-card .field-grid{
        gap:6px!important;
        margin-bottom:6px!important;
      }
      #view-form .rug-card .field,
      #view-form .rug-card .field-label{
        font-size:11.5px!important;
        line-height:1.1!important;
      }
      #view-form .rug-card input,
      #view-form .rug-card select{
        min-height:34px!important;
        height:34px!important;
        padding:0 8px!important;
        border-radius:9px!important;
        font-size:12px!important;
      }
      #view-form .rug-details-grid{
        gap:7px!important;
        margin-top:6px!important;
      }
      #view-form .chip-grid{
        gap:5px!important;
      }
      #view-form .chip-grid label span{
        min-height:28px!important;
        padding:5px 7px!important;
        border-radius:8px!important;
        font-size:11px!important;
        line-height:1.05!important;
      }
      #view-form .rug-total{
        margin-top:6px!important;
        padding:6px 8px!important;
        border-radius:9px!important;
        font-size:12px!important;
      }
      #view-form #addRugBtn{
        min-height:38px!important;
        height:38px!important;
        max-height:38px!important;
        border-radius:10px!important;
        font-size:13px!important;
      }

      #view-form .form-column:last-child .form-card:first-child .section-heading h2,
      #view-form .form-column:last-child .form-card:first-child .section-heading p{
        letter-spacing:0!important;
      }
      #view-form #minimumOrderHint,
      #view-form .warning-box,
      #view-form .info-box{
        padding:8px 9px!important;
        border-radius:10px!important;
        font-size:12px!important;
        line-height:1.2!important;
        margin:6px 0!important;
      }
      #view-form .toggle-row{
        min-height:42px!important;
        padding:8px!important;
        border-radius:10px!important;
        gap:8px!important;
        margin-bottom:7px!important;
      }
      #view-form .toggle-row strong{
        font-size:13px!important;
        line-height:1.1!important;
      }
      #view-form .toggle-row small{
        font-size:11px!important;
        line-height:1.1!important;
      }

      @media(max-width:760px){
        #view-form .page-heading.compact{
          grid-template-columns:minmax(0,1fr) auto!important;
          gap:6px!important;
          margin-bottom:8px!important;
        }
        #view-form .page-heading.compact>div{
          display:grid!important;
          grid-template-columns:auto minmax(0,1fr)!important;
          align-items:center!important;
          gap:6px!important;
        }
        #view-form #formTitle{
          font-size:20px!important;
        }
        #view-form .page-heading.compact>div>p:not(.eyebrow){
          font-size:10.5px!important;
          max-width:none!important;
          overflow:hidden!important;
          display:-webkit-box!important;
          -webkit-line-clamp:2!important;
          -webkit-box-orient:vertical!important;
        }
        #cancelEditBtn{
          min-height:32px!important;
          height:32px!important;
          max-height:32px!important;
          padding:0 10px!important;
          font-size:11px!important;
          border-radius:9px!important;
        }
        #view-form .form-card{
          padding:10px!important;
          border-radius:14px!important;
        }
        #view-form .form-card .section-heading{
          grid-template-columns:26px minmax(0,1fr)!important;
          gap:7px!important;
          margin-bottom:7px!important;
        }
        #view-form .form-card .section-heading>span{
          width:26px!important;
          min-width:26px!important;
          height:26px!important;
          border-radius:8px!important;
          font-size:12px!important;
        }
        #view-form .form-card .section-heading h2{
          font-size:16px!important;
        }
        #view-form .form-card .section-heading p{
          font-size:10.5px!important;
          line-height:1.12!important;
        }
        #view-form .form-card .field-grid{
          gap:6px!important;
          margin-bottom:6px!important;
        }
        #view-form .form-card .field{
          gap:4px!important;
          font-size:11.2px!important;
          margin-bottom:6px!important;
        }
        #view-form .form-card input,
        #view-form .form-card select{
          min-height:35px!important;
          height:35px!important;
          padding:0 8px!important;
          font-size:12px!important;
          border-radius:9px!important;
        }
        #view-form .rug-card{
          padding:8px!important;
        }
        #view-form .rug-card input,
        #view-form .rug-card select{
          min-height:32px!important;
          height:32px!important;
          font-size:11.5px!important;
        }
        #view-form .chip-grid label span{
          min-height:26px!important;
          padding:4px 6px!important;
          font-size:10.5px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', injectStyle, { once: true })
    : injectStyle();
})();
