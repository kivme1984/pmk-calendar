'use strict';

(() => {
  if (window.PMK_MANAGER_UI_V50_REFINEMENTS) return;
  window.PMK_MANAGER_UI_V50_REFINEMENTS = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function draftKeys() {
    const keys = [];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || '';
        if (!/(draft|чернов|unsaved|smart-paste)/i.test(key)) continue;
        const stored = localStorage.getItem(key);
        if (stored && stored !== '{}' && stored !== '[]' && stored !== 'null' && stored.length > 2) keys.push(key);
      }
    } catch {}
    return keys;
  }

  function renderDraftNotice() {
    const summary = $('#v50Summary');
    if (!summary) return;
    $('#v50DraftNotice')?.remove();
    const keys = draftKeys();
    if (!keys.length) return;

    const notice = document.createElement('section');
    notice.id = 'v50DraftNotice';
    notice.className = 'v50-draft-notice';
    notice.innerHTML = `
      <div class="v50-draft-copy">
        <span>●</span>
        <div><strong>Есть незавершённая заявка</strong><small>Можно продолжить заполнение или удалить черновик.</small></div>
      </div>
      <div class="v50-draft-actions">
        <button type="button" data-v50-draft="view">Посмотреть</button>
        <button type="button" data-v50-draft="delete">Удалить</button>
      </div>`;
    summary.prepend(notice);

    notice.addEventListener('click', event => {
      const action = event.target.closest('[data-v50-draft]')?.dataset.v50Draft;
      if (action === 'view') {
        document.body.classList.add('v50-full-form');
        $('#v50Summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => $('.form-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      }
      if (action === 'delete') {
        if (!window.confirm('Удалить незавершённую заявку?')) return;
        keys.forEach(key => {
          try { localStorage.removeItem(key); } catch {}
        });
        try {
          if (typeof resetForm === 'function') resetForm(true);
        } catch {}
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
    if (heading) {
      $$('p,small', heading).forEach(node => { node.hidden = true; });
    }
    $$(':scope > p, :scope > .helper-text, :scope > .hint, :scope > small', card).forEach(node => {
      if (!node.closest('#smartPasteResult')) node.hidden = true;
    });
  }

  function compactAutomationBar() {
    const grid = $('.v50-automation-grid');
    if (!grid) return;
    grid.classList.add('v50-automation-grid-compact');
    $('[data-v50-action="paste"]', grid)?.remove();
    const labels = {
      client: ['👤', 'Клиент'],
      address: ['📍', 'Адрес'],
      slots: ['🕒', 'Окна'],
      price: ['₽', 'Стоимость'],
    };
    Object.entries(labels).forEach(([action, [icon, text]]) => {
      const button = $(`[data-v50-action="${action}"]`, grid);
      if (!button) return;
      button.innerHTML = `<span>${icon}</span><b>${text}</b>`;
    });
  }

  const serviceDefinitions = [
    { label: 'Пятна', pattern: /пят/i },
    { label: 'Запах мочи', pattern: /запах.*моч|моч[аи]/i },
    { label: 'Кондиционер', pattern: /кондиционер/i },
    { label: 'Шерсть / волосы', pattern: /шерст|волос|выч[её]с/i },
    { label: 'Озон', pattern: /озон/i },
    { label: 'Расчёсывание ворса', pattern: /подъ[её]м.*ворс|расч[её]с|расчес/i },
  ];

  function refineRugCard(card) {
    if (!card || card.dataset.v50ServicesRefined === '1') return;
    const labels = $$('label', card).filter(label => $('input[type="checkbox"]', label));
    if (!labels.length) return;

    const matched = new Map();
    labels.forEach(label => {
      const input = $('input[type="checkbox"]', label);
      const source = `${input?.value || ''} ${label.textContent || ''}`;
      const definition = serviceDefinitions.find(item => item.pattern.test(source));
      if (!definition || matched.has(definition.label)) {
        label.classList.add('v50-service-hidden');
        return;
      }
      matched.set(definition.label, label);
      label.classList.add('v50-service-chip');
      label.dataset.v50Service = definition.label;
      const textNodes = [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
      textNodes.forEach(node => node.remove());
      let text = $('.v50-service-text', label);
      if (!text) {
        text = document.createElement('span');
        text.className = 'v50-service-text';
        label.append(text);
      }
      text.textContent = definition.label;
    });

    const chosen = [...matched.values()];
    if (!chosen.length) return;
    const grid = document.createElement('div');
    grid.className = 'v50-service-grid';
    chosen.forEach(label => grid.append(label));

    const first = chosen[0];
    const parent = first.parentElement;
    if (parent) parent.insertBefore(grid, parent.firstChild);
    card.dataset.v50ServicesRefined = '1';
  }

  function refineRugs() {
    $$('.rug-card', $('#rugsContainer') || document).forEach(refineRugCard);
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
      new MutationObserver(() => setTimeout(refineRugs, 40)).observe(rugs, { childList: true, subtree: true });
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
