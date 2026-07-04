'use strict';

(() => {
  if (window.PMK_CLIENT_SEARCH_FAST_V68) return;
  window.PMK_CLIENT_SEARCH_FAST_V68 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const normalize = value => clean(value).toLowerCase().replace(/ё/g, 'е');
  let indexRevision = -1;
  let indexCache = [];

  function line(text, labels) {
    const pattern = labels.join('|');
    const match = String(text || '').match(new RegExp(`(?:^|\\n|[.;])\\s*(?:${pattern})\\s*[:—–-]?\\s*([^\\n.;]+)`, 'i'));
    return clean(match?.[1] || '');
  }

  function phoneFromText(text = '') {
    return String(text).match(/(?:\+?7|8)?[\s()\-.]*\d{3}[\s()\-.]*\d{3}[\s\-.]*\d{2}[\s\-.]*\d{2}/)?.[0] || '';
  }

  function contractFromText(text = '') {
    return clean(String(text).match(/(?:договор(?:\s+пмк)?|номер\s+договора|№\s*договора|\bд)\s*[:№#-]?\s*([дd]?\s*\d{3,4})\b/i)?.[1] || '').replace(/\s+/g, '');
  }

  function eventStamp(event = {}) {
    const raw = event.start?.dateTime || event.start?.date || event.updated || 0;
    const value = new Date(raw).getTime();
    return Number.isFinite(value) ? value : 0;
  }

  function parseEvent(event = {}) {
    const base = eventMeta(event) || {};
    const description = String(event.description || '');
    const raw = [event.summary, description, event.location].filter(Boolean).join('\n');
    const nameFromSummary = String(event.summary || '').split('•')[1]?.trim() || '';
    const data = {
      ...base,
      customerName: line(description, ['Клиент', 'Имя клиента', 'Заказчик', 'Имя']) || base.customerName || nameFromSummary,
      phone: base.phone || line(description, ['Телефон', 'Тел\\.?', 'Номер телефона', 'Мобильный']) || phoneFromText(raw),
      contractNumber: base.contractNumber || line(description, ['Договор', 'Договор ПМК', 'Номер договора', '№ договора']) || contractFromText(raw),
      address: base.address || line(description, ['Адрес', 'Адрес клиента']) || event.location || '',
      settlement: base.settlement || line(description, ['Насел[её]нный пункт', 'Город']),
      district: base.district || line(description, ['Район']),
      street: base.street || line(description, ['Улица']),
      houseNumber: base.houseNumber || line(description, ['Дом']),
      apartmentNumber: base.apartmentNumber || line(description, ['Квартира', 'Кв\\.?']),
      entrance: base.entrance || line(description, ['Подъезд']),
      floor: base.floor || line(description, ['Этаж']),
    };
    const phoneDigits = normalizePhone(data.phone || '').replace(/\D/g, '');
    const contractDigits = String(data.contractNumber || '').replace(/\D/g, '');
    const search = normalize([
      data.customerName, data.phone, data.contractNumber, data.address, data.settlement,
      data.district, data.street, data.houseNumber, data.apartmentNumber, raw,
    ].filter(Boolean).join(' '));
    return { event, data, raw, phoneDigits, contractDigits, search, stamp: eventStamp(event) };
  }

  function signature() {
    const all = getAllEvents();
    const first = all[0];
    const last = all[all.length - 1];
    return [
      Number(window.PMK_EVENTS_REVISION || 0), all.length,
      first?.id || '', first?.updated || '', last?.id || '', last?.updated || '',
    ].join('|');
  }

  function buildIndex(force = false) {
    const revision = signature();
    if (!force && revision === indexRevision) return indexCache;
    indexRevision = revision;
    indexCache = getAllEvents()
      .map(parseEvent)
      .filter(item => item.data.customerName || item.data.phone || item.data.contractNumber)
      .sort((a, b) => b.stamp - a.stamp);
    return indexCache;
  }

  function contractQuery(query = '') {
    const match = normalize(query).match(/^(?:(?:д|d|договор)\s*)?(?:№|#)?\s*[-:]?\s*(\d{3,4})$/i);
    return match?.[1] || '';
  }

  function formatEventDate(item) {
    const dateKey = eventDateKey(item.event);
    const range = comparableEventRange(item.event);
    return `${dateKeyForDisplay(dateKey).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short', timeZone: 'UTC' })} · ${range.start.slice(11, 16)}–${range.end.slice(11, 16)}`;
  }

  function installSearchKeyStyles() {
    if (document.getElementById('pmk-client-search-key-style')) return;
    const style = document.createElement('style');
    style.id = 'pmk-client-search-key-style';
    style.textContent = `
      .pmk-search-key {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        width: fit-content;
        max-width: 100%;
        margin: 7px 0 2px;
        padding: 6px 9px;
        border-radius: 10px;
        background: rgba(255, 214, 0, .16);
        color: #ffd84d;
        font-size: 12.5px;
        font-weight: 800;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }
      .pmk-search-key b { color: inherit; font-weight: 900; }
    `;
    document.head.append(style);
  }

  function searchKeyForDisplay(item, query, exactContract, digits) {
    const original = clean(query);
    if (exactContract) return item.data.contractNumber || original || exactContract;
    if (digits.length >= 5 && item.phoneDigits.includes(digits)) return item.data.phone || original || digits;
    return original;
  }

  function addDetailActions(item) {
    const content = $('#eventDetailsContent');
    if (!content) return;
    $('.pmk-client-detail-actions', content)?.remove();
    const block = document.createElement('div');
    block.className = 'pmk-client-detail-actions';
    block.innerHTML = '<button type="button" class="button button-secondary" data-client-detail-fill>Заполнить клиента</button><button type="button" class="button button-primary" data-client-detail-repeat>Повторить заказ</button>';
    content.append(block);
    $('[data-client-detail-fill]', block)?.addEventListener('click', () => { closeEventDetails?.(); pmkApplyReturningClient(item, false); });
    $('[data-client-detail-repeat]', block)?.addEventListener('click', () => { closeEventDetails?.(); pmkApplyReturningClient(item, true); });
  }

  function openItem(item) {
    if (!item) return;
    openEventDetails(item.event.id);
    requestAnimationFrame(() => addDetailActions(item));
  }

  function renderResults(query = '') {
    const results = $('#clientQuickResults');
    if (!results) return;
    installSearchKeyStyles();
    pmkLastClientQuery = query;
    const normalized = normalize(query);
    const exactContract = contractQuery(normalized);
    const digits = normalized.replace(/\D/g, '');
    if (normalized.length < 2 && !exactContract) return pmkCloseClientResults();

    const matches = buildIndex().reduce((list, item) => {
      let matched = false;
      if (exactContract) matched = item.contractDigits === exactContract;
      else if (digits.length >= 5 && item.phoneDigits.includes(digits)) matched = true;
      else matched = item.search.includes(normalized);
      if (matched) list.push({ ...item, searchKey: searchKeyForDisplay(item, query, exactContract, digits) });
      return list;
    }, []).slice(0, 60);

    if (!matches.length) {
      results.innerHTML = '<div class="client-quick-empty">Ничего не найдено. Для договора используйте: <b>Д453</b>, <b>договор 453</b> или <b>453</b>.</div>';
      results.classList.remove('hidden');
      return;
    }

    results.innerHTML = matches.map((item, index) => {
      const data = item.data;
      const address = displayAddress(data, item.event) || data.address || item.event.location || 'Адрес не указан';
      const contract = data.contractNumber ? `<span class="client-history-contract">Договор ${escapeHtml(data.contractNumber)}</span>` : '';
      const searchKey = item.searchKey ? `<div class="pmk-search-key">🔎 Найдено по ключу: <b>${escapeHtml(item.searchKey)}</b></div>` : '';
      return `<article class="client-quick-item client-history-item">
        <div class="client-quick-main">
          <div class="client-history-top"><strong>${escapeHtml(data.customerName || 'Без имени')}</strong>${contract}</div>
          ${searchKey}
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

    $$('[data-client-open]', results).forEach(button => button.addEventListener('click', () => openItem(matches[Number(button.dataset.clientOpen)])));
    $$('[data-client-fill]', results).forEach(button => button.addEventListener('click', () => pmkApplyReturningClient(matches[Number(button.dataset.clientFill)], false)));
    $$('[data-client-repeat]', results).forEach(button => button.addEventListener('click', () => pmkApplyReturningClient(matches[Number(button.dataset.clientRepeat)], true)));
  }

  function invalidateAndRefresh() {
    indexRevision = -1;
    if (pmkLastClientQuery) renderResults(pmkLastClientQuery);
  }

  function install() {
    const input = $('#clientQuickSearch');
    if (!input) return false;
    installSearchKeyStyles();
    input.placeholder = 'Имя, телефон или договор: Д453 / договор 453';
    document.querySelector('label[for="clientQuickSearch"]')?.replaceChildren(document.createTextNode('История клиента — новые заказы сверху'));
    pmkClientHistory = () => buildIndex();
    pmkClientSearchText = item => item?.search || '';
    pmkRenderClientResults = renderResults;
    window.pmkRenderClientResults = renderResults;
    buildIndex(true);
    return true;
  }

  window.addEventListener('pmk-calendar-cache-ready', invalidateAndRefresh);
  window.addEventListener('pmk-calendar-sync-done', invalidateAndRefresh);
  window.addEventListener('pmk-local-events-changed', invalidateAndRefresh);

  const start = () => requestAnimationFrame(() => {
    if (!install()) setTimeout(install, 180);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();