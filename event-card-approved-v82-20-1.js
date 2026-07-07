'use strict';

(() => {
  if (globalThis.PMK_EVENT_CARD_APPROVED_V82_20_1) return;
  globalThis.PMK_EVENT_CARD_APPROVED_V82_20_1 = true;
  globalThis.PMK_EVENT_CARD_STABLE_RENDER_WITH_CLOUD_V82_20_7 = true;

  function html(value = '') { return typeof escapeHtml === 'function' ? escapeHtml(value) : String(value || '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function eventById(id) { try { return getAllEvents().find(item => String(item.id) === String(id)); } catch { return null; } }
  function metaFor(event) { try { return eventMeta(event); } catch { return {}; } }
  function cardById(id) { return [...document.querySelectorAll('.event-card')].find(card => String(card.dataset.eventCard) === String(id)) || null; }
  function rugTextFor(data, card) {
    try { return rugSummary(data); } catch {}
    return card?.querySelector?.('.event-quick-badges .rug-badge')?.textContent?.replace(/^▦\s*/, '').trim() || 'Ковры не указаны';
  }

  function cloudIndicatorHtml() {
    return '<span class="pmk-event-cloud-status-v82-19" role="group" aria-label="Состояние заявки в облачных календарях"><span class="pmk-event-cloud-provider-v82-19 is-google is-offline" data-event-cloud-provider="google">G</span><span class="pmk-event-cloud-provider-v82-19 is-yandex is-offline" data-event-cloud-provider="yandex">Я</span></span>';
  }

  function addStablePieces(card, event) {
    if (!card) return;
    const data = metaFor(event);
    const status = typeof statusInfo === 'function' ? statusInfo(data.requestStatus, data.visitType) : { className: data.requestStatus || 'pending-pickup' };
    const id = event?.id || card.dataset.eventCard || '';
    card.classList.add('pmk-card-tight-v82-43', 'pmk-approved-card-v82-20-1', 'pmk-status-edge-v82-20-2');
    ['pending-pickup','picked-up','pending-delivery','completed'].forEach(name => card.classList.remove(`pmk-state-${name}`));
    if (status?.className) card.classList.add(`pmk-state-${status.className}`);

    const header = card.querySelector('.event-card-header');
    const contract = header?.querySelector('.contract-control');
    if (header && contract && !header.querySelector('.pmk-rug-inline-badge')) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pmk-rug-inline-badge';
      chip.dataset.rugEvent = id;
      chip.title = 'Открыть информацию о коврах';
      chip.textContent = rugTextFor(data, card);
      contract.insertAdjacentElement('afterend', chip);
    }
    if (header && !header.querySelector('.pmk-event-cloud-status-v82-19')) {
      header.insertAdjacentHTML('beforeend', cloudIndicatorHtml());
    }

    const time = card.querySelector('.event-time');
    const actions = card.querySelector('.event-actions');
    const statusRow = card.querySelector('.status-row');
    if (time && statusRow && statusRow.parentElement !== time) {
      statusRow.classList.add('pmk-status-in-date-row-v82-46');
      time.appendChild(statusRow);
    }
    actions?.querySelector('.status-row')?.remove();

    card.querySelectorAll('.status-action').forEach(button => {
      const key = button.dataset.status || '';
      if (key) button.classList.add(`pmk-status-${key}`);
      button.classList.toggle('pmk-current-status', key && key === data.requestStatus);
    });

    const menu = card.querySelector('.card-menu-popover');
    if (menu && !menu.querySelector('.pmk-share-event')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pmk-share-event';
      button.dataset.shareEvent = id;
      button.textContent = 'Поделиться';
      const danger = menu.querySelector('.danger-menu-item');
      if (danger) menu.insertBefore(button, danger);
      else menu.appendChild(button);
    }
  }

  function patchRenderEventCardOnce() {
    if (typeof renderEventCard !== 'function' || renderEventCard.__pmkStableV82207) return;
    const originalRenderEventCard = renderEventCard;
    renderEventCard = function renderEventCardStableV82207(event) {
      const rendered = originalRenderEventCard(event);
      try {
        const template = document.createElement('template');
        template.innerHTML = rendered.trim();
        addStablePieces(template.content.querySelector('.event-card'), event);
        return template.innerHTML;
      } catch {
        return rendered;
      }
    };
    renderEventCard.__pmkStableV82207 = true;
  }

  patchRenderEventCardOnce();

  function injectFinalStyle() {
    if (document.getElementById('pmkEventCardFinalCompactV82201')) return;
    const style = document.createElement('style');
    style.id = 'pmkEventCardFinalCompactV82201';
    style.textContent = `
      .event-card.pmk-approved-card-v82-20-1 .pmk-status-in-date-row-v82-46{gap:4px!important;row-gap:4px!important;}
      .event-card.pmk-approved-card-v82-20-1 .manage-row .mini-button,
      .event-card.pmk-approved-card-v82-20-1 .manage-row .call-button,
      .event-card.pmk-approved-card-v82-20-1 .manage-row .open-button,
      .event-card.pmk-approved-card-v82-20-1 .manage-row .menu-button,
      .event-card.pmk-approved-card-v82-20-1 .card-menu>summary{min-height:34px!important;height:34px!important;max-height:34px!important;}
    `;
    document.head.appendChild(style);
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
  function closeDialog(dialog) { if (!dialog) return; if (typeof dialog.close === 'function' && dialog.open) dialog.close(); else dialog.removeAttribute('open'); }
  function openDialog(dialog) { if (typeof dialog.showModal === 'function') { if (dialog.open) dialog.close(); dialog.showModal(); } else dialog.setAttribute('open', ''); }

  function openRugs(eventId) {
    const event = eventById(eventId);
    if (!event) return showToast?.('Заявка не найдена.', 'error');
    const data = metaFor(event);
    const dialog = ensureDialog('pmkRugQuickDialog', 'pmk-rug-dialog');
    const summary = rugTextFor(data, cardById(eventId));
    let details = '<div class="details-empty">Информация о коврах не указана.</div>';
    try { details = renderRugDetails(data); } catch {}
    dialog.innerHTML = `<div class="pmk-rug-dialog-card"><h2>Информация о коврах</h2><p>${html(summary)}</p><div class="details-rug-list">${details}</div><button type="button" class="pmk-dialog-close">Закрыть</button></div>`;
    dialog.querySelector('.pmk-dialog-close')?.addEventListener('click', () => closeDialog(dialog), { once: true });
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
      if (navigator.share) { await navigator.share({ title: 'ПМК Календарь', text: payload }); return; }
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(payload);
      else if (typeof copyTextFallback === 'function') copyTextFallback(payload);
      showToast?.('Текст заявки скопирован для отправки.', 'success');
    } catch (error) { if (error?.name !== 'AbortError') showToast?.('Не удалось поделиться заявкой.', 'error'); }
  }

  document.addEventListener('click', event => {
    const rug = event.target.closest('[data-rug-event]');
    if (rug) { event.preventDefault(); event.stopPropagation(); return openRugs(rug.dataset.rugEvent); }
    const share = event.target.closest('[data-share-event]');
    if (share) { event.preventDefault(); event.stopPropagation(); share.closest('details')?.removeAttribute('open'); return shareEvent(share.dataset.shareEvent); }
  }, true);

  function boot() {
    patchRenderEventCardOnce();
    injectFinalStyle();
    requestAnimationFrame(() => document.querySelectorAll('.event-card').forEach(card => addStablePieces(card, eventById(card.dataset.eventCard))));
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
