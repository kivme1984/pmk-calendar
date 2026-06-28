'use strict';

let pmkLastClientQuery = '';

function pmkClientKey(data = {}) {
  return normalizePhone(data.phone || '').replace(/\D/g, '') || String(data.customerName || '').trim().toLowerCase();
}

function pmkLegacyLine(text = '', labels = []) {
  const labelPattern = labels.join('|');
  const match = String(text || '').match(new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*[:—-]\\s*([^\\n]+)`, 'i'));
  return match?.[1]?.trim() || '';
}

function pmkPhoneFromText(text = '') {
  const source = String(text || '');
  const labeled = pmkLegacyLine(source, ['Телефон', 'Тел\\.?', 'Номер телефона', 'Мобильный']);
  if (labeled) return labeled;
  return source.match(/(?:\+7|8)[\s(.-]*\d{3}[\s).-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/)?.[0]?.trim() || '';
}

function pmkLegacyEventData(event = {}) {
  const base = eventMeta(event) || {};
  const description = String(event.description || '');
  const raw = [event.summary, description, event.location].filter(Boolean).join('\n');
  const clientFromDescription = pmkLegacyLine(description, ['Клиент', 'Имя клиента', 'Заказчик', 'Имя']);
  const phoneFromDescription = pmkPhoneFromText(description || raw);
  const addressFromDescription = pmkLegacyLine(description, ['Адрес', 'Адрес клиента']);
  const districtFromDescription = pmkLegacyLine(description, ['Район']);
  const settlementFromDescription = pmkLegacyLine(description, ['Насел[её]нный пункт', 'Город']);
  const streetFromDescription = pmkLegacyLine(description, ['Улица']);
  const houseFromDescription = pmkLegacyLine(description, ['Дом']);
  const apartmentFromDescription = pmkLegacyLine(description, ['Квартира', 'Кв\\.?']);
  const entranceFromDescription = pmkLegacyLine(description, ['Подъезд']);
  const floorFromDescription = pmkLegacyLine(description, ['Этаж']);

  const data = {
    ...base,
    customerName: clientFromDescription || base.customerName || '',
    phone: base.phone || phoneFromDescription || '',
    address: base.address || addressFromDescription || event.location || '',
    district: base.district || districtFromDescription || '',
    settlement: base.settlement || settlementFromDescription || '',
    street: base.street || streetFromDescription || '',
    houseNumber: base.houseNumber || houseFromDescription || '',
    apartmentNumber: base.apartmentNumber || apartmentFromDescription || '',
    entrance: base.entrance || entranceFromDescription || '',
    floor: base.floor || floorFromDescription || '',
  };

  return { data, raw };
}

function pmkClientHistory() {
  const latest = new Map();
  getAllEvents().forEach(event => {
    const parsed = pmkLegacyEventData(event);
    const data = parsed.data;
    const key = pmkClientKey(data);
    if (!key || (!data.phone && !data.customerName)) return;
    const stamp = new Date(event.updated || event.start?.dateTime || event.start || 0).getTime();
    const previous = latest.get(key);
    if (!previous || stamp >= previous.stamp) latest.set(key, { event, data, raw: parsed.raw, stamp });
  });
  return [...latest.values()].sort((a, b) => b.stamp - a.stamp);
}

function pmkClientSearchText(item) {
  const data = item.data || {};
  return [
    data.customerName,
    data.phone,
    data.address,
    data.street,
    data.houseNumber,
    data.district,
    item.raw,
  ].filter(Boolean).join(' ').toLowerCase();
}

function pmkApplyReturningClient(item, includeOrder = false) {
  const previous = JSON.parse(JSON.stringify(item.data || {}));
  const current = getFormData();
  const next = {
    ...previous,
    eventId: '',
    pmkId: makeId(),
    visitType: current.visitType || 'pickup',
    visitDate: current.visitDate || state.selectedDayKey || businessTodayKey(),
    startTime: current.startTime || '10:00',
    endTime: current.endTime || addMinutesToTime(current.startTime || '10:00', REQUEST_DURATION_MINUTES),
    timeNote: current.timeNote || '',
    requestStatus: defaultStatusForVisit(current.visitType || 'pickup'),
    contractNumber: '',
    regularCustomer: true,
    orderSource: 'Постоянный клиент',
    managerComment: '',
    routeException: false,
    routeExceptionReason: '',
    routeExceptionFee: 0,
    routeExceptionApprovedBy: '',
    routeExceptionComment: '',
  };
  if (!includeOrder) {
    next.rugs = current.rugs?.length ? current.rugs : [{}];
    next.issues = [];
    next.services = [];
    next.estimatedPrice = current.estimatedPrice || 0;
    next.discount = current.discount || previous.discount || 10;
  }
  fillForm(next);
  qs('#eventId').value = '';
  qs('#eventId').dataset.pmkId = next.pmkId;
  qs('#deleteEventBtn').classList.add('hidden');
  qs('#formTitle').textContent = includeOrder ? 'Новая заявка — повторный заказ' : 'Новая заявка — постоянный клиент';
  qs('#clientQuickSearch').value = previous.phone || previous.customerName || '';
  pmkCloseClientResults();
  showToast(includeOrder ? 'Прошлый заказ скопирован. Проверьте ковры, дату и стоимость.' : 'Данные клиента заполнены.', 'success');
}

function pmkCloseClientResults() {
  const results = qs('#clientQuickResults');
  if (!results) return;
  results.classList.add('hidden');
  results.innerHTML = '';
}

function pmkClientSyncHint(text = '') {
  const hint = qs('#clientQuickHint');
  if (!hint) return;
  if (text) {
    hint.textContent = text;
    return;
  }
  const count = Number(window.PMK_FULL_CALENDAR_EVENT_COUNT || state.events?.length || 0);
  hint.textContent = state.token
    ? `Поиск по всему Google Calendar${count ? ` · загружено событий: ${count}` : ''}.`
    : 'Google не подключён — поиск только по локальным заявкам.';
}

function pmkEnsureFullCalendarSync() {
  if (!state.token || window.PMK_FULL_CALENDAR_SYNC_READY) return;
  pmkClientSyncHint('Загружаем все страницы Google Calendar…');
  window.PMK_FULL_CALENDAR_SYNC?.refresh?.();
}

function pmkRenderClientResults(query = '') {
  const results = qs('#clientQuickResults');
  if (!results) return;
  pmkLastClientQuery = query;
  pmkEnsureFullCalendarSync();

  const clean = query.trim().toLowerCase();
  const digits = clean.replace(/\D/g, '');
  if (clean.length < 2 && digits.length < 3) return pmkCloseClientResults();

  const matches = pmkClientHistory().filter(item => {
    const text = pmkClientSearchText(item);
    const phoneDigits = normalizePhone(item.data.phone || '').replace(/\D/g, '');
    return text.includes(clean) || (digits.length >= 3 && phoneDigits.includes(digits));
  }).slice(0, 30);

  if (!matches.length) {
    results.innerHTML = window.PMK_FULL_CALENDAR_SYNC_READY || !state.token
      ? '<div class="client-quick-empty">Клиент не найден во всём календаре. Заполните новую заявку.</div>'
      : '<div class="client-quick-empty">Календарь ещё загружается. Поиск обновится автоматически.</div>';
    results.classList.remove('hidden');
    return;
  }

  results.innerHTML = matches.map((item, index) => {
    const data = item.data;
    const address = displayAddress(data, item.event) || data.address || item.event.location || 'Адрес не указан';
    return `<article class="client-quick-item">
      <div class="client-quick-main">
        <strong>${escapeHtml(data.customerName || 'Без имени')}</strong>
        <span>${escapeHtml(data.phone || 'Телефон не указан')}</span>
        <small>${escapeHtml(address)}</small>
      </div>
      <div class="client-quick-actions">
        <button type="button" class="mini-button" data-client-fill="${index}">Заполнить клиента</button>
        <button type="button" class="mini-button client-repeat" data-client-repeat="${index}">Повторить заказ</button>
      </div>
    </article>`;
  }).join('');

  results.classList.remove('hidden');
  qsa('[data-client-fill]', results).forEach(button => button.addEventListener('click', () => pmkApplyReturningClient(matches[Number(button.dataset.clientFill)], false)));
  qsa('[data-client-repeat]', results).forEach(button => button.addEventListener('click', () => pmkApplyReturningClient(matches[Number(button.dataset.clientRepeat)], true)));
}

function pmkCreateClientSearch() {
  const phone = qs('#phone');
  const card = phone?.closest('.form-card');
  if (!phone || !card || qs('#clientQuickSearchWrap')) return;

  const style = document.createElement('style');
  style.textContent = `
    .client-quick-wrap{position:relative;margin:0 0 16px;padding:14px;border:1px solid rgba(0,0,0,.12);border-radius:14px;background:rgba(255,193,7,.08)}
    .client-quick-wrap label{display:block;font-weight:700;margin-bottom:7px}.client-quick-wrap input{width:100%;box-sizing:border-box}
    .client-quick-hint{display:block;margin-top:6px;font-size:12px;opacity:.78}.client-quick-results{position:absolute;z-index:50;left:0;right:0;top:calc(100% + 6px);max-height:60vh;overflow:auto;padding:8px;border:1px solid rgba(0,0,0,.16);border-radius:14px;background:var(--surface,#fff);box-shadow:0 18px 44px rgba(0,0,0,.22)}
    .client-quick-results.hidden{display:none}.client-quick-item{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:11px;border-bottom:1px solid rgba(0,0,0,.08)}.client-quick-item:last-child{border-bottom:0}
    .client-quick-main{min-width:0;display:grid;gap:3px}.client-quick-main strong{font-size:16px}.client-quick-main span,.client-quick-main small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.client-quick-main small{opacity:.75}
    .client-quick-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.client-repeat{font-weight:700}.client-quick-empty{padding:14px;text-align:center;opacity:.8}
    @media(max-width:700px){.client-quick-item{align-items:flex-start;flex-direction:column}.client-quick-actions{width:100%}.client-quick-actions button{flex:1}.client-quick-results{max-height:55vh}}
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.id = 'clientQuickSearchWrap';
  wrap.className = 'client-quick-wrap';
  wrap.innerHTML = `
    <label for="clientQuickSearch">Постоянный клиент — поиск по всему календарю</label>
    <input id="clientQuickSearch" type="search" autocomplete="off" inputmode="search" placeholder="Введите телефон или имя" />
    <small id="clientQuickHint" class="client-quick-hint"></small>
    <div id="clientQuickResults" class="client-quick-results hidden"></div>
  `;
  const firstGrid = card.querySelector('.field-grid');
  card.insertBefore(wrap, firstGrid || card.children[1] || null);

  const input = qs('#clientQuickSearch');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => pmkRenderClientResults(input.value), 120);
  });
  input.addEventListener('focus', () => {
    pmkEnsureFullCalendarSync();
    if (input.value.trim()) pmkRenderClientResults(input.value);
  });
  document.addEventListener('click', event => {
    if (!wrap.contains(event.target)) pmkCloseClientResults();
  });

  window.addEventListener('pmk-calendar-sync-start', () => pmkClientSyncHint('Загружаем все страницы Google Calendar…'));
  window.addEventListener('pmk-calendar-sync-progress', event => pmkClientSyncHint(`Загружаем Google Calendar · событий: ${event.detail?.count || 0}`));
  window.addEventListener('pmk-calendar-sync-done', event => {
    pmkClientSyncHint(`Поиск по всему Google Calendar · загружено событий: ${event.detail?.count || 0}.`);
    if (pmkLastClientQuery) pmkRenderClientResults(pmkLastClientQuery);
  });
  window.addEventListener('pmk-calendar-sync-error', () => pmkClientSyncHint('Не удалось загрузить весь календарь. Проверьте подключение Google.'));
  pmkClientSyncHint();
}

function pmkReturningClientInit() {
  pmkCreateClientSearch();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pmkReturningClientInit, { once: true });
else pmkReturningClientInit();