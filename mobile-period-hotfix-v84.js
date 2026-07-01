'use strict';

(() => {
  if (globalThis.PMK_MOBILE_PERIOD_HOTFIX_V84) return;
  globalThis.PMK_MOBILE_PERIOD_HOTFIX_V84 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let suppressPeriodClickUntil = 0;

  function renderCardV84(event) {
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
    return `<article class="event-card event-card-v84 status-${currentStatus.className}" data-event-card="${id}">
      <div class="event-time">
        <small class="event-date">${formatDateShort(dateKey)}</small>
        <small class="event-weekday">${escapeHtml(date.toLocaleDateString('ru-RU', { weekday:'long', timeZone:'UTC' }))}</small>
        <strong>${formatTime(start)}–${formatTime(end)}</strong>
        <span>${data.visitType === 'delivery' ? 'Доставка' : 'Забор'}</span>
        <div class="event-time-statuses" aria-label="Статус заявки">${statusButtons(event.id, data.requestStatus)}</div>
      </div>
      <div class="event-main">
        <div class="event-card-header">
          ${renderContractControl(event, data)}
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
      <div class="event-card-footer-v84">
        ${phone ? `<a class="mini-button call-button call-button-v84" href="${phoneLink(phone)}">☎ Позвонить</a>` : '<button type="button" class="mini-button call-button-v84 phone-missing" disabled>Телефон не указан</button>'}
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

  renderEventCard = renderCardV84;

  function decorateTotalCard() {
    const total = $('#summaryTotal')?.closest('.summary-card');
    if (!total) return;
    total.dataset.summaryTotalV84 = '1';
    total.tabIndex = 0;
    total.setAttribute('role', 'button');
    total.setAttribute('aria-label', 'Показать все точки');
    const filtered = Boolean($('.summary-card.summary-filterable.active'));
    total.classList.toggle('active-total-v84', !filtered);
  }

  function showAllPoints() {
    const active = $('.summary-card.summary-filterable.active');
    if (active) active.click();
    else globalThis.PMK_MOBILE_PERIOD_WORKDAY_V83_API?.renderFilteredDay?.();
    requestAnimationFrame(decorateTotalCard);
  }

  function scrollingElement() {
    return document.scrollingElement || document.documentElement || document.body;
  }

  function findTouch(event, identifier) {
    const touches = Array.from(event.changedTouches || []);
    return touches.find(item => item.identifier === identifier) || touches[0] || null;
  }

  function installTouchPan(board) {
    if (!board || board.dataset.touchPanV84 === '1') return;
    board.dataset.touchPanV84 = '1';

    let touchId = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startPageTop = 0;
    let axis = '';
    let moved = false;

    board.addEventListener('touchstart', event => {
      if (!['three-days', 'week'].includes(state.currentView)) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      touchId = touch.identifier;
      startX = touch.clientX;
      startY = touch.clientY;
      startScrollLeft = board.scrollLeft;
      startPageTop = scrollingElement().scrollTop;
      axis = '';
      moved = false;
      board.classList.add('pmk-touch-pan-active-v84');
    }, { capture:true, passive:true });

    board.addEventListener('touchmove', event => {
      if (touchId == null || !['three-days', 'week'].includes(state.currentView)) return;
      const touch = findTouch(event, touchId);
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (!axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 5) axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (!axis) return;
      moved = true;
      event.preventDefault();
      event.stopPropagation();
      if (axis === 'x') board.scrollLeft = startScrollLeft - dx;
      else scrollingElement().scrollTop = startPageTop - dy;
    }, { capture:true, passive:false });

    const finish = () => {
      if (touchId == null) return;
      if (moved) suppressPeriodClickUntil = Date.now() + 450;
      touchId = null;
      axis = '';
      moved = false;
      board.classList.remove('pmk-touch-pan-active-v84');
    };

    board.addEventListener('touchend', finish, { capture:true, passive:true });
    board.addEventListener('touchcancel', finish, { capture:true, passive:true });
    board.addEventListener('click', event => {
      if (Date.now() > suppressPeriodClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function installPeriodBoard() {
    const board = $('#weekEvents');
    if (board) installTouchPan(board);
  }

  document.addEventListener('click', event => {
    const total = event.target.closest('.summary-card[data-summary-total-v84]');
    if (!total) return;
    event.preventDefault();
    showAllPoints();
  }, true);

  document.addEventListener('keydown', event => {
    const total = event.target.closest?.('.summary-card[data-summary-total-v84]');
    if (!total || !['Enter',' '].includes(event.key)) return;
    event.preventDefault();
    showAllPoints();
  });

  const observer = new MutationObserver(() => {
    decorateTotalCard();
    installPeriodBoard();
  });

  function install() {
    decorateTotalCard();
    installPeriodBoard();
    const target = $('.main-content');
    if (target) observer.observe(target, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  }

  globalThis.PMK_MOBILE_PERIOD_HOTFIX_V84_API = { installTouchPan, decorateTotalCard, renderCardV84, findTouch };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once:true });
  else requestAnimationFrame(install);
})();