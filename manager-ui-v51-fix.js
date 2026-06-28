'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const labels = ['Пятна','Запах мочи','Кондиционер','Шерсть / волосы','Озон','Расчёсывание ворса'];

  function cleanDescription() {
    const input = $('#smartPasteInput');
    const card = input?.closest('.form-card, section, .card');
    if (!card) return;
    card.classList.add('v51-smart-paste-clean');
    $$('*', card).forEach(node => {
      if (node === input || node.contains(input)) return;
      if (node.querySelector?.('input,textarea,button,select')) return;
      const text = (node.textContent || '').trim();
      if (/^можно продиктовать обычной фразой/i.test(text) || /^пример:/i.test(text)) node.remove();
    });
  }

  function verify() {
    const tools = $('#v51Tools');
    const cards = $$('.rug-card');
    const toolsOk = Boolean(tools && $$('.v51-tool', tools).length === 4);
    const servicesOk = cards.length === 0 || cards.every(card => {
      const current = $$('.v51-service span', card).map(node => node.textContent.trim());
      return current.length === 6 && current.join('|') === labels.join('|');
    });
    const descriptionGone = ![...document.querySelectorAll('body *')].some(node => {
      if (node.children.length) return false;
      return /^можно продиктовать обычной фразой/i.test((node.textContent || '').trim());
    });
    document.documentElement.dataset.v51Verified = toolsOk && servicesOk && descriptionGone ? '1' : '0';
  }

  function run() {
    cleanDescription();
    verify();
  }

  function boot() {
    let count = 0;
    const timer = setInterval(() => {
      run();
      count += 1;
      if (document.documentElement.dataset.v51Verified === '1' || count > 240) clearInterval(timer);
    }, 50);
    const target = $('#requestForm') || document.body;
    new MutationObserver(() => setTimeout(run, 0)).observe(target, { childList: true, subtree: true });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
