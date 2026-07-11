'use strict';

(() => {
  if (globalThis.PMK_MENU_PERFORMANCE_V82_19) return;
  globalThis.PMK_MENU_PERFORMANCE_V82_19 = true;

  const metrics = globalThis.PMK_MENU_PERFORMANCE_V82_19_STATE = {
    installed: false,
    open: false,
    deferredRenders: 0,
    flushedRenders: 0,
  };
  let queuedRender = false;
  let flushing = false;
  let installed = false;

  function sidebarOpen() {
    return Boolean(document.querySelector('#sidebar')?.classList.contains('open'));
  }

  function installRenderGuard() {
    if (installed || typeof globalThis.renderAll !== 'function') return false;
    const previous = globalThis.renderAll;
    if (previous.__pmkMenuPerformanceV8219) {
      installed = true;
      metrics.installed = true;
      return true;
    }

    function guardedRenderAll(...args) {
      if (sidebarOpen() && !flushing) {
        queuedRender = true;
        metrics.deferredRenders += 1;
        return;
      }
      return previous(...args);
    }

    guardedRenderAll.__pmkMenuPerformanceV8219 = true;
    guardedRenderAll.__pmkPrevious = previous;
    globalThis.renderAll = guardedRenderAll;
    installed = true;
    metrics.installed = true;
    return true;
  }

  function flushQueuedRender() {
    if (!queuedRender || sidebarOpen() || flushing) return;
    queuedRender = false;
    flushing = true;
    requestAnimationFrame(() => {
      try {
        metrics.flushedRenders += 1;
        globalThis.renderAll?.();
      } finally {
        flushing = false;
      }
    });
  }

  function syncMenuState() {
    const sidebar = document.querySelector('#sidebar');
    const menu = document.querySelector('#menuToggle');
    if (!sidebar || !menu) return false;

    const open = sidebar.classList.contains('open');
    metrics.open = open;
    document.body.classList.toggle('pmk-sidebar-open', open);
    document.documentElement.classList.toggle('pmk-menu-active-v82-19', open);
    menu.setAttribute('aria-expanded', String(open));
    if (!open) flushQueuedRender();
    return true;
  }

  function boot() {
    installRenderGuard();
    const sidebar = document.querySelector('#sidebar');
    const menu = document.querySelector('#menuToggle');
    if (!sidebar || !menu) return;

    if (sidebar.dataset.pmkMenuPerformanceV8219 !== '1') {
      sidebar.dataset.pmkMenuPerformanceV8219 = '1';
      new MutationObserver(syncMenuState).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
      menu.addEventListener('click', () => requestAnimationFrame(syncMenuState), { passive: true });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) flushQueuedRender();
      });
    }

    syncMenuState();

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installRenderGuard();
      if (installed || attempts >= 12) clearInterval(timer);
    }, 250);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true })
    : setTimeout(boot, 0);
})();
