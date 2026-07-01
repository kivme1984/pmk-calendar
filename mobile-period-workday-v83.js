'use strict';

(() => {
  if (globalThis.PMK_MOBILE_PERIOD_WORKDAY_V83) return;
  globalThis.PMK_MOBILE_PERIOD_WORKDAY_V83 = true;

  const model = globalThis.PMK_PERIOD_MODEL_V83_API;
  const HIDDEN_DAY_STATUSES = new Set(['picked-up', 'in-progress', 'completed', 'archived']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const previousEventMeta = eventMeta;
  const previousRenderAll = renderAll;
  const previousRenderPeriod = renderPeriod;
  let activeSummaryFilter = '';
  let activeFilterDay = '';

  function phoneFromText(value = '') {
    const text = String(value || '');
    const labelled = text.match(/(?:телефон|тел\.?|phone)\s*[:：]?\s*(\+?\d[\d\s()\-]{8,}\d)/i)?.[1];
    const loose = text.match(/(?:\+7|8)[\d\s()\-]{9,}\d/)?.[0];
    return String(labelled || loose || '').trim();
  }

  eventMeta = function eventMetaWithPhoneFallbackV83(event) {
    const data = previousEventMeta(event);
    if (String(data.phone || '').trim()) return data;
    const phone = phoneFromText(event?.description || '');
    return phone ? { ...data, phone } : data;
  };

  scheduleBadge = function scheduleBadgeV83(data = {}) {
    if (data.callAhead) return `<span class="quick-badge schedule-badge call-ahead-badge">☎ Позвонить ${escapeHtml(formatCallAhead(getCallAheadMinutes(data)))}</span>`;
    if (isScheduleNote(data)) return '<span class="quick-badge schedule-badge">◷ Ждёт по расписанию</span>';
    return '';
  };

  renderEventCard = function renderEventCardLeftStatusesV83(event) {
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
    return `<article class="event-card event-card-v83 status-${currentStatus.className}" data-event-card="${id}">
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
        <div class="event-actions event-actions-v83">
          <div class="action-row manage-row">
            ${phone ? `<a class="mini-button call-button primary-card-action" href="${phoneLink(phone)}">☎ Позвонить</a>` : '<button type="button" class="mini-button primary-card-action phone-missing" disabled>Телефон не указан</button>'}
            <button type="button" class="mini-button open-button secondary-card-action" data-open-event="${id}">Открыть</button>
            <details class="card-menu">
              <summary class="mini-button menu-button" aria-label="Дополнительные действия">⋮</summary>
              <div class="card-menu-popover">
                <button type="button" data-edit-event="${id}">Редактировать заявку</button>
                <button type="button" class="danger-menu-item" data-delete-event="${id}">Удалить заявку</button>
              </div>
            </details>
          </div>
        </div>
      </div>
    </article>`;
  };

  function activeDayEvents() {
    return getAllEvents().filter(event => {
      if (eventDateKey(event) !== state.selectedDayKey) return false;
      return !HIDDEN_DAY_STATUSES.has(eventMeta(event).requestStatus);
    });
  }

  function setSummaryCards() {
    const map = [
      ['summaryTotal', ''],
      ['summaryPickup', 'pickup'],
      ['summaryDelivery', 'delivery'],
      ['summaryAttention', 'attention'],
    ];
    map.forEach(([id, filter]) => {
      const value = $(`#${id}`);
      const card = value?.closest('.summary-card');
      if (!card) return;
      card.dataset.summaryFilter = filter;
      card.classList.toggle('summary-filterable', Boolean(filter));
      card.classList.toggle('active', activeSummaryFilter === filter && Boolean(filter));
      if (filter) {
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', activeSummaryFilter === filter ? 'true' : 'false');
      } else {
        card.removeAttribute('tabindex');
        card.removeAttribute('role');
        card.removeAttribute('aria-pressed');
      }
    });
  }

  function updateDaySummary() {
    if (state.currentView !== 'day') return;
    const events = activeDayEvents();
    const pickup = events.filter(event => eventMeta(event).visitType === 'pickup');
    const delivery = events.filter(event => eventMeta(event).visitType === 'delivery');
    const attention = events.filter(event => {
      const data = eventMeta(event);
      return !String(data.phone || '').trim() || !String(displayAddress(data, event) || '').trim();
    });
    const values = { summaryTotal:events.length, summaryPickup:pickup.length, summaryDelivery:delivery.length, summaryAttention:attention.length };
    Object.entries(values).forEach(([id, value]) => { const node = $(`#${id}`); if (node) node.textContent = String(value); });
    setSummaryCards();
  }

  function renderFilteredDay() {
    if (state.currentView !== 'day') return;
    const events = model.filterDayEvents(activeDayEvents(), activeSummaryFilter, eventMeta, displayAddress);
    renderToday(events);
    updateDaySummary();
  }

  function workingDistrictText() {
    const districts = model.workingDistricts(PICKUP_SCHEDULE, state.selectedDayKey || businessTodayKey());
    return districts.length ? `Рабочие районы: ${districts.join(', ')}` : 'По графику районных выездов нет.';
  }

  function applyDayHeading() {
    if (state.currentView !== 'day') return;
    const subtitle = $('#todaySubtitle');
    if (subtitle) subtitle.textContent = workingDistrictText();
    if (activeFilterDay !== state.selectedDayKey) {
      activeFilterDay = state.selectedDayKey;
      activeSummaryFilter = '';
    }
    renderFilteredDay();
  }

  function monthEventCount(events, dateKey) {
    return events.filter(event => {
      if (eventDateKey(event) !== dateKey) return false;
      return !new Set(['completed','archived']).has(eventMeta(event).requestStatus);
    }).length;
  }

  function renderMonthTable(events, dateKeys) {
    const board = $('#weekEvents');
    if (!board) return;
    const cells = model.monthCells(dateKeys);
    const today = businessTodayKey();
    const labels = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    board.className = 'pmk-month-table';
    board.innerHTML = `${labels.map(label => `<div class="pmk-month-weekday">${label}</div>`).join('')}${cells.map(dateKey => {
      if (!dateKey) return '<div class="pmk-month-cell pmk-month-empty" aria-hidden="true"></div>';
      const count = monthEventCount(events, dateKey);
      const day = Number(dateKey.slice(-2));
      return `<button type="button" class="pmk-month-cell${dateKey === today ? ' today' : ''}${count ? ' has-events' : ''}" data-open-month-day="${dateKey}"><span>${day}</span><strong>${count}</strong><small>${count === 1 ? 'точка' : count >= 2 && count <= 4 ? 'точки' : 'точек'}</small></button>`;
    }).join('')}`;
    $$('[data-open-month-day]', board).forEach(button => button.addEventListener('click', () => openDay(button.dataset.openMonthDay)));
  }

  function installBoardDrag(board) {
    if (!board || board.dataset.pmkDragV83 === '1') return;
    board.dataset.pmkDragV83 = '1';
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let horizontal = null;
    let dragged = false;
    let suppressClickUntil = 0;

    board.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScroll = board.scrollLeft;
      horizontal = null;
      dragged = false;
    });

    board.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (horizontal == null && Math.max(Math.abs(dx), Math.abs(dy)) > 7) horizontal = Math.abs(dx) > Math.abs(dy);
      if (!horizontal) return;
      dragged = true;
      event.preventDefault();
      try { board.setPointerCapture(pointerId); } catch {}
      board.classList.add('pmk-period-dragging');
      board.scrollLeft = startScroll - dx;
    }, { passive:false });

    const finish = event => {
      if (pointerId !== event.pointerId) return;
      if (dragged) suppressClickUntil = Date.now() + 350;
      try { board.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
      horizontal = null;
      dragged = false;
      board.classList.remove('pmk-period-dragging');
    };
    board.addEventListener('pointerup', finish);
    board.addEventListener('pointercancel', finish);
    board.addEventListener('click', event => {
      if (Date.now() > suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  renderPeriod = function renderPeriodV83(events, dateKeys, period = 'week') {
    if (period === 'month') return renderMonthTable(events, dateKeys);
    previousRenderPeriod(events, dateKeys, period);
    const board = $('#weekEvents');
    if (period === 'week' || period === 'three-days') requestAnimationFrame(() => installBoardDrag(board));
  };

  renderAll = function renderAllV83() {
    previousRenderAll();
    applyDayHeading();
  };

  function activateSummaryFilter(filter) {
    if (!filter || state.currentView !== 'day') return;
    activeSummaryFilter = activeSummaryFilter === filter ? '' : filter;
    renderFilteredDay();
  }

  function animateDay(direction) {
    const view = $('#view-today');
    if (!view) return;
    requestAnimationFrame(() => {
      view.classList.remove('pmk-day-next','pmk-day-prev');
      void view.offsetWidth;
      view.classList.add(direction === 'next' ? 'pmk-day-next' : 'pmk-day-prev');
      setTimeout(() => view.classList.remove('pmk-day-next','pmk-day-prev'), 330);
    });
  }

  document.addEventListener('click', event => {
    const summary = event.target.closest('.summary-card[data-summary-filter]');
    if (summary?.dataset.summaryFilter) {
      event.preventDefault();
      activateSummaryFilter(summary.dataset.summaryFilter);
      return;
    }
    const dayButton = event.target.closest('#prevDayBtn,#nextDayBtn');
    if (dayButton) animateDay(dayButton.id === 'nextDayBtn' ? 'next' : 'prev');
  }, true);

  document.addEventListener('keydown', event => {
    const summary = event.target.closest?.('.summary-card[data-summary-filter]');
    if (!summary?.dataset.summaryFilter || !['Enter',' '].includes(event.key)) return;
    event.preventDefault();
    activateSummaryFilter(summary.dataset.summaryFilter);
  });

  globalThis.addEventListener?.('pmk-status-ledger-updated', () => requestAnimationFrame(() => {
    if (state.currentView === 'day') applyDayHeading();
  }));

  globalThis.PMK_MOBILE_PERIOD_WORKDAY_V83_API = {
    renderMonthTable,
    installBoardDrag,
    activeDayEvents,
    workingDistrictText,
    renderFilteredDay,
  };

  const install = () => {
    setSummaryCards();
    applyDayHeading();
    if (['week','three-days'].includes(state.currentView)) installBoardDrag($('#weekEvents'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once:true });
  else requestAnimationFrame(install);
})();