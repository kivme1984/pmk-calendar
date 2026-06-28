'use strict';

(() => {
  if (window.PMK_MANAGER_UI_V50_REFINEMENTS) return;
  window.PMK_MANAGER_UI_V50_REFINEMENTS = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const DRAFT_KEY = 'pmk-form-autodraft-v1';

  function hasDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return Boolean(saved?.data && Date.now() - Number(saved.savedAt || 0) < 604800000);
    } catch {
      return false;
    }
  }

  function renderDraftNotice() {
    const summary = $('#v50Summary');
    if (!summary) return;
    $('#v50DraftNotice')?.remove();
    if (!hasDraft()) return;

    const notice = document.createElement('section');
    notice.id = 'v50DraftNotice';
    notice.className = 'v50-draft-notice';
    notice.innerHTML = `
      <div class="v50-draft-copy">
        <span>●</span>
        <div><strong>Есть незавершённая заявка</strong><small>Можно посмотреть и продолжить либо удалить.</small></div>
      </div>
      <div class="v50-draft-actions">
        <button type="button" data-v50-draft="view">Посмотреть</button>
        <button type="button" data-v50-draft="delete">Удалить</button>
      </div>`;
    summary.prepend(notice);

    notice.addEventListener('click', event => {
      const action = event.target.closest('[data-v50-draft]')?.dataset.v50Draft;
      if (action === 'view') {
        try {
          if (typeof pmkDraftRestore === 'function') pmkDraftRestore();
          else document.body.classList.add('v50-full-form');
        } catch {
          document.body.classList.add('v50-full-form');
        }
        setTimeout(() => $('.form-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
      if (action === 'delete') {
        if (!window.confirm('Удалить незавершённую заявку?')) return;
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
        $('#pmkDraftRestore')?.remove();
        notice.remove();
      }
    });
  }

  function compactSmartPaste() {
    const input = $('#smartPasteInput');
    if (!input) return;
    const card = input.closest('.form-card, section, .card');
    if (!card) return;
    card.classList.add('v50-smart-paste-compact');
    const heading = $('.section-heading', card);
    if (heading) $$('p,small', heading).forEach(node => { node.hidden = true; });
    $$(':scope > p, :scope > .helper-text, :scope > .hint, :scope > small', card).forEach(node => {
      if (!node.closest('#smartPasteResult')) node.hidden = true;
    });
  }

  function install() {
    if (!$('#v50Summary')) return false;
    renderDraftNotice();
    compactSmartPaste();
    window.addEventListener('storage', renderDraftNotice, { once: true });
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 100) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
