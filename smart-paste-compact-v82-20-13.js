'use strict';

(() => {
  if (globalThis.PMK_SMART_PASTE_COMPACT_V82_20_13) return;
  globalThis.PMK_SMART_PASTE_COMPACT_V82_20_13 = true;

  function injectStyle() {
    if (document.getElementById('pmkSmartPasteCompactV822013Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkSmartPasteCompactV822013Styles';
    style.textContent = `
      #smartPasteCard.smart-paste-card,
      .smart-paste-card{
        margin:0 0 10px!important;
        padding:10px!important;
        border-width:1px!important;
        border-radius:14px!important;
      }
      .smart-paste-heading{
        gap:8px!important;
        margin-bottom:7px!important;
        align-items:center!important;
      }
      .smart-paste-heading>span{
        min-width:28px!important;
        width:28px!important;
        height:28px!important;
        border-radius:9px!important;
        font-size:15px!important;
      }
      .smart-paste-heading h2{
        margin:0!important;
        font-size:17px!important;
        line-height:1.08!important;
      }
      .smart-paste-heading p{
        margin:2px 0 0!important;
        font-size:12px!important;
        line-height:1.2!important;
      }
      .smart-paste-card .field{
        gap:5px!important;
        margin:0!important;
        font-size:12px!important;
      }
      .smart-paste-card textarea#smartPasteInput{
        min-height:66px!important;
        height:66px!important;
        max-height:92px!important;
        padding:8px 10px!important;
        font-size:13px!important;
        line-height:1.25!important;
        resize:vertical!important;
      }
      .smart-paste-actions{
        display:grid!important;
        grid-template-columns:1fr 1fr 1fr!important;
        gap:6px!important;
        margin-top:7px!important;
      }
      .smart-paste-actions .button,
      .smart-paste-actions .smart-paste-primary,
      #smartPasteParseBtn,
      #smartPasteClipboardBtn,
      #smartPasteClearBtn{
        width:100%!important;
        min-height:38px!important;
        height:38px!important;
        max-height:38px!important;
        padding:0 8px!important;
        border-radius:10px!important;
        font-size:12px!important;
        line-height:1.05!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:normal!important;
        box-sizing:border-box!important;
      }
      .smart-paste-result{
        margin-top:7px!important;
        padding:8px!important;
        border-radius:10px!important;
        font-size:12px!important;
      }
      .smart-paste-result>div{
        gap:4px!important;
        margin:5px 0!important;
      }
      .smart-paste-result span{
        padding:4px 6px!important;
        font-size:11px!important;
      }
      @media(max-width:700px){
        #smartPasteCard.smart-paste-card,
        .smart-paste-card{
          margin:0 0 9px!important;
          padding:9px!important;
          border-radius:13px!important;
        }
        .smart-paste-heading{
          gap:7px!important;
          margin-bottom:6px!important;
        }
        .smart-paste-heading>span{
          min-width:26px!important;
          width:26px!important;
          height:26px!important;
          border-radius:8px!important;
          font-size:14px!important;
        }
        .smart-paste-heading h2{
          font-size:16px!important;
        }
        .smart-paste-heading p{
          font-size:11px!important;
          line-height:1.18!important;
        }
        .smart-paste-card textarea#smartPasteInput{
          min-height:70px!important;
          height:70px!important;
          max-height:96px!important;
          padding:7px 9px!important;
          font-size:12px!important;
        }
        .smart-paste-actions{
          display:grid!important;
          grid-template-columns:1fr 1fr 1fr!important;
          gap:5px!important;
          margin-top:6px!important;
        }
        .smart-paste-actions .smart-paste-primary{
          grid-column:auto!important;
          order:0!important;
        }
        .smart-paste-actions .button,
        #smartPasteParseBtn,
        #smartPasteClipboardBtn,
        #smartPasteClearBtn{
          min-height:38px!important;
          height:38px!important;
          max-height:38px!important;
          padding:0 5px!important;
          font-size:10.8px!important;
          border-radius:9px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', injectStyle, { once: true })
    : injectStyle();
})();
