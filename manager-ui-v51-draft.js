'use strict';

(() => {
  const DRAFT_KEY = 'pmk-form-autodraft-v1';
  const $ = (selector, root = document) => root.querySelector(selector);

  function hasDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return Boolean(saved?.data && Date.now() - Number(saved.savedAt || 0) < 604800000);
    } catch {
      return false;
    }
  }

  function showDraft() {
    try {
      if (typeof pmkDraftRestore === 'function') pmkDraftRestore();
    } catch {}
    setTimeout(() => {
      $('#v50Summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  function deleteDraft(notice) {
    if (!window.confirm('Удалить незавершённую заявку?')) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    notice?.remove();
  }

  function install() {
    const form = $('#requestForm');
    if (!form) return false;

    const old = $('#pmkDraftRestore');
    const existing = $('#v50DraftNotice');
    if (!hasDraft()) {
      old?.remove();
      existing?.remove();
      return true;
    }
    if (existing) return true;

    const notice = document.createElement('section');
    notice.id = 'v50DraftNotice';
    notice.className = 'v51-draft-notice';
    notice.innerHTML = `
      <div class="v51-draft-text">
        <span>!</span>
        <div><strong>Есть незавершённая заявка</strong><small>Посмотрите её или удалите черновик.</small></div>
      </div>
      <div class="v51-draft-buttons">
        <button type="button" data-v50-draft="view">Посмотреть</button>
        <button type="button" data-v50-draft="delete">Удалить</button>
      </div>`;

    old?.remove();
    const smartInput = $('#smartPasteInput');
    const smartCard = smartInput?.closest('.form-card, section, .card');
    if (smartCard) smartCard.before(notice);
    else form.prepend(notice);

    notice.addEventListener('click', event => {
      const action = event.target.closest('[data-v50-draft]')?.dataset.v50Draft;
      if (action === 'view') showDraft();
      if (action === 'delete') deleteDraft(notice);
    });
    return true;
  }

  function boot() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 200) clearInterval(timer);
    }, 50);
    new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
