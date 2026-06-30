'use strict';

(() => {
  if (globalThis.PMK_COMPLETED_WORKFLOW_V80) return;
  globalThis.PMK_COMPLETED_WORKFLOW_V80 = true;

  const HIDDEN_DAY_STATUSES = new Set(['picked-up', 'in-progress', 'completed']);
  const ledger = globalThis.PMK_STATUS_LEDGER_V80_API;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const previousRenderToday = renderToday;
  const previousRenderAll = renderAll;
  const previousSetView = setView;
  let scrubScheduled = false;

  function visibleInDay(event) {
    return !HIDDEN_DAY_STATUSES.has(eventMeta(event).requestStatus);
  }

  function completionTimestamp(event) {
    const data = eventMeta(event);
    const record = ledger.resolve(event, data);
    return String(data.completedAt || record?.completedAt || record?.updatedAt || event.updated || event.created || `${eventDateKey(event)}T00:00:00`);
  }

  function completedEvents(source = getAllEvents()) {
    const unique = new Map();
    source.forEach(event => {
      const data = eventMeta(event);
      if (data.requestStatus !== 'completed') return;
      const key = ledger.key(event, data);
      const existing = unique.get(key);
      if (!existing || completionTimestamp(event).localeCompare(completionTimestamp(existing)) > 0) unique.set(key, event);
    });
    return [...unique.values()].sort((a, b) => completionTimestamp(b).localeCompare(completionTimestamp(a)));
  }

  function completionDateKey(event) {
    try { return businessDateTimeParts(completionTimestamp(event)).date || eventDateKey(event); }
    catch { return eventDateKey(event); }
  }

  function completionTime(event) {
    try { return businessDateTimeParts(completionTimestamp(event)).time || ''; }
    catch { return ''; }
  }

  function displayDate(dateKey) {
    const date = dateKeyForDisplay(dateKey);
    const prefix = dateKey === businessTodayKey() ? 'Сегодня' : date.toLocaleDateString('ru-RU', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC' }).replace(/^./, char => char.toUpperCase());
    const short = date.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit', timeZone:'UTC' });
    return `${prefix} · ${short}`;
  }

  function createView() {
    if ($('#view-completed')) return true;
    const main = $('.main-content');
    const deliveryNav = $('.nav-item[data-view="delivery-waiting"]');
    if (!main || !deliveryNav) return false;
    const nav = document.createElement('button');
    nav.className = 'nav-item nav-completed';
    nav.dataset.view = 'completed';
    nav.innerHTML = '<span>Выполнено</span><b id="completedCount">0</b>';
    deliveryNav.insertAdjacentElement('beforebegin', nav);
    nav.addEventListener('click', () => setView('completed'));
    const section = document.createElement('section');
    section.id = 'view-completed';
    section.className = 'view';
    section.innerHTML = '<div class="page-heading compact"><div><p class="eyebrow">Завершённые заказы</p><h1>Выполнено</h1><p>Завершённые заявки не отображаются в рабочей ленте.</p></div></div><div class="summary-grid completed-summary"><article class="summary-card"><span>Всего выполнено</span><strong id="completedTotal">0</strong></article><article class="summary-card"><span>Выполнено сегодня</span><strong id="completedToday">0</strong></article></div><div id="completedGroups" class="completed-groups"></div>';
    main.appendChild(section);
    return true;
  }

  function renderCompleted() {
    if (!createView()) return;
    const events = completedEvents();
    const today = businessTodayKey();
    $('#completedCount').textContent = String(events.length);
    $('#completedTotal').textContent = String(events.length);
    $('#completedToday').textContent = String(events.filter(event => completionDateKey(event) === today).length);
    const groups = new Map();
    events.forEach(event => {
      const key = completionDateKey(event);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });
    const container = $('#completedGroups');
    if (!events.length) {
      container.innerHTML = '<div class="empty-state"><strong>Выполненных заявок пока нет.</strong><br>После изменения статуса на «Выполнено» заявка появится здесь.</div>';
      return;
    }
    container.innerHTML = [...groups.entries()].map(([dateKey, items]) => `<section class="completed-day"><header><div><strong>${escapeHtml(displayDate(dateKey))}</strong><span>${items.length}</span></div></header><div class="completed-day-list">${items.map(event => `<div class="completed-card-wrap"><div class="completed-at">Выполнено${completionTime(event) ? ` · ${escapeHtml(completionTime(event))}` : ''}</div>${renderEventCard(event)}</div>`).join('')}</div></section>`).join('');
    bindEventActions(container);
  }

  function scrubTodayDom() {
    if (scrubScheduled) return;
    scrubScheduled = true;
    requestAnimationFrame(() => {
      scrubScheduled = false;
      const container = $('#todayEvents');
      if (!container) return;
      let removed = false;
      $$('[data-event-card]', container).forEach(card => {
        const event = getAllEvents().find(item => String(item.id) === String(card.dataset.eventCard));
        if (event && !visibleInDay(event)) { card.remove(); removed = true; }
      });
      if (removed && !container.querySelector('[data-event-card]')) container.innerHTML = '<div class="empty-state"><strong>Активных заявок на этот день нет.</strong><br>Забранные и выполненные заявки находятся в отдельных разделах.</div>';
    });
  }

  renderToday = function renderTodayCompletedSafeV80(events = []) {
    const result = previousRenderToday((events || []).filter(visibleInDay));
    scrubTodayDom();
    return result;
  };

  renderAll = function renderAllCompletedSafeV80() {
    previousRenderAll();
    scrubTodayDom();
    renderCompleted();
  };

  setView = function setViewCompletedV80(view, options = {}) {
    if (view !== 'completed') return previousSetView(view, options);
    state.currentView = 'completed';
    $$('.view').forEach(element => element.classList.toggle('active', element.id === 'view-completed'));
    $$('.nav-item').forEach(element => element.classList.toggle('active', element.dataset.view === 'completed'));
    $('#sidebar')?.classList.remove('open');
    if (!options.skipHistory) pushAppHistory('completed');
    renderCompleted();
  };

  function installObserver() {
    const container = $('#todayEvents');
    if (!container || container.dataset.completedObserverV80 === '1') return;
    container.dataset.completedObserverV80 = '1';
    const observer = new MutationObserver(() => scrubTodayDom());
    observer.observe(container, { childList:true, subtree:true });
  }

  globalThis.PMK_COMPLETED_WORKFLOW_V80_API = { render:renderCompleted, events:completedEvents, scrub:scrubTodayDom };
  const install = () => { createView(); installObserver(); scrubTodayDom(); renderCompleted(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once:true });
  else requestAnimationFrame(install);
  globalThis.addEventListener?.('pmk-status-ledger-updated', () => requestAnimationFrame(() => { scrubTodayDom(); renderCompleted(); }));
  globalThis.addEventListener?.('pmk-calendar-sync-done', () => requestAnimationFrame(() => { scrubTodayDom(); renderCompleted(); }));
})();