'use strict';

(() => {
  if (window.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72) return;
  window.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72 = true;

  const CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const DEFAULT_API_URL = 'https://lucky-math-8e63pmk-address.standart-media.workers.dev/calendar';
  const YANDEX_PREFIX = 'local-yandex-';

  const previous = {
    saveRequest,
    updateEventStatus,
    updateEventContract,
    deleteEvent,
  };

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function yandexConfig() {
    return {
      enabled: true,
      apiUrl: DEFAULT_API_URL,
      syncToken: '',
      ...(readJson(CONFIG_KEY, {}) || {}),
    };
  }

  function yandexConfigured() {
    const config = yandexConfig();
    return Boolean(config.enabled && config.apiUrl && config.syncToken);
  }

  async function yandexRequest(path, options = {}) {
    const config = yandexConfig();
    if (!yandexConfigured()) throw new Error('Яндекс.Календарь не настроен.');
    const response = await fetch(`${String(config.apiUrl).replace(/\/+$/, '')}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.syncToken}`,
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; }
    catch { payload = text ? { error: text } : null; }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('Яндекс: неверный ключ синхронизации.');
      throw new Error(payload?.error || `Яндекс.Календарь: ошибка ${response.status}`);
    }
    return payload;
  }

  function pmkData(event) {
    try { return decodePmkData(event) || event?.pmkData || null; }
    catch { return event?.pmkData || null; }
  }

  function pmkIdOf(event) {
    return String(pmkData(event)?.pmkId || event?._pmkId || '').trim();
  }

  function ensurePmkId(data = {}, event = null) {
    return String(data.pmkId || pmkIdOf(event) || qs('#eventId')?.dataset?.pmkId || makeId());
  }

  function isYandexEvent(event) {
    return Boolean(event?._provider === 'yandex' || String(event?.id || '').startsWith(YANDEX_PREFIX));
  }

  function findGoogleEvent(pmkId, preferredId = '') {
    const events = state.events || [];
    if (preferredId && !String(preferredId).startsWith('local-')) {
      const direct = events.find(event => event.id === preferredId && !isYandexEvent(event));
      if (direct) return direct;
    }
    return events.find(event => !isYandexEvent(event) && pmkIdOf(event) === pmkId && !String(event.id || '').startsWith('local-')) || null;
  }

  function queue(provider, op, data) {
    const pmkId = String(data?.pmkId || '');
    if (!pmkId) return;
    const items = readJson(QUEUE_KEY, []);
    const next = (Array.isArray(items) ? items : []).filter(item => !(item?.provider === provider && item?.pmkId === pmkId));
    next.push({ provider, op, pmkId, data: op === 'upsert' ? data : null, savedAt: new Date().toISOString() });
    writeJson(QUEUE_KEY, next.slice(-300));
  }

  function removeQueued(provider, pmkId) {
    const items = readJson(QUEUE_KEY, []);
    writeJson(QUEUE_KEY, (Array.isArray(items) ? items : []).filter(item => !(item?.provider === provider && item?.pmkId === pmkId)));
  }

  async function upsertGoogle(data, preferredId = '') {
    if (!state.token) throw new Error('Google Calendar не подключён.');
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const existing = findGoogleEvent(data.pmkId, preferredId);
    const path = existing
      ? `/calendars/${calendarId}/events/${encodeURIComponent(existing.id)}`
      : `/calendars/${calendarId}/events`;
    const result = await googleRequest(path, {
      method: existing ? 'PATCH' : 'POST',
      body: JSON.stringify(toGoogleEvent(data)),
    });
    removeQueued('google', data.pmkId);
    return result;
  }

  async function upsertYandex(data) {
    const result = await yandexRequest(`/events/${encodeURIComponent(data.pmkId)}`, {
      method: 'PUT',
      body: JSON.stringify({ event: toGoogleEvent(data), pmkData: data }),
    });
    removeQueued('yandex', data.pmkId);
    return result;
  }

  async function deleteGoogle(pmkId, preferredId = '') {
    if (!state.token) throw new Error('Google Calendar не подключён.');
    const event = findGoogleEvent(pmkId, preferredId);
    if (!event) return null;
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const result = await googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(event.id)}`, { method: 'DELETE' });
    removeQueued('google', pmkId);
    return result;
  }

  async function deleteYandex(pmkId) {
    const result = await yandexRequest(`/events/${encodeURIComponent(pmkId)}`, { method: 'DELETE' });
    removeQueued('yandex', pmkId);
    return result;
  }

  function availableProviders() {
    return {
      google: Boolean(state.token),
      yandex: yandexConfigured(),
    };
  }

  async function saveToAvailableProviders(data, preferredId = '') {
    const providers = availableProviders();
    const tasks = [];

    if (providers.google) {
      tasks.push(upsertGoogle(data, preferredId)
        .then(value => ({ provider: 'Google', ok: true, value }))
        .catch(error => {
          queue('google', 'upsert', data);
          return { provider: 'Google', ok: false, error };
        }));
    }

    if (providers.yandex) {
      tasks.push(upsertYandex(data)
        .then(value => ({ provider: 'Яндекс', ok: true, value }))
        .catch(error => {
          queue('yandex', 'upsert', data);
          return { provider: 'Яндекс', ok: false, error };
        }));
    }

    if (!tasks.length) return { providers, results: [] };
    return { providers, results: await Promise.all(tasks) };
  }

  function resultMessage(results, action = 'сохранена') {
    const success = results.filter(item => item.ok).map(item => item.provider);
    const failed = results.filter(item => !item.ok).map(item => item.provider);
    if (success.length && !failed.length) return { text: `Заявка ${action} в ${success.join(' и ')}.`, type: 'success' };
    if (success.length) return { text: `Заявка ${action} в ${success.join(' и ')}. ${failed.join(' и ')} будет обновлён позже.`, type: 'error' };
    const error = results.map(item => item.error?.message).filter(Boolean).join(' ');
    return { text: error || 'Не удалось сохранить заявку.', type: 'error' };
  }

  async function refreshProviders() {
    try {
      if (typeof window.PMK_YANDEX_CALENDAR?.refresh === 'function') await window.PMK_YANDEX_CALENDAR.refresh();
      else if (typeof refreshEvents === 'function') await refreshEvents();
    } catch (error) {
      console.warn('PMK provider refresh v72:', error);
      invalidateEventCaches();
      renderAll();
    }
  }

  saveRequest = async function saveRequestAnyCalendarV72(sourceData, localOnly = false) {
    if (localOnly) return previous.saveRequest(sourceData, true);
    if (!validateForm(sourceData)) return;

    const sourceEvent = getAllEvents().find(event => event.id === sourceData.eventId) || null;
    const data = {
      ...sourceData,
      pmkId: ensurePmkId(sourceData, sourceEvent),
    };
    qs('#eventId').dataset.pmkId = data.pmkId;

    const { results } = await saveToAvailableProviders(data, sourceData.eventId || '');
    if (!results.length) return previous.saveRequest(data, false);

    const label = resultMessage(results, sourceData.eventId ? 'обновлена' : 'создана');
    if (!results.some(item => item.ok)) throw new Error(label.text);

    if (sourceData.eventId?.startsWith('local-') && !sourceData.eventId.startsWith(YANDEX_PREFIX)) {
      state.localEvents = state.localEvents.filter(event => event.id !== sourceData.eventId);
      persistLocalEvents();
    }

    showToast(label.text, label.type);
    state.selectedDayKey = data.visitDate || state.selectedDayKey;
    state.periodAnchorKey = state.selectedDayKey;
    await refreshProviders();
    resetForm();
    setView(['three-days','week','month','delivery-waiting','search'].includes(state.returnView) ? state.returnView : 'day');
  };

  async function updateStructured(id, mutate, successText) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    const current = eventMeta(event);
    const data = mutate({
      ...current,
      eventId: id,
      pmkId: ensurePmkId(current, event),
    });
    const { results } = await saveToAvailableProviders(data, id);
    if (!results.length) return false;
    if (!results.some(item => item.ok)) throw new Error(resultMessage(results).text);
    showToast(successText, 'success');
    await refreshProviders();
    return true;
  }

  updateEventContract = async function updateEventContractAnyCalendarV72(id, contractNumber) {
    const event = getAllEvents().find(item => item.id === id);
    if (event && id.startsWith('local-') && !id.startsWith(YANDEX_PREFIX) && state.localEvents.some(item => item.id === id) && !yandexConfigured()) {
      return previous.updateEventContract(id, contractNumber);
    }
    try {
      const updated = await updateStructured(id, data => ({ ...data, contractNumber: cleanShortField(contractNumber) }), 'Номер договора сохранён.');
      if (updated === false) return previous.updateEventContract(id, contractNumber);
    } catch (error) {
      showToast(error?.message || 'Не удалось изменить договор.', 'error');
    }
  };

  updateEventStatus = async function updateEventStatusAnyCalendarV72(id, nextStatus) {
    const event = getAllEvents().find(item => item.id === id);
    if (event && id.startsWith('local-') && !id.startsWith(YANDEX_PREFIX) && state.localEvents.some(item => item.id === id) && !yandexConfigured()) {
      return previous.updateEventStatus(id, nextStatus);
    }
    try {
      const updated = await updateStructured(id, data => ({ ...data, requestStatus: nextStatus }), `Статус: ${statusInfo(nextStatus, eventMeta(event || {}).visitType).label}`);
      if (updated === false) return previous.updateEventStatus(id, nextStatus);
    } catch (error) {
      showToast(error?.message || 'Не удалось изменить статус.', 'error');
    }
  };

  deleteEvent = async function deleteEventAnyCalendarV72(id) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    if (id.startsWith('local-') && !id.startsWith(YANDEX_PREFIX) && state.localEvents.some(item => item.id === id) && !yandexConfigured()) {
      return previous.deleteEvent(id);
    }

    const data = eventMeta(event);
    const pmkId = ensurePmkId(data, event);
    if (!confirm(`Удалить заявку ${data.customerName || 'клиента'}?`)) return;

    const providers = availableProviders();
    const tasks = [];
    if (providers.google) {
      tasks.push(deleteGoogle(pmkId, id).then(() => ({ provider:'Google', ok:true })).catch(error => {
        queue('google', 'delete', { pmkId });
        return { provider:'Google', ok:false, error };
      }));
    }
    if (providers.yandex) {
      tasks.push(deleteYandex(pmkId).then(() => ({ provider:'Яндекс', ok:true })).catch(error => {
        queue('yandex', 'delete', { pmkId });
        return { provider:'Яндекс', ok:false, error };
      }));
    }
    if (!tasks.length) return previous.deleteEvent(id);

    const results = await Promise.all(tasks);
    if (!results.some(item => item.ok)) {
      showToast(resultMessage(results, 'удалена').text, 'error');
      return;
    }

    state.events = state.events.filter(item => pmkIdOf(item) !== pmkId);
    invalidateEventCaches();
    renderAll();
    resetForm();
    setView(state.returnView || 'day');
    showToast('Заявка удалена из доступных календарей.', 'success');
    await refreshProviders();
  };

  const previousUpdateConnectionUI = updateConnectionUI;
  updateConnectionUI = function updateConnectionUIAnyCalendarV72() {
    previousUpdateConnectionUI();
    const providers = availableProviders();
    const submit = qs('#submitBtn');
    if (submit && (providers.google || providers.yandex)) {
      submit.textContent = qs('#eventId').value ? 'Обновить заявку' : 'Создать заявку';
      submit.disabled = false;
    }
  };

  window.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72_API = {
    saveToAvailableProviders,
    availableProviders,
    yandexConfigured,
  };
})();