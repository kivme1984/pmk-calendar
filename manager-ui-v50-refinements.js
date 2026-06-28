'use strict';

(() => {
  if (window.PMK_MANAGER_UI_V50_REFINEMENTS) return;
  window.PMK_MANAGER_UI_V50_REFINEMENTS = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const DRAFT_KEY = 'pmk-form-autodraft-v1';

  function readDraft() {
    try {
      const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return value?.data && Date.now() - Number(value.savedAt || 0) < 604800000 ? value : null;
    } catch {
      return null;
    }
  }

  function renderDraftNotice() {
    const summary = $('#v50Summary');
    if (!summary) return;
    $('#v50DraftNotice')?.remove();
    if (!readDraft()) return;

    const notice = document.createElement('section');
    notice.id = 'v50DraftNotice';
    notice.className = 'v50-draft-notice';
    notice.innerHTML = `
      <div class="v50-draft-copy">
        <span class="v50-draft-dot"></span>
        <div><strong>Незавершённая заявка</strong><small>Продолжить заполнение или удалить черновик.</small></div>
      </div>
      <div class="v50-draft-actions">
        <button type="button" data-v50-draft="view">Посмотреть</button>
        <button type="button" data-v50-draft="delete">Удалить</button>
      </div>`;
    summary.prepend(notice);

    notice.addEventListener('click', event => {
      const action = event.target.closest('[data-v50-draft]')?.dataset.v50Draft;
      if (action === 'view') {
        if (typeof pmkDraftRestore === 'function') pmkDraftRestore();
        else document.body.classList.add('v50-full-form');
        setTimeout(() => $('.form-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
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
    if (heading) $$('p,small', heading).forEach(node => node.remove());
    $$(':scope > p, :scope > .helper-text, :scope > .hint, :scope > small', card).forEach(node => {
      if (!node.closest('#smartPasteResult')) node.remove();
    });
  }

  function compactAutomationBar() {
    const grid = $('.v50-automation-grid');
    if (!grid) return;
    grid.classList.add('v50-automation-grid-compact');
    $$('[data-v50-action="paste"]', grid).forEach(button => button.remove());

    const labels = {
      client: ['К', 'Клиент'],
      address: ['⌖', 'Адрес'],
      slots: ['◷', 'Окна'],
      price: ['₽', 'Стоимость'],
    };
    Object.entries(labels).forEach(([action, [icon, text]]) => {
      const button = $(`[data-v50-action="${action}"]`, grid);
      if (!button) return;
      button.innerHTML = `<span aria-hidden="true">${icon}</span><b>${text}</b>`;
      button.setAttribute('aria-label', text);
    });
  }

  const services = [
    ['Удаление пятен', 'Пятна'],
    ['Удаление запаха мочи', 'Запах мочи'],
    ['Кондиционер', 'Кондиционер'],
    ['Вычёсывание шерсти и волос', 'Шерсть / волосы'],
    ['Озонация', 'Озон'],
    ['Подъём ворса', 'Расчёсывание ворса'],
  ];

  function rebuildRugServices(card) {
    if (!card) return;
    const container = $('.rug-services', card);
    if (!container || container.dataset.v50Built === '1') return;

    const checked = new Set($$('input[type="checkbox"]:checked', container).map(input => input.value));
    container.className = 'rug-services v50-service-grid';
    container.innerHTML = services.map(([value, label]) => `
      <label class="v50-service-chip">
        <input type="checkbox" value="${value}" ${checked.has(value) ? 'checked' : ''} />
        <span>${label}</span>
      </label>`).join('');
    container.dataset.v50Built = '1';
  }

  function refineRugs() {
    $$('.rug-card', $('#rugsContainer') || document).forEach(rebuildRugServices);
  }

  function install() {
    if (!$('#v50Summary')) return false;
    renderDraftNotice();
    compactSmartPaste();
    compactAutomationBar();
    refineRugs();

    const rugs = $('#rugsContainer');
    if (rugs && rugs.dataset.v50RefinementObserver !== '1') {
      rugs.dataset.v50RefinementObserver = '1';
      new MutationObserver(() => setTimeout(refineRugs, 30)).observe(rugs, { childList: true, subtree: true });
    }

    window.addEventListener('storage', renderDraftNotice);
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
