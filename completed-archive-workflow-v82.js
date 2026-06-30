'use strict';

(() => {
  if (globalThis.PMK_COMPLETED_ARCHIVE_WORKFLOW_V82) return;
  globalThis.PMK_COMPLETED_ARCHIVE_WORKFLOW_V82 = true;

  const HIDDEN_DAY_STATUSES = new Set(['picked-up', 'in-progress', 'completed', 'archived']);
  const ARCHIVE_PAGE_SIZE = 50;
  const ledger = globalThis.PMK_STATUS_LEDGER_V80_API;
  const policy = globalThis.PMK_ARCHIVE_POLICY_V82_API;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const previousRenderToday = renderToday;
  const previousRenderAll = renderAll;
  const previousSetView = setView;
  let archiveLimit = ARCHIVE_PAGE_SIZE;
  let scrubScheduled = false;
  let boundaryTimer = 0;

  function visibleInDay(event) {
    return !HIDDEN_DAY_STATUSES.has(eventMeta(event).requestStatus);
  }

  function completionTimestamp(event) {
    const data = eventMeta(event);
    const record = ledger.resolve(event, data);
    return String(
      data.completedAt ||
      record?.completedAt ||
      record?.updatedAt ||
      event.updated ||
      event.created ||
      `${eventDateKey(event)}T23:59:59`
    );
  }

  function uniqueCompletedEvents(source = getAllEvents()) {
    const unique = new Map();
    source.forEach(event => {
      const data = eventMeta(event);
      if (data.requestStatus !== 'completed' && data.requestStatus !== 'archived') return;
      const key = ledger.key(event, data);
      const existing = unique.get(key);
      if (!existing || policy.timestamp(completionTimestamp(event)) > policy.timestamp(completionTimestamp(existing))) unique.set(key, event);
    });
    return [...unique.values()].sort((a, b) => policy.timestamp(completionTimestamp(b)) - policy.timestamp(completionTimestamp(a)));
  }

  function splitCompleted(source = getAllEvents(), now = Date.now()) {
    return policy.split(uniqueCompletedEvents(source), completionTimestamp, now);
  }

  function completionParts(event) {
    try { return businessDateTimeParts(completionTimestamp(event)); }
    catch { return { date:eventDateKey(event), time:'' }; }
  }

  function completionDateKey(event) {
    return completionParts(event).date || eventDateKey(event);
  }

  function completionTime(event) {
    return completionParts(event).time || '';
  }

  function displayDay(dateKey) {
    const date = dateKeyForDisplay(dateKey);
    return dateKey === businessTodayKey()
      ? 'Сегодня'
      : date.toLocaleDateString('ru-RU', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC' }).replace(/^./, char => char.toUpperCase());
  }

  function displayMonth(monthKey) {
    const [year, month] = String(monthKey).split('-').map(Number);
    const date = new Date(Date.UTC(year, Math.max(0, month - 1), 1));
    return date.toLocaleDateString('ru-RU', { month:'long', year:'numeric', timeZone:'UTC' }).replace(/^./, char => char.toUpperCase());
  }

  function compactCard(event, archived = false) {
    const data = eventMeta(event);
    const id = escapeHtml(String(event.id || ''));
    const title = data.customerName || event.summary || 'Клиент';
    const address = displayAddress(data, event) || 'Адрес не указан';
    const contract = String(data.contractNumber || '').trim();
    const completedDate = completionDateKey(event);
    const completedClock = completionTime(event);
    const visitDate = eventDateKey(event);
    const visitStart = formatTime(event.start?.dateTime || event.start);
    const type = data.visitType === 'delivery' ? 'Доставка' : 'Забор';
    const stateLabel = archived ? 'Архив' : 'Выполнено';
    const stateClass = archived ? 'archived' : 'completed';
    const phone = String(data.phone || '').trim();
    return `<article class="history-compact-card history-${stateClass}" data-history-event="${id}">
      <div class="history-compact-main">
        <div class="history-compact-state-row">
          <span class="history-state history-state-${stateClass}">${stateLabel}</span>
          <time>${escapeHtml(formatDateShort(completedDate))}${completedClock ? ` · ${escapeHtml(completedClock)}` : ''}</time>
        </div>
        <div class="history-compact-title-row">
          <h3>${escapeHtml(title)}</h3>
          ${contract ? `<span class="history-contract">№ ${escapeHtml(contract)}</span>` : ''}
        </div>
        <div class="history-compact-meta">
          <span>${escapeHtml(type)}</span>
          <span>${escapeHtml(formatDateShort(visitDate))} · ${escapeHtml(visitStart)}</span>
          ${data.district ? `<span>${escapeHtml(data.district)}</span>` : ''}
        </div>
        <p class="history-compact-address">${escapeHtml(address)}</p>
      </div>
      <div class="history-compact-actions">
        ${phone ? `<a class="history-icon-action" href="${phoneLink(phone)}" aria-label="Позвонить">☎</a>` : ''}
        <a class="history-icon-action" href="${yandexMapLinkForData(data, event)}" target="_blank" rel="noopener" aria-label="Открыть адрес">⌖</a>
        <button type="button" class="history-open-button" data-open-event="${id}">Открыть</button>
      </div>
    </article>`;
  }

  function createViews() {
    const main = $('.main-content');
    const deliveryNav = $('.nav-item[data-view="delivery-waiting"]');
    if (!main || !deliveryNav) return false;

    let completedNav = $('.nav-item[data-view="completed"]');
    if (!completedNav) {
      completedNav = document.createElement('button');
      completedNav.className = 'nav-item nav-completed';
      completedNav.dataset.view = 'completed';
      completedNav.innerHTML = '<span>Выполнено</span><b id="completedCount">0</b>';
      deliveryNav.insertAdjacentElement('beforebegin', completedNav);
      completedNav.addEventListener('click', () => setView('completed'));
    }

    let archiveNav = $('.nav-item[data-view="archive"]');
    if (!archiveNav) {
      archiveNav = document.createElement('button');
      archiveNav.className = 'nav-item nav-archive';
      archiveNav.dataset.view = 'archive';
      archiveNav.innerHTML = '<span>Архив</span><b id="archiveCount">0</b>';
      completedNav.insertAdjacentElement('afterend', archiveNav);
      archiveNav.addEventListener('click', () => setView('archive'));
    }

    let completedView = $('#view-completed');
    if (!completedView) {
      completedView = document.createElement('section');
      completedView.id = 'view-completed';
      completedView.className = 'view';
      main.appendChild(completedView);
    }
    if (completedView.dataset.historyShellV82 !== '1') {
      completedView.dataset.historyShellV82 = '1';
      completedView.innerHTML = '<div class="page-heading compact history-heading"><div><p class="eyebrow">Последние 7 дней</p><h1>Выполнено</h1><p>Недавние завершённые заявки. Через неделю они автоматически перейдут в архив.</p></div></div><div class="history-summary"><span>За 7 дней</span><strong id="completedTotal">0</strong><small id="completedToday">Сегодня: 0</small></div><div id="completedGroups" class="history-groups"></div>';
    }

    let archiveView = $('#view-archive');
    if (!archiveView) {
      archiveView = document.createElement('section');
      archiveView.id = 'view-archive';
      archiveView.className = 'view';
      main.appendChild(archiveView);
    }
    if (archiveView.dataset.historyShellV82 !== '1') {
      archiveView.dataset.historyShellV82 = '1';
      archiveView.innerHTML = '<div class="page-heading compact history-heading"><div><p class="eyebrow">Старше 7 дней</p><h1>Архив</h1><p>Завершённые заказы хранятся здесь и не мешают ежедневной работе.</p></div></div><div class="history-summary history-summary-archive"><span>В архиве</span><strong id="archiveTotal">0</strong><small>Показываем последние записи</small></div><div id="archiveGroups" class="history-groups"></div><button id="archiveLoadMore" class="button button-secondary archive-load-more" type="button" hidden>Показать ещё</button>';
      $('#archiveLoadMore', archiveView)?.addEventListener('click', () => {
        archiveLimit += ARCHIVE_PAGE_SIZE;
        renderArchive();
      });
    }
    return true;
  }

  function renderCompleted() {
    if (!createViews()) return;
    const { active, archived } = splitCompleted();
    const today = businessTodayKey();
    $('#completedCount').textContent = String(active.length);
    $('#archiveCount').textContent = String(archived.length);
    $('#completedTotal').textContent = String(active.length);
    $('#completedToday').textContent = `Сегодня: ${active.filter(event => completionDateKey(event) === today).length}`;
    const groups = new Map();
    active.forEach(event => {
      const key = completionDateKey(event);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });
    const container = $('#completedGroups');
    if (!active.length) {
      container.innerHTML = '<div class="empty-state history-empty"><strong>Недавних выполненных заявок нет.</strong><br>Заявки старше недели находятся в архиве.</div>';
      scheduleBoundary(active);
      return;
    }
    container.innerHTML = [...groups.entries()].map(([dateKey, items]) => `<section class="history-group"><header><strong>${escapeHtml(displayDay(dateKey))}</strong><span>${items.length}</span></header><div class="history-list">${items.map(event => compactCard(event, false)).join('')}</div></section>`).join('');
    bindEventActions(container);
    scheduleBoundary(active);
  }

  function renderArchive() {
    if (!createViews()) return;
    const { active, archived } = splitCompleted();
    $('#completedCount').textContent = String(active.length);
    $('#archiveCount').textContent = String(archived.length);
    $('#archiveTotal').textContent = String(archived.length);
    const visible = archived.slice(0, archiveLimit);
    const groups = new Map();
    visible.forEach(event => {
      const key = completionDateKey(event).slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });
    const container = $('#archiveGroups');
    if (!archived.length) {
      container.innerHTML = '<div class="empty-state history-empty"><strong>Архив пока пуст.</strong><br>Заявки перейдут сюда автоматически через 7 дней после выполнения.</div>';
    } else {
      container.innerHTML = [...groups.entries()].map(([monthKey, items]) => `<section class="history-group history-group-archive"><header><strong>${escapeHtml(displayMonth(monthKey))}</strong><span>${items.length}</span></header><div class="history-list">${items.map(event => compactCard(event, true)).join('')}</div></section>`).join('');
      bindEventActions(container);
    }
    const loadMore = $('#archiveLoadMore');
    if (loadMore) {
      loadMore.hidden = visible.length >= archived.length;
      loadMore.textContent = `Показать ещё (${archived.length - visible.length})`;
    }
  }

  function scheduleBoundary(activeEvents = splitCompleted().active) {
    clearTimeout(boundaryTimer);
    if (!activeEvents.length) return;
    const next = Math.min(...activeEvents.map(event => policy.remainingMs(completionTimestamp(event))));
    if (!Number.isFinite(next)) return;
    boundaryTimer = setTimeout(() => {
      archiveLimit = ARCHIVE_PAGE_SIZE;
      renderCompleted();
      renderArchive();
    }, Math.max(1000, Math.min(next + 1200, 2147483000)));
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

  renderToday = function renderTodayHistorySafeV82(events = []) {
    const result = previousRenderToday((events || []).filter(visibleInDay));
    scrubTodayDom();
    return result;
  };

  renderAll = function renderAllHistorySafeV82() {
    previousRenderAll();
    scrubTodayDom();
    renderCompleted();
    renderArchive();
  };

  setView = function setViewHistoryV82(view, options = {}) {
    if (view !== 'completed' && view !== 'archive') return previousSetView(view, options);
    state.currentView = view;
    $$('.view').forEach(element => element.classList.toggle('active', element.id === `view-${view}`));
    $$('.nav-item').forEach(element => element.classList.toggle('active', element.dataset.view === view));
    $('#sidebar')?.classList.remove('open');
    if (!options.skipHistory) pushAppHistory(view);
    if (view === 'completed') renderCompleted();
    else renderArchive();
  };

  function installObserver() {
    const container = $('#todayEvents');
    if (!container || container.dataset.historyObserverV82 === '1') return;
    container.dataset.historyObserverV82 = '1';
    new MutationObserver(() => scrubTodayDom()).observe(container, { childList:true, subtree:true });
  }

  const api = {
    render() { renderCompleted(); renderArchive(); },
    renderCompleted,
    renderArchive,
    completedEvents:() => splitCompleted().active,
    archivedEvents:() => splitCompleted().archived,
    splitCompleted,
    completionTimestamp,
    compactCard,
    scrub:scrubTodayDom,
  };
  globalThis.PMK_COMPLETED_ARCHIVE_WORKFLOW_V82_API = api;
  globalThis.PMK_COMPLETED_WORKFLOW_V80_API = api;

  const install = () => {
    createViews();
    installObserver();
    scrubTodayDom();
    renderCompleted();
    renderArchive();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once:true });
  else requestAnimationFrame(install);

  globalThis.addEventListener?.('pmk-status-ledger-updated', () => requestAnimationFrame(() => api.render()));
  globalThis.addEventListener?.('pmk-calendar-sync-done', () => requestAnimationFrame(() => api.render()));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestAnimationFrame(() => api.render());
  });
})();