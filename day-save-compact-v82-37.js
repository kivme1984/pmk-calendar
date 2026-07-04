'use strict';

(() => {
  if (globalThis.PMK_SAVE_GUARD_COMPACT_DAY_V82_37) return;
  globalThis.PMK_SAVE_GUARD_COMPACT_DAY_V82_37 = true;

  function toast(message, type = 'error') {
    try { if (typeof showToast === 'function') showToast(message, type); } catch {}
  }

  function injectStyles() {
    if (document.getElementById('pmkCompactDayCardsV8237Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkCompactDayCardsV8237Styles';
    style.textContent = `
      #todayEvents{gap:8px!important}
      #todayEvents .event-card{display:grid!important;grid-template-columns:72px minmax(0,1fr)!important;gap:8px!important;padding:8px!important;border-radius:15px!important;margin:0 0 8px!important;align-items:start!important}
      #todayEvents .event-time{min-height:0!important;padding:8px 5px!important;border-radius:12px!important;gap:2px!important;text-align:center!important}
      #todayEvents .event-time .event-date,#todayEvents .event-time .event-weekday{font-size:9px!important;line-height:1.05!important;margin:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      #todayEvents .event-time strong{font-size:15px!important;line-height:1.05!important;margin:2px 0!important;letter-spacing:-.03em!important}
      #todayEvents .event-time span{font-size:10px!important;line-height:1!important;font-weight:900!important}
      #todayEvents .event-main{min-width:0!important;display:grid!important;gap:5px!important}
      #todayEvents .event-card-header{gap:6px!important;align-items:center!important;margin:0!important}
      #todayEvents .event-card-header h3{font-size:16px!important;line-height:1.08!important;margin:0!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      #todayEvents .contract-control{min-width:auto!important}
      #todayEvents .contract-chip{min-height:28px!important;height:28px!important;padding:4px 7px!important;border-radius:9px!important;font-size:11px!important;line-height:1!important;white-space:nowrap!important}
      #todayEvents .contract-editor{gap:4px!important;margin-top:4px!important}
      #todayEvents .contract-editor input{height:30px!important;min-height:30px!important;padding:5px 7px!important;font-size:12px!important;border-radius:9px!important}
      #todayEvents .event-quick-badges{display:flex!important;gap:4px!important;flex-wrap:wrap!important;margin:0!important;max-height:42px!important;overflow:hidden!important}
      #todayEvents .quick-badge{min-height:22px!important;padding:3px 6px!important;border-radius:999px!important;font-size:10px!important;line-height:1.05!important;font-weight:850!important;max-width:100%!important}
      #todayEvents .address-block{min-height:30px!important;padding:5px 7px!important;border-radius:10px!important;gap:5px!important;font-size:12px!important;line-height:1.15!important;margin:0!important}
      #todayEvents .address-icon,#todayEvents .address-arrow{font-size:12px!important;line-height:1!important}
      #todayEvents .address-text{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      #todayEvents .event-comment{min-height:0!important;padding:5px 7px!important;border-radius:10px!important;gap:5px!important;margin:0!important}
      #todayEvents .event-comment p{font-size:11px!important;line-height:1.18!important;max-height:26px!important;margin:0!important;overflow:hidden!important}
      #todayEvents .event-comment.expanded p{max-height:none!important}
      #todayEvents .event-comment button{font-size:10px!important;padding:0 3px!important}
      #todayEvents .event-actions{grid-column:1/-1!important;display:grid!important;gap:5px!important;margin:0!important;padding-top:1px!important}
      #todayEvents .action-row{gap:4px!important;margin:0!important}
      #todayEvents .status-row{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important}
      #todayEvents .manage-row{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 38px!important;align-items:center!important}
      #todayEvents .status-action,#todayEvents .mini-button,#todayEvents .menu-button{min-height:30px!important;height:30px!important;padding:4px 5px!important;border-radius:9px!important;font-size:10px!important;line-height:1.05!important;font-weight:900!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      #todayEvents .primary-card-action,#todayEvents .secondary-card-action{font-size:11px!important}
      #todayEvents .card-menu{position:relative!important}
      #todayEvents .card-menu summary{width:38px!important;min-width:38px!important;padding:0!important;display:grid!important;place-items:center!important}
      #todayEvents .card-menu-popover{right:0!important;bottom:34px!important;min-width:170px!important;border-radius:12px!important;padding:6px!important}
      #todayEvents .card-menu-popover button{min-height:34px!important;padding:7px 8px!important;font-size:12px!important;border-radius:9px!important}
      @media(max-width:560px){
        #todayEvents .event-card{grid-template-columns:62px minmax(0,1fr)!important;gap:6px!important;padding:7px!important;border-radius:13px!important}
        #todayEvents .event-time{padding:7px 4px!important;border-radius:10px!important}
        #todayEvents .event-time strong{font-size:13px!important}
        #todayEvents .event-time .event-date,#todayEvents .event-time .event-weekday{font-size:8px!important}
        #todayEvents .event-card-header h3{font-size:15px!important}
        #todayEvents .quick-badge{font-size:9px!important;padding:3px 5px!important}
        #todayEvents .address-block{font-size:11px!important;min-height:28px!important;padding:4px 6px!important}
        #todayEvents .status-action,#todayEvents .mini-button,#todayEvents .menu-button{min-height:28px!important;height:28px!important;font-size:9px!important;border-radius:8px!important}
        #todayEvents .manage-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 34px!important}
        #todayEvents .card-menu summary{width:34px!important;min-width:34px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function patchSaveRequest() {
    if (typeof saveRequest !== 'function') return false;
    if (saveRequest.__pmkSaveGuardV8237) return true;
    const original = saveRequest;
    const wrapped = async function saveRequestGuardV8237(data, localOnly = false) {
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
    wrapped.__pmkSaveGuardV8237 = true;
    try { globalThis.saveRequest = wrapped; } catch {}
    try { saveRequest = wrapped; } catch {}
    return true;
  }

  function boot() {
    injectStyles();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      injectStyles();
      if (patchSaveRequest() || attempts > 80) clearInterval(timer);
    }, 100);
    ['resize', 'pmk-calendar-sync-done', 'pmk-yandex-sync-done'].forEach(name => globalThis.addEventListener(name, injectStyles));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
