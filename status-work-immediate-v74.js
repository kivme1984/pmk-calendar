'use strict';

(() => {
  if (window.PMK_STATUS_WORK_IMMEDIATE_V75) return;
  window.PMK_STATUS_WORK_IMMEDIATE_V75 = true;

  const OVERRIDES_KEY = 'pmk-status-overrides-v74';
  const WORK_STATUSES = new Set(['picked-up', 'in-progress']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const previousEventMeta = eventMeta;
  const previousRenderToday = renderToday;
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

  function contractNumber(data = {}) {
    return String(data.contractNumber || '').replace(/^\s*[№#]\s*/, '').trim();
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

  eventMeta = function eventMetaWithStatusOverrideV75(event) {
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

  function notInWork(event) {
    return !WORK_STATUSES.has(eventMeta(event).requestStatus);
  }

  renderToday = function renderTodayWithoutWorkV75(events = []) {
    return previousRenderToday((events || []).filter(notInWork));
  };

  function renderDayWithoutWork() {
    if (state.currentView !== 'day') return;
    const events = getAllEvents().filter(event => eventDateKey(event) === state.selectedDayKey && notInWork(event));
    $('#todayCount').textContent = String(events.length);
    $('#summaryTotal').textContent = String(events.length);
    $('#summaryPickup').textContent = String(events.filter(event => eventMeta(event).visitType === 'pickup').length);
    $('#summaryDelivery').textContent = String(events.filter(event => eventMeta(event).visitType === 'delivery').length);
    $('#summaryAttention').textContent = String(events.filter(event => !eventMeta(event).phone || !displayAddress(eventMeta(event), event)).length);
    renderToday(events);
  }

  renderAll = function renderAllWithImmediateWorkV75() {
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
    dialog.addEventListener('submit', async event => {
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
      await applyStatus(id, status, { contractOverride:number, skipContractCheck:true });
    });
    return dialog;
  }

  function requestContract(event, data, nextStatus) {
    const dialog = contractDialog();
    dialog.dataset.eventId = event.id;
    dialog.dataset.nextStatus = nextStatus;
    $('#pmkContractRequiredText').textContent = `${data.customerName || 'У заявки'} не указан номер договора. До его внесения заказ не будет переведён во вкладку «В работе».`;
    const input = $('#pmkContractRequiredInput');
    input.value = contractNumber(data);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    requestAnimationFrame(() => input.focus());
    showToast('Для статуса «Забрали» обязателен номер договора.', 'error');
  }

  async function applyStatus(id, nextStatus, options = {}) {
    if (busy) return;
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');

    const current = eventMeta(event);
    const resolvedContract = options.contractOverride || contractNumber(current);
    if (WORK_STATUSES.has(nextStatus) && !resolvedContract && !options.skipContractCheck) {
      requestContract(event, current, nextStatus);
      return;
    }

    busy = true;
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
    renderAll();
    document.querySelector(`[data-event-card="${CSS.escape(id)}"]`)?.remove();

    try {
      const results = await saveStatus(event, nextData);
      if (!results.length) {
        await previousUpdateEventStatus(id, nextStatus);
      } else if (!results.some(item => item.ok)) {
        const message = results.map(item => item.error?.message).filter(Boolean).join(' ');
        showToast(message || 'Статус сохранён локально и будет отправлен позже.', 'error');
      } else {
        const label = statusInfo(nextStatus, nextData.visitType).label;
        showToast(WORK_STATUSES.has(nextStatus) ? `Договор № ${resolvedContract}. Заказ перенесён во «В работе».` : `Статус: ${label}`, 'success');
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