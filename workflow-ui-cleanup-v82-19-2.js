'use strict';

(() => {
  if (globalThis.PMK_WORKFLOW_UI_CLEANUP_V82_19_2) return;
  globalThis.PMK_WORKFLOW_UI_CLEANUP_V82_19_2 = true;
  globalThis.PMK_FULL_FORM_DONE_FIX_V82_20 = true;

  let scheduled = false;
  let observer = null;
  let doneFixBound = false;

  function isSettingsView() {
    return Boolean(document.querySelector('#view-settings.active'));
  }

  function isFullFormOpen() {
    return document.body?.classList?.contains('v50-full-form');
  }

  function ensureDoneFixStyles() {
    if (document.getElementById('pmkFullFormDoneFixV8220Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkFullFormDoneFixV8220Styles';
    style.textContent = `
      body.v50-manager-preview .v50-editor-bar,
      body.v50-manager-preview .v50-editor-done,
      body.v50-manager-preview .v50-editor-back,
      body.v50-manager-preview .v50-editor-save{pointer-events:auto!important;touch-action:manipulation}
      body.v50-manager-preview .v50-source-section.v50-editor-open{padding-bottom:calc(170px + env(safe-area-inset-bottom))!important}
      body.v50-manager-preview.v50-full-form #requestForm .form-actions{display:flex!important;visibility:visible!important;opacity:1!important}
      body.v50-manager-preview.v50-full-form #v50StickyActions{display:none!important}
      body.v50-manager-preview.v50-full-form #addRugBtn{margin-bottom:18px}
    `;
    document.head.appendChild(style);
  }

  function syncSummaryAfterEditorClose() {
    const form = document.querySelector('#requestForm');
    if (!form) return;
    try {
      form.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('change', { bubbles: true }));
    } catch {}
  }

  function closeManagerEditor() {
    const opened = [...document.querySelectorAll('.v50-editor-open')];
    if (!opened.length) return false;
    try { document.activeElement?.blur?.(); } catch {}
    opened.forEach(section => section.classList.remove('v50-editor-open'));
    document.body.classList.remove('v50-modal-active');
    syncSummaryAfterEditorClose();
    scheduleClean();
    return true;
  }

  function closeFullForm() {
    if (!isFullFormOpen()) return false;
    try { document.activeElement?.blur?.(); } catch {}
    document.body.classList.remove('v50-full-form');
    const button = document.querySelector('#v50Summary [data-v50-action="full"]');
    if (button) button.textContent = 'Открыть полную форму';
    syncSummaryAfterEditorClose();
    scheduleClean();
    requestAnimationFrame(() => document.querySelector('#v50Summary')?.scrollIntoView({ block: 'start' }));
    return true;
  }

  function installDoneFix() {
    if (doneFixBound) return;
    doneFixBound = true;
    document.addEventListener('click', event => {
      const button = event.target.closest('.v50-editor-done,.v50-editor-back,.v50-editor-save');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!closeManagerEditor()) closeFullForm();
    }, true);
  }

  function clean() {
    scheduled = false;
    ensureDoneFixStyles();
    installDoneFix();
    document.documentElement.dataset.pmkWorkflowCleanup = '82.19.2';
    document.documentElement.dataset.pmkFullFormDoneFix = '82.20';

    document.querySelectorAll('#pmkStableBuildBadgeV8219,.pmk-stable-build-badge-v82-19')
      .forEach(node => node.remove());

    const indicator = document.querySelector('#pmkVersionIndicator');
    if (indicator && !isSettingsView()) indicator.remove();

    const fullForm = isFullFormOpen();
    document.querySelectorAll('#requestForm .form-actions').forEach(row => {
      if (fullForm) {
        row.hidden = false;
        row.removeAttribute('aria-hidden');
        row.style.removeProperty('display');
      } else {
        row.hidden = true;
        row.setAttribute('aria-hidden', 'true');
        row.style.setProperty('display', 'none', 'important');
      }
    });

    const sticky = document.querySelector('#v50StickyActions');
    if (sticky) {
      sticky.hidden = fullForm;
      sticky.setAttribute('aria-hidden', fullForm ? 'true' : 'false');
      if (fullForm) sticky.style.setProperty('display', 'none', 'important');
      else sticky.style.removeProperty('display');
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
            || element?.id === 'v50StickyActions'
            || element?.classList?.contains('form-actions')
            || element?.classList?.contains('view')
            || element === document.body;
        }
        return [...mutation.addedNodes].some(node => node.nodeType === 1 && (
          node.matches?.('#pmkVersionIndicator,#pmkStableBuildBadgeV8219,.pmk-stable-build-badge-v82-19,#v50StickyActions,#requestForm .form-actions,.v50-editor-bar,.v50-editor-save')
          || node.querySelector?.('#pmkVersionIndicator,#pmkStableBuildBadgeV8219,.pmk-stable-build-badge-v82-19,#v50StickyActions,#requestForm .form-actions,.v50-editor-bar,.v50-editor-save')
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
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  }

  function boot() {
    clean();
    installObserver();
    document.addEventListener('click', event => {
      if (event.target.closest('.nav-item,[data-view],[data-v50-action="full"],.v50-editor-done,.v50-editor-back,.v50-editor-save')) {
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