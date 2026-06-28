'use strict';

(() => {
  if (window.PMK_CLIENT_NOTE_SAFE_V64) return;
  window.PMK_CLIENT_NOTE_SAFE_V64 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let syncing = false;
  let previousHasText = false;

  function updateState() {
    const source = $('#smartPasteInput');
    const panel = $('#pmkClientInfoMirror');
    if (!source || !panel) return;
    const hasText = Boolean(source.value.trim());
    panel.classList.toggle('has-text', hasText);
    if (hasText && !previousHasText) panel.classList.remove('collapsed');
    if (!hasText) panel.classList.remove('collapsed');
    previousHasText = hasText;
  }

  function syncFromMain() {
    if (syncing) return;
    const source = $('#smartPasteInput');
    const mirror = $('#pmkClientInfoMirrorInput');
    if (!source || !mirror) return;
    syncing = true;
    mirror.value = source.value;
    syncing = false;
    updateState();
  }

  function syncFromMirror() {
    if (syncing) return;
    const source = $('#smartPasteInput');
    const mirror = $('#pmkClientInfoMirrorInput');
    if (!source || !mirror) return;
    syncing = true;
    source.value = mirror.value;
    source.dispatchEvent(new Event('input', { bubbles: true }));
    syncing = false;
    updateState();
  }

  function install() {
    const source = $('#smartPasteInput');
    const card = $('#smartPasteCard');
    if (!source || !card) return false;
    if ($('#pmkClientInfoMirror')) return true;

    card.classList.add('pmk-client-info-start');
    const title = $('.smart-paste-heading h2', card);
    if (title) title.textContent = 'Информация клиента';

    const panel = document.createElement('section');
    panel.id = 'pmkClientInfoMirror';
    panel.className = 'pmk-client-info-mirror';
    panel.innerHTML = `
      <div class="pmk-client-info-mirror-head">
        <button type="button" id="pmkClientInfoExpand" class="pmk-client-info-expand">Заметка сохранена</button>
        <label for="pmkClientInfoMirrorInput">Информация клиента</label>
        <button type="button" id="pmkClientInfoCollapse" class="pmk-client-info-collapse" aria-label="Свернуть заметку">×</button>
      </div>
      <textarea id="pmkClientInfoMirrorInput" rows="3"></textarea>`;
    document.body.appendChild(panel);

    $('#pmkClientInfoMirrorInput').value = source.value;
    source.addEventListener('input', syncFromMain);
    $('#pmkClientInfoMirrorInput').addEventListener('input', syncFromMirror);
    $('#pmkClientInfoCollapse').addEventListener('click', () => panel.classList.add('collapsed'));
    $('#pmkClientInfoExpand').addEventListener('click', () => {
      panel.classList.remove('collapsed');
      requestAnimationFrame(() => $('#pmkClientInfoMirrorInput')?.focus());
    });
    $('#smartPasteClearBtn')?.addEventListener('click', () => setTimeout(syncFromMain, 0));
    $('#smartPasteClipboardBtn')?.addEventListener('click', () => setTimeout(syncFromMain, 250));
    $('#smartPasteParseBtn')?.addEventListener('click', () => setTimeout(syncFromMain, 0));

    updateState();
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 120) clearInterval(timer);
    }, 50);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();