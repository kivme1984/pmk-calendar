'use strict';

(() => {
  if (globalThis.PMK_V82_UI_SWIPE_TEST_V1) return;
  globalThis.PMK_V82_UI_SWIPE_TEST_V1 = true;
  document.documentElement.dataset.pmkTestVersion = 'v82-ui-swipe-v1';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let scheduled = false;
  let syncing = false;
  let observedHeader = null;
  let headerObserver = null;
  let observedBoard = null;
  let boardObserver = null;
  let lastPeriodSignature = '';
  let suppressClickUntil = 0;

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyHeaderFix();
      applyPeriodFix();
    });
  }

  function providerStatusText(card) {
    const source = $('[data-provider-text]', card)?.textContent?.trim();
    if (source) return source;
    const status = card.dataset.status || 'idle';
    return ({
      success: 'Подключён',
      syncing: 'Обновляется…',
      warning: 'Есть очередь',
      pending: 'Ожидает проверки',
      error: 'Ошибка',
      offline: 'Не подключён',
      idle: 'Проверяем…',
    })[status] || 'Проверяем…';
  }

  function decorateProviderCard(card) {
    let mobile = $('.pmk-provider-mobile-status', card);
    if (!mobile) {
      mobile = document.createElement('span');
      mobile.className = 'pmk-provider-mobile-status';
      card.appendChild(mobile);
    }
    const next = providerStatusText(card);
    if (mobile.textContent !== next) mobile.textContent = next;
    card.setAttribute('aria-label', `${card.dataset.provider === 'yandex' ? 'Яндекс' : 'Google'}: ${next}`);
  }

  function decorateRefreshButton(button) {
    if (!button) return;
    button.type = 'button';
    button.classList.add('pmk-test-refresh-button');
    button.setAttribute('aria-label', 'Обновить Google и Яндекс календари');
    button.setAttribute('title', 'Обновить Google и Яндекс календари');
    const label = syncing ? 'Обновляем' : 'Обновить';
    const nextHtml = `<span class="pmk-test-refresh-icon" aria-hidden="true">↻</span><small>${label}</small>`;
    if (button.innerHTML !== nextHtml) button.innerHTML = nextHtml;
    button.disabled = syncing;
    button.setAttribute('aria-busy', String(syncing));
  }

  function watchHeader(header) {
    if (!header || observedHeader === header) return;
    headerObserver?.disconnect();
    observedHeader = header;
    headerObserver = new MutationObserver(scheduleApply);
    headerObserver.observe(header, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-status', 'class'],
    });
  }

  function applyHeaderFix() {
    const header = $('.app-header');
    if (!header) return;
    header.classList.add('pmk-test-header-v1');
    watchHeader(header);

    $('#pmkHeaderSync')?.setAttribute('hidden', '');
    $('#connectionBadge')?.setAttribute('hidden', '');
    $('#connectGoogleBtn')?.classList.add('pmk-test-original-connect');
    $('#refreshBtn')?.classList.add('pmk-test-old-refresh');

    const panel = $('#pmkProviderStatusPanel');
    if (!panel) return;
    panel.classList.add('pmk-test-provider-panel');
    $$('.pmk-provider-card', panel).forEach(decorateProviderCard);
    decorateRefreshButton($('#pmkProvidersSyncBtn', panel));
  }

  async function refreshProviders() {
    if (syncing) return;
    syncing = true;
    applyHeaderFix();
    try {
      const refresh = globalThis.PMK_FULL_CALENDAR_SYNC?.refresh
        || globalThis.PMK_YANDEX_PRIMARY_REFRESH_V72_API?.refresh
        || globalThis.refreshEvents;
      if (typeof refresh !== 'function') throw new Error('Модуль обновления календарей не найден');
      await refresh();
      if (typeof showToast === 'function') showToast('Календари обновлены.', 'success');
    } catch (error) {
      if (typeof showToast === 'function') showToast(error?.message || 'Не удалось обновить календари.', 'error');
    } finally {
      syncing = false;
      applyHeaderFix();
    }
  }

  function bindRefreshCapture() {
    document.addEventListener('click', event => {
      const button = event.target.closest('#pmkProvidersSyncBtn');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      refreshProviders();
    }, true);
  }

  function periodMode() {
    if (typeof state === 'undefined') return '';
    if (state.currentView === 'three-days') return 'three-days';
    if (state.currentView === 'week') return 'week';
    return '';
  }

  function watchBoard(board) {
    if (!board || observedBoard === board) return;
    boardObserver?.disconnect();
    observedBoard = board;
    boardObserver = new MutationObserver(scheduleApply);
    boardObserver.observe(board, { childList: true, subtree: false, attributes: true, attributeFilter: ['class'] });

    let startX = 0;
    let startY = 0;
    let horizontalDrag = false;

    board.addEventListener('touchstart', event => {
      const touch = event.touches?.[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      horizontalDrag = false;
      board.classList.remove('pmk-test-dragging');
    }, { passive: true });

    board.addEventListener('touchmove', event => {
      const touch = event.touches?.[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.05) {
        horizontalDrag = true;
        board.classList.add('pmk-test-dragging');
      }
    }, { passive: true });

    const finish = () => {
      if (horizontalDrag) suppressClickUntil = Date.now() + 420;
      horizontalDrag = false;
      requestAnimationFrame(() => board.classList.remove('pmk-test-dragging'));
    };
    board.addEventListener('touchend', finish, { passive: true });
    board.addEventListener('touchcancel', finish, { passive: true });
  }

  function applyPeriodFix() {
    const board = $('#weekEvents');
    if (!board) return;
    watchBoard(board);
    const mode = periodMode();
    board.classList.toggle('pmk-test-three-days', mode === 'three-days');
    board.classList.toggle('pmk-test-week', mode === 'week');
    board.classList.toggle('pmk-test-multiday', Boolean(mode));

    const signature = mode ? `${mode}:${typeof state !== 'undefined' ? state.periodAnchorKey || '' : ''}` : '';
    if (signature && signature !== lastPeriodSignature) {
      lastPeriodSignature = signature;
      requestAnimationFrame(() => { board.scrollLeft = 0; });
    }
    if (!mode) lastPeriodSignature = '';
  }

  function bindSwipeClickGuard() {
    document.addEventListener('click', event => {
      if (Date.now() > suppressClickUntil) return;
      if (!event.target.closest('#weekEvents button, #weekEvents a')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }, true);
  }

  function bindRuntimeEvents() {
    [
      'pmk-calendar-sync-start', 'pmk-calendar-sync-progress', 'pmk-calendar-sync-done',
      'pmk-calendar-sync-error', 'pmk-yandex-sync-done', 'pmk-yandex-sync-error',
      'pmk-status-ledger-updated', 'popstate', 'resize',
    ].forEach(name => globalThis.addEventListener(name, scheduleApply));
    document.addEventListener('click', event => {
      if (event.target.closest('.nav-item,[data-open-day],#prevPeriodBtn,#nextPeriodBtn')) setTimeout(scheduleApply, 0);
    }, true);
  }

  function boot() {
    bindRefreshCapture();
    bindSwipeClickGuard();
    bindRuntimeEvents();
    applyHeaderFix();
    applyPeriodFix();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      applyHeaderFix();
      applyPeriodFix();
      if (($('#pmkProviderStatusPanel') && $('#weekEvents')) || attempts > 100) clearInterval(timer);
    }, 80);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
