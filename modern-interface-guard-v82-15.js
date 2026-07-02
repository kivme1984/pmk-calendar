'use strict';

(() => {
  if (globalThis.PMK_MODERN_INTERFACE_GUARD_V82_15) return;
  globalThis.PMK_MODERN_INTERFACE_GUARD_V82_15 = true;
  document.documentElement.dataset.pmkCandidate = '82.15';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let attempts = 0;

  function enforceModernShell() {
    $('.nav-item[data-view="three-days"]')?.remove();
    $('[data-workspace-action="drafts"]')?.remove();

    const launchpad = $('#pmkManagerLaunchpad');
    if (launchpad) {
      launchpad.hidden = !['day', 'week', 'month'].includes(typeof state !== 'undefined' ? state.currentView : 'day');
      launchpad.classList.add('pmk-quick-actions-v82-10');
      const title = $('.pmk-launchpad-title span', launchpad);
      const heading = $('.pmk-launchpad-title strong', launchpad);
      if (title) title.textContent = 'Быстрые действия';
      if (heading) heading.textContent = 'Работа с заявкой';
      const allowed = ['paste', 'client', 'slots', 'calculate'];
      $$('[data-workspace-action]', launchpad).forEach(button => {
        if (!allowed.includes(button.dataset.workspaceAction)) button.remove();
        else {
          button.hidden = false;
          button.removeAttribute('data-pmk-hidden-quick');
          button.style.removeProperty('grid-column');
          button.style.removeProperty('grid-row');
        }
      });
    }
  }

  function checkModernShell() {
    const launchpad = $('#pmkManagerLaunchpad');
    const actions = launchpad ? $$('[data-workspace-action]', launchpad) : [];
    const failures = [];
    if ($('.nav-item[data-view="three-days"]')) failures.push('старый пункт «3 дня»');
    if ($('[data-workspace-action="drafts"]')) failures.push('старый блок «Черновики»');
    if (launchpad && actions.length !== 4) failures.push(`быстрых действий: ${actions.length}, должно быть 4`);
    if (!globalThis.PMK_FINAL_UI_V82_9 && !globalThis.PMK_FINAL_UI_V82_10) failures.push('не запущен современный интерфейс');
    if (!globalThis.PMK_FINAL_LAYOUT_LOCK_V82_12) failures.push('не запущена современная карточка v82.12');
    if (!globalThis.PMK_FINAL_PERIOD_LOCK_V82_13) failures.push('не запущены режимы недели и месяца');
    return failures;
  }

  function showFailure(failures) {
    let panel = $('#pmkModernGuardFailure');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'pmkModernGuardFailure';
      panel.style.cssText = 'position:fixed;inset:12px;z-index:100000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.76);font-family:Arial,sans-serif';
      document.body.appendChild(panel);
    }
    panel.innerHTML = `<div style="width:min(520px,100%);padding:20px;border-radius:16px;background:#fff;color:#171717;box-shadow:0 24px 70px rgba(0,0,0,.4)"><strong style="display:block;font-size:20px;margin-bottom:8px">Старый интерфейс заблокирован</strong><p style="margin:0 0 10px;line-height:1.45">Этот тест не открыл приложение, потому что современный слой загрузился не полностью.</p><small style="display:block;color:#8a2e2e;line-height:1.4">${failures.join(' · ')}</small></div>`;
  }

  function verify() {
    attempts += 1;
    enforceModernShell();
    const failures = checkModernShell();
    if (!failures.length) {
      $('#pmkModernGuardFailure')?.remove();
      return true;
    }
    if (attempts >= 40) showFailure(failures);
    return false;
  }

  function boot() {
    verify();
    const timer = setInterval(() => {
      if (verify() || attempts >= 40) clearInterval(timer);
    }, 150);
    document.addEventListener('click', event => {
      if (event.target.closest('.nav-item,[data-status-event],[data-open-day]')) setTimeout(enforceModernShell, 0);
    }, true);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
