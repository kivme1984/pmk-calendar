'use strict';

(() => {
  if (globalThis.PMK_FLOATING_NOTE_MOBILE_V82_1) return;
  globalThis.PMK_FLOATING_NOTE_MOBILE_V82_1 = true;

  const POSITION_KEY = 'pmk-floating-manager-note-position-v73';
  const ADJUSTED_KEY = 'pmk-floating-note-mobile-adjusted-v82-1';
  const $ = (selector, root = document) => root.querySelector(selector);
  let installTimer = 0;

  function toast(message, type = 'success') {
    if (typeof showToast === 'function') showToast(message, type);
  }

  function fallbackCopy(textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.focus();
    textarea.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch {}
    textarea.setSelectionRange(start, end);
    return copied;
  }

  async function copyNote() {
    const textarea = $('#pmkCompactNoteText');
    const text = textarea?.value || '';
    if (!text.trim()) return toast('В заметке нет текста для копирования.', 'error');
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else if (!fallbackCopy(textarea)) throw new Error('copy unavailable');
      toast('Текст заметки скопирован.', 'success');
    } catch {
      if (fallbackCopy(textarea)) toast('Текст заметки скопирован.', 'success');
      else toast('Не удалось скопировать текст.', 'error');
    }
  }

  function insertAtCursor(textarea, value) {
    const start = Number.isFinite(textarea.selectionStart) ? textarea.selectionStart : textarea.value.length;
    const end = Number.isFinite(textarea.selectionEnd) ? textarea.selectionEnd : start;
    textarea.setRangeText(value, start, end, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  async function pasteNote() {
    const textarea = $('#pmkCompactNoteText');
    if (!textarea) return;
    try {
      if (!navigator.clipboard?.readText) throw new Error('clipboard read unavailable');
      const text = await navigator.clipboard.readText();
      if (!text) return toast('Буфер обмена пуст.', 'error');
      insertAtCursor(textarea, text);
      toast('Текст вставлен в заметку.', 'success');
    } catch {
      textarea.focus();
      toast('Нажмите и удерживайте поле заметки, затем выберите «Вставить».', 'error');
    }
  }

  function iconButton(id, symbol, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = id;
    button.className = 'pmk-compact-note-icon-action';
    button.textContent = symbol;
    button.title = label;
    button.setAttribute('aria-label', label);
    return button;
  }

  function adjustMobilePositionOnce(widget) {
    if (!matchMedia('(max-width: 760px)').matches) return;
    if (localStorage.getItem(ADJUSTED_KEY) === '1') return;

    requestAnimationFrame(() => {
      const rect = widget.getBoundingClientRect();
      const headerBottom = $('.app-header')?.getBoundingClientRect().bottom || 0;
      const nextY = Math.max(headerBottom + 8, rect.top - 22);
      widget.style.top = `${nextY}px`;
      widget.style.bottom = 'auto';
      try {
        const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null') || {};
        const x = Number.isFinite(saved.x) ? saved.x : rect.left;
        localStorage.setItem(POSITION_KEY, JSON.stringify({ x, y: nextY }));
        localStorage.setItem(ADJUSTED_KEY, '1');
      } catch {
        try { localStorage.setItem(ADJUSTED_KEY, '1'); } catch {}
      }
    });
  }

  function install() {
    const widget = $('#pmkCompactNoteWidget');
    const actions = $('.pmk-compact-note-actions', widget || document);
    if (!widget || !actions) return false;
    if (widget.dataset.pmkMobileV821 === '1') return true;
    widget.dataset.pmkMobileV821 = '1';

    const paste = iconButton('pmkCompactNotePaste', '↧', 'Вставить текст из буфера');
    const copy = iconButton('pmkCompactNoteCopy', '⧉', 'Скопировать текст заметки');
    actions.prepend(copy);
    actions.prepend(paste);
    paste.addEventListener('click', pasteNote);
    copy.addEventListener('click', copyNote);

    adjustMobilePositionOnce(widget);
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    installTimer = window.setInterval(() => {
      attempts += 1;
      if (install() || attempts > 120) clearInterval(installTimer);
    }, 50);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
