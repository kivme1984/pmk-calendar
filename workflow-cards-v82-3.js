'use strict';

(() => {
  if (globalThis.PMK_WORKFLOW_CARDS_V82_3) return;
  globalThis.PMK_WORKFLOW_CARDS_V82_3 = true;

  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const YANDEX_CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
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
    if (typeof getAllEvents !== 'function' || typeof eventMeta !== 'function') return { work: 0, delivery: 0, completed: 0 };
    const all = getAllEvents();
    return {
      work: all.filter(event => ['picked-up', 'in-progress'].includes(eventMeta(event).requestStatus)).length,
      delivery: all.filter(event => eventMeta(event).requestStatus === 'pending-delivery').length,
      completed: globalThis.PMK_COMPLETED_ARCHIVE_WORKFLOW_V82_API?.completedEvents?.().length
        ?? all.filter(event => eventMeta(event).requestStatus === 'completed').length,
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
      if (button.classList.contains('active') !== active) button.classList.toggle('active', active);
    });
  }

  function applyAll() {
    scheduled = false;
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
      schedule();
    }, 35);
  }

  function bind() {
    document.addEventListener('click', event => {
      if (event.target.closest('[data-status-event][data-status]')) setTimeout(rerenderWorkflowViews, 0);
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
