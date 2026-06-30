'use strict';

(() => {
  if (window.PMK_IN_WORK_WORKFLOW_V73) return;
  window.PMK_IN_WORK_WORKFLOW_V73 = true;

  const WORK_STATUSES = new Set(['picked-up', 'in-progress']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const previous = {
    setView,
    renderAll,
    getFormData,
    fillForm,
    resetForm,
    updateEventStatus,
  };

  function isInWork(data = {}) {
    return WORK_STATUSES.has(data.requestStatus);
  }

  function workTimestamp(event, data = eventMeta(event)) {
    return data.workStartedAt || event.updated || event.created || `${eventDateKey(event)}T00:00:00`;
  }

  function workDateKey(event, data = eventMeta(event)) {
    const value = workTimestamp(event, data);
    try {
      const parts = businessDateTimeParts(value);
      return parts.date || eventDateKey(event);
    } catch {
      return eventDateKey(event);
    }
  }

  function workTime(event, data = eventMeta(event)) {
    const value = workTimestamp(event, data);
    try {
      const parts = businessDateTimeParts(value);
      return parts.time || '';
    } catch {
      return '';
    }
  }

  function shortDate(dateKey) {
    return dateKeyForDisplay(dateKey).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC',
    });
  }

  function dateHeading(dateKey) {
    const today = businessTodayKey();
    const label = dateKey === today ? 'Сегодня' : dateKeyForDisplay(dateKey).toLocaleDateString('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    });
    return `${label.replace(/^./, char => char.toUpperCase())} · ${shortDate(dateKey)}`;
  }

  function workEvents() {
    return getAllEvents()
      .filter(event => isInWork(eventMeta(event)))
      .sort((a, b) => new Date(workTimestamp(b)).getTime() - new Date(workTimestamp(a)).getTime());
  }

  function createView() {
    if ($('#view-in-work')) return true;
    const main = $('.main-content');
    const deliveryNav = $('.nav-item[data-view="delivery-waiting"]');
    if (!main || !deliveryNav) return false;

    const nav = document.createElement('button');
    nav.className = 'nav-item nav-in-work';
    nav.dataset.view = 'in-work';
    nav.innerHTML = '<span>В работе</span><b id="inWorkCount">0</b>';
    deliveryNav.insertAdjacentElement('beforebegin', nav);
    nav.addEventListener('click', () => setView('in-work'));

    const section = document.createElement('section');
    section.id = 'view-in-work';
    section.className = 'view';
    section.innerHTML = `
      <div class="page-heading compact">
        <div><p class="eyebrow">Заказы на фабрике</p><h1>В работе</h1><p>Заказы со статусом «Забрали», сгруппированные по дате перевода в работу.</p></div>
      </div>
      <div class="summary-grid in-work-summary">
        <article class="summary-card"><span>Всего в работе</span><strong id="inWorkTotal">0</strong></article>
        <article class="summary-card"><span>Добавлено сегодня</span><strong id="inWorkToday">0</strong></article>
        <article class="summary-card"><span>С прошлых дней</span><strong id="inWorkOlder">0</strong></article>
      </div>
      <div id="inWorkGroups" class="in-work-groups"></div>`;
    main.appendChild(section);
    return true;
  }

  function renderInWork() {
    if (!createView()) return;
    const events = workEvents();
    const today = businessTodayKey();
    $('#inWorkCount').textContent = String(events.length);
    $('#inWorkTotal').textContent = String(events.length);
    $('#inWorkToday').textContent = String(events.filter(event => workDateKey(event) === today).length);
    $('#inWorkOlder').textContent = String(events.filter(event => workDateKey(event) !== today).length);

    const groups = new Map();
    events.forEach(event => {
      const data = eventMeta(event);
      const key = workDateKey(event, data);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ event, data });
    });

    const container = $('#inWorkGroups');
    if (!events.length) {
      container.innerHTML = '<div class="empty-state"><strong>Сейчас заказов в работе нет.</strong><br>После изменения статуса на «Забрали» заказ появится здесь.</div>';
      return;
    }

    container.innerHTML = [...groups.entries()].map(([dateKey, items]) => `
      <section class="in-work-day">
        <header><div><strong>${escapeHtml(dateHeading(dateKey))}</strong><span>В работе: ${items.length}</span></div></header>
        <div class="in-work-day-list">
          ${items.map(({ event, data }) => `
            <div class="in-work-card-wrap">
              <div class="in-work-since">В работе с ${escapeHtml(shortDate(dateKey))}${workTime(event, data) ? ` · ${escapeHtml(workTime(event, data))}` : ''}</div>
              ${renderEventCard(event)}
            </div>`).join('')}
        </div>
      </section>`).join('');
    bindEventActions(container);
  }

  function updateDayWithoutWork() {
    if (state.currentView !== 'day') return;
    const events = getAllEvents().filter(event => eventDateKey(event) === state.selectedDayKey && !isInWork(eventMeta(event)));
    $('#todayCount').textContent = String(events.length);
    $('#summaryTotal').textContent = String(events.length);
    $('#summaryPickup').textContent = String(events.filter(event => eventMeta(event).visitType === 'pickup').length);
    $('#summaryDelivery').textContent = String(events.filter(event => eventMeta(event).visitType === 'delivery').length);
    $('#summaryAttention').textContent = String(events.filter(event => !eventMeta(event).phone || !displayAddress(eventMeta(event), event)).length);
    renderToday(events);
  }

  setView = function setViewWithInWorkV73(view, options = {}) {
    if (view !== 'in-work') return previous.setView(view, options);
    state.currentView = 'in-work';
    $$('.view').forEach(element => element.classList.toggle('active', element.id === 'view-in-work'));
    $$('.nav-item').forEach(element => element.classList.toggle('active', element.dataset.view === 'in-work'));
    $('#sidebar')?.classList.remove('open');
    if (!options.skipHistory) pushAppHistory('in-work');
    renderInWork();
  };

  renderAll = function renderAllWithInWorkV73() {
    previous.renderAll();
    renderInWork();
    updateDayWithoutWork();
  };

  getFormData = function getFormDataWithWorkStartedV73() {
    const data = previous.getFormData();
    const form = $('#requestForm');
    const saved = form?.dataset.workStartedAt || '';
    if (isInWork(data)) {
      data.workStartedAt = saved || new Date().toISOString();
      if (form && !saved) form.dataset.workStartedAt = data.workStartedAt;
    } else if (saved) {
      data.workStartedAt = saved;
    }
    return data;
  };

  fillForm = function fillFormWithWorkStartedV73(data) {
    const result = previous.fillForm(data);
    const form = $('#requestForm');
    if (form) form.dataset.workStartedAt = data?.workStartedAt || '';
    return result;
  };

  resetForm = function resetFormWithWorkStartedV73(...args) {
    const result = previous.resetForm(...args);
    const form = $('#requestForm');
    if (form) form.dataset.workStartedAt = '';
    return result;
  };

  async function saveWorkStatus(id, nextStatus) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    const current = eventMeta(event);
    const data = {
      ...current,
      eventId: id,
      pmkId: current.pmkId || event._pmkId || makeId(),
      requestStatus: nextStatus,
      workStartedAt: current.workStartedAt || new Date().toISOString(),
    };
    const api = window.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72_API;
    if (typeof api?.saveToAvailableProviders !== 'function') return previous.updateEventStatus(id, nextStatus);
    const { results } = await api.saveToAvailableProviders(data, id);
    if (!results.length) return previous.updateEventStatus(id, nextStatus);
    if (!results.some(item => item.ok)) {
      const message = results.map(item => item.error?.message).filter(Boolean).join(' ') || 'Не удалось перевести заказ в работу.';
      return showToast(message, 'error');
    }
    showToast('Заказ перенесён во вкладку «В работе».', 'success');
    await refreshEvents();
    renderAll();
  }

  updateEventStatus = async function updateEventStatusWithInWorkV73(id, nextStatus) {
    if (!WORK_STATUSES.has(nextStatus)) return previous.updateEventStatus(id, nextStatus);
    try {
      await saveWorkStatus(id, nextStatus);
    } catch (error) {
      showToast(error?.message || 'Не удалось перевести заказ в работу.', 'error');
    }
  };

  function install() {
    if (!createView()) return false;
    const status = $('#requestStatus');
    if (status && !status.dataset.workTimestampBound) {
      status.dataset.workTimestampBound = '1';
      status.addEventListener('change', () => {
        const form = $('#requestForm');
        if (form && WORK_STATUSES.has(status.value) && !form.dataset.workStartedAt) form.dataset.workStartedAt = new Date().toISOString();
      });
    }
    renderInWork();
    updateDayWithoutWork();
    return true;
  }

  window.PMK_IN_WORK_WORKFLOW_V73_API = { render: renderInWork, events: workEvents };
  const start = () => requestAnimationFrame(() => { if (!install()) setTimeout(install, 200); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();