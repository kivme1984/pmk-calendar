'use strict';

(() => {
  if (window.PMK_RUNTIME_SAFETY_V66) return;
  window.PMK_RUNTIME_SAFETY_V66 = true;

  if (typeof pmkRenderClientResults === 'function' && typeof pmkLastClientQuery !== 'undefined') {
    const renderClientResultsV66 = pmkRenderClientResults;
    pmkRenderClientResults = function renderClientResultsWithQueryV66(query = '') {
      pmkLastClientQuery = query;
      return renderClientResultsV66(query);
    };
  }

  if (typeof resetForm === 'function') {
    const resetFormV66 = resetForm;
    resetForm = function resetFormWithDraftStateV66(...args) {
      const result = resetFormV66(...args);
      const form = document.querySelector('#requestForm');
      if (form) form.dataset.activeDraftId = '';
      return result;
    };
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('#saveDraftBtn, .v50-draft')) return;
    setTimeout(() => window.PMK_MANAGER_WORKSPACE_V66_API?.renderDrafts?.(), 0);
  });
})();