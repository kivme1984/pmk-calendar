'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  function setOpen(section, open) {
    section.classList.toggle('is-open', open);
    section.querySelector('.v51-tools-toggle')?.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('v51-tools-open', open);
    if (open) requestAnimationFrame(() => section.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  function openEditor(action, section) {
    setOpen(section, false);
    const summary = $('#v50Summary');
    if (!summary) return;
    const proxy = summary.querySelector(`[data-v50-action="${action}"]`);
    if (proxy) {
      proxy.click();
      return;
    }
    const map = { client: 'client', address: 'client', slots: 'date', price: 'cost' };
    summary.querySelector(`[data-v50-open="${map[action]}"]`)?.click();
    if (action === 'address') setTimeout(() => $('#street')?.focus(), 120);
    if (action === 'slots') setTimeout(() => $('#managerSlotPlanner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    if (action === 'price') setTimeout(() => {
      const toggle = $('#autoPrice');
      if (toggle && !toggle.checked) toggle.click();
    }, 120);
  }

  function createTools() {
    const section = document.createElement('section');
    section.id = 'v51Tools';
    section.className = 'v51-tools v51-tools-stable';
    section.innerHTML = `
      <button type="button" class="v51-tools-toggle" aria-expanded="false">
        <strong>Дополнительные возможности</strong><span>⌄</span>
      </button>
      <div class="v51-tools-panel">
        <button type="button" class="v51-tool" data-v51-action="client"><span class="v51-tool-icon">К</span><span class="v51-tool-text"><strong>Постоянный клиент</strong><small>Данные и прошлый адрес</small></span></button>
        <button type="button" class="v51-tool" data-v51-action="address"><span class="v51-tool-icon">⌖</span><span class="v51-tool-text"><strong>Поиск адреса</strong><small>Подсказки DaData</small></span></button>
        <button type="button" class="v51-tool" data-v51-action="slots"><span class="v51-tool-icon">◷</span><span class="v51-tool-text"><strong>Окна маршрута</strong><small>Забор и возврат</small></span></button>
        <button type="button" class="v51-tool" data-v51-action="price"><span class="v51-tool-icon">₽</span><span class="v51-tool-text"><strong>Автостоимость</strong><small>Рассчитать заявку</small></span></button>
      </div>`;

    const toggle = section.querySelector('.v51-tools-toggle');
    toggle.addEventListener('click', () => setOpen(section, !section.classList.contains('is-open')));
    section.addEventListener('click', event => {
      const button = event.target.closest('[data-v51-action]');
      if (button) openEditor(button.dataset.v51Action, section);
    });
    return section;
  }

  function install() {
    const summary = $('#v50Summary');
    if (!summary) return false;
    const existing = $('#v51Tools');
    if (existing?.classList.contains('v51-tools-stable')) return true;
    existing?.remove();
    summary.before(createTools());

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
