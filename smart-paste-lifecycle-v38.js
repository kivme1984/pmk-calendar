'use strict';

(() => {
  const STORAGE_KEY = 'pmk-smart-paste-draft-v1';
  const originalSaveRequest = saveRequest;

  saveRequest = async function saveRequestWithSmartPasteCleanup(...args) {
    await originalSaveRequest(...args);
    if (state.currentView === 'form') return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    const textarea = qs('#smartPasteInput');
    if (textarea) textarea.value = '';
    const result = qs('#smartPasteResult');
    if (result) {
      result.className = 'smart-paste-result hidden';
      result.innerHTML = '';
    }
  };
})();
