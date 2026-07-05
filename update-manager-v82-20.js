'use strict';

(() => {
  if (window.PMK_UPDATE_MANAGER_V82_48_3_NO_LOOP) return;
  window.PMK_UPDATE_MANAGER_V82_20 = true;
  window.PMK_UPDATE_MANAGER_V82_35 = true;
  window.PMK_UPDATE_MANAGER_V82_37 = true;
  window.PMK_UPDATE_MANAGER_V82_38 = true;
  window.PMK_UPDATE_MANAGER_V82_39 = true;
  window.PMK_UPDATE_MANAGER_V82_40 = true;
  window.PMK_UPDATE_MANAGER_V82_41 = true;
  window.PMK_UPDATE_MANAGER_V82_42 = true;
  window.PMK_UPDATE_MANAGER_V82_43 = true;
  window.PMK_UPDATE_MANAGER_V82_44 = true;
  window.PMK_UPDATE_MANAGER_V82_45 = true;
  window.PMK_UPDATE_MANAGER_V82_46 = true;
  window.PMK_UPDATE_MANAGER_V82_47 = true;
  window.PMK_UPDATE_MANAGER_V82_48 = true;
  window.PMK_UPDATE_MANAGER_V82_48_1 = true;
  window.PMK_UPDATE_MANAGER_V82_48_3_NO_LOOP = true;

  const CURRENT = '82.48.3';
  const CURRENT_TOKEN = 'google-oauth-fallback-working-events-v82-48-3';
  const INSTALLED_VERSION_KEY = 'pmk-installed-version';
  const INSTALLED_TOKEN_KEY = 'pmk-installed-build-token';

  function cleanupModal() {
    document.querySelectorAll('.pmk-update-modal-backdrop,#pmkUpdateModal').forEach(node => node.remove());
    document.documentElement.classList.remove('pmk-update-locked');
    document.body?.classList.remove('pmk-update-locked');
    if (document.body) {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.pointerEvents = '';
    }
  }

  function rememberCurrent() {
    try {
      localStorage.setItem(INSTALLED_VERSION_KEY, CURRENT);
      localStorage.setItem(INSTALLED_TOKEN_KEY, CURRENT_TOKEN);
      sessionStorage.setItem('pmk-update-later-token', `${CURRENT}|${CURRENT_TOKEN}`);
    } catch {}
  }

  function boot() {
    rememberCurrent();
    cleanupModal();
  }

  window.PMK_UPDATE_MANAGER = {
    version: CURRENT,
    check: () => { rememberCurrent(); cleanupModal(); return Promise.resolve(false); },
    updateNow: () => { location.href = './reset.html?manual=1&v=' + encodeURIComponent(CURRENT); },
    disableAutoPrompt: true,
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
