'use strict';

(() => {
  const files = [
    './stability-route.js?v=34',
    './stability-cache.js?v=34',
    './stability-copy.js?v=34',
    './stability-draft.js?v=34',
  ];
  let index = 0;
  const loadNext = () => {
    if (index >= files.length) return;
    const script = document.createElement('script');
    script.src = files[index++];
    script.async = false;
    script.onload = loadNext;
    script.onerror = loadNext;
    document.head.appendChild(script);
  };
  loadNext();
})();
