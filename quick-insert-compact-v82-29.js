'use strict';

(() => {
  if (globalThis.PMK_QUICK_INSERT_COMPACT_V82_29) return;
  globalThis.PMK_QUICK_INSERT_COMPACT_V82_29 = true;

  function injectStyles() {
    if (document.getElementById('pmkQuickInsertCompactV8229Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkQuickInsertCompactV8229Styles';
    style.textContent = `
      .pmk-quick-insert-compact-v82-29{padding:12px!important;border-radius:18px!important;margin-top:10px!important}
      .pmk-quick-insert-compact-v82-29 .section-heading{gap:10px!important;margin-bottom:8px!important}
      .pmk-quick-insert-compact-v82-29 .section-heading span:first-child{width:46px!important;height:46px!important;min-width:46px!important;border-radius:14px!important;font-size:22px!important}
      .pmk-quick-insert-compact-v82-29 .section-heading h2,
      .pmk-quick-insert-compact-v82-29 h2,
      .pmk-quick-insert-compact-v82-29 h3{font-size:20px!important;line-height:1.12!important;margin:0 0 4px!important}
      .pmk-quick-insert-compact-v82-29 .section-heading p,
      .pmk-quick-insert-compact-v82-29 p,
      .pmk-quick-insert-compact-v82-29 label{font-size:13px!important;line-height:1.25!important;margin-bottom:5px!important}
      .pmk-quick-insert-compact-v82-29 textarea{min-height:94px!important;height:94px!important;max-height:120px!important;padding:10px 12px!important;font-size:14px!important;line-height:1.35!important;border-radius:14px!important}
      .pmk-quick-insert-compact-v82-29 button{min-height:44px!important;height:auto!important;padding:9px 11px!important;border-radius:14px!important;font-size:15px!important;line-height:1.12!important}
      .pmk-quick-insert-compact-v82-29 .button-primary,
      .pmk-quick-insert-compact-v82-29 [data-smart-parse],
      .pmk-quick-insert-compact-v82-29 .pmk-quick-primary-v82-29{min-height:48px!important;padding:10px 12px!important;font-size:16px!important}
      .pmk-quick-insert-compact-v82-29 .field-grid,
      .pmk-quick-insert-compact-v82-29 .quick-actions,
      .pmk-quick-insert-compact-v82-29 .button-row{gap:8px!important;margin-top:8px!important}
      .pmk-quick-insert-compact-v82-29 > * + *{margin-top:8px!important}
      #view-form .page-heading.compact{gap:8px!important;margin-bottom:10px!important}
      #view-form .page-heading.compact h1{font-size:36px!important;line-height:1.05!important;margin-bottom:6px!important}
      #view-form .page-heading.compact p{font-size:14px!important;line-height:1.2!important}
      #view-form #cancelEditBtn{min-height:48px!important;padding:8px 12px!important;font-size:16px!important;border-radius:14px!important}
      @media(max-width:520px){
        .pmk-quick-insert-compact-v82-29{padding:10px!important;border-radius:16px!important}
        .pmk-quick-insert-compact-v82-29 .section-heading span:first-child{width:42px!important;height:42px!important;min-width:42px!important}
        .pmk-quick-insert-compact-v82-29 .section-heading h2,
        .pmk-quick-insert-compact-v82-29 h2,
        .pmk-quick-insert-compact-v82-29 h3{font-size:19px!important}
        .pmk-quick-insert-compact-v82-29 textarea{min-height:84px!important;height:84px!important;max-height:108px!important;font-size:13px!important;padding:9px 10px!important}
        .pmk-quick-insert-compact-v82-29 button{min-height:40px!important;font-size:14px!important;padding:8px 9px!important}
        .pmk-quick-insert-compact-v82-29 .button-primary,
        .pmk-quick-insert-compact-v82-29 [data-smart-parse],
        .pmk-quick-insert-compact-v82-29 .pmk-quick-primary-v82-29{min-height:44px!important;font-size:15px!important}
        #view-form .page-heading.compact h1{font-size:32px!important}
        #view-form #cancelEditBtn{min-height:44px!important;font-size:15px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function includesText(node, text) {
    return String(node?.textContent || '').toLowerCase().includes(text.toLowerCase());
  }

  function findQuickInsertCard() {
    const candidates = [...document.querySelectorAll('#requestForm .form-card, #view-form .form-card, section, article, div')];
    return candidates.find(node => includesText(node, 'Быстро вставить заявку') && node.querySelector('textarea'));
  }

  function applyCompact() {
    injectStyles();
    const card = findQuickInsertCard();
    if (!card) return;
    card.classList.add('pmk-quick-insert-compact-v82-29');

    const textarea = card.querySelector('textarea');
    if (textarea) {
      textarea.rows = 3;
      textarea.style.setProperty('height', '84px', 'important');
      textarea.style.setProperty('min-height', '84px', 'important');
      textarea.style.setProperty('max-height', '110px', 'important');
    }

    [...card.querySelectorAll('button')].forEach(button => {
      const text = String(button.textContent || '').toLowerCase();
      if (text.includes('распознать') || text.includes('распределить')) button.classList.add('pmk-quick-primary-v82-29');
    });
  }

  function boot() {
    applyCompact();
    let scheduled = false;
    const rerun = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        applyCompact();
      });
    };
    new MutationObserver(rerun).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    ['resize', 'pmk-version-ready'].forEach(name => globalThis.addEventListener(name, rerun));
    setTimeout(rerun, 300);
    setTimeout(rerun, 1000);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();