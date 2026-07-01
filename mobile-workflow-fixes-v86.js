'use strict';

(() => {
  if (globalThis.PMK_MOBILE_WORKFLOW_FIXES_V86) return;
  globalThis.PMK_MOBILE_WORKFLOW_FIXES_V86 = true;

  const VERSION = '86';
  const CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const MOBILE_QUERY = '(max-width: 760px)';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const media = globalThis.matchMedia?.(MOBILE_QUERY);
  let scheduled = false;

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(globalThis.localStorage?.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function clean(value = '') {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalize(value = '') {
    return clean(value).toLowerCase().replace(/ё/g, 'е');
  }

  function eventForCard(card) {
    const id = String(card?.dataset?.eventCard || '');
    if (!id || typeof getAllEvents !== 'function') return null;
    return getAllEvents().find(item => String(item.id) === id) || null;
  }

  function pmkIdOf(event, data = {}) {
    return clean(data.pmkId || event?._pmkId || event?.pmkData?.pmkId || '');
  }

  function providerState(event, provider) {
    const data = typeof eventMeta === 'function' ? eventMeta(event) : (event?.pmkData || {});
    const providers = new Set(Array.isArray(event?._providers) ? event._providers.map(value => normalize(value)) : []);
    if (event?._provider) providers.add(normalize(event._provider));
    if (event?._yandexMirror) providers.add('yandex');

    const id = String(event?.id || '');
    if (id.startsWith('local-yandex-')) providers.add('yandex');
    if (id && !id.startsWith('local-') && !providers.has('yandex')) providers.add('google');

    const pmkId = pmkIdOf(event, data);
    const queue = readJson(QUEUE_KEY, []);
    const queued = Array.isArray(queue) && queue.some(item => normalize(item?.provider) === provider && (!pmkId || clean(item?.pmkId) === pmkId));
    const synced = providers.has(provider);

    if (synced) return { state: 'synced', label: provider === 'google' ? 'Google синхронизирован' : 'Яндекс синхронизирован' };
    if (queued) return { state: 'queued', label: provider === 'google' ? 'Google: ожидает синхронизации' : 'Яндекс: ожидает синхронизации' };

    if (provider === 'yandex') {
      const config = { enabled: true, apiUrl: '', syncToken: '', ...(readJson(CONFIG_KEY, {}) || {}) };
      if (!config.enabled || !config.apiUrl || !config.syncToken) return { state: 'offline', label: 'Яндекс не настроен на этом устройстве' };
      return { state: 'missing', label: 'Яндекс: копия заявки ещё не найдена' };
    }

    const googleConnected = Boolean((typeof state !== 'undefined' && state?.token) || globalThis.localStorage?.getItem('pmk-google-connected') === '1');
    return googleConnected
      ? { state: 'missing', label: 'Google: копия заявки ещё не найдена' }
      : { state: 'offline', label: 'Google не подключён на этом устройстве' };
  }

  function providerBadge(provider, state) {
    const letter = provider === 'google' ? 'G' : 'Я';
    const providerClass = provider === 'google' ? 'event-provider-google' : 'event-provider-yandex';
    return `<span class="event-provider-mark ${providerClass} pmk-provider-state is-${state.state}" data-contract-provider="${provider}" title="${state.label}" aria-label="${state.label}">${letter}</span>`;
  }

  function installProviderIndicators() {
    $$('.event-card[data-event-card]').forEach(card => {
      const event = eventForCard(card);
      if (!event) return;
      const google = providerState(event, 'google');
      const yandex = providerState(event, 'yandex');
      const signature = `${google.state}|${yandex.state}`;
      const row = $('.event-contract-provider-row', card) || $('.event-card-header', card) || $('.event-main', card);
      if (!row) return;
      let indicators = $('.event-provider-marks', row);
      if (!indicators) {
        indicators = document.createElement('span');
        indicators.className = 'event-provider-marks';
        const control = $('.contract-control', row);
        if (control) control.insertAdjacentElement('afterend', indicators);
        else row.prepend(indicators);
      }
      if (indicators.dataset.signature === signature && indicators.dataset.pmkV86 === '1') return;
      indicators.dataset.signature = signature;
      indicators.dataset.pmkV86 = '1';
      indicators.innerHTML = providerBadge('google', google) + providerBadge('yandex', yandex);
    });
  }

  function placeStatusControls() {
    const mobile = Boolean(media?.matches ?? globalThis.innerWidth <= 760);
    $$('.event-card[data-event-card]').forEach(card => {
      const time = $('.event-time', card);
      const footer = $('.event-card-footer-v85', card) || $('.event-actions', card);
      const status = $('.event-status-grid-v85, .status-row', card);
      if (!time || !status) return;
      if (mobile) {
        if (status.parentElement !== time) time.append(status);
        status.classList.add('pmk-status-under-time');
        card.classList.add('pmk-mobile-status-layout');
      } else {
        if (status.classList.contains('event-status-grid-v85') && status.parentElement !== card) {
          if (footer?.parentElement === card) card.insertBefore(status, footer);
          else card.append(status);
        } else if (status.classList.contains('status-row')) {
          const actions = $('.event-actions', card);
          if (actions && status.parentElement !== actions) actions.prepend(status);
        }
        status.classList.remove('pmk-status-under-time');
        card.classList.remove('pmk-mobile-status-layout');
      }
    });
  }

  function reorderWorkflowNavigation() {
    const inWork = $('.nav-item[data-view="in-work"], .nav-in-work');
    const delivery = $('.nav-item[data-view="delivery-waiting"]');
    const completed = $('.nav-item[data-view="completed"], .nav-completed');
    const archive = $('.nav-item[data-view="archive"], .nav-archive');
    if (!inWork || !delivery) return;
    if (inWork.nextElementSibling !== delivery) inWork.insertAdjacentElement('afterend', delivery);
    if (completed && delivery.nextElementSibling !== completed) delivery.insertAdjacentElement('afterend', completed);
    if (archive && completed && completed.nextElementSibling !== archive) completed.insertAdjacentElement('afterend', archive);
  }

  function disclosureCard(id, title, headingSelector) {
    const card = document.getElementById(id);
    if (!card || card.tagName === 'DETAILS') return card;

    const details = document.createElement('details');
    details.id = id;
    details.className = `${card.className || ''} settings-details pmk-settings-disclosure`.trim();
    details.dataset.pmkDisclosure = VERSION;

    const summary = document.createElement('summary');
    summary.textContent = title;
    const body = document.createElement('div');
    body.className = 'pmk-settings-disclosure-body';

    const heading = headingSelector ? card.querySelector(headingSelector) : null;
    if (heading) heading.remove();
    while (card.firstChild) body.append(card.firstChild);
    details.append(summary, body);
    card.replaceWith(details);
    details.open = false;
    return details;
  }

  function collapseAdvancedSettings() {
    disclosureCard('pmkYandexSettings', 'Яндекс.Календарь', ':scope > h2');
    disclosureCard('pmkManagerDeviceSetup', 'Подключение устройства менеджера', '.pmk-manager-device-heading h2');
  }

  function allFilterCandidates() {
    const selectors = [
      '[data-event-filter="all"]', '[data-filter="all"]', '[data-status-filter="all"]',
      '[data-sort="all"]', '[data-events="all"]', 'button[value="all"]', '[role="tab"][data-value="all"]',
    ];
    const direct = selectors.flatMap(selector => $$(selector));
    const contextual = $$('button,[role="tab"]').filter(button => {
      const label = normalize(button.textContent).replace(/\s+\d+$/, '');
      if (label !== 'все' && label !== 'все события') return false;
      return Boolean(button.closest('[class*="filter"],[id*="filter"],[class*="sort"],[id*="sort"],[role="tablist"],.segmented,.tabs'));
    });
    return [...new Set([...direct, ...contextual])];
  }

  function activateSummaryAll() {
    const total = $('#summaryTotal')?.closest('.summary-card');
    if (!total) return;
    const otherActive = $$('.summary-card.active[data-summary-filter]').some(card => card !== total && card.dataset.summaryFilter && card.dataset.summaryFilter !== 'all');
    total.dataset.summaryFilter = 'all';
    total.classList.add('summary-filterable');
    total.classList.toggle('active', !otherActive);
    total.tabIndex = 0;
    total.setAttribute('role', 'button');
    total.setAttribute('aria-label', 'Показать все события');
    total.setAttribute('aria-pressed', otherActive ? 'false' : 'true');
    const label = $('span', total);
    if (label && /^(всего|все)$/i.test(clean(label.textContent))) label.textContent = 'Все';
    if (total.dataset.pmkAllDefaultV86 !== '1' && !otherActive) {
      total.dataset.pmkAllDefaultV86 = '1';
      total.click();
    }
  }

  function activateAllFilter() {
    activateSummaryAll();
    allFilterCandidates().forEach(button => {
      if (button.dataset.pmkAllDefaultV86 === '1') return;
      button.dataset.pmkAllDefaultV86 = '1';
      const active = button.matches('.active,.is-active,[aria-selected="true"],[aria-pressed="true"]');
      if (!active && !button.disabled) button.click();
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', 'true');
    });
  }

  function bindBoardGestures(board) {
    if (!board || board.dataset.pmkGestureV86 === '1') return;
    board.dataset.pmkGestureV86 = '1';
    let startX = 0;
    let startY = 0;
    let moved = false;
    let suppressClickUntil = 0;

    board.addEventListener('touchstart', event => {
      const touch = event.touches?.[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      moved = false;
    }, { passive: true });

    board.addEventListener('touchmove', event => {
      const touch = event.touches?.[0];
      if (!touch) return;
      if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 8) moved = true;
    }, { passive: true });

    board.addEventListener('touchend', () => {
      if (moved) suppressClickUntil = Date.now() + 450;
    }, { passive: true });

    board.addEventListener('click', event => {
      if (Date.now() > suppressClickUntil) return;
      if (!event.target.closest('.day-event,.day-open,.day-add')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function enablePeriodScrolling() {
    const board = $('#weekEvents');
    if (!board) return;
    bindBoardGestures(board);
    board.dataset.pmkTouchScroll = VERSION;
  }

  function openSettingsDisclosureForInteraction(event) {
    if (event.target.closest('.pmk-provider-card[data-provider="yandex"]')) {
      setTimeout(() => {
        const details = $('#pmkYandexSettings');
        if (details?.tagName === 'DETAILS') details.open = true;
      }, 80);
    }
    const field = event.target.closest('#pmkYandexSettings input,#pmkYandexSettings button,#pmkManagerDeviceSetup input,#pmkManagerDeviceSetup button');
    const details = field?.closest('details');
    if (details) details.open = true;
  }

  function apply() {
    scheduled = false;
    document.documentElement.dataset.pmkMobileWorkflow = VERSION;
    collapseAdvancedSettings();
    reorderWorkflowNavigation();
    placeStatusControls();
    installProviderIndicators();
    enablePeriodScrolling();
    activateAllFilter();
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  function boot() {
    apply();
    const root = document.body || document.documentElement;
    new MutationObserver(scheduleApply).observe(root, { childList: true, subtree: true });
    media?.addEventListener?.('change', scheduleApply);
    globalThis.addEventListener('resize', scheduleApply, { passive: true });
    globalThis.addEventListener('pmk-calendar-sync-done', scheduleApply);
    globalThis.addEventListener('pmk-yandex-sync-done', scheduleApply);
    globalThis.addEventListener('pmk-yandex-sync-error', scheduleApply);
    globalThis.addEventListener('pmk-status-ledger-updated', scheduleApply);
    globalThis.addEventListener('storage', event => {
      if ([CONFIG_KEY, QUEUE_KEY].includes(event.key)) scheduleApply();
    });
    document.addEventListener('click', openSettingsDisclosureForInteraction, true);
    document.addEventListener('focusin', openSettingsDisclosureForInteraction, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
