'use strict';

(() => {
  if (globalThis.PMK_MOBILE_WORKFLOW_FIXES_V89) return;
  globalThis.PMK_MOBILE_WORKFLOW_FIXES_V89 = true;

  const VERSION = '89';
  const FAST_SYNC_LAST_KEY = 'pmk-calendar-last-sync-v68';
  const FAST_SYNC_CALENDAR_KEY = 'pmk-calendar-cache-id-v68';
  const FAST_SYNC_CACHE = 'pmk-calendar-data-v68';
  const FAST_SYNC_CACHE_PATH = './__pmk-calendar-events-v68.json';
  const MULTI_DAY_VIEWS = new Set(['three-days', 'week']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let forceFullSync = true;
  let refreshInFlight = null;
  let autoRefreshTimer = 0;

  function emit(name, detail = {}) {
    globalThis.dispatchEvent(new CustomEvent(name, { detail }));
  }

  async function clearFastSyncCheckpoint() {
    try {
      localStorage.removeItem(FAST_SYNC_LAST_KEY);
      localStorage.removeItem(FAST_SYNC_CALENDAR_KEY);
    } catch {}

    if ('caches' in globalThis) {
      try {
        const cache = await caches.open(FAST_SYNC_CACHE);
        await cache.delete(FAST_SYNC_CACHE_PATH);
      } catch {}
    }

    if (typeof state !== 'undefined') {
      state.events = [];
      if (typeof invalidateEventCaches === 'function') invalidateEventCaches();
    }
  }

  function installReliableGoogleSync() {
    const api = globalThis.PMK_FULL_CALENDAR_SYNC;
    const baseRefresh = api?.refresh;
    if (!api || typeof baseRefresh !== 'function' || api.refresh?.pmkV89) return false;

    const reliableRefresh = async function reliableRefreshV89(options = {}) {
      if (refreshInFlight) return refreshInFlight;
      refreshInFlight = (async () => {
        const full = Boolean(options.full || forceFullSync);
        if (full) {
          await clearFastSyncCheckpoint();
          forceFullSync = false;
        }
        const result = await baseRefresh();
        emit('pmk-v89-google-refresh', {
          full,
          count: Number(globalThis.PMK_FULL_CALENDAR_EVENT_COUNT || state?.events?.length || 0),
        });
        return result;
      })().finally(() => {
        refreshInFlight = null;
      });
      return refreshInFlight;
    };

    reliableRefresh.pmkV89 = true;
    reliableRefresh.baseRefresh = baseRefresh;
    api.refresh = reliableRefresh;
    refreshEvents = reliableRefresh;
    globalThis.PMK_FULL_CALENDAR_SYNC_V89 = {
      refresh: reliableRefresh,
      forceFull() {
        forceFullSync = true;
        return reliableRefresh({ full: true });
      },
    };

    document.addEventListener('pointerdown', event => {
      if (!event.target.closest('#pmkSyncButton,#pmkProvidersSyncBtn,#connectGoogleBtn')) return;
      forceFullSync = true;
    }, true);

    return true;
  }

  function scheduleReliableSync(reason = 'auto') {
    clearTimeout(autoRefreshTimer);
    autoRefreshTimer = setTimeout(() => {
      if (document.visibilityState === 'hidden') return;
      if (typeof state === 'undefined' || !state.token) return;
      const refresh = globalThis.PMK_FULL_CALENDAR_SYNC?.refresh;
      if (typeof refresh !== 'function') return;
      refresh().catch(() => {});
      emit('pmk-v89-auto-refresh-requested', { reason });
    }, reason === 'startup' ? 350 : 700);
  }

  function setupReliableSwipeNavigation() {
    const main = $('.main-content');
    const sidebar = $('#sidebar');
    if (!main || !sidebar || main.dataset.pmkSwipeV89 === '1') return;
    main.dataset.pmkSwipeV89 = '1';

    let startX = 0;
    let startY = 0;
    let startedAt = 0;
    let startTarget = null;
    let startBoard = null;
    let startScrollLeft = 0;
    let startScrollMax = 0;

    const reset = () => {
      startX = 0;
      startY = 0;
      startedAt = 0;
      startTarget = null;
      startBoard = null;
      startScrollLeft = 0;
      startScrollMax = 0;
    };

    const onStart = event => {
      const touch = event.touches?.[0];
      if (!touch) return reset();
      startX = touch.clientX;
      startY = touch.clientY;
      startedAt = Date.now();
      startTarget = event.target;
      startBoard = startTarget?.closest?.('#weekEvents') || null;
      startScrollLeft = Number(startBoard?.scrollLeft || 0);
      startScrollMax = startBoard ? Math.max(0, startBoard.scrollWidth - startBoard.clientWidth) : 0;
    };

    const onEnd = event => {
      const touch = event.changedTouches?.[0];
      if (!touch || !startedAt) return reset();

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const elapsed = Date.now() - startedAt;
      const horizontal = Math.abs(dx) >= 62 && Math.abs(dx) > Math.abs(dy) * 1.18;

      if (sidebar.classList.contains('open') && horizontal && dx < 0) {
        sidebar.classList.remove('open');
        reset();
        return;
      }

      if (!horizontal || elapsed > 1300 || typeof state === 'undefined') return reset();

      const view = state.currentView;
      if (view === 'day') {
        const interactive = startTarget?.closest?.('input,textarea,select,button,a,[contenteditable="true"],.event-card');
        if (!interactive && typeof shiftSelectedDay === 'function') shiftSelectedDay(dx < 0 ? 1 : -1);
        reset();
        return;
      }

      if (MULTI_DAY_VIEWS.has(view)) {
        if (startBoard && startScrollMax > 4) {
          const movingNext = dx < 0;
          const atStart = startScrollLeft <= 3;
          const atEnd = startScrollLeft >= startScrollMax - 3;
          if ((movingNext && !atEnd) || (!movingNext && !atStart)) return reset();
        }
        if (typeof shiftPeriod === 'function' && typeof periodStepDays === 'function') {
          shiftPeriod(dx < 0 ? periodStepDays() : -periodStepDays());
        }
        reset();
        return;
      }

      if (view === 'month' && typeof shiftPeriod === 'function' && typeof periodStepDays === 'function') {
        shiftPeriod(dx < 0 ? periodStepDays() : -periodStepDays());
      }
      reset();
    };

    main.addEventListener('touchstart', onStart, { passive: true, capture: true });
    main.addEventListener('touchend', onEnd, { passive: true, capture: true });
    main.addEventListener('touchcancel', reset, { passive: true, capture: true });
    sidebar.addEventListener('touchstart', onStart, { passive: true, capture: true });
    sidebar.addEventListener('touchend', onEnd, { passive: true, capture: true });
    sidebar.addEventListener('touchcancel', reset, { passive: true, capture: true });
  }

  setupSwipeNavigation = setupReliableSwipeNavigation;
  installReliableGoogleSync();

  function normalizeStatusColumn() {
    $$('.event-card-v85[data-event-card], .event-card[data-event-card]').forEach(card => {
      const time = $('.event-time', card);
      const status = $('.event-status-grid-v85, .event-time-statuses, .status-row', card);
      if (!time || !status) return;
      if (matchMedia('(max-width: 760px)').matches && status.parentElement !== time) time.append(status);
      status.classList.add('pmk-status-column-v89');
      card.classList.add('pmk-card-status-column-v89');
    });
  }

  function fixPeriodBoard() {
    const board = $('#weekEvents');
    if (!board) return;
    if (!MULTI_DAY_VIEWS.has(state?.currentView)) return;
    board.classList.add('pmk-period-board-v89');
  }

  function applyUiFixes() {
    normalizeStatusColumn();
    fixPeriodBoard();
  }

  function boot() {
    setupReliableSwipeNavigation();
    installReliableGoogleSync();
    applyUiFixes();

    const root = document.body || document.documentElement;
    new MutationObserver(() => requestAnimationFrame(applyUiFixes)).observe(root, { childList: true, subtree: true });

    globalThis.addEventListener('pmk-calendar-sync-done', applyUiFixes);
    globalThis.addEventListener('pmk-yandex-sync-done', applyUiFixes);
    globalThis.addEventListener('online', () => scheduleReliableSync('online'));
    globalThis.addEventListener('focus', () => scheduleReliableSync('focus'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleReliableSync('visible');
    });

    let attempts = 0;
    const syncInstaller = setInterval(() => {
      attempts += 1;
      const installed = installReliableGoogleSync();
      if (installed || attempts > 80) clearInterval(syncInstaller);
    }, 100);

    scheduleReliableSync('startup');
    setInterval(() => scheduleReliableSync('interval'), 120000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
