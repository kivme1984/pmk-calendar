'use strict';

(() => {
  if (globalThis.PMK_STATUS_PIPELINE_V81) return;
  globalThis.PMK_STATUS_PIPELINE_V81 = true;

  const WORK_STATUSES = new Set(['picked-up', 'in-progress']);
  const HIDDEN_STATUSES = new Set(['picked-up', 'in-progress', 'completed']);
  const inFlight = new Set();
  const ledger = globalThis.PMK_STATUS_LEDGER_V80_API;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function contractNumber(data = {}) {
    return String(data.contractNumber || '').replace(/^\s*[№#]\s*/, '').trim();
  }

  function statusLabel(status, visitType = 'pickup') {
    try { return statusInfo(status, visitType).label; }
    catch {
      if (status === 'completed') return 'Выполнено';
      if (status === 'picked-up') return 'Забрали';
      if (status === 'pending-delivery') return 'Ожидает доставки';
      return 'Статус изменён';
    }
  }

  function findEvent(id) {
    return getAllEvents().find(item => String(item.id) === String(id)) || null;
  }

  function prepareTransition(event, nextStatus, options = {}) {
    const current = eventMeta(event);
    const now = options.now || new Date().toISOString();
    const resolvedContract = options.contractOverride || contractNumber(current);
    const pmkId = ledger.stablePmkId(event, current);
    return {
      current,
      nextData: {
        ...current,
        eventId: event.id,
        pmkId,
        contractNumber: resolvedContract || current.contractNumber || '',
        requestStatus: nextStatus,
        workStartedAt: WORK_STATUSES.has(nextStatus) ? (current.workStartedAt || now) : (current.workStartedAt || ''),
        completedAt: nextStatus === 'completed' ? (current.completedAt || now) : '',
      },
      resolvedContract,
      now,
    };
  }

  function patchEventObject(event, data) {
    const keep = {
      id: event.id,
      _provider: event._provider,
      _providers: event._providers,
      _pmkId: data.pmkId,
      _yandexMirror: event._yandexMirror,
      htmlLink: event.htmlLink,
    };
    let body = null;
    try { body = toGoogleEvent(data); } catch { body = null; }
    if (body) Object.assign(event, body);
    Object.assign(event, keep);
    event.pmkData = { ...(event.pmkData || {}), ...data };
    event.updated = new Date().toISOString();
    return event;
  }

  function patchMatchingEvents(sourceEvent, sourceData, nextData) {
    let localChanged = false;
    getAllEvents().forEach(event => {
      const data = eventMeta(event);
      if (!ledger.sameLogical(sourceEvent, sourceData, event, data)) return;
      patchEventObject(event, { ...data, ...nextData, eventId:event.id });
      if (String(event.id || '').startsWith('local-') && event._provider !== 'yandex') localChanged = true;
    });
    if (localChanged && typeof persistLocalEvents === 'function') persistLocalEvents();
    if (typeof invalidateEventCaches === 'function') invalidateEventCaches();
  }

  function activeList() {
    const all = getAllEvents();
    if (state.currentView === 'delivery-waiting') return all.filter(event => eventMeta(event).requestStatus === 'pending-delivery');
    return all.filter(event => eventDateKey(event) === state.selectedDayKey && !HIDDEN_STATUSES.has(eventMeta(event).requestStatus));
  }

  function updateVisibleCounters() {
    if (state.currentView !== 'day' && state.currentView !== 'delivery-waiting') return;
    const all = getAllEvents();
    const list = activeList();
    const map = {
      todayCount: state.currentView === 'day' ? list.length : null,
      deliveryWaitingCount: all.filter(event => eventMeta(event).requestStatus === 'pending-delivery').length,
      summaryTotal: list.length,
      summaryPickup: list.filter(event => eventMeta(event).visitType === 'pickup').length,
      summaryDelivery: list.filter(event => eventMeta(event).visitType === 'delivery').length,
      summaryAttention: list.filter(event => !eventMeta(event).phone || !displayAddress(eventMeta(event), event)).length,
    };
    Object.entries(map).forEach(([id, value]) => {
      const node = $(`#${id}`);
      if (node && value != null) node.textContent = String(value);
    });
  }

  function buttonFor(id, status) {
    return $$('[data-status-event][data-status]').find(button => button.dataset.statusEvent === String(id) && button.dataset.status === status) || null;
  }

  function emptyMessageForCurrentView() {
    return state.currentView === 'delivery-waiting'
      ? '<div class="empty-state"><strong>Заявок, ожидающих доставки, нет.</strong></div>'
      : '<div class="empty-state"><strong>Активных заявок на этот день нет.</strong><br>Забранные и выполненные заявки находятся в отдельных разделах.</div>';
  }

  function removeCardNextPaint(card) {
    if (!card) return;
    const container = card.parentElement;
    card.classList.add('pmk-card-action-removing-fast');
    requestAnimationFrame(() => {
      card.remove();
      if (container && !container.querySelector('.event-card,[data-event-card]')) container.innerHTML = emptyMessageForCurrentView();
    });
  }

  function afterVisualAction(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  }

  function immediateFeedback(event, nextStatus, button) {
    const label = statusLabel(nextStatus, eventMeta(event).visitType);
    const target = button || buttonFor(event.id, nextStatus);
    if (target) {
      target.dataset.originalText ||= target.textContent;
      target.disabled = true;
      target.classList.add('pmk-status-accepted');
      target.textContent = '✓ Принято';
    }
    const card = target?.closest('.event-card') || $(`[data-event-card="${CSS.escape(String(event.id))}"]`);
    if (card && HIDDEN_STATUSES.has(nextStatus)) {
      const confirmation = document.createElement('div');
      confirmation.className = 'pmk-card-action-confirmation';
      confirmation.textContent = `✓ ${label}`;
      card.appendChild(confirmation);
      removeCardNextPaint(card);
    }
    showToast(`✓ ${label}. Действие принято.`, 'success');
    return card;
  }

  function contractDialog() {
    let dialog = $('#pmkContractRequiredDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'pmkContractRequiredDialog';
    dialog.className = 'pmk-contract-required-dialog';
    dialog.innerHTML = '<form method="dialog" class="pmk-contract-required-shell"><button type="button" class="pmk-contract-required-close" aria-label="Закрыть">×</button><span class="pmk-contract-required-icon">№</span><h2>Сначала укажите номер договора</h2><p id="pmkContractRequiredText"></p><label>Номер договора<input id="pmkContractRequiredInput" inputmode="numeric" autocomplete="off" placeholder="Например, 453"></label><small>Номер нужен, чтобы курьер и фабрика видели, какой договор принят в работу.</small><div class="pmk-contract-required-actions"><button type="button" class="button button-secondary" data-contract-required-cancel>Отмена</button><button type="submit" class="button button-primary">Сохранить и перенести</button></div></form>';
    document.body.appendChild(dialog);
    $('.pmk-contract-required-close', dialog).addEventListener('click', () => dialog.close());
    $('[data-contract-required-cancel]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('submit', event => {
      event.preventDefault();
      const input = $('#pmkContractRequiredInput');
      const number = contractNumber({ contractNumber:input.value });
      if (!number) {
        input.classList.add('invalid');
        input.focus();
        return showToast('Введите номер договора.', 'error');
      }
      const id = dialog.dataset.eventId;
      const status = dialog.dataset.nextStatus || 'picked-up';
      dialog.close();
      applyStatus(id, status, { contractOverride:number, skipContractCheck:true });
    });
    return dialog;
  }

  function requestContract(event, nextStatus) {
    const data = eventMeta(event);
    const dialog = contractDialog();
    dialog.dataset.eventId = event.id;
    dialog.dataset.nextStatus = nextStatus;
    $('#pmkContractRequiredText').textContent = `${data.customerName || 'У заявки'} не указан номер договора. До его внесения заказ не будет переведён в работу.`;
    const input = $('#pmkContractRequiredInput');
    input.value = contractNumber(data);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    requestAnimationFrame(() => input.focus());
  }

  async function saveInBackground(event, nextData) {
    const api = globalThis.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72_API;
    if (typeof api?.saveToAvailableProviders === 'function') {
      const result = await api.saveToAvailableProviders(nextData, event.id);
      return result.results || [];
    }
    return [];
  }

  function scheduleSecondaryViews() {
    const run = () => {
      globalThis.PMK_COMPLETED_WORKFLOW_V80_API?.render?.();
      globalThis.PMK_IN_WORK_WORKFLOW_V73_API?.render?.();
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout:700 });
    else setTimeout(run, 80);
  }

  function persistTransition(event, nextData, flightKey) {
    setTimeout(async () => {
      try {
        const results = await saveInBackground(event, nextData);
        if (!results.length && String(event.id || '').startsWith('local-') && event._provider !== 'yandex') {
          patchMatchingEvents(event, nextData, nextData);
          if (typeof persistLocalEvents === 'function') persistLocalEvents();
        }
        if (results.length && !results.some(item => item.ok)) {
          const message = results.map(item => item.error?.message).filter(Boolean).join(' ');
          showToast(message || 'Изменение сохранено на устройстве и будет отправлено позже.', 'error');
        }
        try { await refreshEvents(); } catch {}
        scheduleSecondaryViews();
      } catch (error) {
        showToast(error?.message || 'Изменение сохранено на устройстве и будет отправлено позже.', 'error');
        scheduleSecondaryViews();
      } finally {
        inFlight.delete(flightKey);
      }
    }, 40);
  }

  function applyStatus(id, nextStatus, options = {}) {
    const event = findEvent(id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    const current = eventMeta(event);
    const flightKey = ledger.key(event, current);
    if (inFlight.has(flightKey)) return;

    const transition = prepareTransition(event, nextStatus, options);
    if (WORK_STATUSES.has(nextStatus) && !transition.resolvedContract && !options.skipContractCheck) {
      requestContract(event, nextStatus);
      return;
    }

    inFlight.add(flightKey);
    ledger.mark(event, transition.nextData, nextStatus, {
      updatedAt:transition.now,
      contractNumber:transition.nextData.contractNumber,
      workStartedAt:transition.nextData.workStartedAt,
      completedAt:transition.nextData.completedAt,
    });
    immediateFeedback(event, nextStatus, options.sourceButton);
    afterVisualAction(() => {
      patchMatchingEvents(event, transition.current, transition.nextData);
      updateVisibleCounters();
      scheduleSecondaryViews();
      persistTransition(event, transition.nextData, flightKey);
    });
  }

  globalThis.updateEventStatus = applyStatus;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-status-event][data-status]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyStatus(button.dataset.statusEvent, button.dataset.status, { sourceButton:button });
  }, true);

  globalThis.PMK_STATUS_PIPELINE_V81_API = {
    applyStatus,
    prepareTransition,
    patchMatchingEvents,
    removeCardNextPaint,
    afterVisualAction,
    hiddenStatuses:HIDDEN_STATUSES,
  };
})();