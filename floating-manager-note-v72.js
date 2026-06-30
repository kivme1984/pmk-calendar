'use strict';

(() => {
  if (window.PMK_FLOATING_MANAGER_NOTE_V72) return;
  window.PMK_FLOATING_MANAGER_NOTE_V72 = true;

  const NOTE_KEY = 'pmk-floating-manager-note-v1';
  const OPEN_KEY = 'pmk-floating-manager-note-open-v1';
  const POSITION_KEY = 'pmk-floating-manager-note-side-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  let saveTimer = 0;

  function read(key, fallback = '') {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function saveText(showState = true) {
    const textarea = $('#pmkFloatingNoteText');
    if (!textarea) return;
    write(NOTE_KEY, textarea.value);
    const status = $('#pmkFloatingNoteStatus');
    if (status && showState) {
      status.textContent = 'Сохранено';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (status) status.textContent = textarea.value.trim() ? 'Заметка сохранена на устройстве' : 'Заметка пустая';
      }, 1000);
    }
    updateCount();
  }

  function updateCount() {
    const textarea = $('#pmkFloatingNoteText');
    const count = $('#pmkFloatingNoteCount');
    if (textarea && count) count.textContent = `${textarea.value.length} знаков`;
    const button = $('#pmkFloatingNoteButton');
    if (button) button.classList.toggle('has-note', Boolean(textarea?.value.trim()));
  }

  function setOpen(open) {
    const panel = $('#pmkFloatingNotePanel');
    const button = $('#pmkFloatingNoteButton');
    if (!panel || !button) return;
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    button.setAttribute('aria-expanded', String(open));
    write(OPEN_KEY, open ? '1' : '0');
    if (open) {
      requestAnimationFrame(() => $('#pmkFloatingNoteText')?.focus());
    } else {
      saveText(false);
    }
  }

  function toggleSide() {
    const widget = $('#pmkFloatingNoteWidget');
    if (!widget) return;
    const next = widget.dataset.side === 'left' ? 'right' : 'left';
    widget.dataset.side = next;
    write(POSITION_KEY, next);
    const button = $('#pmkFloatingNoteMove');
    if (button) button.textContent = next === 'left' ? 'Переместить вправо' : 'Переместить влево';
  }

  function install() {
    if ($('#pmkFloatingNoteWidget')) return true;
    const widget = document.createElement('aside');
    widget.id = 'pmkFloatingNoteWidget';
    widget.className = 'pmk-floating-note-widget';
    widget.dataset.side = read(POSITION_KEY, 'right') === 'left' ? 'left' : 'right';
    widget.innerHTML = `
      <button type="button" id="pmkFloatingNoteButton" class="pmk-floating-note-button" aria-label="Открыть заметку менеджера" aria-expanded="false">
        <span aria-hidden="true">✎</span>
        <small>Заметка</small>
      </button>
      <section id="pmkFloatingNotePanel" class="pmk-floating-note-panel" aria-hidden="true">
        <header>
          <div>
            <span>Всегда под рукой</span>
            <strong>Заметка менеджера</strong>
          </div>
          <button type="button" id="pmkFloatingNoteClose" class="pmk-floating-note-close" aria-label="Закрыть заметку">×</button>
        </header>
        <textarea id="pmkFloatingNoteText" placeholder="Вставьте сюда важный текст, телефон, адрес, договорённость или задачу. Текст сохраняется автоматически."></textarea>
        <footer>
          <div>
            <span id="pmkFloatingNoteStatus">Заметка сохраняется автоматически</span>
            <small id="pmkFloatingNoteCount">0 знаков</small>
          </div>
          <button type="button" id="pmkFloatingNoteMove">Переместить влево</button>
        </footer>
      </section>`;
    document.body.appendChild(widget);

    const textarea = $('#pmkFloatingNoteText');
    textarea.value = read(NOTE_KEY, '');
    textarea.addEventListener('input', () => {
      clearTimeout(saveTimer);
      const status = $('#pmkFloatingNoteStatus');
      if (status) status.textContent = 'Сохраняем…';
      updateCount();
      saveTimer = setTimeout(() => saveText(true), 250);
    });
    textarea.addEventListener('change', () => saveText(true));

    $('#pmkFloatingNoteButton').addEventListener('click', () => {
      setOpen(!$('#pmkFloatingNotePanel').classList.contains('open'));
    });
    $('#pmkFloatingNoteClose').addEventListener('click', () => setOpen(false));
    $('#pmkFloatingNoteMove').addEventListener('click', toggleSide);

    window.addEventListener('pagehide', () => saveText(false));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveText(false);
    });

    updateCount();
    $('#pmkFloatingNoteMove').textContent = widget.dataset.side === 'left' ? 'Переместить вправо' : 'Переместить влево';
    setOpen(read(OPEN_KEY, '0') === '1');
    return true;
  }

  const start = () => requestAnimationFrame(() => install());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();