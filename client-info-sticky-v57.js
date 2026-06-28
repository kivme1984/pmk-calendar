'use strict';

(() => {
  if (window.PMK_CLIENT_INFO_STICKY_V57) return;
  window.PMK_CLIENT_INFO_STICKY_V57 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let saveTimer = 0;

  function updateState() {
    const card = $('#smartPasteCard');
    const textarea = $('#smartPasteInput');
    const status = $('#pmkClientDraftStatus');
    if (!card || !textarea) return;
    card.classList.toggle('pmk-client-draft-has-text', Boolean(textarea.value.trim()));
    if (status) status.textContent = textarea.value.trim() ? 'Сохранено' : 'Пусто';
  }

  function markSaving() {
    const status = $('#pmkClientDraftStatus');
    if (status) status.textContent = 'Сохраняем…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(updateState, 450);
  }

  function install() {
    const card = $('#smartPasteCard');
    const textarea = $('#smartPasteInput');
    if (!card || !textarea) return false;
    if (card.dataset.pmkClientInfoSticky === '1') return true;

    card.dataset.pmkClientInfoSticky = '1';
    card.classList.add('pmk-client-info-sticky');
    textarea.rows = 3;

    const heading = $('.smart-paste-heading', card);
    const title = $('h2', heading || card);
    const icon = $('.smart-paste-heading > span', card);
    if (title) title.textContent = 'Информация клиента — черновик';
    if (icon) icon.textContent = '✎';

    if (heading && !$('#pmkClientDraftStatus', card)) {
      const status = document.createElement('span');
      status.id = 'pmkClientDraftStatus';
      status.className = 'pmk-client-draft-status';
      status.textContent = 'Пусто';
      heading.append(status);
    }

    textarea.addEventListener('input', markSaving);
    $('#smartPasteClearBtn')?.addEventListener('click', () => setTimeout(updateState, 0));
    $('#smartPasteClipboardBtn')?.addEventListener('click', () => setTimeout(updateState, 250));
    $('#smartPasteParseBtn')?.addEventListener('click', () => setTimeout(updateState, 0));

    updateState();
    document.body.classList.add('pmk-client-info-sticky-ready');
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

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();