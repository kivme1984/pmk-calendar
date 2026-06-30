'use strict';

(() => {
  if (window.PMK_CLIENT_SEARCH_WORKFLOW_V66) return;
  window.PMK_CLIENT_SEARCH_WORKFLOW_V66 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

  function eventStamp(event = {}) {
    const raw = event.start?.dateTime || event.start?.date || event.start || event.updated || 0;
    const value = new Date(raw).getTime();
    return Number.isFinite(value) ? value : 0;
  }

  function contractFromEvent(event = {}, data = {}) {
    const direct = clean(data.contractNumber || '');
    if (direct) return direct;
    const text = [event.summary, event.description, event.location].filter(Boolean).join('\n');
    const labeled = text.match(/(?:^|\n|\s)(?:договор(?:\s+пмк)?|номер\s+договора|№\s*договора|д)\s*[:№#-]?\s*([дd]?\s*\d{3,4})\b/i);
    return clean(labeled?.[1] || '').replace(/\s+/g, '');
  }

  function contractDigits(value = '') {
    return String(value).replace(/\D/g, '');
  }

  function contractQuery(query = '') {
    const normalized = clean(query).toLowerCase().replace(/ё/g, 'е');
    const match = normalized.match(/^(?:(?:д|d|договор)\s*)?(?:№|#)?\s*[-:]?\s*(\d{3,4})$/i);
    return match ? match[1] : '';
  }

  function fullHistory() {
    return getAllEvents()
      .map(event => {
        const parsed = typeof pmkLegacyEventData === 'function'
          ? pmkLegacyEventData(event)
          : { data: eventMeta(event) || {}, raw: [event.summary, event.description, event.location].filter(Boolean).join('\n') };
        const data = { ...(parsed.data || {}) };
        data.contractNumber = contractFromEvent(event, data);
        return { event, data, raw: parsed.raw || '', stamp: eventStamp(event) };
      })
      .filter(item => item.data.phone || item.data.customerName || item.data.contractNumber)
      .sort((a, b) => b.stamp - a.stamp);
  }

  function searchText(item) {
    const data = item.data || {};
    return [
      data.customerName,
      data.phone,
      data.contractNumber,
      data.address,
      data.settlement,
      data.street,
      data.houseNumber,
      data.district,
      item.raw,
    ].filter(Boolean).join(' ').toLowerCase().replace(/ё/g, 'е');
  }

  function formatEventDate(item) {
    const dateKey = eventDateKey(item.event);
    const range = comparableEventRange(item.event);
    const date = dateKeyForDisplay(dateKey);
    const dateText = date.toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short', timeZone: 'UTC',
    });
    return `${dateText} · ${range.start.slice(11, 16)}–${range.end.slice(11, 16)}`;
  }

  function detailActions(item) {
    const content = $('#eventDetailsContent');
    if (!content) return;
    content.querySelector('.pmk-client-detail-actions')?.remove();
    const actions = document.createElement('div');
    actions.className = 'pmk-client-detail-actions';
    actions.innerHTML = `
      <button type="button" class="button button-secondary" data-client-detail-fill>Заполнить клиента</button>
      <button type="button" class="button button-primary" data-client-detail-repeat>Повторить заказ</button>`;
    content.appendChild(actions);
    $('[data-client-detail-fill]', actions)?.addEventListener('click', () => {
      $('#eventDetailsDialog')?.close?.();
      pmkApplyReturningClient(item, false);
    });
    $('[data-client-detail-repeat]', actions)?.addEventListener('click', () => {
      $('#eventDetailsDialog')?.close?.();
      pmkApplyReturningClient(item, true);
    });
  }

  function openHistoryItem(item) {
    if (typeof openEventDetails === 'function') {
      openEventDetails(item.event.id);
      requestAnimationFrame(() => detailActions(item));
      return;
    }
    if (typeof openEvent === 'function') openEvent(item.event.id);
  }

  function renderResults(query = '') {
    const results = $('#clientQuickResults');
    if (!results) return;
    window.pmkLastClientQuery = query;
    if (typeof pmkEnsureFullCalendarSync === 'function') pmkEnsureFullCalendarSync();

    const normalized = clean(query).toLowerCase().replace(/ё/g, 'е');
    const digits = normalized.replace(/\D/g, '');
    const exactContract = contractQuery(normalized);
    if (normalized.length < 2 && !exactContract) {
      if (typeof pmkCloseClientResults === 'function') pmkCloseClientResults();
      return;
    }

    const matches = fullHistory().filter(item => {
      if (exactContract) return contractDigits(item.data.contractNumber) === exactContract;
      const text = searchText(item);
      const phoneDigits = normalizePhone(item.data.phone || '').replace(/\D/g, '');
      const textMatch = text.includes(normalized);
      const phoneMatch = digits.length >= 5 && phoneDigits.includes(digits);
      return textMatch || phoneMatch;
    }).slice(0, 60);

    if (!matches.length) {
      results.innerHTML = window.PMK_FULL_CALENDAR_SYNC_READY || !state.token
        ? '<div class="client-quick-empty">Ничего не найдено. Для договора вводите, например: <b>Д453</b>, <b>договор 543</b> или <b>543</b>.</div>'
        : '<div class="client-quick-empty">Календарь ещё загружается. Результаты появятся автоматически.</div>';
      results.classList.remove('hidden');
      return;
    }

    results.innerHTML = matches.map((item, index) => {
      const data = item.data;
      const address = displayAddress(data, item.event) || data.address || item.event.location || 'Адрес не указан';
      const contract = data.contractNumber ? `<span class="client-history-contract">Договор ${escapeHtml(data.contractNumber)}</span>` : '';
      return `<article class="client-quick-item client-history-item">
        <div class="client-quick-main">
          <div class="client-history-top"><strong>${escapeHtml(data.customerName || 'Без имени')}</strong>${contract}</div>
          <span>${escapeHtml(data.phone || 'Телефон не указан')}</span>
          <small>${escapeHtml(address)}</small>
          <time>${escapeHtml(formatEventDate(item))}</time>
        </div>
        <div class="client-quick-actions">
          <button type="button" class="mini-button client-open" data-client-open="${index}">Открыть</button>
          <button type="button" class="mini-button" data-client-fill="${index}">Заполнить клиента</button>
          <button type="button" class="mini-button client-repeat" data-client-repeat="${index}">Повторить заказ</button>
        </div>
      </article>`;
    }).join('');

    results.classList.remove('hidden');
    $$('[data-client-open]', results).forEach(button => button.addEventListener('click', () => openHistoryItem(matches[Number(button.dataset.clientOpen)])));
    $$('[data-client-fill]', results).forEach(button => button.addEventListener('click', () => pmkApplyReturningClient(matches[Number(button.dataset.clientFill)], false)));
    $$('[data-client-repeat]', results).forEach(button => button.addEventListener('click', () => pmkApplyReturningClient(matches[Number(button.dataset.clientRepeat)], true)));
  }

  function install() {
    const input = $('#clientQuickSearch');
    if (!input) return false;
    input.placeholder = 'Имя, телефон или договор: Д453 / договор 543';
    const label = document.querySelector('label[for="clientQuickSearch"]');
    if (label) label.textContent = 'История клиента — новые заказы сверху';
    window.pmkClientHistory = fullHistory;
    window.pmkClientSearchText = searchText;
    window.pmkRenderClientResults = renderResults;
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 160) clearInterval(timer);
    }, 50);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();