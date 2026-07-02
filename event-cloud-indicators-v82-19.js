'use strict';

(() => {
  if (globalThis.PMK_EVENT_CLOUD_INDICATORS_V82_19) return;
  globalThis.PMK_EVENT_CLOUD_INDICATORS_V82_19 = true;

  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const YANDEX_PREFIX = 'local-yandex-';
  let scheduled = false;
  let queueSignature = '';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function readQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function dataOf(event = {}) {
    try {
      if (typeof decodePmkData === 'function') return decodePmkData(event) || event.pmkData || {};
    } catch {}
    return event.pmkData || {};
  }

  function pmkIdOf(event = {}) {
    const data = dataOf(event);
    return String(data.pmkId || event._pmkId || event.pmkData?.pmkId || '').trim();
  }

  function allEvents() {
    try {
      return typeof getAllEvents === 'function' ? getAllEvents() : [];
    } catch {
      return [];
    }
  }

  function copiesOf(event = {}) {
    const pmkId = pmkIdOf(event);
    if (!pmkId) return [event];
    const copies = allEvents().filter(item => pmkIdOf(item) === pmkId);
    return copies.length ? copies : [event];
  }

  function queuedProviders(pmkId = '') {
    const pending = new Set();
    if (!pmkId) return pending;
    readQueue().forEach(item => {
      if (String(item?.pmkId || '') === pmkId && item?.op === 'upsert') pending.add(String(item.provider || ''));
    });
    return pending;
  }

  function snapshot(event = {}) {
    const pmkId = pmkIdOf(event);
    const pending = queuedProviders(pmkId);
    let google = false;
    let yandex = false;

    copiesOf(event).forEach(item => {
      const providers = Array.isArray(item?._providers) ? item._providers : [];
      if (providers.includes('google')) google = true;
      if (providers.includes('yandex')) yandex = true;

      const id = String(item?.id || '');
      if (item?._provider === 'yandex' || id.startsWith(YANDEX_PREFIX)) yandex = true;
      else if (id && !id.startsWith('local-')) google = true;
    });

    if (pending.has('google')) google = false;
    if (pending.has('yandex')) yandex = false;

    return {
      pmkId,
      google,
      yandex,
      googlePending: pending.has('google'),
      yandexPending: pending.has('yandex'),
    };
  }

  function providerTitle(provider, synced, pending) {
    const name = provider === 'google' ? 'Google' : 'Яндекс';
    if (synced) return `${name}: заявка находится в облаке`;
    if (pending) return `${name}: изменения ожидают синхронизации`;
    return `${name}: заявка не подтверждена в облаке`;
  }

  function ensureIndicator(root, compact = false) {
    let indicator = $('.pmk-event-cloud-status-v82-19', root);
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = `pmk-event-cloud-status-v82-19${compact ? ' is-compact' : ''}`;
      indicator.setAttribute('role', 'group');
      indicator.setAttribute('aria-label', 'Состояние заявки в облачных календарях');
      indicator.innerHTML = '<span class="pmk-event-cloud-provider-v82-19 is-google" data-event-cloud-provider="google">G</span><span class="pmk-event-cloud-provider-v82-19 is-yandex" data-event-cloud-provider="yandex">Я</span>';
    }
    return indicator;
  }

  function paint(indicator, event) {
    const state = snapshot(event);
    const google = $('[data-event-cloud-provider="google"]', indicator);
    const yandex = $('[data-event-cloud-provider="yandex"]', indicator);

    google?.classList.toggle('is-synced', state.google);
    yandex?.classList.toggle('is-synced', state.yandex);
    google?.classList.toggle('is-pending', state.googlePending);
    yandex?.classList.toggle('is-pending', state.yandexPending);

    if (google) {
      const title = providerTitle('google', state.google, state.googlePending);
      google.title = title;
      google.setAttribute('aria-label', title);
    }
    if (yandex) {
      const title = providerTitle('yandex', state.yandex, state.yandexPending);
      yandex.title = title;
      yandex.setAttribute('aria-label', title);
    }
    indicator.dataset.pmkId = state.pmkId;
    indicator.dataset.google = state.google ? 'synced' : (state.googlePending ? 'pending' : 'offline');
    indicator.dataset.yandex = state.yandex ? 'synced' : (state.yandexPending ? 'pending' : 'offline');
  }

  function eventById(id = '') {
    return allEvents().find(event => String(event.id || '') === String(id || '')) || null;
  }

  function decorateCard(card) {
    const event = eventById(card?.dataset?.eventCard);
    const header = $('.event-card-header', card);
    const contract = $('.contract-control', header || card);
    if (!event || !header || !contract) return;

    const indicator = ensureIndicator(header, false);
    if (!indicator.isConnected) contract.insertAdjacentElement('afterend', indicator);
    paint(indicator, event);
  }

  function decoratePeriodEvent(button) {
    const event = eventById(button?.dataset?.openEvent);
    if (!event) return;

    const indicator = ensureIndicator(button, true);
    if (!indicator.isConnected) {
      const contractLine = [...button.children].find(node => node.tagName === 'SPAN' && /^Договор\s*№/i.test(node.textContent || ''));
      const firstLine = $('b', button);
      if (contractLine) contractLine.insertAdjacentElement('afterend', indicator);
      else if (firstLine) firstLine.insertAdjacentElement('afterend', indicator);
      else button.prepend(indicator);
    }
    paint(indicator, event);
  }

  function renderNow() {
    scheduled = false;
    $$('.event-card[data-event-card]').forEach(decorateCard);
    $$('.day-event[data-open-event]').forEach(decoratePeriodEvent);
    queueSignature = localStorage.getItem(QUEUE_KEY) || '';
  }

  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(renderNow);
  }

  function relevantMutation(mutation) {
    return mutation.type === 'childList' && [...mutation.addedNodes].some(node => node.nodeType === 1 && (
      node.matches?.('.event-card[data-event-card],.day-event[data-open-event],.event-card-header,.contract-control') ||
      node.querySelector?.('.event-card[data-event-card],.day-event[data-open-event],.event-card-header,.contract-control')
    ));
  }

  function boot() {
    renderNow();
    const root = $('.main-content') || document.body;
    new MutationObserver(mutations => {
      if (mutations.some(relevantMutation)) scheduleRender();
    }).observe(root, { childList: true, subtree: true });

    ['pmk-calendar-sync-start', 'pmk-calendar-sync-done', 'pmk-calendar-sync-error', 'pmk-yandex-sync-done', 'pmk-yandex-sync-error', 'pmk-status-ledger-updated', 'storage', 'online']
      .forEach(name => globalThis.addEventListener(name, scheduleRender));

    document.addEventListener('click', event => {
      if (!event.target.closest('#submitBtn,[data-status-event],[data-contract-save],#pmkMiniRefresh,#pmkProvidersSyncBtn')) return;
      setTimeout(scheduleRender, 0);
      setTimeout(scheduleRender, 700);
      setTimeout(scheduleRender, 2200);
    }, true);

    setInterval(() => {
      if (document.hidden) return;
      const next = localStorage.getItem(QUEUE_KEY) || '';
      if (next !== queueSignature) scheduleRender();
    }, 1800);
  }

  globalThis.PMK_EVENT_CLOUD_INDICATORS_V82_19_API = {
    snapshot,
    renderNow,
    scheduleRender,
    pmkIdOf,
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
