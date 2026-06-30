'use strict';

(() => {
  if (window.PMK_YANDEX_CALENDAR_SYNC_V69) return;
  window.PMK_YANDEX_CALENDAR_SYNC_V69 = true;

  const CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const CACHE_KEY = 'pmk-yandex-calendar-cache-v1';
  const DEFAULT_API_URL = 'https://lucky-math-8e63pmk-address.standart-media.workers.dev/calendar';
  const YANDEX_ID_PREFIX = 'local-yandex-';

  const previous = {
    refreshEvents,
    saveRequest,
    updateEventStatus,
    updateEventContract,
    deleteEvent,
    saveReminder,
    updateConnectionUI,
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

  function loadConfig() {
    return {
      enabled: true,
      apiUrl: DEFAULT_API_URL,
      syncToken: '',
      ...readJson(CONFIG_KEY, {}),
    };
  }

  let config = loadConfig();
  let yandexOnline = false;
  let yandexEvents = readJson(CACHE_KEY, []);
  let activeRefresh = null;

  function saveConfig(next = config) {
    config = {
      enabled: Boolean(next.enabled),
      apiUrl: String(next.apiUrl || DEFAULT_API_URL).trim().replace(/\/+$/, ''),
      syncToken: String(next.syncToken || '').trim(),
    };
    writeJson(CONFIG_KEY, config);
    updateConnectionUI();
    renderYandexStatus();
  }

  function isConfigured() {
    return Boolean(config.enabled && config.apiUrl && config.syncToken);
  }

  function queueItems() {
    return readJson(QUEUE_KEY, []);
  }

  function saveQueue(items) {
    writeJson(QUEUE_KEY, items.slice(-300));
    renderYandexStatus();
  }

  function enqueue(provider, op, data) {
    const pmkId = String(data?.pmkId || '');
    if (!pmkId) return;
    const items = queueItems().filter(item => !(item.provider === provider && item.pmkId === pmkId));
    items.push({ provider, op, pmkId, data: op === 'upsert' ? data : null, savedAt: new Date().toISOString() });
    saveQueue(items);
  }

  function removeQueued(provider, pmkId) {
    saveQueue(queueItems().filter(item => !(item.provider === provider && item.pmkId === pmkId)));
  }

  function errorMessage(error, fallback = 'Ошибка синхронизации') {
    return String(error?.message || fallback).replace(/^Error:\s*/i, '');
  }

  async function yandexRequest(path, options = {}) {
    if (!isConfigured()) throw new Error('Яндекс.Календарь ещё не настроен.');
    const response = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.syncToken}`,
        ...(options.headers || {}),
      },
      cache: 'no-store',
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

  function pmkDataOf(event) {
    try { return decodePmkData(event) || event?.pmkData || null; }
    catch { return event?.pmkData || null; }
  }

  function pmkIdOf(event) {
    return String(pmkDataOf(event)?.pmkId || event?._pmkId || '').trim();
  }

  function normalizeYandexEvent(event) {
    const data = event?.pmkData || null;
    if (!data?.pmkId) return null;
    const normalized = {
      ...event,
      id: `${YANDEX_ID_PREFIX}${data.pmkId}`,
      _provider: 'yandex',
      _pmkId: data.pmkId,
      htmlLink: event.htmlLink || 'https://calendar.yandex.ru/',
    };
    normalized.extendedProperties = { private: encodePmkData(data) };
    return normalized;
  }

  function mergeProviderEvents(googleSource = [], yandexSource = []) {
    const pending = queueItems();
    const pendingGoogleUpserts = new Set(pending.filter(item => item.provider === 'google' && item.op === 'upsert').map(item => item.pmkId));
    const deletedPmkIds = new Set(pending.filter(item => item.op === 'delete').map(item => item.pmkId));
    const result = new Map();
    const add = (event, provider) => {
      if (!event) return;
      const pmkId = pmkIdOf(event);
      const key = pmkId ? `pmk:${pmkId}` : `${provider}:${event.id}`;
      const existing = result.get(key);
      if (!existing) {
        result.set(key, { ...event, _providers: [provider] });
        return;
      }
      const providers = [...new Set([...(existing._providers || []), provider])];
      if (provider === 'google' && !pendingGoogleUpserts.has(pmkId)) result.set(key, { ...event, _providers: providers, _yandexMirror: true });
      else result.set(key, { ...existing, _providers: providers, _yandexMirror: true });
    };
    yandexSource.forEach(event => add(event, 'yandex'));
    googleSource.forEach(event => add(event, 'google'));
    return [...result.values()]
      .filter(event => !deletedPmkIds.has(pmkIdOf(event)))
      .sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0));
  }

  async function fetchYandexEvents() {
    const payload = await yandexRequest('/events?from=1970-01-01&to=2100-01-01');
    const events = (Array.isArray(payload?.events) ? payload.events : []).map(normalizeYandexEvent).filter(Boolean);
    yandexEvents = events;
    writeJson(CACHE_KEY, events);
    yandexOnline = true;
    window.dispatchEvent(new CustomEvent('pmk-yandex-sync-done', { detail: { count: events.length } }));
    return events;
  }

  function googleRemoteId(event) {
    const id = String(event?.id || '');
    if (!id || id.startsWith('local-')) return '';
    return id;
  }

  function findGoogleEventByPmkId(pmkId) {
    return (state.events || []).find(event => event?._provider !== 'yandex' && pmkIdOf(event) === pmkId && googleRemoteId(event));
  }

  async function upsertGoogle(data, preferredId = '') {
    if (!state.token) throw new Error('Google Calendar не подключён.');
    const body = toGoogleEvent(data);
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const currentId = preferredId && !preferredId.startsWith('local-') ? preferredId : (findGoogleEventByPmkId(data.pmkId)?.id || '');
    if (currentId) {
      return googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(currentId)}`, { method: 'PATCH', body: JSON.stringify(body) });
    }
    return googleRequest(`/calendars/${calendarId}/events`, { method: 'POST', body: JSON.stringify(body) });
  }

  async function deleteGoogle(pmkId, preferredId = '') {
    if (!state.token) throw new Error('Google Calendar не подключён.');
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const currentId = preferredId && !preferredId.startsWith('local-') ? preferredId : (findGoogleEventByPmkId(pmkId)?.id || '');
    if (!currentId) return null;
    return googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(currentId)}`, { method: 'DELETE' });
  }

  async function upsertYandex(data) {
    const payload = await yandexRequest(`/events/${encodeURIComponent(data.pmkId)}`, {
      method: 'PUT',
      body: JSON.stringify({ event: toGoogleEvent(data), pmkData: data }),
    });
    yandexOnline = true;
    removeQueued('yandex', data.pmkId);
    return payload;
  }

  async function deleteYandex(pmkId) {
    const payload = await yandexRequest(`/events/${encodeURIComponent(pmkId)}`, { method: 'DELETE' });
    yandexOnline = true;
    removeQueued('yandex', pmkId);
    return payload;
  }

  async function flushQueue() {
    let items = queueItems();
    if (!items.length) return { completed: 0, remaining: 0 };
    let completed = 0;
    for (const item of [...items]) {
      try {
        if (item.provider === 'google' && state.token) {
          if (item.op === 'delete') await deleteGoogle(item.pmkId);
          else await upsertGoogle(item.data);
          removeQueued('google', item.pmkId);
          completed += 1;
        }
        if (item.provider === 'yandex' && isConfigured()) {
          if (item.op === 'delete') await deleteYandex(item.pmkId);
          else await upsertYandex(item.data);
          completed += 1;
        }
      } catch (error) {
        console.warn('PMK provider queue:', item.provider, item.op, error);
      }
    }
    items = queueItems();
    return { completed, remaining: items.length };
  }

  async function providerRefresh() {
    if (activeRefresh) return activeRefresh;
    activeRefresh = (async () => {
      const googleBefore = (state.events || []).filter(event => event?._provider !== 'yandex');
      state.events = googleBefore;
      try { await previous.refreshEvents(); } catch (error) { console.warn('Google refresh:', error); }
      let googleEvents = (state.events || []).filter(event => event?._provider !== 'yandex');
      if (!googleEvents.length && googleBefore.length) googleEvents = googleBefore;

      if (isConfigured()) {
        try {
          await flushQueue();
          await fetchYandexEvents();
        } catch (error) {
          yandexOnline = false;
          window.dispatchEvent(new CustomEvent('pmk-yandex-sync-error', { detail: { message: errorMessage(error) } }));
          console.warn('Yandex refresh:', error);
        }
      }

      state.events = mergeProviderEvents(googleEvents, yandexEvents);
      window.PMK_EVENTS_REVISION = Number(window.PMK_EVENTS_REVISION || 0) + 1;
      invalidateEventCaches();
      renderAll();
      checkUpcomingNotifications();
      updateConnectionUI();
      renderYandexStatus();
      return state.events;
    })().finally(() => { activeRefresh = null; });
    return activeRefresh;
  }

  function resultLabel(results) {
    const ok = results.filter(item => item.status === 'fulfilled').map(item => item.provider);
    const failed = results.filter(item => item.status === 'rejected').map(item => item.provider);
    if (ok.includes('Google') && ok.includes('Яндекс')) return { text: 'Заявка сохранена в Google и Яндекс.Календаре.', type: 'success' };
    if (ok.length && failed.length) return { text: `Заявка сохранена в ${ok.join(' и ')}. ${failed.join(' и ')} будет синхронизирован позже.`, type: 'error' };
    if (ok.length) return { text: `Заявка сохранена в ${ok.join(' и ')}.`, type: 'success' };
    return { text: 'Не удалось сохранить заявку во внешние календари.', type: 'error' };
  }

  async function saveRemoteData(data, preferredId = '') {
    const tasks = [];
    if (state.token) {
      tasks.push(upsertGoogle(data, preferredId)
        .then(value => ({ status: 'fulfilled', provider: 'Google', value }))
        .catch(reason => ({ status: 'rejected', provider: 'Google', reason })));
    } else {
      enqueue('google', 'upsert', data);
    }

    if (isConfigured()) {
      tasks.push(upsertYandex(data)
        .then(value => ({ status: 'fulfilled', provider: 'Яндекс', value }))
        .catch(reason => {
          enqueue('yandex', 'upsert', data);
          return { status: 'rejected', provider: 'Яндекс', reason };
        }));
    }

    const results = await Promise.all(tasks);
    return results;
  }

  saveRequest = async function saveRequestWithYandex(data, localOnly = false) {
    if (localOnly) return previous.saveRequest(data, true);
    if (!validateForm(data)) return;

    if (!state.token && !isConfigured()) return previous.saveRequest(data, false);

    const results = await saveRemoteData(data, data.eventId || '');
    const successes = results.filter(item => item.status === 'fulfilled');
    if (!successes.length && results.length) {
      const detail = results.map(item => errorMessage(item.reason)).join(' ');
      throw new Error(detail || 'Не удалось сохранить заявку.');
    }

    if (data.eventId?.startsWith('local-')) {
      state.localEvents = state.localEvents.filter(event => event.id !== data.eventId);
      persistLocalEvents();
    }

    const label = resultLabel(results);
    showToast(label.text, label.type);
    state.selectedDayKey = data.visitDate || state.selectedDayKey;
    state.periodAnchorKey = state.selectedDayKey;
    await providerRefresh();
    resetForm();
    setView(['three-days', 'week', 'month', 'delivery-waiting', 'search'].includes(state.returnView) ? state.returnView : 'day');
  };

  async function updateStructuredEvent(id, mutate, successText) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    const current = eventMeta(event);
    const data = mutate({ ...current, eventId: id, pmkId: current.pmkId || pmkIdOf(event) || makeId() });
    const results = await saveRemoteData(data, googleRemoteId(event));
    if (!results.some(item => item.status === 'fulfilled') && results.length) throw new Error(results.map(item => errorMessage(item.reason)).join(' '));
    showToast(successText, 'success');
    await providerRefresh();
  }

  updateEventStatus = async function updateEventStatusWithYandex(id, nextStatus) {
    if (id.startsWith('local-') && !id.startsWith(YANDEX_ID_PREFIX) && state.localEvents.some(item => item.id === id)) {
      return previous.updateEventStatus(id, nextStatus);
    }
    try {
      await updateStructuredEvent(id, data => ({ ...data, requestStatus: nextStatus }), `Статус: ${statusInfo(nextStatus).label}`);
    } catch (error) { showToast(errorMessage(error), 'error'); }
  };

  updateEventContract = async function updateEventContractWithYandex(id, contractNumber) {
    if (id.startsWith('local-') && !id.startsWith(YANDEX_ID_PREFIX) && state.localEvents.some(item => item.id === id)) {
      return previous.updateEventContract(id, contractNumber);
    }
    try {
      await updateStructuredEvent(id, data => ({ ...data, contractNumber: cleanShortField(contractNumber) }), 'Номер договора сохранён.');
    } catch (error) { showToast(errorMessage(error), 'error'); }
  };

  deleteEvent = async function deleteEventWithYandex(id) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    if (id.startsWith('local-') && !id.startsWith(YANDEX_ID_PREFIX) && state.localEvents.some(item => item.id === id)) return previous.deleteEvent(id);
    const data = eventMeta(event);
    const pmkId = data.pmkId || pmkIdOf(event);
    const name = data.customerName || 'эту заявку';
    if (!confirm(`Удалить заявку ${name}?`)) return;

    const tasks = [];
    if (state.token) tasks.push(deleteGoogle(pmkId, googleRemoteId(event)).catch(error => { enqueue('google', 'delete', { pmkId }); throw error; }));
    else enqueue('google', 'delete', { pmkId });
    if (isConfigured()) tasks.push(deleteYandex(pmkId).catch(error => { enqueue('yandex', 'delete', { pmkId }); throw error; }));
    else enqueue('yandex', 'delete', { pmkId });

    const settled = await Promise.allSettled(tasks);
    if (settled.length && settled.every(item => item.status === 'rejected')) {
      showToast('Удаление поставлено в очередь синхронизации.', 'error');
    } else {
      showToast('Заявка удалена. Недоступные календари обновятся позже.', 'success');
    }
    state.events = state.events.filter(item => pmkIdOf(item) !== pmkId);
    invalidateEventCaches();
    renderAll();
    resetForm();
    setView(state.returnView || 'day');
  };

  saveReminder = async function saveReminderWithYandex(data) {
    if (!isConfigured()) return previous.saveReminder(data);
    if (!data.date || !data.time || !data.text) return showToast('Заполните дату, время и текст напоминания.', 'error');
    const pmkId = `reminder-${makeId()}`;
    const reminderData = {
      version: 1,
      pmkId,
      eventId: '',
      visitType: 'reminder',
      customerName: data.text,
      phone: '',
      district: '',
      address: '',
      visitDate: data.date,
      startTime: data.time,
      endTime: addMinutesToTime(data.time, data.duration || 30),
      requestStatus: 'completed',
      rugs: [],
      estimatedPrice: 0,
      discount: 0,
      managerComment: data.text,
    };
    const eventBody = toReminderEvent(data);
    const tasks = [];
    if (state.token) {
      const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
      tasks.push(googleRequest(`/calendars/${calendarId}/events`, { method: 'POST', body: JSON.stringify(eventBody) }));
    } else enqueue('google', 'upsert', reminderData);
    tasks.push(yandexRequest(`/events/${encodeURIComponent(pmkId)}`, { method: 'PUT', body: JSON.stringify({ event: eventBody, pmkData: reminderData }) }));
    await Promise.allSettled(tasks);
    showToast('Напоминание сохранено в доступных календарях.', 'success');
    qs('#reminderForm').reset();
    qs('#reminderDate').value = state.selectedDayKey || businessTodayKey();
    await providerRefresh();
    setView(state.returnView || 'day');
  };

  updateConnectionUI = function updateConnectionUIWithYandex() {
    previous.updateConnectionUI();
    const google = Boolean(state.token);
    const yandex = Boolean(isConfigured() && yandexOnline);
    const yandexReady = Boolean(isConfigured());
    const badge = qs('#connectionBadge');
    if (badge) {
      if (google && yandex) badge.textContent = 'Google + Яндекс';
      else if (google && yandexReady) badge.textContent = 'Google + Яндекс настроен';
      else if (google) badge.textContent = 'Google подключён';
      else if (yandex) badge.textContent = 'Яндекс подключён';
      else if (yandexReady) badge.textContent = 'Яндекс настроен';
      else badge.textContent = 'Демо-режим';
      badge.className = `status-badge ${(google || yandexReady) ? 'online' : 'offline'}`;
    }
    const submit = qs('#submitBtn');
    if (submit && (google || yandexReady)) submit.textContent = qs('#eventId').value ? 'Обновить в календарях' : 'Создать в календарях';
  };

  refreshEvents = providerRefresh;
  if (window.PMK_FULL_CALENDAR_SYNC) window.PMK_FULL_CALENDAR_SYNC.refresh = providerRefresh;
  window.PMK_YANDEX_CALENDAR = {
    refresh: providerRefresh,
    test: () => yandexRequest('/health'),
    flushQueue,
    configured: isConfigured,
  };

  async function testConnection() {
    const button = document.querySelector('#pmkYandexTestBtn');
    if (button) button.disabled = true;
    try {
      const result = await yandexRequest('/health');
      yandexOnline = true;
      showToast(`Яндекс.Календарь подключён${result?.calendar ? `: ${result.calendar}` : ''}.`, 'success');
      await providerRefresh();
    } catch (error) {
      yandexOnline = false;
      showToast(errorMessage(error), 'error');
    } finally {
      if (button) button.disabled = false;
      updateConnectionUI();
      renderYandexStatus();
    }
  }

  async function backfillToYandex() {
    if (!isConfigured()) return showToast('Сначала настройте Яндекс.Календарь.', 'error');
    const source = (state.events || []).filter(event => event?._provider !== 'yandex').map(event => pmkDataOf(event)).filter(data => data?.pmkId);
    if (!source.length) return showToast('В Google Calendar не найдено заявок ПМК для переноса.', 'error');
    const button = document.querySelector('#pmkYandexBackfillBtn');
    if (button) button.disabled = true;
    let completed = 0;
    let failed = 0;
    for (const data of source) {
      try { await upsertYandex(data); completed += 1; }
      catch { enqueue('yandex', 'upsert', data); failed += 1; }
      const status = document.querySelector('#pmkYandexStatus');
      if (status) status.textContent = `Перенос: ${completed + failed} из ${source.length}`;
    }
    if (button) button.disabled = false;
    showToast(`Перенос в Яндекс: ${completed} успешно${failed ? `, ${failed} в очереди` : ''}.`, failed ? 'error' : 'success');
    await providerRefresh();
  }

  function injectSettings() {
    const settingsGrid = document.querySelector('#view-settings .settings-grid');
    if (!settingsGrid || document.querySelector('#pmkYandexSettings')) return;
    const card = document.createElement('section');
    card.id = 'pmkYandexSettings';
    card.className = 'form-card';
    card.innerHTML = `
      <h2>Яндекс.Календарь</h2>
      <p style="margin:0 0 14px;color:var(--muted,#777)">Заявки дублируются через защищённый Cloudflare Worker. Логин и пароль Яндекса в браузере не хранятся.</p>
      <label class="toggle-row"><input type="checkbox" id="pmkYandexEnabled"><span><strong>Дублировать заявки в Яндекс</strong><small>При недоступности одного календаря операция останется в очереди.</small></span></label>
      <label class="field">Адрес календарного Worker<input id="pmkYandexApiUrl" autocomplete="off" placeholder="https://...workers.dev/calendar"></label>
      <label class="field">Ключ синхронизации<input id="pmkYandexSyncToken" type="password" autocomplete="new-password" placeholder="Отдельный ключ PMK_SYNC_TOKEN"></label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
        <button type="button" id="pmkYandexTestBtn" class="button button-secondary">Проверить Яндекс</button>
        <button type="button" id="pmkYandexBackfillBtn" class="button button-secondary">Перенести заявки из Google</button>
      </div>
      <div id="pmkYandexStatus" class="info-box" style="margin-top:12px"></div>`;
    settingsGrid.appendChild(card);

    document.querySelector('#pmkYandexEnabled').checked = config.enabled;
    document.querySelector('#pmkYandexApiUrl').value = config.apiUrl;
    document.querySelector('#pmkYandexSyncToken').value = config.syncToken;
    document.querySelector('#pmkYandexTestBtn').addEventListener('click', testConnection);
    document.querySelector('#pmkYandexBackfillBtn').addEventListener('click', backfillToYandex);
    document.querySelector('#saveSettingsBtn')?.addEventListener('click', () => {
      saveConfig({
        enabled: document.querySelector('#pmkYandexEnabled').checked,
        apiUrl: document.querySelector('#pmkYandexApiUrl').value,
        syncToken: document.querySelector('#pmkYandexSyncToken').value,
      });
      showToast('Настройки Яндекс.Календаря сохранены.', 'success');
    });
    renderYandexStatus();
  }

  function renderYandexStatus() {
    const status = document.querySelector('#pmkYandexStatus');
    if (!status) return;
    const queued = queueItems().length;
    if (!config.enabled) {
      status.textContent = 'Дублирование в Яндекс отключено.';
      status.className = 'info-box';
    } else if (!config.syncToken) {
      status.textContent = 'Нужно указать ключ синхронизации и настроить секреты Worker.';
      status.className = 'info-box danger';
    } else if (yandexOnline) {
      status.textContent = `Яндекс.Календарь доступен${queued ? ` • в очереди: ${queued}` : ''}.`;
      status.className = 'info-box good';
    } else {
      status.textContent = `Яндекс настроен, соединение ещё не проверено${queued ? ` • в очереди: ${queued}` : ''}.`;
      status.className = 'info-box';
    }
  }

  function enhanceHeaderStatus() {
    const info = document.querySelector('#pmkSyncTime');
    if (!info) return;
    const queued = queueItems().length;
    if (isConfigured()) info.textContent = `${info.textContent.replace(/\s·\sЯндекс.*$/, '')} · Яндекс${yandexOnline ? ' ✓' : ' ожидает'}${queued ? ` · очередь ${queued}` : ''}`;
  }

  window.addEventListener('pmk-calendar-sync-done', () => setTimeout(enhanceHeaderStatus, 0));
  window.addEventListener('pmk-yandex-sync-done', () => setTimeout(enhanceHeaderStatus, 0));
  window.addEventListener('online', () => isConfigured() && providerRefresh());

  const boot = () => {
    injectSettings();
    updateConnectionUI();
    renderYandexStatus();
    if (isConfigured()) providerRefresh();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
