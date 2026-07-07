'use strict';

(() => {
  if (globalThis.PMK_EVENT_CARD_RENDER_STABLE_V82_20_6) return;
  globalThis.PMK_EVENT_CARD_RENDER_STABLE_V82_20_6 = true;

  if (typeof renderEventCard !== 'function') return;
  const originalRenderEventCard = renderEventCard;

  function safeText(value) {
    return typeof escapeHtml === 'function' ? escapeHtml(value || '') : String(value || '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function addStablePieces(card, event) {
    if (!card) return;
    const data = typeof eventMeta === 'function' ? eventMeta(event) : {};
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
      chip.textContent = typeof rugSummary === 'function' ? rugSummary(data) : 'Ковры';
      contract.insertAdjacentElement('afterend', chip);
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
      const share = document.createElement('button');
      share.type = 'button';
      share.className = 'pmk-share-event';
      share.dataset.shareEvent = id;
      share.textContent = 'Поделиться';
      const danger = menu.querySelector('.danger-menu-item');
      if (danger) menu.insertBefore(share, danger);
      else menu.appendChild(share);
    }
  }

  renderEventCard = function renderEventCardStableV82206(event) {
    const html = originalRenderEventCard(event);
    try {
      const template = document.createElement('template');
      template.innerHTML = html.trim();
      const card = template.content.querySelector('.event-card');
      addStablePieces(card, event);
      return template.innerHTML;
    } catch {
      return html;
    }
  };
})();
