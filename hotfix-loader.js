'use strict';

(() => {
  const mobileStyles = document.createElement('link');
  mobileStyles.rel = 'stylesheet';
  mobileStyles.href = './mobile-rug-layout.css?v=36';
  document.head.appendChild(mobileStyles);

  const files = [
    './stability-route.js?v=34',
    './stability-cache.js?v=34',
    './stability-copy.js?v=34',
    './stability-draft.js?v=34',
    './returning-client-search.js?v=35',
    './google-freeform-import.js?v=36',
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
