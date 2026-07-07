'use strict';

(() => {
  if (globalThis.PMK_FORM_TITLE_CANCEL_ROW_V82_20_22) return;
  globalThis.PMK_FORM_TITLE_CANCEL_ROW_V82_20_22 = true;

  function injectStyle() {
    if (document.getElementById('pmkFormTitleCancelRowV822022Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkFormTitleCancelRowV822022Styles';
    style.textContent = `
      #view-form .page-heading.compact{
        display:grid!important;
        grid-template-columns:minmax(0,1fr) auto!important;
        align-items:center!important;
        gap:10px!important;
        margin-bottom:18px!important;
      }
      #view-form .page-heading.compact>div{
        min-width:0!important;
      }
      #view-form .page-heading.compact .eyebrow,
      #view-form .page-heading.compact>div>p:not(.eyebrow){
        display:none!important;
      }
      #view-form #formTitle{
        margin:0!important;
        font-size:clamp(34px,9.2vw,48px)!important;
        line-height:1.02!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
      }
      #view-form #cancelEditBtn{
        width:auto!important;
        min-width:92px!important;
        max-width:118px!important;
        min-height:40px!important;
        height:40px!important;
        max-height:40px!important;
        padding:0 14px!important;
        border-radius:12px!important;
        font-size:14px!important;
        font-weight:850!important;
        line-height:1!important;
        white-space:nowrap!important;
      }
      @media(max-width:420px){
        #view-form .page-heading.compact{
          gap:8px!important;
          margin-bottom:16px!important;
        }
        #view-form #formTitle{
          font-size:clamp(31px,8.6vw,38px)!important;
        }
        #view-form #cancelEditBtn{
          min-width:86px!important;
          max-width:104px!important;
          min-height:38px!important;
          height:38px!important;
          max-height:38px!important;
          padding:0 11px!important;
          border-radius:11px!important;
          font-size:13px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', injectStyle, { once: true })
    : injectStyle();
})();
