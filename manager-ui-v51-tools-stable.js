'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  const ICONS = {
    paste: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5h6M9 3h6v5H9zM7 5H5.8A1.8 1.8 0 0 0 4 6.8v12.4A1.8 1.8 0 0 0 5.8 21h12.4a1.8 1.8 0 0 0 1.8-1.8V6.8A1.8 1.8 0 0 0 18.2 5H17"/><path d="M8 13h8M8 17h5"/></svg>',
    client: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="8" r="3.5"/><path d="M4.5 19c.8-3.4 3-5.2 6.5-5.2 2 0 3.6.6 4.7 1.8"/><circle cx="18" cy="17.5" r="3"/><path d="m20.2 19.7 1.8 1.8"/></svg>',
    slots: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6"/></svg>',
    calculate: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/></svg>',
  };

  function clickSummaryAction(action) {
    const summary = $('#v50Summary');
    const proxy = summary?.querySelector(`[data-v50-action="${action}"]`);
    if (proxy) {
      proxy.click();
      return true;
    }
    return false;
  }

  function openSummaryEditor(type) {
    const summary = $('#v50Summary');
    const target = summary?.querySelector(`[data-v50-open="${type}"]`);
    if (!target) return false;
    target.click();
    return true;
  }

  function runAction(action) {
    if (action === 'paste') {
      if (clickSummaryAction('paste')) return;
      const input = $('#smartPasteInput');
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus();
      return;
    }

    if (action === 'client') {
      if (clickSummaryAction('client')) return;
      openSummaryEditor('client');
      setTimeout(() => ($('#returningClientSearch, .returning-client-search input') || $('#customerName'))?.focus(), 120);
      return;
    }

    if (action === 'slots') {
      if (!clickSummaryAction('slots')) openSummaryEditor('date');
      setTimeout(() => $('#managerSlotPlanner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 140);
      return;
    }

    if (action === 'calculate') {
      openSummaryEditor('rugs');
      setTimeout(() => {
        const toggle = $('#autoPrice');
        if (toggle && !toggle.checked) {
          toggle.checked = true;
          toggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
        window.PMK_PRICING_V48?.calculatePrice?.();
        const firstRug = $('#rugsContainer .rug-card');
        firstRug?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstIncomplete = firstRug?.querySelector('.rug-width[value="0.0"], .rug-width, .rug-material');
        firstIncomplete?.focus?.();
      }, 160);
    }
  }

  function createTools() {
    const section = document.createElement('nav');
    section.id = 'v51Tools';
    section.className = 'v51-tools-stable v51-quick-menu';
    section.setAttribute('aria-label', 'Быстрые действия заявки');
    section.innerHTML = `
      <button type="button" class="v51-quick-action" data-v51-action="paste">
        <span class="v51-quick-icon">${ICONS.paste}</span><strong>Вставить</strong>
      </button>
      <button type="button" class="v51-quick-action" data-v51-action="client">
        <span class="v51-quick-icon">${ICONS.client}</span><strong>Найти клиента</strong>
      </button>
      <button type="button" class="v51-quick-action" data-v51-action="slots">
        <span class="v51-quick-icon">${ICONS.slots}</span><strong>Выбрать окно</strong>
      </button>
      <button type="button" class="v51-quick-action" data-v51-action="calculate">
        <span class="v51-quick-icon">${ICONS.calculate}</span><strong>Рассчитать</strong>
      </button>`;

    section.addEventListener('click', event => {
      const button = event.target.closest('[data-v51-action]');
      if (button) runAction(button.dataset.v51Action);
    });
    return section;
  }

  function install() {
    const summary = $('#v50Summary');
    if (!summary) return false;

    const existing = $('#v51Tools');
    if (!existing?.classList.contains('v51-quick-menu')) {
      existing?.remove();
      summary.before(createTools());
    }

    const input = $('#smartPasteInput');
    if (input) input.placeholder = 'Вставьте или продиктуйте текст заявки';
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 200) clearInterval(timer);
    }, 50);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();