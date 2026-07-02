'use strict';

(() => {
  if (globalThis.PMK_EVENT_PROVIDER_BADGES_V82_20) return;
  globalThis.PMK_EVENT_PROVIDER_BADGES_V82_20 = true;

  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let frame = 0;
  let observer = null;

  function readQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function dataOf(event) {
    try { return typeof eventMeta === 'function' ? (eventMeta(event) || {}) : {}; }
    catch { return event?.pmkData || {}; }
  }

  function pmkIdOf(event) {
    const data = dataOf(event);
    return String(data.pmkId || event?._pmkId || '').trim();
  }

  function isLocal(event) {
    return String(event?.id || '').startsWith('local-');
  }

  function providerState(event) {
    const pmkId = pmkIdOf(event);
    const pending = new Set(
      readQueue()
        .filter((item) => !pmkId || String(item?.pmkId || '') === pmkId)
        .map((item) => String(item?.provider || '')),
    );
    const providers = new Set(Array.isArray(event?._providers) ? event._providers : []);
    const id = String(event?.id || '');
    const yandexNative = event?._provider === 'yandex' || id.startsWith('local-yandex-');
    const googleNative = !isLocal(event) && event?._provider !== 'yandex';

    return {
      google: (providers.has('google') || googleNative) && !pending.has('google'),
      yandex: (providers.has('yandex') || yandexNative) && !pending.has('yandex'),
      pendingGoogle: pending.has('google'),
      pendingYandex: pending.has('yandex'),
    };
  }

  function badge(provider, letter, synced, pending) {
    const title = synced
      ? `${provider}: событие синхронизировано`
      : pending
        ? `${provider}: изменение ожидает синхронизации`
        : `${provider}: событие не синхронизировано`;
    return `<span class="pmk-event-provider-badge pmk-event-provider-${provider.toLowerCase()} ${synced ? 'is-synced' : 'is-offline'}${pending ? ' is-pending' : ''}" title="${title}" aria-label="${title}">${letter}</span>`;
  }

  function statusHtml(event) {
    const status = providerState(event);
    return `<span class="pmk-event-provider-badges" data-pmk-event-providers>
      ${badge('Google', 'G', status.google, status.pendingGoogle)}
      ${badge('Яндекс', 'Я', status.yandex, status.pendingYandex)}
    </span>`;
  }

  function eventById(id) {
    if (!id || typeof getAllEvents !== 'function') return null;
    try { return getAllEvents().find((event) => String(event.id) === String(id)) || null; }
    catch { return null; }
  }

  function eventForNode(node) {
    const id = node?.dataset?.eventCard || node?.dataset?.openEvent || node?.dataset?.historyEvent || '';
    return eventById(id);
  }

  function replaceStatus(host, event, placement = 'append') {
    if (!host || !event) return;
    $('[data-pmk-event-providers]', host)?.remove();
    const template = document.createElement('template');
    template.innerHTML = statusHtml(event).trim();
    const badges = template.content.firstElementChild;
    if (!badges) return;
    if (placement === 'prepend') host.prepend(badges);
    else host.append(badges);
  }

  function decorateFullCard(card) {
    const event = eventForNode(card);
    const header = $('.event-card-header', card);
    if (!event || !header) return;
    $('[data-pmk-event-providers]', header)?.remove();
    const contract = $('.contract-control', header);
    const template = document.createElement('template');
    template.innerHTML = statusHtml(event).trim();
    const badges = template.content.firstElementChild;
    if (!badges) return;
    if (contract) contract.insertAdjacentElement('afterend', badges);
    else header.prepend(badges);
  }

  function decoratePeriodCard(card) {
    const event = eventForNode(card);
    if (!event) return;
    replaceStatus(card, event, 'append');
  }

  function decorateHistoryCard(card) {
    const event = eventForNode(card);
    const row = $('.history-compact-title-row', card);
    if (!event || !row) return;
    replaceStatus(row, event, 'append');
  }

  function decorateAll() {
    frame = 0;
    $$('[data-event-card]').forEach(decorateFullCard);
    $$('#weekEvents [data-open-event].day-event').forEach(decoratePeriodCard);
    $$('[data-history-event]').forEach(decorateHistoryCard);
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(decorateAll);
  }

  function watch() {
    if (observer) return;
    const root = $('.main-content') || document.body;
    observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length))) schedule();
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  function installRenderHooks() {
    ['renderAll', 'renderToday', 'renderPeriod', 'renderSearch'].forEach((name) => {
      const current = globalThis[name];
      if (typeof current !== 'function' || current.__pmkEventProviderBadgesV8220) return;
      const wrapped = function eventProviderBadgesRenderHook(...args) {
        const result = current(...args);
        schedule();
        return result;
      };
      wrapped.__pmkEventProviderBadgesV8220 = true;
      Object.keys(current).forEach((key) => { try { wrapped[key] = current[key]; } catch {} });
      globalThis[name] = wrapped;
    });
  }

  function boot() {
    installRenderHooks();
    watch();
    decorateAll();
    ['pmk-calendar-sync-start', 'pmk-calendar-sync-done', 'pmk-calendar-sync-error', 'pmk-yandex-sync-done', 'pmk-yandex-sync-error', 'pmk-status-ledger-updated', 'online', 'offline', 'storage']
      .forEach((name) => globalThis.addEventListener(name, schedule));
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installRenderHooks();
      decorateAll();
      if (attempts >= 80) clearInterval(timer);
    }, 100);
  }

  globalThis.PMK_EVENT_PROVIDER_BADGES_V82_20_API = { providerState, decorateAll };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
