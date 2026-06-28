'use strict';

(() => {
  if (window.PMK_PLANNING_REFRESH_REMOVE_V62) return;
  window.PMK_PLANNING_REFRESH_REMOVE_V62 = true;

  function removePlanningRefresh() {
    document.querySelector('#view-week #refreshBtn')?.remove();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', removePlanningRefresh, { once: true })
    : removePlanningRefresh();
})();