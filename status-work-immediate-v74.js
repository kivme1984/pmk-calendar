'use strict';

(() => {
  if (window.PMK_STATUS_WORK_IMMEDIATE_V77) return;
  window.PMK_STATUS_WORK_IMMEDIATE_V77 = true;

  const OVERRIDES_KEY = 'pmk-status-overrides-v74';
  const WORK_STATUSES = new Set(['picked-up', 'in-progress']);
  const HIDDEN_DAY_STATUSES = new Set(['picked-up', 'in-progress', 'completed']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const previousEventMeta = eventMeta;
  const previousRenderToday = renderToday;
  const previousRenderAll = renderAll;
  const previousUpdateEventStatus = updateEventStatus;
  const inFlight = new Set();
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

  function contractNumber(data = {}) {
    return String(data.contractNumber || '').replace(/^\s*[№#]\s*/, '').trim();
  }

  function statusLabel(status, visitType = 'pickup') {
    try { return statusInfo(status, visitType).label; }
    catch { return status === 'completed' ? 'Выполнено' : status === 'picked-up' ? 'Забрали' : 'Статус изменён'; }
  }

  function setOverride(event, data, nextStatus, workStartedAt = '', contract = '') {
    const key = keyFor(event, data);
    if (!key) return;
    overrides[key] = {
      status: nextStatus,
      workStartedAt: workStartedAt || data.workStartedAt || '',
      contractNumber: contract || contractNumber(data),
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
      const statusReady = base.requestStatus === override.status;
      const timeReady = !override.workStartedAt || base.workStartedAt === override.workStartedAt;
      const contractReady = !override.contractNumber || contractNumber(base) === override.contractNumber;
      if (statusReady && timeReady && contractReady) {
        delete overrides[key];
        changed = true;
      }
    });
    if (changed) persistOverrides();
  }

  eventMeta = function eventMetaWithStatusOverrideV77(event) {
    const base = previousEventMeta(event);
    const override = overrides[keyFor(event, base)];
    if (!override) return base;
    return {
      ...base,
      requestStatus: override.status || base.requestStatus,
      workStartedAt: override.workStartedAt || base.workStartedAt || '',
      contractNumber: override.contractNumber || base.contractNumber || '',
    };
  };

  function visibleInDay(event) {
    return !HIDDEN_DAY_STATUSES.has(eventMeta(event).requestStatus);
  }

  renderToday = function renderTodayActiveOnlyV77(events = []) {
    return previousRenderToday((events || []).filter(visibleInDay));
  };

  function activeDayEvents() {
    return getAllEvents().filter(event => eventDateKey(event) === state.selectedDayKey && visibleInDay(event));
  }

  function updateDayCountersOnly() {
    if (state.currentView !== 'day') return;
    const events = activeDayEvents();
    const values = {
      todayCount: events.length,
      summaryTotal: events.length,
      summaryPickup: events.filter(event => eventMeta(event).visitType === 'pickup').length,
      summaryDelivery: events.filter(event => eventMeta(event).visitType === 'delivery').length,
      summaryAttention: events.filter(event => !eventMeta(event).phone || !displayAddress(eventMeta(event), event)).length,
    };
    Object.entries(values).forEach(([id, value]) => {
      const node = $(`#${id}`);
      if (node) node.textContent = String(value);
    });
  }

  function renderDayActiveOnly() {
    if (state.currentView !== 'day') return;
    const events = activeDayEvents();
    updateDayCountersOnly();
    renderToday(events);
  }

  renderAll = function renderAllWithActiveDayV77() {
    previousRenderAll();
    renderDayActiveOnly();
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

  function findStatusButton(id, status) {
    return $$('[data-status-event][data-status]').find(button => button.dataset.statusEvent === id && button.dataset.status === status) || null;
  }

  function cardFor(button, id) {
    return button?.closest('.event-card') || $$('[data-event-card]').find(card => card.dataset.eventCard === id) || null;
  }

  function showImmediateAcceptance(button, id, nextStatus, visitType) {
    const label = statusLabel(nextStatus, visitType);
    const target = button || findStatusButton(id, nextStatus);
    if (target) {
      target.dataset.originalText ||= target.textContent;
      target.classList.add('pmk-status-accepted');
      target.disabled = true;
      target.textContent = '✓ Принято';
    }

    const card = cardFor(target, id);
    if (card) {
      card.classList.add('pmk-card-action-accepted');
      const confirmation = document.createElement('div');
      confirmation.className = 'pmk-card-action-confirmation';
      confirmation.textContent = `✓ ${label}`;
      card.appendChild(confirmation);
      requestAnimationFrame(() => card.classList.add('pmk-card-action-removing'));
      setTimeout(() => {
        card.remove();
        updateDayCountersOnly();
        const list = $('#todayList');
        if (list && !list.querySelector('.event-card') && state.currentView === 'day') {
          list.innerHTML = '<div class="empty-state"><strong>Активных заявок на этот день нет.</strong><br>Забранные и выполненные заказы убраны из рабочей ленты.</div>';
        }
      }, 190);
    }

    showToast(`✓ ${label}. Действие принято, синхронизация идёт в фоне.`, 'success');
  }

  function restoreVisibleButton(id, nextStatus) {
    const button = findStatusButton(id, nextStatus);
    if (!button) return;
    button.disabled = false;
    button.classList.remove('pmk-status-accepted');
    button.textContent = button.dataset.originalText || statusLabel(nextStatus);
  }

  function contractDialog() {
    let dialog = $('#pmkContractRequiredDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'pmkContractRequiredDialog';
    dialog.className = 'pmk-contract-required-dialog';
    dialog.innerHTML = `
      <form method="dialog" class="pmk-contract-required-shell">
        <button type="button" class="pmk-contract-required-close" aria-label="Закрыть">×</button>
        <span class="pmk-contract-required-icon">№</span>
        <h2>Сначала укажите номер договора</h2>
        <p id="pmkContractRequiredText">Без номера договора заказ нельзя отметить как забранный.</p>
        <label>Номер договора
          <input id="pmkContractRequiredInput" inputmode="numeric" autocomplete="off" placeholder="Например, 453">
        </label>
        <small>Номер нужен, чтобы курьер и фабрика точно видели, какой договор принят в работу.</small>
        <div class="pmk-contract-required-actions">
          <button type="button" class="button button-secondary" data-contract-required-cancel>Отмена</button>
          <button type="submit" class="button button-primary">Сохранить и перенести</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);
    $('.pmk-contract-required-close', dialog).addEventListener('click', () => dialog.close());
    $('[data-contract-required-cancel]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('submit', event => {
      event.preventDefault();
      const input = $('#pmkContractRequiredInput');
      const number = contractNumber({ contractNumber: input.value });
      if (!number) {
        input.focus();
        input.classList.add('invalid');
        return showToast('Введите номер договора.', 'error');
      }
      input.classList.remove('invalid');
      const id = dialog.dataset.eventId;
      const status = dialog.dataset.nextStatus || 'picked-up';
      dialog.close();
      applyStatus(id, status, { contractOverride:number, skipContractCheck:true });
    });
    return dialog;
  }

  function requestContract(event, data, nextStatus, button) {
    const target = button || findStatusButton(event.id, nextStatus);
    if (target) {
      target.classList.add('pmk-status-needs-contract');
      target.textContent = 'Нужен № договора';
      setTimeout(() => {
        target.classList.remove('pmk-status-needs-contract');
        target.textContent = target.dataset.originalText || statusLabel(nextStatus, data.visitType);
      }, 1200);
    }
    const dialog = contractDialog();
    dialog.dataset.eventId = event.id;
    dialog.dataset.nextStatus = nextStatus;
    $('#pmkContractRequiredText').textContent = `${data.customerName || 'У заявки'} не указан номер договора. До его внесения заказ не будет переведён во вкладку «В работе».`;
    const input = $('#pmkContractRequiredInput');
    input.value = contractNumber(data);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    requestAnimationFrame(() => input.focus());
  }

  function persistInBackground(event, nextData, id, nextStatus) {
    setTimeout(async () => {
      try {
        const results = await saveStatus(event, nextData);
        if (!results.length) {
          await previousUpdateEventStatus(id, nextStatus);
        } else if (!results.some(item => item.ok)) {
          const message = results.map(item => item.error?.message).filter(Boolean).join(' ');
          showToast(message || 'Изменение сохранено на устройстве и будет отправлено позже.', 'error');
        }

        try { await refreshEvents(); } catch {}
        reconcileOverrides();
        invalidateEventCaches();
        requestAnimationFrame(() => {
          renderDayActiveOnly();
          window.PMK_IN_WORK_WORKFLOW_V73_API?.render?.();
        });
      } catch (error) {
        showToast(error?.message || 'Изменение сохранено на устройстве и будет отправлено позже.', 'error');
      } finally {
        inFlight.delete(keyFor(event, nextData) || id);
        if (!HIDDEN_DAY_STATUSES.has(nextStatus)) restoreVisibleButton(id, nextStatus);
      }
    }, 0);
  }

  function applyStatus(id, nextStatus, options = {}) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');

    const current = eventMeta(event);
    const flightKey = keyFor(event, current) || id;
    if (inFlight.has(flightKey)) return;

    const sourceButton = options.sourceButton || findStatusButton(id, nextStatus);
    const resolvedContract = options.contractOverride || contractNumber(current);
    if (WORK_STATUSES.has(nextStatus) && !resolvedContract && !options.skipContractCheck) {
      requestContract(event, current, nextStatus, sourceButton);
      return;
    }

    inFlight.add(flightKey);
    const workStartedAt = WORK_STATUSES.has(nextStatus)
      ? (current.workStartedAt || new Date().toISOString())
      : current.workStartedAt || '';
    const nextData = {
      ...current,
      eventId: id,
      pmkId: current.pmkId || event._pmkId || makeId(),
      contractNumber: resolvedContract || current.contractNumber || '',
      requestStatus: nextStatus,
      workStartedAt,
    };

    setOverride(event, nextData, nextStatus, workStartedAt, resolvedContract);
    invalidateEventCaches();

    if (HIDDEN_DAY_STATUSES.has(nextStatus)) {
      showImmediateAcceptance(sourceButton, id, nextStatus, nextData.visitType);
      updateDayCountersOnly();
      requestAnimationFrame(() => window.PMK_IN_WORK_WORKFLOW_V73_API?.render?.());
    } else {
      const target = sourceButton || findStatusButton(id, nextStatus);
      if (target) {
        target.dataset.originalText ||= target.textContent;
        target.classList.add('pmk-status-accepted');
        target.disabled = true;
        target.textContent = '✓ Принято';
      }
      showToast(`✓ ${statusLabel(nextStatus, nextData.visitType)}. Действие принято.`, 'success');
    }

    persistInBackground(event, nextData, id, nextStatus);
  }

  updateEventStatus = applyStatus;

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-status-event][data-status]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyStatus(button.dataset.statusEvent, button.dataset.status, { sourceButton:button });
  }, true);

  window.addEventListener('pmk-calendar-sync-done', () => {
    reconcileOverrides();
    invalidateEventCaches();
    requestAnimationFrame(() => {
      renderDayActiveOnly();
      window.PMK_IN_WORK_WORKFLOW_V73_API?.render?.();
    });
  });

  requestAnimationFrame(() => {
    reconcileOverrides();
    renderDayActiveOnly();
    window.PMK_IN_WORK_WORKFLOW_V73_API?.render?.();
  });
})();