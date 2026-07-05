'use strict';

(() => {
  if (globalThis.PMK_PERSISTENT_GOOGLE_AUTH_V82_20_STUB) return;
  globalThis.PMK_PERSISTENT_GOOGLE_AUTH_V82_20_STUB = true;
  globalThis.PMK_PERSISTENT_GOOGLE_AUTH_V82_20 = true;

  function callFinal(name, ...args) {
    const api = globalThis.PMK_GOOGLE_WORKER_FINAL;
    return api && typeof api[name] === 'function' ? api[name](...args) : null;
  }

  globalThis.PMK_PERSISTENT_GOOGLE_AUTH = {
    connect: (...args) => callFinal('connect', ...args),
    refresh: (...args) => callFinal('verify', ...args),
    disconnect: (...args) => callFinal('reset', ...args),
    hasSession: () => false,
    resetApiKey: (...args) => callFinal('reset', ...args),
  };
})();
