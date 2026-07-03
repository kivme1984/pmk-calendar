'use strict';

(() => {
  if (globalThis.PMK_WORKFLOW_UI_CLEANUP_V82_19_2) return;
  globalThis.PMK_WORKFLOW_UI_CLEANUP_V82_19_2 = true;

  let scheduled = false;
  let observer = null;

  function isSettingsView() {
    return Boolean(document.querySelector('#view-settings.active'));
  }

  function clean() {
    scheduled = false;
    document.documentElement.dataset.pmkWorkflowCleanup = '82.19.2';

    document.querySelectorAll('#pmkStableBuildBadgeV8219,.pmk-stable-build-badge-v82-19')
      .forEach(node => node.remove());

    const indicator = document.querySelector('#pmkVersionIndicator');
    if (indicator && !isSettingsView()) indicator.remove();

    document.querySelectorAll('#requestForm .form-actions').forEach(row => {
      row.hidden = true;
      row.setAttribute('aria-hidden', 'true');
      row.style.setProperty('display', 'none', 'important');
    });

    const sticky = document.querySelector('#v50StickyActions');
    if (sticky) {
      sticky.hidden = false;
      sticky.removeAttribute('aria-hidden');
      sticky.style.removeProperty('display');
    }
  }

  function scheduleClean() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(clean);
  }

  function installObserver() {
    if (observer) return;
    observer = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => {
        if (mutation.type === 'attributes') {
          const element = mutation.target;
          return element?.id === 'pmkVersionIndicator'
            || element?.id === 'pmkStableBuildBadgeV8219'
            || element?.classList?.contains('form-actions')
            || element?.classList?.contains('view');
        }
        return [...mutation.addedNodes].some(node => node.nodeType === 1 && (
          node.matches?.('#pmkVersionIndicator,#pmkStableBuildBadgeV8219,.pmk-stable-build-badge-v82-19,#requestForm .form-actions')
          || node.querySelector?.('#pmkVersionIndicator,#pmkStableBuildBadgeV8219,.pmk-stable-build-badge-v82-19,#requestForm .form-actions')
        ));
      });
      if (relevant) scheduleClean();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'style'],
    });
  }

  function boot() {
    clean();
    installObserver();
    document.addEventListener('click', event => {
      if (event.target.closest('.nav-item,[data-view],[data-v50-action="full"],.v50-editor-done,.v50-editor-back')) {
        setTimeout(scheduleClean, 0);
        setTimeout(scheduleClean, 180);
      }
    }, true);
    ['popstate', 'resize', 'pmk-version-ready']
      .forEach(name => globalThis.addEventListener(name, scheduleClean));
    setTimeout(scheduleClean, 250);
    setTimeout(scheduleClean, 1000);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
