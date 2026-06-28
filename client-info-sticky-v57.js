'use strict';

(() => {
  if (window.PMK_CLIENT_INFO_STICKY_V57) return;
  window.PMK_CLIENT_INFO_STICKY_V57 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let syncing = false;

  function createMirror() {
    if ($('#pmkClientInfoMirror')) return $('#pmkClientInfoMirror');
    const panel = document.createElement('section');
    panel.id = 'pmkClientInfoMirror';
    panel.className = 'pmk-client-info-mirror';
    panel.innerHTML = `
      <label for="pmkClientInfoMirrorInput">Информация клиента</label>
      <textarea id="pmkClientInfoMirrorInput" rows="3"></textarea>`;
    document.body.appendChild(panel);
    return panel;
  }

  function syncFromMain() {
    if (syncing) return;
    const source = $('#smartPasteInput');
    const mirror = $('#pmkClientInfoMirrorInput');
    if (!source || !mirror || mirror.value === source.value) return;
    syncing = true;
    mirror.value = source.value;
    syncing = false;
  }

  function syncFromMirror() {
    if (syncing) return;
    const source = $('#smartPasteInput');
    const mirror = $('#pmkClientInfoMirrorInput');
    if (!source || !mirror || source.value === mirror.value) return;
    syncing = true;
    source.value = mirror.value;
    source.dispatchEvent(new Event('input', { bubbles: true }));
    syncing = false;
  }

  function install() {
    const card = $('#smartPasteCard');
    const source = $('#smartPasteInput');
    if (!card || !source) return false;
    if (card.dataset.pmkClientInfoSticky === '1') return true;

    card.dataset.pmkClientInfoSticky = '1';
    card.classList.add('pmk-client-info-start');

    const title = $('.smart-paste-heading h2', card);
    if (title) title.textContent = 'Информация клиента';

    const mirrorPanel = createMirror();
    const mirror = $('#pmkClientInfoMirrorInput', mirrorPanel);
    mirror.value = source.value;

    source.addEventListener('input', syncFromMain);
    mirror.addEventListener('input', syncFromMirror);
    $('#smartPasteClearBtn')?.addEventListener('click', () => setTimeout(syncFromMain, 0));
    $('#smartPasteClipboardBtn')?.addEventListener('click', () => setTimeout(syncFromMain, 250));
    $('#smartPasteParseBtn')?.addEventListener('click', () => setTimeout(syncFromMain, 0));

    const bodyObserver = new MutationObserver(syncFromMain);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

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