'use strict';

(() => {
  if (window.PMK_COMPLETED_WORKFLOW_V79) return;
  window.PMK_COMPLETED_WORKFLOW_V79 = true;

  const HIDDEN_DAY_STATUSES = new Set(['picked-up', 'in-progress', 'completed']);
  const OVERRIDES_KEY = 'pmk-status-overrides-v74';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const previousEventMeta = eventMeta;
  const previousRenderToday = renderToday;
  const previousRenderAll = renderAll;
  const previousSetView = setView;
  let scrubScheduled = false;

  function readOverrides() {
    try {
      const value = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch { return {}; }
  }

  function statusFromDescription(description = '') {
    const match = String(description || '').match(/Статус\s*ПМК\s*:\s*([^\n\r]+)/i);
    if (!match) return '';
    const label = match[1].trim().toLowerCase();
    if (/выполн|готов/.test(label)) return 'completed';
    if (/забрал|в\s*работ/.test(label)) return 'picked-up';
    if (/ожидает\s+достав|доставк/.test(label)) return 'pending-delivery';
    if (/ожидает\s+забор|забор/.test(label)) return 'pending-pickup';
    return '';
  }

  function contractFromDescription(description = '') {
    return String(description || '').match(/Договор\s*ПМК\s*:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  }

  function completionFromDescription(description = '') {
    return String(description || '').match(/Выполнено\s*ПМК\s*:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  }

  function eventKey(event, data = {}) {
    return String(data.pmkId || event?._pmkId || event?.id || '').trim();
  }

  eventMeta = function eventMetaLegacyStatusAwareV79(event) {
    const base = previousEventMeta(event);
    const descriptionStatus = statusFromDescription(event?.description || '');
    const descriptionContract = contractFromDescription(event?.description || '');
    const completionMarker = completionFromDescription(event?.description || '');
    const override = readOverrides()[eventKey(event, base)] || null;
    return {
      ...base,
      requestStatus: override?.status || descriptionStatus || base.requestStatus,
      contractNumber: override?.contractNumber || descriptionContract || base.contractNumber || '',
      workStartedAt: override?.workStartedAt || base.workStartedAt || '',
      completedAt: base.completedAt || completionMarker || (descriptionStatus === 'completed' ? (event?.updated || '') : '') || (override?.status === 'completed' ? override.updatedAt : ''),
    };
  };

  function visibleInDay(event) {
    return !HIDDEN_DAY_STATUSES.has(eventMeta(event).requestStatus);
  }

  function completedEvents() {
    return getAllEvents()
      .filter(event => eventMeta(event).requestStatus === 'completed')
      .sort((a, b) => completionTimestamp(b).localeCompare(completionTimestamp(a)));
  }

  function completionTimestamp(event) {
    const data = eventMeta(event);
    const override = readOverrides()[eventKey(event, data)] || null;
    return String(data.completedAt || override?.updatedAt || event.updated || event.created || `${eventDateKey(event)}T00:00:00`);
  }

  function completionDateKey(event) {
    try {
      return businessDateTimeParts(completionTimestamp(event)).date || eventDateKey(event);
    } catch { return eventDateKey(event); }
  }

  function completionTime(event) {
    try { return businessDateTimeParts(completionTimestamp(event)).time || ''; }
    catch { return ''; }
  }

  function displayDate(dateKey) {
    const date = dateKeyForDisplay(dateKey);
    const today = businessTodayKey();
    const prefix = dateKey === today ? 'Сегодня' : date.toLocaleDateString('ru-RU', {
      weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC',
    }).replace(/^./, char => char.toUpperCase());
    const short = date.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit', timeZone:'UTC' });
    return `${prefix} · ${short}`;
  }

  function createCompletedView() {
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
    section.innerHTML = `
      <div class="page-heading compact">
        <div><p class="eyebrow">Завершённые заказы</p><h1>Выполнено</h1><p>Заявки, завершённые менеджером или курьером. Они не отображаются в рабочей ленте.</p></div>
      </div>
      <div class="summary-grid completed-summary">
        <article class="summary-card"><span>Всего выполнено</span><strong id="completedTotal">0</strong></article>
        <article class="summary-card"><span>Выполнено сегодня</span><strong id="completedToday">0</strong></article>
      </div>
      <div id="completedGroups" class="completed-groups"></div>`;
    main.appendChild(section);
    return true;
  }

  function renderCompleted() {
    if (!createCompletedView()) return;
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

    container.innerHTML = [...groups.entries()].map(([dateKey, items]) => `
      <section class="completed-day">
        <header><div><strong>${escapeHtml(displayDate(dateKey))}</strong><span>${items.length}</span></div></header>
        <div class="completed-day-list">
          ${items.map(event => `
            <div class="completed-card-wrap">
              <div class="completed-at">Выполнено${completionTime(event) ? ` · ${escapeHtml(completionTime(event))}` : ''}</div>
              ${renderEventCard(event)}
            </div>`).join('')}
        </div>
      </section>`).join('');
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
        const id = card.dataset.eventCard;
        const event = getAllEvents().find(item => String(item.id) === String(id));
        if (event && !visibleInDay(event)) {
          card.remove();
          removed = true;
        }
      });
      if (removed && !container.querySelector('[data-event-card]')) {
        container.innerHTML = '<div class="empty-state"><strong>Активных заявок на этот день нет.</strong><br>Забранные и выполненные заявки находятся в отдельных разделах.</div>';
      }
    });
  }

  renderToday = function renderTodayWithCompletedFilterV79(events = []) {
    const active = (events || []).filter(visibleInDay);
    const result = previousRenderToday(active);
    scrubTodayDom();
    return result;
  };

  renderAll = function renderAllWithCompletedV79() {
    previousRenderAll();
    scrubTodayDom();
    renderCompleted();
  };

  setView = function setViewWithCompletedV79(view, options = {}) {
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
    if (!container || container.dataset.completedObserver === '1') return;
    container.dataset.completedObserver = '1';
    const observer = new MutationObserver(() => {
      scrubTodayDom();
      renderCompleted();
    });
    observer.observe(container, { childList:true, subtree:true });
  }

  window.PMK_COMPLETED_WORKFLOW_V79_API = {
    render: renderCompleted,
    events: completedEvents,
    scrub: scrubTodayDom,
  };

  const install = () => {
    createCompletedView();
    installObserver();
    scrubTodayDom();
    renderCompleted();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once:true });
  else requestAnimationFrame(install);

  window.addEventListener('pmk-calendar-sync-done', () => requestAnimationFrame(() => {
    scrubTodayDom();
    renderCompleted();
  }));
})();