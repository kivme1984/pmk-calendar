'use strict';

(() => {
  if (globalThis.PMK_SAVE_GUARD_V82_40) return;
  globalThis.PMK_SAVE_GUARD_V82_40 = true;

  function toast(message, type = 'error') {
    try {
      if (typeof showToast === 'function') showToast(message, type);
    } catch {}
  }

  function patchSaveRequest() {
    if (typeof saveRequest !== 'function') return false;
    if (saveRequest.__pmkSaveGuardV8240) return true;

    const original = saveRequest;
    const wrapped = async function saveRequestGuardV8240(data, localOnly = false) {
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

    wrapped.__pmkSaveGuardV8240 = true;
    try { globalThis.saveRequest = wrapped; } catch {}
    try { saveRequest = wrapped; } catch {}
    return true;
  }

  function removeCardExperimentStyles() {
    document.getElementById('pmkCompactDayCardsV8237Styles')?.remove();
    document.getElementById('pmkDayCardRestoreV8238Styles')?.remove();
  }

  function boot() {
    removeCardExperimentStyles();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      removeCardExperimentStyles();
      if (patchSaveRequest() || attempts > 80) clearInterval(timer);
    }, 100);
    const observer = new MutationObserver(removeCardExperimentStyles);
    observer.observe(document.head, { childList: true, subtree: true });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
