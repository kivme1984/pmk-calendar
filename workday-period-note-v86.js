'use strict';

(() => {
  if (globalThis.PMK_WORKDAY_PERIOD_NOTE_V86) return;
  globalThis.PMK_WORKDAY_PERIOD_NOTE_V86 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const previousRenderPeriod = renderPeriod;

  function providerBadges(event) {
    return globalThis.PMK_PERIOD_HEADER_PROVIDER_V85_API?.providerBadges?.(event) || '';
  }

  function renderCardV86(event) {
    const data = eventMeta(event);
    const start = event.start?.dateTime || event.start;
    const end = event.end?.dateTime || event.end;
    const currentStatus = statusInfo(data.requestStatus, data.visitType);
    const title = data.customerName || event.summary || 'Заявка';
    const dateKey = eventDateKey(event);
    const date = dateKeyForDisplay(dateKey);
    const comment = eventCommentText(data);
    const id = escapeHtml(String(event.id || ''));
    const phone = String(data.phone || '').trim();

    return `<article class="event-card event-card-v86 status-${currentStatus.className}" data-event-card="${id}">
      <div class="event-time">
        <small class="event-date">${formatDateShort(dateKey)}</small>
        <small class="event-weekday">${escapeHtml(date.toLocaleDateString('ru-RU', { weekday:'long', timeZone:'UTC' }))}</small>
        <strong>${formatTime(start)}–${formatTime(end)}</strong>
        <span>${data.visitType === 'delivery' ? 'Доставка' : 'Забор'}</span>
        <div class="event-time-status-grid-v86" aria-label="Изменить статус заявки">${statusButtons(event.id, data.requestStatus)}</div>
      </div>
      <div class="event-main">
        <div class="event-contract-provider-row">
          ${renderContractControl(event, data)}
          ${providerBadges(event)}
        </div>
        <div class="event-card-header event-card-header-v86">
          <h3 title="${escapeHtml(title)}">${escapeHtml(title)}</h3>
        </div>
        <div class="event-quick-badges">
          ${sourceBadge(data)}
          <span class="quick-badge rug-badge">▦ ${escapeHtml(rugSummary(data))}</span>
          ${scheduleBadge(data)}
        </div>
        ${addressCapsule(data, event)}
        ${comment ? `<div class="event-comment"><span aria-hidden="true">◯</span><p>${escapeHtml(comment)}</p><button type="button" data-toggle-comment="${id}">Ещё</button></div>` : ''}
      </div>
      <div class="event-card-footer-v86">
        ${phone ? `<a class="mini-button call-button call-button-v86" href="${phoneLink(phone)}">☎ Позвонить</a>` : '<button type="button" class="mini-button call-button-v86 phone-missing" disabled>Телефон не указан</button>'}
        <button type="button" class="mini-button open-button secondary-card-action" data-open-event="${id}">Открыть</button>
        <details class="card-menu">
          <summary class="mini-button menu-button" aria-label="Дополнительные действия">⋮</summary>
          <div class="card-menu-popover">
            <button type="button" data-edit-event="${id}">Редактировать заявку</button>
            <button type="button" class="danger-menu-item" data-delete-event="${id}">Удалить заявку</button>
          </div>
        </details>
      </div>
    </article>`;
  }

  renderEventCard = renderCardV86;

  function fixPeriodBoard(period = state.currentView) {
    const board = $('#weekEvents');
    if (!board) return;
    const scrollable = period === 'three-days' || period === 'week';
    board.classList.toggle('pmk-scrollable-period-v86', scrollable);
    if (scrollable) {
      board.style.width = '100%';
      board.style.maxWidth = '100%';
      board.style.minWidth = '0';
      requestAnimationFrame(() => globalThis.PMK_PERIOD_HEADER_PROVIDER_V85_API?.updateScrollUi?.());
    } else {
      board.classList.remove('pmk-scrollable-period-v86');
    }
  }

  renderPeriod = function renderPeriodScrollableV86(events, dateKeys, period = 'week') {
    const result = previousRenderPeriod(events, dateKeys, period);
    requestAnimationFrame(() => fixPeriodBoard(period));
    return result;
  };

  function enforceTwoLineNote() {
    const textarea = $('#pmkCompactNoteText');
    if (!textarea) return;
    textarea.rows = 2;
    if (!textarea.value) textarea.style.height = '56px';
  }

  const observer = new MutationObserver(() => {
    fixPeriodBoard();
    enforceTwoLineNote();
  });

  function install() {
    fixPeriodBoard();
    enforceTwoLineNote();
    const main = $('.main-content');
    if (main) observer.observe(main, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  }

  globalThis.PMK_WORKDAY_PERIOD_NOTE_V86_API = { renderCardV86, fixPeriodBoard, enforceTwoLineNote };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once:true });
  else requestAnimationFrame(install);
})();