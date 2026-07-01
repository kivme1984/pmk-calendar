'use strict';

(() => {
  const WORKER_URL = './sw-v82-2.js';
  registerServiceWorker = function registerServiceWorkerV822() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register(`${WORKER_URL}?v=82-2`, { scope:'./', updateViaCache:'none' }).catch(() => {});
  };
})();
