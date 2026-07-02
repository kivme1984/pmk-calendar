'use strict';

(() => {
  const WORKER_URL = './sw-v82-1.js';
  registerServiceWorker = function registerServiceWorkerV821() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register(`${WORKER_URL}?v=82-1`, { scope:'./', updateViaCache:'none' }).catch(() => {});
  };
})();
