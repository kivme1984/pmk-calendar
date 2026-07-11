'use strict';

(() => {
  if (globalThis.PMK_QUICK_ACTIONS_ICONS_V82_19) return;
  globalThis.PMK_QUICK_ACTIONS_ICONS_V82_19 = true;

  const icons = {
    paste: {
      label: 'Вставить текст клиента',
      svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h6M9 3h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1V5a2 2 0 0 1 2-2Z"/><path d="M8 11h8M8 15h6"/></svg>',
    },
    client: {
      label: 'Найти клиента',
      svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M3.5 18c.7-3.2 2.7-5 5.5-5 2 0 3.6.8 4.6 2.2"/><circle cx="17" cy="17" r="3"/><path d="m19.3 19.3 2.2 2.2"/></svg>',
    },
    slots: {
      label: 'Выбрать свободное окно',
      svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><circle cx="15.5" cy="15.5" r="3.5"/><path d="M15.5 13.5v2.2l1.5 1"/></svg>',
    },
    calculate: {
      label: 'Рассчитать стоимость',
      svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h8v3H8zM8 13h1M12 13h1M16 13h1M8 17h1M12 17h1M16 17h1"/></svg>',
    },
  };

  let scheduled = false;

  function apply() {
    scheduled = false;
    const panel = document.querySelector('#pmkManagerLaunchpad');
    if (!panel) return false;
    panel.classList.add('pmk-icon-actions-v82-19');

    Object.entries(icons).forEach(([action, config]) => {
      const button = panel.querySelector(`[data-workspace-action="${action}"]`);
      if (!button) return;
      button.classList.add('pmk-icon-action-v82-19');
      button.setAttribute('aria-label', config.label);
      button.setAttribute('title', config.label);
      button.dataset.pmkActionLabel = config.label;
      if (button.dataset.pmkIconV8219 !== action) {
        button.dataset.pmkIconV8219 = action;
        button.innerHTML = `<span class="pmk-action-icon-v82-19">${config.svg}</span>`;
      }
    });
    return true;
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  function boot() {
    apply();
    const root = document.querySelector('.main-content') || document.body;
    new MutationObserver(mutations => {
      if (mutations.some(mutation => [...mutation.addedNodes].some(node => node.nodeType === 1 && (
        node.id === 'pmkManagerLaunchpad' || node.querySelector?.('#pmkManagerLaunchpad')
      )))) scheduleApply();
    }).observe(root, { childList: true, subtree: true });

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (apply() || attempts >= 16) clearInterval(timer);
    }, 200);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
