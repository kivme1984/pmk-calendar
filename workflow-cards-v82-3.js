'use strict';

(() => {
  if (globalThis.PMK_WORKFLOW_CARDS_V82_3) return;
  globalThis.PMK_WORKFLOW_CARDS_V82_3 = true;

  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const YANDEX_CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const HIDDEN_DAY_STATUSES = new Set(['picked-up', 'in-progress', 'completed', 'archived']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const ledger = globalThis.PMK_STATUS_LEDGER_V80_API;
  let scheduled = false;
  let observer = null;
  let rerenderTimer = 0;

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function setText(node, value) {
    const next = String(value);
    if (node && node.textContent !== next) node.textContent = next;
  }

  function pmkId(event, data = {}) {
    return String(data.pmkId || event?._pmkId || event?.pmkData?.pmkId || '').trim();
  }

  function eventUpdatedAt(event = {}) {
    const value = new Date(event.updated || event.created || event.start?.dateTime || event.start?.date || 0).getTime();
    return Number.isFinite(value) ? value : 0;
  }

  function isOperationalEvent(event) {
    if (!event || typeof eventMeta !== 'function') return false;
    const data = eventMeta(event);
    if (pmkId(event, data)) return true;
    if (event?._provider || event?._providers?.length || event?._yandexMirror) return true;
    if (typeof isPmkEvent === 'function' && isPmkEvent(event)) return true;
    if (ledger?.resolve?.(event, data)) return true;
    return /(?:Статус|Договор)\s*ПМК\s*:/i.test(String(event.description || ''));
  }

  function eventLogicalKey(event) {
    const data = eventMeta(event);
    const explicit = pmkId(event, data);
    if (explicit) return `pmk:${explicit}`;
    if (ledger?.key) return `logical:${ledger.key(event, data)}`;
    return `id:${String(event.id || '')}`;
  }

  function uniqueOperationalEvents(source = null) {
    const events = Array.isArray(source)
      ? source
      : (typeof getAllEvents === 'function' ? getAllEvents() : []);
    const unique = new Map();
    events.filter(isOperationalEvent).forEach(event => {
      const key = eventLogicalKey(event);
      const current = unique.get(key);
      if (!current || eventUpdatedAt(event) >= eventUpdatedAt(current)) unique.set(key, event);
    });
    return [...unique.values()];
  }

  function configuredProviders() {
    const yandex = readJson(YANDEX_CONFIG_KEY, {}) || {};
    return {
      google: Boolean(typeof state !== 'undefined' && state.token),
      yandex: Boolean(yandex.enabled !== false && yandex.apiUrl && yandex.syncToken),
    };
  }

  function queuedProviders(id) {
    const queue = readJson(QUEUE_KEY, []);
    return new Set((Array.isArray(queue) ? queue : [])
      .filter(item => String(item?.pmkId || '') === id)
      .map(item => String(item.provider || '').toLowerCase()));
  }

  function providerState(event, provider) {
    const data = typeof eventMeta === 'function' ? eventMeta(event) : (event?.pmkData || {});
    const id = pmkId(event, data);
    const providers = new Set((event?._providers || []).map(value => String(value).toLowerCase()));
    const queued = queuedProviders(id);
    const configured = configuredProviders();

    let present = providers.has(provider);
    if (provider === 'google' && !present) {
      const eventId = String(event?.id || '');
      present = Boolean(eventId && !eventId.startsWith('local-') && event?._provider !== 'yandex');
    }
    if (provider === 'yandex' && !present) {
      present = event?._provider === 'yandex' || String(event?.id || '').startsWith('local-yandex-') || Boolean(event?._yandexMirror);
    }

    if (queued.has(provider)) return { state: 'pending', label: 'Ожидает синхронизации' };
    if (present) return { state: 'synced', label: 'Синхронизировано' };
    if (!configured[provider]) return { state: 'off', label: 'Не подключено' };
    return { state: 'missing', label: 'Нет копии' };
  }

  function marker(provider, value) {
    const isGoogle = provider === 'google';
    const title = `${isGoogle ? 'Google' : 'Яндекс'}: ${value.label}`;
    return `<span class="pmk-card-provider pmk-card-provider-${provider}" data-sync-state="${value.state}" title="${title}" aria-label="${title}"><b>${isGoogle ? 'G' : 'Я'}</b><i aria-hidden="true"></i></span>`;
  }

  function decorateCard(card) {
    if (!card || card.closest('#weekEvents')) return;
    const id = String(card.dataset.eventCard || '');
    if (!id || typeof getAllEvents !== 'function') return;
    const event = getAllEvents().find(item => String(item.id) === id);
    if (!event) return;
    const header = $('.event-card-header', card);
    if (!header) return;

    let sync = $('.pmk-card-sync', card);
    if (!sync) {
      sync = document.createElement('div');
      sync.className = 'pmk-card-sync';
      const contract = $('.contract-control', header);
      if (contract) contract.insertAdjacentElement('afterend', sync);
      else header.prepend(sync);
    }
    const google = providerState(event, 'google');
    const yandex = providerState(event, 'yandex');
    const signature = `${google.state}:${google.label}|${yandex.state}:${yandex.label}`;
    if (sync.dataset.signature !== signature) {
      sync.dataset.signature = signature;
      sync.innerHTML = marker('google', google) + marker('yandex', yandex);
    }

    $('.manage-row', card)?.classList.add('pmk-card-bottom-actions');
  }

  function workflowCounts() {
    const all = uniqueOperationalEvents();
    const completedSource = globalThis.PMK_COMPLETED_ARCHIVE_WORKFLOW_V82_API?.completedEvents?.() || [];
    return {
      work: all.filter(event => ['picked-up', 'in-progress'].includes(eventMeta(event).requestStatus)).length,
      delivery: all.filter(event => eventMeta(event).requestStatus === 'pending-delivery').length,
      completed: uniqueOperationalEvents(completedSource).length,
    };
  }

  function createWorkflowStrip() {
    const view = $('#view-today');
    const summary = $('.summary-grid', view || document);
    if (!view || !summary) return null;
    let strip = $('#pmkWorkflowStrip');
    if (strip) return strip;
    strip = document.createElement('div');
    strip.id = 'pmkWorkflowStrip';
    strip.className = 'pmk-workflow-strip';
    strip.innerHTML = `
      <button type="button" class="pmk-workflow-card pmk-workflow-work" data-workflow-view="in-work"><span>В работе</span><strong id="pmkWorkflowWorkCount">0</strong><small>Заказы на фабрике</small></button>
      <button type="button" class="pmk-workflow-card pmk-workflow-delivery" data-workflow-view="delivery-waiting"><span>Ожидают доставки</span><strong id="pmkWorkflowDeliveryCount">0</strong><small>Нужно вернуть клиентам</small></button>
      <button type="button" class="pmk-workflow-card pmk-workflow-completed" data-workflow-view="completed"><span>Выполнено</span><strong id="pmkWorkflowCompletedCount">0</strong><small>За последние 7 дней</small></button>`;
    summary.insertAdjacentElement('afterend', strip);
    strip.addEventListener('click', event => {
      const button = event.target.closest('[data-workflow-view]');
      if (!button || typeof setView !== 'function') return;
      setView(button.dataset.workflowView);
    });
    return strip;
  }

  function renderWorkflowStrip() {
    const strip = createWorkflowStrip();
    if (!strip) return;
    const counts = workflowCounts();
    setText($('#pmkWorkflowWorkCount', strip), counts.work);
    setText($('#pmkWorkflowDeliveryCount', strip), counts.delivery);
    setText($('#pmkWorkflowCompletedCount', strip), counts.completed);
    const current = typeof state !== 'undefined' ? state.currentView : '';
    $$('[data-workflow-view]', strip).forEach(button => {
      const active = button.dataset.workflowView === current;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function removeWrongCategoryCards() {
    const container = $('#todayEvents');
    if (!container || typeof state === 'undefined' || typeof getAllEvents !== 'function') return;
    const currentView = state.currentView;
    if (currentView !== 'day' && currentView !== 'delivery-waiting') return;

    let removed = false;
    $$('[data-event-card]', container).forEach(card => {
      const event = getAllEvents().find(item => String(item.id) === String(card.dataset.eventCard));
      if (!event) return;
      const status = eventMeta(event).requestStatus;
      const keep = currentView === 'delivery-waiting'
        ? status === 'pending-delivery'
        : !HIDDEN_DAY_STATUSES.has(status);
      if (!keep) {
        card.remove();
        removed = true;
      }
    });

    if (removed && !container.querySelector('[data-event-card]')) {
      container.innerHTML = currentView === 'delivery-waiting'
        ? '<div class="empty-state"><strong>Заявок, ожидающих доставки, нет.</strong></div>'
        : '<div class="empty-state"><strong>Активных заявок на этот день нет.</strong><br>Забранные и выполненные заявки находятся в отдельных разделах.</div>';
    }
  }

  function updateVisibleSummaryFromDom() {
    if (typeof state === 'undefined' || state.currentView !== 'day') return;
    const cards = $$('#todayEvents [data-event-card]');
    setText($('#summaryTotal'), cards.length);
    const events = cards.map(card => getAllEvents().find(item => String(item.id) === String(card.dataset.eventCard))).filter(Boolean);
    setText($('#summaryPickup'), events.filter(event => eventMeta(event).visitType === 'pickup').length);
    setText($('#summaryDelivery'), events.filter(event => eventMeta(event).visitType === 'delivery').length);
    setText($('#summaryAttention'), events.filter(event => !eventMeta(event).phone || !displayAddress(eventMeta(event), event)).length);
  }

  function applyAll() {
    scheduled = false;
    removeWrongCategoryCards();
    updateVisibleSummaryFromDom();
    renderWorkflowStrip();
    $$('.event-card[data-event-card]').forEach(decorateCard);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyAll);
  }

  function rerenderWorkflowViews() {
    clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(() => {
      try { globalThis.PMK_IN_WORK_WORKFLOW_V73_API?.render?.(); } catch {}
      try { globalThis.PMK_COMPLETED_ARCHIVE_WORKFLOW_V82_API?.render?.(); } catch {}
      try { if (typeof renderAll === 'function') renderAll(); } catch {}
      requestAnimationFrame(() => {
        removeWrongCategoryCards();
        updateVisibleSummaryFromDom();
        renderWorkflowStrip();
        schedule();
      });
    }, 90);
  }

  function bind() {
    document.addEventListener('click', event => {
      const statusButton = event.target.closest('[data-status-event][data-status]');
      if (statusButton) {
        const nextStatus = statusButton.dataset.status;
        if (HIDDEN_DAY_STATUSES.has(nextStatus)) {
          const card = statusButton.closest('[data-event-card]');
          if (card && typeof state !== 'undefined' && state.currentView === 'day') {
            requestAnimationFrame(() => card.remove());
          }
        }
        setTimeout(rerenderWorkflowViews, 0);
      }
      if (event.target.closest('.nav-item,[data-open-day],#prevDayBtn,#nextDayBtn')) setTimeout(schedule, 0);
    }, true);

    [
      'pmk-calendar-sync-start',
      'pmk-calendar-sync-done',
      'pmk-calendar-sync-error',
      'pmk-yandex-sync-done',
      'pmk-yandex-sync-error',
      'storage',
      'popstate',
    ].forEach(name => globalThis.addEventListener(name, schedule));
    globalThis.addEventListener('pmk-status-ledger-updated', rerenderWorkflowViews);
  }

  function watch() {
    if (observer) return;
    const root = $('.main-content') || document.body;
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
  }

  function boot() {
    bind();
    watch();
    applyAll();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      applyAll();
      if (($('#pmkWorkflowStrip') && $('.pmk-card-sync')) || attempts > 120) clearInterval(timer);
    }, 80);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
