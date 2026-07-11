'use strict';

(() => {
  if (globalThis.PMK_EXCLUSIVE_STATUS_ROUTER_V82_6) return;
  globalThis.PMK_EXCLUSIVE_STATUS_ROUTER_V82_6 = true;
  document.documentElement.dataset.pmkExclusiveWorkflow = '82.6';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const ledger = globalThis.PMK_STATUS_LEDGER_V80_API;
  const archiveApi = globalThis.PMK_COMPLETED_ARCHIVE_WORKFLOW_V82_API;
  const overrides = new Map();
  const previousEventMeta = globalThis.eventMeta;
  const previousUpdateEventStatus = globalThis.updateEventStatus;
  let scheduled = false;
  let observer = null;
  let rendering = false;

  const CATEGORY_BY_STATUS = {
    'pending-pickup': 'day',
    'picked-up': 'in-work',
    'in-progress': 'in-work',
    'pending-delivery': 'delivery-waiting',
    completed: 'completed',
    archived: 'archive',
  };

  function rawMeta(event) {
    return typeof previousEventMeta === 'function' ? previousEventMeta(event) : (event?.pmkData || {});
  }

  function eventKey(event, data = rawMeta(event)) {
    const explicit = String(data?.pmkId || event?._pmkId || event?.pmkData?.pmkId || '').trim();
    if (explicit) return `pmk:${explicit}`;
    try {
      const logical = ledger?.key?.(event, data);
      if (logical) return `logical:${logical}`;
    } catch {}
    return `id:${String(event?.id || '')}`;
  }

  function effectiveMeta(event) {
    const data = rawMeta(event);
    const override = overrides.get(eventKey(event, data));
    if (!override) return data;
    const next = { ...data, requestStatus: override.status };
    if (['picked-up', 'in-progress'].includes(override.status)) next.workStartedAt = data.workStartedAt || override.time;
    if (override.status === 'completed') next.completedAt = data.completedAt || override.time;
    return next;
  }

  if (typeof previousEventMeta === 'function') {
    globalThis.eventMeta = function eventMetaExclusiveV826(event) {
      return effectiveMeta(event);
    };
  }

  function allEvents() {
    try { return typeof getAllEvents === 'function' ? getAllEvents() : []; }
    catch { return []; }
  }

  function eventById(id) {
    return allEvents().find(event => String(event.id) === String(id)) || null;
  }

  function uniqueEvents(source = allEvents()) {
    const unique = new Map();
    source.forEach(event => {
      const key = eventKey(event);
      const current = unique.get(key);
      const stamp = new Date(event.updated || event.created || event.start?.dateTime || event.start || 0).getTime() || 0;
      const currentStamp = current ? (new Date(current.updated || current.created || current.start?.dateTime || current.start || 0).getTime() || 0) : -1;
      if (!current || stamp >= currentStamp) unique.set(key, event);
    });
    return [...unique.values()];
  }

  function categoryFor(event) {
    return CATEGORY_BY_STATUS[effectiveMeta(event).requestStatus] || 'day';
  }

  function selectedDayKey() {
    try { return state.selectedDayKey || businessTodayKey(); }
    catch { return ''; }
  }

  function eventsForCategory(category) {
    const unique = uniqueEvents();
    if (category === 'day') {
      const day = selectedDayKey();
      return unique.filter(event => categoryFor(event) === 'day' && (!day || eventDateKey(event) === day));
    }
    if (category === 'completed' || category === 'archive') {
      try {
        const split = globalThis.PMK_ARCHIVE_POLICY_V82_API && archiveApi?.completedEvents
          ? globalThis.PMK_ARCHIVE_POLICY_V82_API.split(archiveApi.completedEvents(), event => effectiveMeta(event).completedAt || event.updated || event.created || `${eventDateKey(event)}T23:59:59`, Date.now())
          : null;
        if (split) return uniqueEvents(category === 'completed' ? split.active : split.archived);
      } catch {}
    }
    return unique.filter(event => categoryFor(event) === category);
  }

  function optimisticRemove(logicalKey, nextCategory) {
    const selectors = [
      '#todayEvents [data-event-card]',
      '#inWorkGroups [data-event-card]',
      '#completedGroups [data-history-event]',
      '#archiveGroups [data-history-event]',
    ];
    selectors.forEach(selector => {
      $$(selector).forEach(card => {
        const id = card.dataset.eventCard || card.dataset.historyEvent;
        const event = eventById(id);
        if (!event || eventKey(event) !== logicalKey) return;
        const owner = card.closest('#todayEvents,#inWorkGroups,#completedGroups,#archiveGroups');
        const ownerCategory = owner?.id === 'todayEvents'
          ? (typeof state !== 'undefined' && state.currentView === 'delivery-waiting' ? 'delivery-waiting' : 'day')
          : owner?.id === 'inWorkGroups' ? 'in-work'
          : owner?.id === 'completedGroups' ? 'completed'
          : owner?.id === 'archiveGroups' ? 'archive'
          : '';
        if (ownerCategory && ownerCategory !== nextCategory) {
          const removable = card.closest('.in-work-card-wrap,.history-compact-card,.event-card') || card;
          removable.classList.add('pmk-status-moving-out');
          setTimeout(() => removable.remove(), 70);
        }
      });
    });
  }

  function renderWorkflowViews() {
    if (rendering) return;
    rendering = true;
    try {
      if (typeof renderAll === 'function') renderAll();
      globalThis.PMK_IN_WORK_WORKFLOW_V73_API?.render?.();
      globalThis.PMK_COMPLETED_ARCHIVE_WORKFLOW_V82_API?.render?.();
    } catch {}
    rendering = false;
    requestAnimationFrame(scrubAll);
  }

  function countSet(selector, value) {
    const node = $(selector);
    if (node) node.textContent = String(value);
  }

  function updateCounts() {
    const dayEvents = eventsForCategory('day');
    const inWork = eventsForCategory('in-work');
    const delivery = eventsForCategory('delivery-waiting');
    const completed = eventsForCategory('completed');
    const archived = eventsForCategory('archive');

    countSet('#todayCount', dayEvents.length);
    countSet('#deliveryWaitingCount', delivery.length);
    countSet('#inWorkCount', inWork.length);
    countSet('#completedCount', completed.length);
    countSet('#archiveCount', archived.length);
    countSet('#inWorkTotal', inWork.length);
    countSet('#completedTotal', completed.length);
    countSet('#archiveTotal', archived.length);

    if (typeof state !== 'undefined' && state.currentView === 'day') {
      countSet('#summaryTotal', dayEvents.length);
      countSet('#summaryPickup', dayEvents.filter(event => effectiveMeta(event).visitType === 'pickup').length);
      countSet('#summaryDelivery', dayEvents.filter(event => effectiveMeta(event).visitType === 'delivery').length);
      countSet('#summaryAttention', dayEvents.filter(event => {
        const data = effectiveMeta(event);
        return !data.phone || !displayAddress(data, event);
      }).length);
    }
    if (typeof state !== 'undefined' && state.currentView === 'delivery-waiting') {
      countSet('#summaryTotal', delivery.length);
      countSet('#summaryPickup', delivery.filter(event => effectiveMeta(event).visitType === 'pickup').length);
      countSet('#summaryDelivery', delivery.filter(event => effectiveMeta(event).visitType === 'delivery').length);
      countSet('#summaryAttention', delivery.filter(event => {
        const data = effectiveMeta(event);
        return !data.phone || !displayAddress(data, event);
      }).length);
    }
  }

  function scrubCards(containerSelector, category, attribute = 'eventCard') {
    const container = $(containerSelector);
    if (!container) return;
    const seen = new Set();
    $$(`[data-${attribute.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}]`, container).forEach(card => {
      const id = card.dataset[attribute];
      const event = eventById(id);
      if (!event) return;
      const key = eventKey(event);
      const correct = categoryFor(event) === category;
      const duplicate = seen.has(key);
      if (correct && !duplicate) {
        seen.add(key);
        return;
      }
      const removable = card.closest('.in-work-card-wrap,.history-compact-card,.event-card') || card;
      removable.remove();
    });
  }

  function scrubHistory(containerSelector) {
    const container = $(containerSelector);
    if (!container) return;
    const seen = new Set();
    $$('[data-history-event]', container).forEach(card => {
      const event = eventById(card.dataset.historyEvent);
      if (!event) return;
      const key = eventKey(event);
      if (seen.has(key)) card.remove();
      else seen.add(key);
    });
  }

  function setEmptyState(containerSelector, text) {
    const container = $(containerSelector);
    if (!container || container.querySelector('[data-event-card],[data-history-event]')) return;
    if (!container.querySelector('.empty-state')) container.innerHTML = `<div class="empty-state"><strong>${text}</strong></div>`;
  }

  function scrubAll() {
    scheduled = false;
    if (typeof state !== 'undefined') {
      if (state.currentView === 'day') scrubCards('#todayEvents', 'day');
      if (state.currentView === 'delivery-waiting') scrubCards('#todayEvents', 'delivery-waiting');
    }
    scrubCards('#inWorkGroups', 'in-work');
    scrubHistory('#completedGroups');
    scrubHistory('#archiveGroups');

    if (typeof state !== 'undefined' && state.currentView === 'day') setEmptyState('#todayEvents', 'Активных заявок на этот день нет.');
    if (typeof state !== 'undefined' && state.currentView === 'delivery-waiting') setEmptyState('#todayEvents', 'Ковров к выдаче сейчас нет.');
    setEmptyState('#inWorkGroups', 'Сейчас заказов в работе нет.');
    updateCounts();
  }

  function scheduleScrub() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(scrubAll);
  }

  async function exclusiveUpdateEventStatus(id, nextStatus) {
    const event = eventById(id);
    if (!event || typeof previousUpdateEventStatus !== 'function') return previousUpdateEventStatus?.(id, nextStatus);
    const key = eventKey(event);
    const previousStatus = effectiveMeta(event).requestStatus;
    const nextCategory = CATEGORY_BY_STATUS[nextStatus] || 'day';
    const time = new Date().toISOString();

    overrides.set(key, { status: nextStatus, time });
    optimisticRemove(key, nextCategory);
    renderWorkflowViews();
    updateCounts();

    try {
      const result = await previousUpdateEventStatus(id, nextStatus);
      setTimeout(() => {
        overrides.delete(key);
        renderWorkflowViews();
      }, 450);
      return result;
    } catch (error) {
      overrides.set(key, { status: previousStatus, time });
      renderWorkflowViews();
      setTimeout(() => {
        overrides.delete(key);
        renderWorkflowViews();
      }, 250);
      throw error;
    }
  }

  if (typeof previousUpdateEventStatus === 'function') {
    globalThis.updateEventStatus = exclusiveUpdateEventStatus;
  }

  function bind() {
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-status-event][data-status]');
      if (!button) return;
      const card = button.closest('[data-event-card]');
      if (card) card.classList.add('pmk-status-transitioning');
    }, true);

    ['pmk-status-ledger-updated', 'pmk-calendar-sync-done', 'pmk-yandex-sync-done', 'popstate', 'storage']
      .forEach(name => globalThis.addEventListener(name, () => {
        renderWorkflowViews();
        scheduleScrub();
      }));
  }

  function watch() {
    if (observer) return;
    const root = $('.main-content') || document.body;
    observer = new MutationObserver(scheduleScrub);
    observer.observe(root, { childList: true, subtree: true });
  }

  function boot() {
    bind();
    watch();
    renderWorkflowViews();
    scheduleScrub();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
