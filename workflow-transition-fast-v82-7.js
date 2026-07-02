'use strict';

(() => {
  if (globalThis.PMK_WORKFLOW_TRANSITION_FAST_V82_7) return;
  globalThis.PMK_WORKFLOW_TRANSITION_FAST_V82_7 = true;

  const TARGET_VIEW = {
    'pending-pickup': 'day',
    'picked-up': 'in-work',
    'in-progress': 'in-work',
    'pending-delivery': 'delivery-waiting',
    completed: 'completed',
    archived: 'archive',
  };

  function removeCurrentCard(button) {
    const target = TARGET_VIEW[button.dataset.status] || 'day';
    const current = typeof state !== 'undefined' ? state.currentView : '';
    if (!current || current === target) return;
    const card = button.closest('.event-card');
    if (!card) return;
    const removable = card.closest('.in-work-card-wrap,.history-compact-card,.event-card') || card;
    requestAnimationFrame(() => {
      removable.classList.add('pmk-status-moving-out-fast');
      setTimeout(() => removable.remove(), 80);
    });
  }

  function refreshSecondaryViews() {
    setTimeout(() => {
      try { globalThis.PMK_IN_WORK_WORKFLOW_V73_API?.render?.(); } catch {}
      try { globalThis.PMK_COMPLETED_ARCHIVE_WORKFLOW_V82_API?.render?.(); } catch {}
    }, 100);
  }

  function boot() {
    window.addEventListener('click', event => {
      const button = event.target.closest?.('[data-status-event][data-status]');
      if (!button) return;
      removeCurrentCard(button);
      refreshSecondaryViews();
    }, true);

    requestAnimationFrame(() => {
      try { if (typeof renderAll === 'function') renderAll(); } catch {}
      refreshSecondaryViews();
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();