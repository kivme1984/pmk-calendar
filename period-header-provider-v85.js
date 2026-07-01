'use strict';

(() => {
  if (globalThis.PMK_PERIOD_HEADER_PROVIDER_V85) return;
  globalThis.PMK_PERIOD_HEADER_PROVIDER_V85 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let dragState = null;
  let raf = 0;

  function providerSet(event = {}) {
    const providers = new Set(Array.isArray(event._providers) ? event._providers.map(value => String(value).toLowerCase()) : []);
    if (event._provider) providers.add(String(event._provider).toLowerCase());
    const id = String(event.id || '');
    const link = String(event.htmlLink || '').toLowerCase();
    if (id.startsWith('local-yandex-') || link.includes('yandex')) providers.add('yandex');
    if (event._yandexMirror) providers.add('yandex');
    if (event.kind === 'calendar#event' || link.includes('google') || (!id.startsWith('local-') && id && !providers.has('yandex'))) providers.add('google');
    return providers;
  }

  function providerBadges(event = {}) {
    const providers = providerSet(event);
    const items = [];
    if (providers.has('google')) items.push('<span class="event-provider-mark event-provider-google" title="Синхронизировано с Google Calendar" aria-label="Google Calendar">G</span>');
    if (providers.has('yandex')) items.push('<span class="event-provider-mark event-provider-yandex" title="Синхронизировано с Яндекс Календарём" aria-label="Яндекс Календарь">Я</span>');
    return items.length ? `<span class="event-provider-marks">${items.join('')}</span>` : '';
  }

  function renderCardV85(event) {
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
    return `<article class="event-card event-card-v85 status-${currentStatus.className}" data-event-card="${id}">
      <div class="event-time">
        <small class="event-date">${formatDateShort(dateKey)}</small>
        <small class="event-weekday">${escapeHtml(date.toLocaleDateString('ru-RU', { weekday:'long', timeZone:'UTC' }))}</small>
        <strong>${formatTime(start)}–${formatTime(end)}</strong>
        <span>${data.visitType === 'delivery' ? 'Доставка' : 'Забор'}</span>
      </div>
      <div class="event-main">
        <div class="event-contract-provider-row">
          ${renderContractControl(event, data)}
          ${providerBadges(event)}
        </div>
        <div class="event-card-header event-card-header-v85">
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
      <div class="event-status-grid-v85" aria-label="Изменить статус заявки">${statusButtons(event.id, data.requestStatus)}</div>
      <div class="event-card-footer-v85">
        ${phone ? `<a class="mini-button call-button call-button-v85" href="${phoneLink(phone)}">☎ Позвонить</a>` : '<button type="button" class="mini-button call-button-v85 phone-missing" disabled>Телефон не указан</button>'}
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

  renderEventCard = renderCardV85;

  function scrollModel(board) {
    const max = Math.max(0, board.scrollWidth - board.clientWidth);
    return { max, ratio:max ? Math.min(1, Math.max(0, board.scrollLeft / max)) : 0 };
  }

  function updateScrollUi() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const board = $('#weekEvents');
      const bar = $('#pmkVisiblePeriodScroll');
      if (!board || !bar) return;
      const track = $('.pmk-period-scroll-track', bar);
      const thumb = $('.pmk-period-scroll-thumb', bar);
      const prev = $('[data-period-scroll="prev"]', bar);
      const next = $('[data-period-scroll="next"]', bar);
      const { max, ratio } = scrollModel(board);
      const trackWidth = track.clientWidth;
      const visibleRatio = board.scrollWidth ? Math.min(1, board.clientWidth / board.scrollWidth) : 1;
      const thumbWidth = Math.max(42, trackWidth * visibleRatio);
      const travel = Math.max(0, trackWidth - thumbWidth);
      thumb.style.width = `${thumbWidth}px`;
      thumb.style.transform = `translateX(${travel * ratio}px)`;
      bar.classList.toggle('is-hidden', !['three-days','week'].includes(state.currentView) || max <= 1);
      prev.disabled = board.scrollLeft <= 1;
      next.disabled = board.scrollLeft >= max - 1;
      bar.dataset.progress = String(Math.round(ratio * 100));
      track.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
    });
  }

  function stepBoard(direction) {
    const board = $('#weekEvents');
    if (!board) return;
    const distance = Math.max(180, board.clientWidth * .78) * direction;
    board.scrollTo({ left:board.scrollLeft + distance, behavior:'smooth' });
  }

  function createVisibleScroll() {
    const board = $('#weekEvents');
    if (!board) return null;
    let bar = $('#pmkVisiblePeriodScroll');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pmkVisiblePeriodScroll';
      bar.className = 'pmk-visible-period-scroll';
      bar.innerHTML = `
        <button type="button" class="pmk-period-scroll-arrow" data-period-scroll="prev" aria-label="Прокрутить дни влево">‹</button>
        <div class="pmk-period-scroll-track" role="scrollbar" aria-label="Перемещение по дням" aria-orientation="horizontal">
          <div class="pmk-period-scroll-thumb"><span>Перемещайте дни</span></div>
        </div>
        <button type="button" class="pmk-period-scroll-arrow" data-period-scroll="next" aria-label="Прокрутить дни вправо">›</button>`;
      board.insertAdjacentElement('beforebegin', bar);
      $('[data-period-scroll="prev"]', bar).addEventListener('click', () => stepBoard(-1));
      $('[data-period-scroll="next"]', bar).addEventListener('click', () => stepBoard(1));
      const track = $('.pmk-period-scroll-track', bar);
      const thumb = $('.pmk-period-scroll-thumb', bar);
      track.addEventListener('click', event => {
        if (event.target.closest('.pmk-period-scroll-thumb')) return;
        const rect = track.getBoundingClientRect();
        const boardModel = scrollModel(board);
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        board.scrollTo({ left:boardModel.max * ratio, behavior:'smooth' });
      });
      thumb.addEventListener('pointerdown', event => {
        event.preventDefault();
        thumb.setPointerCapture?.(event.pointerId);
        dragState = { pointerId:event.pointerId, startX:event.clientX, startLeft:board.scrollLeft };
        bar.classList.add('is-dragging');
      });
      thumb.addEventListener('pointermove', event => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        event.preventDefault();
        const model = scrollModel(board);
        const thumbWidth = thumb.getBoundingClientRect().width;
        const travel = Math.max(1, track.clientWidth - thumbWidth);
        board.scrollLeft = Math.min(model.max, Math.max(0, dragState.startLeft + (event.clientX - dragState.startX) * (model.max / travel)));
      });
      const finish = event => {
        if (!dragState || (event.pointerId != null && dragState.pointerId !== event.pointerId)) return;
        dragState = null;
        bar.classList.remove('is-dragging');
      };
      thumb.addEventListener('pointerup', finish);
      thumb.addEventListener('pointercancel', finish);
      board.addEventListener('scroll', updateScrollUi, { passive:true });
    }
    updateScrollUi();
    return bar;
  }

  function shortStatus(status) {
    return ({ success:'ОК', warning:'Очередь', syncing:'Синхр.', error:'Ошибка', offline:'Нет', pending:'Проверить' })[status] || 'Проверка';
  }

  function clarifyHeader() {
    const panel = $('#pmkProviderStatusPanel');
    if (!panel) return;
    $$('.pmk-provider-card', panel).forEach(card => {
      let mobile = $('.pmk-provider-mobile-status', card);
      if (!mobile) {
        mobile = document.createElement('span');
        mobile.className = 'pmk-provider-mobile-status';
        card.appendChild(mobile);
      }
      const provider = card.dataset.provider === 'google' ? 'Google' : 'Яндекс';
      const full = $('[data-provider-text]', card)?.textContent || 'Проверяем';
      const compact = shortStatus(card.dataset.status);
      if (mobile.textContent !== compact) mobile.textContent = compact;
      const title = `${provider}: ${full}`;
      if (card.title !== title) card.title = title;
      const aria = `${provider}. Статус: ${full}`;
      if (card.getAttribute('aria-label') !== aria) card.setAttribute('aria-label', aria);
    });
    const sync = $('#pmkProvidersSyncBtn');
    if (sync && sync.dataset.v85 !== '1') {
      sync.dataset.v85 = '1';
      sync.innerHTML = '<span aria-hidden="true">↻</span><small>Синхр.</small>';
      sync.title = 'Синхронизировать Google и Яндекс';
      sync.setAttribute('aria-label', 'Синхронизировать Google и Яндекс');
    }
  }

  const observer = new MutationObserver(() => {
    createVisibleScroll();
    updateScrollUi();
    clarifyHeader();
  });

  function install() {
    createVisibleScroll();
    clarifyHeader();
    const main = $('.main-content');
    const header = $('.app-header');
    if (main) observer.observe(main, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    if (header) observer.observe(header, { childList:true, subtree:true, attributes:true, attributeFilter:['data-status','data-queue','class'] });
    window.addEventListener('resize', updateScrollUi, { passive:true });
  }

  globalThis.PMK_PERIOD_HEADER_PROVIDER_V85_API = { providerSet, providerBadges, createVisibleScroll, updateScrollUi, clarifyHeader, renderCardV85 };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once:true });
  else requestAnimationFrame(install);
})();