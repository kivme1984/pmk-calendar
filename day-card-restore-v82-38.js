'use strict';

(() => {
  if (window.PMK_DAY_CARD_RESTORE_V82_38) return;
  window.PMK_DAY_CARD_RESTORE_V82_38 = true;

  function toast(message, type = 'error') {
    try {
      if (typeof showToast === 'function') showToast(message, type);
    } catch {}
  }

  function removeBrokenCompactStyle() {
    document.getElementById('pmkCompactDayCardsV8237Styles')?.remove();
  }

  function injectRestoreStyle() {
    if (document.getElementById('pmkDayCardRestoreV8238Styles')) return;

    const style = document.createElement('style');
    style.id = 'pmkDayCardRestoreV8238Styles';
    style.textContent = `
      #todayEvents{gap:10px!important}
      #todayEvents .event-card{padding:12px!important;border-radius:22px!important;gap:12px!important;margin:0 0 10px!important;display:grid!important;align-items:start!important}
      #todayEvents .event-time{min-width:98px!important;width:98px!important;padding:12px 8px!important;border-radius:16px!important;min-height:auto!important}
      #todayEvents .event-time .event-date,#todayEvents .event-time .event-weekday{font-size:11px!important;line-height:1.15!important}
      #todayEvents .event-time strong{font-size:15px!important;line-height:1.1!important}
      #todayEvents .event-time span{font-size:11px!important}
      #todayEvents .event-main{min-width:0!important;gap:8px!important}
      #todayEvents .event-card-header{gap:8px!important;margin-bottom:0!important;align-items:center!important}
      #todayEvents .event-card-header h3{font-size:17px!important;line-height:1.15!important;margin:0!important}
      #todayEvents .contract-chip{min-height:34px!important;padding:7px 12px!important;border-radius:12px!important;font-size:13px!important}
      #todayEvents .contract-editor{gap:6px!important}
      #todayEvents .contract-editor input{height:36px!important;min-height:36px!important;padding:6px 10px!important;border-radius:10px!important;font-size:13px!important}
      #todayEvents .event-quick-badges{gap:6px!important;flex-wrap:wrap!important;margin:0!important;max-height:none!important;overflow:visible!important}
      #todayEvents .quick-badge{min-height:28px!important;padding:5px 10px!important;border-radius:999px!important;font-size:12px!important;line-height:1.1!important}
      #todayEvents .address-block{min-height:40px!important;padding:8px 12px!important;border-radius:14px!important;font-size:14px!important;line-height:1.2!important;gap:8px!important}
      #todayEvents .address-text{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      #todayEvents .event-comment{padding:10px 12px!important;border-radius:14px!important;gap:8px!important;min-height:auto!important}
      #todayEvents .event-comment p{font-size:13px!important;line-height:1.22!important;margin:0!important;max-height:34px!important;overflow:hidden!important}
      #todayEvents .event-comment.expanded p{max-height:none!important}
      #todayEvents .event-comment button{font-size:12px!important}
      #todayEvents .event-actions{margin-top:8px!important;gap:8px!important;grid-column:auto!important;display:grid!important}
      #todayEvents .action-row{gap:6px!important;margin:0!important}
      #todayEvents .status-row{gap:6px!important;display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;scrollbar-width:none!important}
      #todayEvents .status-row::-webkit-scrollbar{display:none!important}
      #todayEvents .status-action{min-height:34px!important;height:auto!important;padding:0 8px!important;border-radius:10px!important;font-size:12px!important;white-space:nowrap!important;flex:1 0 auto!important}
      #todayEvents .manage-row{gap:8px!important;display:flex!important;align-items:center!important}
      #todayEvents .mini-button,#todayEvents .menu-button{min-height:40px!important;height:auto!important;border-radius:12px!important;font-size:13px!important;padding:0 12px!important}
      #todayEvents .primary-card-action,#todayEvents .secondary-card-action{font-size:13px!important}
      #todayEvents .card-menu summary{min-width:44px!important;width:44px!important;padding:0!important;display:grid!important;place-items:center!important}
      #todayEvents .card-menu-popover{min-width:180px!important;border-radius:14px!important;padding:6px!important}
      #todayEvents .card-menu-popover button{min-height:38px!important;font-size:13px!important;border-radius:10px!important}
      @media(max-width:560px){
        #todayEvents .event-card{padding:10px!important;gap:10px!important;border-radius:18px!important}
        #todayEvents .event-time{min-width:86px!important;width:86px!important;padding:10px 6px!important;border-radius:14px!important}
        #todayEvents .event-time .event-date,#todayEvents .event-time .event-weekday{font-size:10px!important}
        #todayEvents .event-time strong{font-size:14px!important}
        #todayEvents .event-time span{font-size:10px!important}
        #todayEvents .event-card-header h3{font-size:15px!important}
        #todayEvents .contract-chip{min-height:32px!important;padding:6px 10px!important;font-size:12px!important}
        #todayEvents .quick-badge{min-height:26px!important;padding:4px 8px!important;font-size:11px!important}
        #todayEvents .address-block{min-height:36px!important;padding:7px 10px!important;border-radius:12px!important;font-size:13px!important}
        #todayEvents .event-comment{padding:8px 10px!important;border-radius:12px!important}
        #todayEvents .event-comment p{font-size:12px!important;max-height:32px!important}
        #todayEvents .status-action{min-height:32px!important;font-size:11px!important;border-radius:9px!important}
        #todayEvents .mini-button,#todayEvents .menu-button{min-height:38px!important;font-size:12px!important;border-radius:10px!important}
        #todayEvents .card-menu summary{min-width:40px!important;width:40px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function patchSaveRequest() {
    if (typeof saveRequest !== 'function') return false;
    if (saveRequest.__pmkSaveGuardV8238) return true;
    const original = saveRequest;
    const wrapped = async function saveRequestGuardV8238(data, localOnly = false) {
      try {
        return await original.call(this, data, localOnly);
      } catch (error) {
        const message = error?.message || String(error || 'Ошибка сохранения');
        let hasToken = false;
        try { hasToken = typeof state !== 'undefined' && Boolean(state.token); } catch {}
        if (!localOnly && hasToken) {
          try {
            toast('Google не принял заявку. Сохраняю локально на устройстве.', 'error');
            return await original.call(this, data, true);
          } catch (fallbackError) {
            toast(fallbackError?.message || message, 'error');
            throw fallbackError;
          }
        }
        toast(message, 'error');
        throw error;
      }
    };
    wrapped.__pmkSaveGuardV8238 = true;
    try { globalThis.saveRequest = wrapped; } catch {}
    try { saveRequest = wrapped; } catch {}
    return true;
  }

  function keepLayoutClean() {
    removeBrokenCompactStyle();
    injectRestoreStyle();
  }

  function boot() {
    keepLayoutClean();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      keepLayoutClean();
      if (patchSaveRequest() || attempts > 80) clearInterval(timer);
    }, 100);
    const observer = new MutationObserver(() => keepLayoutClean());
    observer.observe(document.head, { childList: true, subtree: true });
    ['resize', 'pmk-calendar-sync-done', 'pmk-yandex-sync-done'].forEach(eventName => {
      window.addEventListener(eventName, keepLayoutClean);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
