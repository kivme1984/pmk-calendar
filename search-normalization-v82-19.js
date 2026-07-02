'use strict';

(() => {
  if (globalThis.PMK_SEARCH_NORMALIZATION_V82_19) return;
  globalThis.PMK_SEARCH_NORMALIZATION_V82_19 = true;

  if (typeof eventSearchText !== 'function') return;
  const previousEventSearchText = eventSearchText;

  eventSearchText = function eventSearchTextNormalizedV8219(event) {
    const text = String(previousEventSearchText(event) || '').toLowerCase();
    const compactDigits = text.replace(/\D+/g, '');
    return compactDigits ? `${text} ${compactDigits}` : text;
  };
})();
