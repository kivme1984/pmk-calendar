'use strict';

(() => {
  if (window.PMK_CLIENT_INFO_STICKY_V57) return;
  window.PMK_CLIENT_INFO_STICKY_V57 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let syncing = false;
  let hadText = false;

  function createMirror() {
    if ($('#pmkClientInfoMirror')) return $('#pmkClientInfoMirror');
    const panel = document.createElement('section');
    panel.id = 'pmkClientInfoMirror';
    panel.className = 'pmk-client-info-mirror';
    panel.innerHTML = `
      <div class="pmk-client-info-mirror-head">
        <button type="button" id="pmkClientInfoExpand" class="pmk-client-info-expand" aria-label="Развернуть заметку">Заметка сохранена</button>
        <label for="pmkClientInfoMirrorInput">Информация клиента</label>
        <button type="button" id="pmkClientInfoCollapse" class="pmk-client-info-collapse" aria-label="Свернуть заметку">×</button>
      </div>
      <textarea id="pmkClientInfoMirrorInput" rows="3"></textarea>`;
    document.body.appendChild(panel);
    return panel;
  }

  function updateVisibility({ resetCollapse = false } = {}) {
    const source = $('#smartPasteInput');
    const hasText = Boolean(source?.value.trim());

    document.body.classList.toggle('pmk-client-info-has-text', hasText);
    if (resetCollapse || (hasText && !hadText)) {
      document.body.classList.remove('pmk-client-info-collapsed');
    }
    if (!hasText) {
      document.body.classList.remove('pmk-client-info-collapsed');
    }
    hadText = hasText;
  }

  function syncFromMain() {
    if (syncing) return;
    const source = $('#smartPasteInput');
    const mirror = $('#pmkClientInfoMirrorInput');
    if (!source || !mirror) return;

    const changed = mirror.value !== source.value;
    if (changed) {
      syncing = true;
      mirror.value = source.value;
      syncing = false;
    }
    updateVisibility({ resetCollapse: changed && Boolean(source.value.trim()) && !hadText });
  }

  function syncFromMirror() {
    if (syncing) return;
    const source = $('#smartPasteInput');
    const mirror = $('#pmkClientInfoMirrorInput');
    if (!source || !mirror || source.value === mirror.value) {
      updateVisibility();
      return;
    }
    syncing = true;
    source.value = mirror.value;
    source.dispatchEvent(new Event('input', { bubbles: true }));
    syncing = false;
    updateVisibility();
  }

  function collapseMirror() {
    document.body.classList.add('pmk-client-info-collapsed');
  }

  function expandMirror() {
    document.body.classList.remove('pmk-client-info-collapsed');
    requestAnimationFrame(() => $('#pmkClientInfoMirrorInput')?.focus());
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
    $('#pmkClientInfoCollapse')?.addEventListener('click', collapseMirror);
    $('#pmkClientInfoExpand')?.addEventListener('click', expandMirror);
    $('#smartPasteClearBtn')?.addEventListener('click', () => setTimeout(syncFromMain, 0));
    $('#smartPasteClipboardBtn')?.addEventListener('click', () => setTimeout(syncFromMain, 250));
    $('#smartPasteParseBtn')?.addEventListener('click', () => setTimeout(syncFromMain, 0));

    const bodyObserver = new MutationObserver(syncFromMain);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    updateVisibility();
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