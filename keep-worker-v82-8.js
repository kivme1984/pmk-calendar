'use strict';

(() => {
  const WORKER_URL = './sw-v82-8.js';
  registerServiceWorker = function registerServiceWorkerV828() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register(`${WORKER_URL}?v=82-8`, { scope:'./', updateViaCache:'none' }).catch(() => {});
  };
})();