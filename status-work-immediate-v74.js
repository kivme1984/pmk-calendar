'use strict';

(() => {
  if (window.PMK_STATUS_WORK_IMMEDIATE_V74) return;
  window.PMK_STATUS_WORK_IMMEDIATE_V74 = true;

  const OVERRIDES_KEY = 'pmk-status-overrides-v74';
  const $ = (selector, root = document) => root.querySelector(selector);
  const previousEventMeta = eventMeta;
  const previousRenderAll = renderAll;
  const previousUpdateEventStatus = updateEventStatus;
  let busy = false;
  let overrides = loadOverrides();

  function loadOverrides() {
    try {
      const value = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch { return {}; }
  }

  function persistOverrides() {
    try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides)); } catch {}
  }

  function keyFor(event, data = {}) {
    return String(data.pmkId || event?._pmkId || event?.id || '').trim();
  }

  function setOverride(event, data, nextStatus, workStartedAt = '') {
    const key = keyFor(event, data);
    if (!key) return;
    overrides[key] = {
      status: nextStatus,
      workStartedAt: workStartedAt || data.workStartedAt || '',
      updatedAt: new Date().toISOString(),
    };
    persistOverrides();
  }

  function reconcileOverrides() {
    let changed = false;
    getAllEvents().forEach(event => {
      const base = previousEventMeta(event);
      const key = keyFor(event, base);
      const override = overrides[key];
      if (!override) return;
      if (base.requestStatus === override.status && (!override.workStartedAt || base.workStartedAt === override.workStartedAt)) {
        delete overrides[key];
        changed = true;
      }
    });
    if (changed) persistOverrides();
  }

  eventMeta = function eventMetaWithStatusOverrideV74(event) {
    const base = previousEventMeta(event);
    const override = overrides[keyFor(event, base)];
    if (!override) return base;
    return {
      ...base,
      requestStatus: override.status || base.requestStatus,
      workStartedAt: override.workStartedAt || base.workStartedAt || '',
    };
  };

  function renderDayWithoutWork() {
    if (state.currentView !== 'day') return;
    const events = getAllEvents().filter(event => {
      const data = eventMeta(event);
      return eventDateKey(event) === state.selectedDayKey && !['picked-up', 'in-progress'].includes(data.requestStatus);
    });
    $('#todayCount').textContent = String(events.length);
    $('#summaryTotal').textContent = String(events.length);
    $('#summaryPickup').textContent = String(events.filter(event => eventMeta(event).visitType === 'pickup').length);
    $('#summaryDelivery').textContent = String(events.filter(event => eventMeta(event).visitType === 'delivery').length);
    $('#summaryAttention').textContent = String(events.filter(event => !eventMeta(event).phone || !displayAddress(eventMeta(event), event)).length);
    renderToday(events);
  }

  renderAll = function renderAllWithImmediateWorkV74() {
    previousRenderAll();
    renderDayWithoutWork();
    window.PMK_IN_WORK_WORKFLOW_V73_API?.render?.();
  };

  function patchLocalEvent(event, nextData) {
    if (!event?.id?.startsWith('local-')) return false;
    const googleEvent = toGoogleEvent(nextData);
    state.localEvents = state.localEvents.map(item => item.id === event.id ? {
      ...item,
      ...googleEvent,
      updated: new Date().toISOString(),
    } : item);
    persistLocalEvents();
    return true;
  }

  async function saveStatus(event, nextData) {
    const api = window.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72_API;
    if (typeof api?.saveToAvailableProviders === 'function') {
      const result = await api.saveToAvailableProviders(nextData, event.id);
      if (result.results.length) return result.results;
    }
    if (patchLocalEvent(event, nextData)) return [{ provider:'Устройство', ok:true }];
    return [];
  }

  async function applyStatus(id, nextStatus) {
    if (busy) return;
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');

    busy = true;
    const current = eventMeta(event);
    const workStartedAt = ['picked-up', 'in-progress'].includes(nextStatus)
      ? (current.workStartedAt || new Date().toISOString())
      : current.workStartedAt || '';
    const nextData = {
      ...current,
      eventId: id,
      pmkId: current.pmkId || event._pmkId || makeId(),
      requestStatus: nextStatus,
      workStartedAt,
    };

    setOverride(event, nextData, nextStatus, workStartedAt);
    invalidateEventCaches();
    renderAll();

    try {
      const results = await saveStatus(event, nextData);
      if (!results.length) {
        await previousUpdateEventStatus(id, nextStatus);
      } else if (!results.some(item => item.ok)) {
        const message = results.map(item => item.error?.message).filter(Boolean).join(' ');
        showToast(message || 'Статус сохранён локально и будет отправлен позже.', 'error');
      } else {
        const label = statusInfo(nextStatus, nextData.visitType).label;
        showToast(['picked-up','in-progress'].includes(nextStatus) ? 'Заказ перенесён во вкладку «В работе».' : `Статус: ${label}`, 'success');
      }

      try { await refreshEvents(); } catch {}
      reconcileOverrides();
      invalidateEventCaches();
      renderAll();
    } catch (error) {
      showToast(error?.message || 'Статус сохранён локально и будет отправлен позже.', 'error');
      invalidateEventCaches();
      renderAll();
    } finally {
      busy = false;
    }
  }

  updateEventStatus = applyStatus;

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-status-event][data-status]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyStatus(button.dataset.statusEvent, button.dataset.status);
  }, true);

  window.addEventListener('pmk-calendar-sync-done', () => {
    reconcileOverrides();
    invalidateEventCaches();
    renderAll();
  });

  requestAnimationFrame(() => {
    reconcileOverrides();
    renderDayWithoutWork();
    window.PMK_IN_WORK_WORKFLOW_V73_API?.render?.();
  });
})();