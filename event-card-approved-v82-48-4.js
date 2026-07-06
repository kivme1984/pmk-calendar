'use strict';

(() => {
  if (globalThis.PMK_EVENT_CARD_APPROVED_V82_48_4) return;
  globalThis.PMK_EVENT_CARD_APPROVED_V82_48_4 = true;

  function html(value = '') { return typeof escapeHtml === 'function' ? escapeHtml(value) : String(value || '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function eventById(id) { try { return getAllEvents().find(item => String(item.id) === String(id)); } catch { return null; } }
  function metaFor(event) { try { return eventMeta(event); } catch { return {}; } }
  function cardById(id) { return [...document.querySelectorAll('.event-card')].find(card => String(card.dataset.eventCard) === String(id)) || null; }
  function rugTextFor(data, card) {
    try { return rugSummary(data); } catch {}
    return card?.querySelector?.('.event-quick-badges .rug-badge')?.textContent?.replace(/^▦\s*/, '').trim() || 'Ковры не указаны';
  }

  function ensureDialog(id, className) {
    let dialog = document.getElementById(id);
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.className = className;
    dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog); });
    document.body.appendChild(dialog);
    return dialog;
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
      if (dialog.open) dialog.close();
      dialog.showModal();
    } else dialog.setAttribute('open', '');
  }

  function openRugs(eventId) {
    const event = eventById(eventId);
    if (!event) return showToast?.('Заявка не найдена.', 'error');
    const data = metaFor(event);
    const dialog = ensureDialog('pmkRugQuickDialog', 'pmk-rug-dialog');
    const summary = rugTextFor(data, cardById(eventId));
    let details = '<div class="details-empty">Информация о коврах не указана.</div>';
    try { details = renderRugDetails(data); } catch {}
    dialog.innerHTML = `<div class="pmk-rug-dialog-card">
      <h2>Информация о коврах</h2>
      <p>${html(summary)}</p>
      <div class="details-rug-list">${details}</div>
      <button type="button" class="pmk-dialog-close">Закрыть</button>
    </div>`;
    dialog.querySelector('.pmk-dialog-close')?.addEventListener('click', () => closeDialog(dialog));
    openDialog(dialog);
  }

  function shareTextFor(event) {
    const data = metaFor(event);
    const title = data.customerName || event.summary || 'Заявка';
    const phone = data.phone ? `\nТелефон: ${data.phone}` : '';
    const address = (typeof displayAddress === 'function' ? displayAddress(data, event) : event.location) || '';
    const addressLine = address ? `\nАдрес: ${address}` : '';
    const contract = data.contractNumber ? `\nДоговор: № ${data.contractNumber}` : '';
    const rugs = `\nКовры: ${rugTextFor(data, cardById(event.id))}`;
    const time = `${typeof formatTime === 'function' ? formatTime(event.start?.dateTime || event.start) : ''}–${typeof formatTime === 'function' ? formatTime(event.end?.dateTime || event.end) : ''}`;
    const timeLine = time.replace('–', '').trim() ? `\nВремя: ${time}` : '';
    return `ПМК Календарь\n${title}${phone}${addressLine}${contract}${rugs}${timeLine}`.trim();
  }

  async function shareEvent(eventId) {
    const event = eventById(eventId);
    if (!event) return showToast?.('Заявка не найдена.', 'error');
    const payload = shareTextFor(event);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ПМК Календарь', text: payload });
        return;
      }
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(payload);
      else if (typeof copyTextFallback === 'function') copyTextFallback(payload);
      showToast?.('Текст заявки скопирован для отправки.', 'success');
    } catch (error) {
      if (error?.name !== 'AbortError') showToast?.('Не удалось поделиться заявкой.', 'error');
    }
  }

  function addRugChip(card) {
    const eventId = card.dataset.eventCard;
    if (!eventId) return;
    const event = eventById(eventId);
    const data = event ? metaFor(event) : {};
    const header = card.querySelector('.event-card-header');
    const contract = header?.querySelector('.contract-control');
    if (!header || !contract) return;
    let chip = header.querySelector('.pmk-rug-inline-badge');
    if (!chip) {
      chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pmk-rug-inline-badge';
      chip.dataset.rugEvent = eventId;
      contract.insertAdjacentElement('afterend', chip);
    }
    chip.textContent = rugTextFor(data, card);
    chip.title = 'Открыть информацию о коврах';
    chip.dataset.rugEvent = eventId;
  }

  function addShareToMenu(card) {
    const eventId = card.dataset.eventCard;
    const menu = card.querySelector('.card-menu-popover');
    if (!eventId || !menu || menu.querySelector('.pmk-share-event')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmk-share-event';
    button.dataset.shareEvent = eventId;
    button.textContent = 'Поделиться';
    const danger = menu.querySelector('.danger-menu-item');
    if (danger) menu.insertBefore(button, danger);
    else menu.appendChild(button);
  }

  function applyCard(card) {
    if (!card || card.closest('#weekEvents')) return;
    card.classList.add('pmk-approved-card-v82-48-4');
    addRugChip(card);
    addShareToMenu(card);
  }

  function applyAll() { document.querySelectorAll('.event-card').forEach(applyCard); }

  document.addEventListener('click', event => {
    const rug = event.target.closest('[data-rug-event]');
    if (rug) {
      event.preventDefault();
      event.stopPropagation();
      return openRugs(rug.dataset.rugEvent);
    }
    const share = event.target.closest('[data-share-event]');
    if (share) {
      event.preventDefault();
      event.stopPropagation();
      share.closest('details')?.removeAttribute('open');
      return shareEvent(share.dataset.shareEvent);
    }
  }, true);

  function boot() {
    applyAll();
    const root = document.querySelector('.main-content') || document.body;
    const observer = new MutationObserver(() => requestAnimationFrame(applyAll));
    observer.observe(root, { childList: true, subtree: true });
    ['pmk-calendar-sync-done', 'pmk-calendar-sync-error', 'resize', 'popstate'].forEach(name => window.addEventListener(name, applyAll));
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
