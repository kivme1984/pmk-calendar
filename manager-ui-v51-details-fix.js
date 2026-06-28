'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  function openEditor(action) {
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

  function markup() {
    return `
      <summary class="v51-tools-toggle"><strong>Дополнительные возможности</strong><span>⌄</span></summary>
      <div class="v51-tools-panel">
        <button type="button" class="v51-tool" data-v51-action="client"><span class="v51-tool-icon">К</span><span class="v51-tool-text"><strong>Постоянный клиент</strong><small>Данные и прошлый адрес</small></span></button>
        <button type="button" class="v51-tool" data-v51-action="address"><span class="v51-tool-icon">⌖</span><span class="v51-tool-text"><strong>Поиск адреса</strong><small>Подсказки DaData</small></span></button>
        <button type="button" class="v51-tool" data-v51-action="slots"><span class="v51-tool-icon">◷</span><span class="v51-tool-text"><strong>Окна маршрута</strong><small>Забор и возврат</small></span></button>
        <button type="button" class="v51-tool" data-v51-action="price"><span class="v51-tool-icon">₽</span><span class="v51-tool-text"><strong>Автостоимость</strong><small>Рассчитать заявку</small></span></button>
      </div>`;
  }

  function install() {
    const old = $('#v51Tools');
    const summary = $('#v50Summary');
    if (!summary) return;
    if (!old || old.tagName !== 'DETAILS') {
      const details = document.createElement('details');
      details.id = 'v51Tools';
      details.className = 'v51-tools';
      details.innerHTML = markup();
      details.addEventListener('click', event => {
        const button = event.target.closest('[data-v51-action]');
        if (button) openEditor(button.dataset.v51Action);
      });
      if (old) old.replaceWith(details);
      else (summary.querySelector('.v50-status') || summary.firstElementChild)?.after(details);
    }

    const input = $('#smartPasteInput');
    if (input) input.placeholder = 'Вставьте или продиктуйте текст заявки';
  }

  function boot() {
    let count = 0;
    const timer = setInterval(() => {
      install();
      count += 1;
      if ($('#v51Tools')?.tagName === 'DETAILS' || count > 160) clearInterval(timer);
    }, 50);
    const summary = $('#v50Summary');
    if (summary) new MutationObserver(install).observe(summary, { childList: true, subtree: true });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
