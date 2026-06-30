'use strict';

(() => {
  if (window.PMK_COMPACT_FLOATING_NOTE_V73) return;
  window.PMK_COMPACT_FLOATING_NOTE_V73 = true;

  const NOTE_KEY = 'pmk-floating-manager-note-v1';
  const OPEN_KEY = 'pmk-floating-manager-note-open-v1';
  const POSITION_KEY = 'pmk-floating-manager-note-position-v73';
  const $ = (selector, root = document) => root.querySelector(selector);
  let saveTimer = 0;
  let drag = null;

  function read(key, fallback = '') {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function readPosition() {
    try {
      const value = JSON.parse(read(POSITION_KEY, 'null'));
      if (Number.isFinite(value?.x) && Number.isFinite(value?.y)) return value;
    } catch {}
    return { x: 10, y: 76 };
  }

  function clampPosition(x, y) {
    const widget = $('#pmkCompactNoteWidget');
    const width = widget?.offsetWidth || 44;
    const height = widget?.offsetHeight || 44;
    return {
      x: Math.max(6, Math.min(window.innerWidth - width - 6, x)),
      y: Math.max(6, Math.min(window.innerHeight - height - 6, y)),
    };
  }

  function applyPosition(x, y, save = false) {
    const widget = $('#pmkCompactNoteWidget');
    if (!widget) return;
    const next = clampPosition(x, y);
    widget.style.left = `${next.x}px`;
    widget.style.top = `${next.y}px`;
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    if (save) write(POSITION_KEY, JSON.stringify(next));
  }

  function autoSize() {
    const textarea = $('#pmkCompactNoteText');
    if (!textarea) return;
    textarea.style.height = '36px';
    textarea.style.height = `${Math.min(Math.max(36, textarea.scrollHeight), Math.max(120, window.innerHeight * 0.48))}px`;
  }

  function saveText() {
    const textarea = $('#pmkCompactNoteText');
    if (!textarea) return;
    write(NOTE_KEY, textarea.value);
    $('#pmkCompactNoteButton')?.classList.toggle('has-note', Boolean(textarea.value.trim()));
  }

  function setOpen(open) {
    const widget = $('#pmkCompactNoteWidget');
    if (!widget) return;
    widget.classList.toggle('is-open', open);
    $('#pmkCompactNotePanel')?.setAttribute('aria-hidden', String(!open));
    $('#pmkCompactNoteButton')?.setAttribute('aria-expanded', String(open));
    write(OPEN_KEY, open ? '1' : '0');
    if (open) {
      autoSize();
      requestAnimationFrame(() => $('#pmkCompactNoteText')?.focus());
    } else saveText();
    const position = clampPosition(parseFloat(widget.style.left) || 10, parseFloat(widget.style.top) || 76);
    applyPosition(position.x, position.y, true);
  }

  function recognize() {
    const text = $('#pmkCompactNoteText')?.value.trim() || '';
    if (!text) return showToast('В заметке нет текста для распознавания.', 'error');
    const smartInput = $('#smartPasteInput');
    const parser = window.PMK_VOICE_PARSER_FAST_V68_API;
    if (!smartInput || typeof parser?.apply !== 'function') return showToast('Движок распознавания ещё не загружен.', 'error');
    smartInput.value = text;
    smartInput.dispatchEvent(new Event('input', { bubbles: true }));
    parser.apply();
    setView('form');
    showToast('Текст заметки распознан и распределён по заявке.', 'success');
  }

  function clearNote() {
    const textarea = $('#pmkCompactNoteText');
    if (!textarea?.value && !read(NOTE_KEY, '')) return;
    if (!confirm('Удалить текст заметки?')) return;
    textarea.value = '';
    write(NOTE_KEY, '');
    autoSize();
    $('#pmkCompactNoteButton')?.classList.remove('has-note');
    textarea.focus();
  }

  function beginDrag(event) {
    if (event.target.closest('button,textarea')) return;
    const widget = $('#pmkCompactNoteWidget');
    if (!widget) return;
    const rect = widget.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    widget.classList.add('is-dragging');
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    applyPosition(event.clientX - drag.dx, event.clientY - drag.dy, false);
    event.preventDefault();
  }

  function endDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const widget = $('#pmkCompactNoteWidget');
    widget?.classList.remove('is-dragging');
    applyPosition(parseFloat(widget?.style.left) || 10, parseFloat(widget?.style.top) || 76, true);
    drag = null;
  }

  function install() {
    document.querySelector('#pmkFloatingNoteWidget')?.remove();
    if ($('#pmkCompactNoteWidget')) return true;

    const widget = document.createElement('aside');
    widget.id = 'pmkCompactNoteWidget';
    widget.className = 'pmk-compact-note-widget';
    widget.innerHTML = `
      <button type="button" id="pmkCompactNoteButton" class="pmk-compact-note-button" aria-label="Открыть заметку" aria-expanded="false">✎</button>
      <section id="pmkCompactNotePanel" class="pmk-compact-note-panel" aria-hidden="true">
        <header id="pmkCompactNoteDrag"><strong>Заметка</strong><button type="button" id="pmkCompactNoteClose" aria-label="Закрыть">×</button></header>
        <textarea id="pmkCompactNoteText" rows="1" placeholder="Текст…"></textarea>
        <div class="pmk-compact-note-actions">
          <button type="button" id="pmkCompactNoteRecognize">Распознать</button>
          <button type="button" id="pmkCompactNoteClear">Очистить</button>
        </div>
      </section>`;
    document.body.appendChild(widget);

    const textarea = $('#pmkCompactNoteText');
    textarea.value = read(NOTE_KEY, '');
    textarea.addEventListener('input', () => {
      autoSize();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveText, 180);
    });
    textarea.addEventListener('change', saveText);

    $('#pmkCompactNoteButton').addEventListener('click', () => setOpen(true));
    $('#pmkCompactNoteClose').addEventListener('click', () => setOpen(false));
    $('#pmkCompactNoteRecognize').addEventListener('click', recognize);
    $('#pmkCompactNoteClear').addEventListener('click', clearNote);

    const dragHandle = $('#pmkCompactNoteDrag');
    dragHandle.addEventListener('pointerdown', beginDrag);
    dragHandle.addEventListener('pointermove', moveDrag);
    dragHandle.addEventListener('pointerup', endDrag);
    dragHandle.addEventListener('pointercancel', endDrag);

    window.addEventListener('resize', () => {
      const rect = widget.getBoundingClientRect();
      applyPosition(rect.left, rect.top, true);
      autoSize();
    });
    window.addEventListener('pagehide', saveText);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveText(); });

    const position = readPosition();
    applyPosition(position.x, position.y, false);
    $('#pmkCompactNoteButton').classList.toggle('has-note', Boolean(textarea.value.trim()));
    setOpen(read(OPEN_KEY, '0') === '1');
    autoSize();
    return true;
  }

  const start = () => requestAnimationFrame(install);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();