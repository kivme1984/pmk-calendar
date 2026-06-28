'use strict';

(() => {
  if (window.PMK_MANAGER_UI_V50_FINAL) return;
  window.PMK_MANAGER_UI_V50_FINAL = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const SERVICES = [
    ['Удаление пятен', 'Пятна'],
    ['Удаление запаха мочи', 'Запах мочи'],
    ['Кондиционер', 'Кондиционер'],
    ['Вычёсывание шерсти и волос', 'Шерсть / волосы'],
    ['Озонация', 'Озон'],
    ['Подъём ворса', 'Расчёсывание ворса'],
  ];

  function servicesMarkup(selected = new Set()) {
    return SERVICES.map(([value, label]) => `
      <label class="v50-final-service">
        <input type="checkbox" value="${value}" ${selected.has(value) ? 'checked' : ''}>
        <span>${label}</span>
      </label>`).join('');
  }

  function selectedServices(container) {
    return new Set($$('input[type="checkbox"]:checked', container).map(input => input.value));
  }

  function replaceServices(container) {
    if (!container || container.dataset.v50FinalServices === '1') return;
    const selected = selectedServices(container);
    container.className = 'rug-services v50-final-services';
    container.innerHTML = servicesMarkup(selected);
    container.dataset.v50FinalServices = '1';

    const section = container.closest('.rug-service-section, .rug-details-grid > div, .rug-details-grid');
    const title = section ? $('.field-label', section) : null;
    if (title) title.textContent = 'Услуги для этого ковра';
  }

  function replaceTemplate() {
    const template = $('#rugTemplate');
    const details = template?.content?.querySelector('.rug-details-grid');
    if (!details) return;
    details.className = 'rug-details-grid rug-services-only v50-final-rug-details';
    details.innerHTML = `
      <div class="rug-service-section">
        <p class="field-label">Услуги для этого ковра</p>
        <div class="rug-services v50-final-services" data-v50-final-services="1">
          ${servicesMarkup()}
        </div>
      </div>`;
  }

  function replaceExistingRugs() {
    $$('.rug-card .rug-services').forEach(replaceServices);
    $$('.rug-card .rug-details-grid').forEach(details => {
      details.classList.add('rug-services-only', 'v50-final-rug-details');
      $$(':scope > div', details).forEach(block => {
        if (!$('.rug-services', block)) block.remove();
      });
    });
  }

  function replaceAutomations() {
    const grid = $('.v50-automation-grid');
    if (!grid) return;
    grid.className = 'v50-automation-grid v50-final-automation';
    $$('[data-v50-action="paste"]', grid).forEach(button => button.remove());

    const items = [
      ['client', '👤', 'Клиент'],
      ['address', '📍', 'Адрес'],
      ['slots', '◷', 'Окна'],
      ['price', '₽', 'Стоимость'],
    ];
    items.forEach(([action, icon, label]) => {
      const button = $(`[data-v50-action="${action}"]`, grid);
      if (!button) return;
      button.className = 'v50-final-automation-button';
      button.innerHTML = `<span aria-hidden="true">${icon}</span><b>${label}</b>`;
    });
  }

  function removeSmartPasteDescription() {
    const input = $('#smartPasteInput');
    const card = input?.closest('.form-card, section, .card');
    if (!card) return;
    card.classList.add('v50-final-smart-paste');
    const heading = $('.section-heading', card);
    if (heading) $$('p, small', heading).forEach(node => node.remove());
    $$(':scope > p, :scope > small, :scope > .helper-text, :scope > .hint', card).forEach(node => node.remove());
  }

  function install() {
    replaceTemplate();
    replaceExistingRugs();
    replaceAutomations();
    removeSmartPasteDescription();

    const rugs = $('#rugsContainer');
    if (rugs && rugs.dataset.v50FinalObserver !== '1') {
      rugs.dataset.v50FinalObserver = '1';
      new MutationObserver(() => replaceExistingRugs()).observe(rugs, { childList: true, subtree: true });
    }

    const summary = $('#v50Summary');
    if (summary && summary.dataset.v50FinalObserver !== '1') {
      summary.dataset.v50FinalObserver = '1';
      new MutationObserver(() => replaceAutomations()).observe(summary, { childList: true, subtree: true });
    }
  }

  function boot() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      install();
      if (($('#v50Summary') && $('#rugsContainer')) || attempts > 120) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
