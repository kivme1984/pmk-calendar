'use strict';

(() => {
  if (window.PMK_MANAGER_UI_V51) return;
  window.PMK_MANAGER_UI_V51 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const SERVICES = [
    ['Удаление пятен', 'Пятна / слайм / пластилин / маркеры · 500 ₽'],
    ['Удаление запаха мочи', 'Запах мочи · 700/1000 ₽'],
    ['Дезинфекция', 'Дезинфекция / после потопа · 700 ₽'],
    ['Кондиционер', 'Кондиционер · 300 ₽'],
    ['Вычёсывание шерсти и волос', 'Шерсть / волосы · 150 ₽/м²'],
    ['Подъём ворса', 'Подъём ворса · 150 ₽/м²'],
    ['Озонация', 'Озон · 300 ₽'],
    ['Экспресс-стирка', 'Экспресс · 1000 ₽'],
  ];

  function selectedServices(root) {
    const selected = new Set();
    $$('input[type="checkbox"]:checked', root).forEach(input => {
      const value = String(input.value || '');
      if (/пят|слайм|пластилин|маркер/i.test(value)) selected.add('Удаление пятен');
      if (/запах.*моч|моч[аи]/i.test(value)) selected.add('Удаление запаха мочи');
      if (/дезинф|потоп|мокр/i.test(value)) selected.add('Дезинфекция');
      if (/кондиционер/i.test(value)) selected.add('Кондиционер');
      if (/шерст|волос|выч[её]с/i.test(value)) selected.add('Вычёсывание шерсти и волос');
      if (/подъ[её]м.*ворс|расч[её]с|расчес/i.test(value)) selected.add('Подъём ворса');
      if (/озон/i.test(value)) selected.add('Озонация');
      if (/экспресс/i.test(value)) selected.add('Экспресс-стирка');
    });
    return selected;
  }

  function serviceMarkup(selected = new Set()) {
    return SERVICES.map(([value, label]) => `
      <label class="v51-service">
        <input type="checkbox" value="${value}" ${selected.has(value) ? 'checked' : ''}>
        <span>${label}</span>
      </label>`).join('');
  }

  function rebuildRugDetails(details) {
    if (!details) return;
    const expected = SERVICES.map(item => item[1]).join('|');
    const current = $$('.v51-service span', details).map(node => node.textContent.trim()).join('|');
    if (current === expected) return;

    const selected = selectedServices(details);
    details.className = 'rug-details-grid v51-clean-details';
    details.innerHTML = `
      <section class="v51-service-section">
        <h4 class="v51-service-title">Услуги для этого ковра</h4>
        <div class="v51-services">${serviceMarkup(selected)}</div>
      </section>`;
  }

  function rebuildServices() {
    rebuildRugDetails($('#rugTemplate')?.content?.querySelector('.rug-details-grid'));
    $$('.rug-card .rug-details-grid').forEach(rebuildRugDetails);
  }

  function smartPasteCard() {
    const input = $('#smartPasteInput');
    return input?.closest('.form-card, section, .card') || null;
  }

  function cleanSmartPaste() {
    const card = smartPasteCard();
    if (!card) return;
    card.classList.add('v51-smart-paste-clean');
    $$('p,small,.helper-text,.hint', card).forEach(node => {
      if (!node.closest('#smartPasteResult')) node.remove();
    });
  }

  function toolAction(action) {
    const summary = $('#v50Summary');
    if (!summary) return;
    const proxy = $(`[data-v50-action="${action}"]`, summary);
    if (proxy) {
      proxy.click();
      return;
    }
    const openMap = { client: 'client', address: 'client', slots: 'date', price: 'cost' };
    const target = $(`[data-v50-open="${openMap[action]}"]`, summary);
    target?.click();
    if (action === 'address') setTimeout(() => $('#street')?.focus(), 120);
    if (action === 'slots') setTimeout(() => $('#managerSlotPlanner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    if (action === 'price') setTimeout(() => {
      const toggle = $('#autoPrice');
      if (toggle && !toggle.checked) toggle.click();
      toggle?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }

  function installTools() {
    const summary = $('#v50Summary');
    if (!summary || $('#v51Tools')) return;

    const tools = document.createElement('section');
    tools.id = 'v51Tools';
    tools.className = 'v51-tools';
    tools.innerHTML = `
      <button type="button" class="v51-tools-toggle" aria-expanded="false">
        <strong>Дополнительные возможности</strong><span>⌄</span>
      </button>
      <div class="v51-tools-panel">
        <button type="button" class="v51-tool" data-v51-action="client"><span class="v51-tool-icon">К</span><span class="v51-tool-text"><strong>Постоянный клиент</strong><small>Найти данные и прошлый адрес</small></span></button>
        <button type="button" class="v51-tool" data-v51-action="address"><span class="v51-tool-icon">⌖</span><span class="v51-tool-text"><strong>Поиск адреса</strong><small>Подсказки DaData</small></span></button>
        <button type="button" class="v51-tool" data-v51-action="slots"><span class="v51-tool-icon">◷</span><span class="v51-tool-text"><strong>Окна маршрута</strong><small>Забор и возврат</small></span></button>
        <button type="button" class="v51-tool" data-v51-action="price"><span class="v51-tool-icon">₽</span><span class="v51-tool-text"><strong>Автостоимость</strong><small>Рассчитать заявку</small></span></button>
      </div>`;

    const status = $('.v50-status', summary);
    if (status) status.after(tools);
    else summary.prepend(tools);

    const toggle = $('.v51-tools-toggle', tools);
    toggle.addEventListener('click', () => {
      const open = tools.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    tools.addEventListener('click', event => {
      const button = event.target.closest('[data-v51-action]');
      if (!button) return;
      toolAction(button.dataset.v51Action);
    });
  }

  function verify() {
    const tools = $('#v51Tools');
    const toolButtons = tools ? $$('.v51-tool', tools) : [];
    const cards = $$('.rug-card');
    const servicesOk = cards.length > 0 && cards.every(card => {
      const labels = $$('.v51-service span', card).map(node => node.textContent.trim());
      return labels.length === SERVICES.length && labels.join('|') === SERVICES.map(item => item[1]).join('|');
    });
    const ok = Boolean(tools && toolButtons.length === 4 && servicesOk && smartPasteCard()?.classList.contains('v51-smart-paste-clean'));
    document.documentElement.dataset.v51Verified = ok ? '1' : '0';
    return ok;
  }

  function run() {
    installTools();
    cleanSmartPaste();
    rebuildServices();
    verify();
  }

  function boot() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      run();
      if (verify() || attempts > 200) clearInterval(timer);
    }, 50);

    const rugs = $('#rugsContainer');
    if (rugs) new MutationObserver(() => { rebuildServices(); verify(); }).observe(rugs, { childList: true, subtree: true });
    const summary = $('#v50Summary');
    if (summary) new MutationObserver(() => { installTools(); verify(); }).observe(summary, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();