'use strict';

const DEFAULT_SETTINGS = {
  clientId: '590025911241-pcl02les7r12l6stk1mb4aesdv294nba.apps.googleusercontent.com',
  calendarId: 'primary',
  timezone: 'Europe/Moscow',
  minimumOrder: 1800,
  duration: 30,
  strictRoute: false,
};

const ROUTES = {
  'Автозаводский': [1],
  'Ленинский': [1],
  'Канавинский': [1],
  'Московский': [2, 5],
  'Сормовский': [2, 5],
  'Нижегородский': [3, 6],
  'Советский': [3, 6],
  'Приокский': [3, 6],
};

const WEEKDAY_NAMES = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAY_ROUTE = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
const TOKEN_STORAGE_KEY = 'pmk-google-token';
const REQUEST_DURATION_MINUTES = 30;
const STATUS_OPTIONS = {
  'pending-pickup': { label: 'Ожидает забора', short: 'Забор', className: 'pending-pickup', colorId: '9' },
  'picked-up': { label: 'Забрали', short: 'Забрали', className: 'picked-up', colorId: '5' },
  'pending-delivery': { label: 'Ожидает доставки', short: 'Доставка', className: 'pending-delivery', colorId: '11' },
};
const state = {
  settings: loadSettings(),
  token: loadSavedToken(),
  tokenClient: null,
  events: [],
  localEvents: loadLocalEvents(),
  currentView: 'today',
  selectedDayKey: null,
  autoReconnectTried: false,
  silentReconnect: false,
};

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

function loadSettings() {
  try {
    const settings = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('pmk-settings') || '{}') };
    if (!settings.clientId || !settings.clientId.endsWith('.apps.googleusercontent.com')) settings.clientId = DEFAULT_SETTINGS.clientId;
    return settings;
  }
  catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings() {
  localStorage.setItem('pmk-settings', JSON.stringify(state.settings));
}

function loadLocalEvents() {
  try { return JSON.parse(localStorage.getItem('pmk-local-events') || '[]'); }
  catch { return []; }
}

function persistLocalEvents() {
  localStorage.setItem('pmk-local-events', JSON.stringify(state.localEvents));
}

function loadSavedToken() {
  try {
    const saved = JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY) || 'null');
    if (!saved?.accessToken || !saved?.expiresAt || Date.now() > saved.expiresAt) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    return saved.accessToken;
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

function saveToken(response) {
  const expiresIn = Number(response.expires_in || 3600);
  const expiresAt = Date.now() + Math.max(60, expiresIn - 60) * 1000;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ accessToken: response.access_token, expiresAt }));
}

function clearSavedToken() {
  state.token = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function pad(value) { return String(value).padStart(2, '0'); }
function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `pmk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function toDateInput(date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
function businessTodayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: state.settings.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function addDaysToKey(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function dateKeyForDisplay(dateKey) { return new Date(`${dateKey}T12:00:00Z`); }
function formatMoney(value) { return new Intl.NumberFormat('ru-RU').format(Number(value || 0)) + ' ₽'; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function normalizePhone(phone = '') { return phone.replace(/[^+\d]/g, ''); }
function phoneLink(phone = '') { return `tel:${normalizePhone(phone)}`; }
function hasSettlement(address = '') {
  return /(нижн(ий|его)?\s+новгород|(^|[\s,])бор([\s,]|$)|дзержинск|кстово|городец|балахна|богородск|павлово|арзамас|(^|[\s,])г\.|город|пос\.?|поселок|посёлок|(^|[\s,])д\.|деревня|село|(^|[\s,])с\.)/i.test(address);
}
function extractEntrance(...values) {
  const text = values.filter(Boolean).join(', ');
  return text.match(/(подъезд\s*№?\s*\d+|под\.?\s*\d+)/i)?.[0] || '';
}
function normalizeAddressForMap(address = '', accessInfo = '') {
  const rawParts = address.split(',').map(part => part.trim()).filter(Boolean);
  const publicParts = rawParts.filter(part => !/(кв\.?|квартира|офис|этаж|домофон|код|звонок|калитка)/i.test(part));
  const parts = hasSettlement(address) ? publicParts : ['Нижний Новгород', ...publicParts];
  const entrance = extractEntrance(address, accessInfo);
  if (entrance && !parts.some(part => part.toLowerCase().includes(entrance.toLowerCase()))) parts.push(entrance);
  return parts.join(', ');
}
function yandexMapLink(address = '', accessInfo = '') { return `https://yandex.ru/maps/?text=${encodeURIComponent(normalizeAddressForMap(address, accessInfo))}`; }
function googleMapLink(address = '', accessInfo = '') { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizeAddressForMap(address, accessInfo))}`; }
function normalizeTag(value = '') {
  if (value === 'Сложный запах') return 'Дезинфекция';
  if (value === 'Вычёсывание шерсти') return '';
  return value;
}
function normalizeTags(values = []) {
  return [...new Set(values.map(normalizeTag).filter(Boolean))];
}
function getCallAheadMinutes(data = {}) {
  return Number(data.callAheadMinutes || 30);
}
function formatCallAhead(minutes) {
  if (minutes === 60) return 'за 1 час';
  if (minutes === 120) return 'за 2 часа';
  return `за ${minutes} минут`;
}
function defaultStatusForVisit(visitType = 'pickup') {
  return visitType === 'delivery' ? 'pending-delivery' : 'pending-pickup';
}
function normalizeStatus(status, visitType = 'pickup') {
  return STATUS_OPTIONS[status] ? status : defaultStatusForVisit(visitType);
}
function statusInfo(status, visitType = 'pickup') {
  return STATUS_OPTIONS[normalizeStatus(status, visitType)];
}
function isPmkEvent(event) {
  return Boolean(decodePmkData(event));
}

function showToast(message, type = '') {
  const toast = qs('#toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.className = 'toast', 3200);
}

function setView(view) {
  state.currentView = view;
  const targetView = view === 'tomorrow' ? 'today' : view;
  if (view === 'today') state.selectedDayKey = businessTodayKey();
  if (view === 'tomorrow') state.selectedDayKey = addDaysToKey(businessTodayKey(), 1);
  qsa('.view').forEach(el => el.classList.toggle('active', el.id === `view-${targetView}`));
  qsa('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  qs('#sidebar').classList.remove('open');
  if (view === 'today' || view === 'tomorrow' || view === 'week') refreshEvents();
}

function initializeForm() {
  state.selectedDayKey = businessTodayKey();
  qs('#visitDate').value = businessTodayKey();
  addRug();
  updatePreview();
}

function addRug(data = {}) {
  const fragment = qs('#rugTemplate').content.cloneNode(true);
  const card = qs('.rug-card', fragment);
  qs('.rug-length', card).value = clampDimension(data.length || 1, 1, 5);
  qs('.rug-width', card).value = data.width || 0;
  qs('.rug-length-value', card).value = Number(qs('.rug-length', card).value).toFixed(1);
  qs('.rug-width-value', card).value = Number(qs('.rug-width', card).value).toFixed(1);
  qs('.rug-material', card).value = data.material || '';
  qs('.rug-pile', card).value = data.pile || '';
  setRugChecked(card, '.rug-issues', data.issues || []);
  setRugChecked(card, '.rug-services', data.services || []);
  qs('.remove-rug', card).addEventListener('click', () => {
    if (qsa('.rug-card').length <= 1) return showToast('В заявке должен остаться хотя бы один ковёр.', 'error');
    card.remove();
    renumberRugs(); updatePreview();
  });
  qsa('input,select', card).forEach(el => el.addEventListener('input', () => {
    syncRugDimension(card, el);
    if (el.type === 'range') vibrateTick();
    updateRugTotal(card); updatePreview();
  }));
  qs('#rugsContainer').appendChild(fragment);
  renumberRugs(); updateRugTotal(card);
}

function renumberRugs() {
  qsa('.rug-card').forEach((card, index) => qs('.rug-number', card).textContent = index + 1);
}

function updateRugTotal(card) {
  const length = Number(qs('.rug-length', card).value || 0);
  const width = Number(qs('.rug-width', card).value || 0);
  if (document.activeElement !== qs('.rug-length-value', card)) qs('.rug-length-value', card).value = length.toFixed(1);
  if (document.activeElement !== qs('.rug-width-value', card)) qs('.rug-width-value', card).value = width.toFixed(1);
  qs('.rug-total strong', card).textContent = `${(length * width).toFixed(2).replace('.00','')} м²`;
}

function clampDimension(value, min, max) {
  const number = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function syncRugDimension(card, source) {
  const pairs = [
    { range: qs('.rug-length', card), input: qs('.rug-length-value', card), min: 1, max: 5 },
    { range: qs('.rug-width', card), input: qs('.rug-width-value', card), min: 0, max: 4 },
  ];
  pairs.forEach(pair => {
    if (source === pair.range) pair.input.value = Number(pair.range.value).toFixed(1);
    if (source === pair.input) {
      const value = clampDimension(pair.input.value, pair.min, pair.max);
      pair.range.value = value;
    }
  });
}

function vibrateTick() {
  if (!navigator.vibrate) return;
  clearTimeout(vibrateTick.timer);
  vibrateTick.timer = setTimeout(() => navigator.vibrate(8), 35);
}

function collectRugs() {
  return qsa('.rug-card').map(card => ({
    length: Number(qs('.rug-length', card).value || 0),
    width: Number(qs('.rug-width', card).value || 0),
    material: qs('.rug-material', card).value,
    pile: qs('.rug-pile', card).value,
    issues: collectCheckedFrom(card, '.rug-issues'),
    services: collectCheckedFrom(card, '.rug-services'),
  }));
}

function collectCheckedFrom(root, selector) {
  return qsa(`${selector} input:checked`, root).map(el => el.value);
}

function setRugChecked(card, selector, values = []) {
  const normalizedValues = normalizeTags(values);
  qsa(`${selector} input`, card).forEach(input => input.checked = normalizedValues.includes(input.value));
}

function normalizeRugs(data = {}) {
  const sourceRugs = data.rugs?.length ? data.rugs : [{}];
  return sourceRugs.map((rug, index) => ({
    ...rug,
    issues: normalizeTags(Array.isArray(rug.issues) ? rug.issues : (index === 0 ? (data.issues || []) : [])),
    services: normalizeTags(Array.isArray(rug.services) ? rug.services : (index === 0 ? (data.services || []) : [])),
  }));
}

function getFormData() {
  const visitType = qs('input[name="visitType"]:checked')?.value || 'pickup';
  const rugs = collectRugs();
  return {
    version: 1,
    pmkId: qs('#eventId').dataset.pmkId || makeId(),
    eventId: qs('#eventId').value || '',
    visitType,
    customerName: qs('#customerName').value.trim(),
    phone: qs('#phone').value.trim(),
    orderSource: qs('#orderSource').value,
    address: qs('#address').value.trim(),
    district: qs('#district').value,
    accessInfo: qs('#accessInfo').value.trim(),
    visitDate: qs('#visitDate').value,
    startTime: qs('#startTime').value,
    endTime: qs('#endTime').value,
    requestStatus: normalizeStatus(qs('#requestStatus').value, visitType),
    rugs,
    issues: [...new Set(rugs.flatMap(rug => rug.issues || []))],
    services: [...new Set(rugs.flatMap(rug => rug.services || []))],
    estimatedPrice: Number(qs('#estimatedPrice').value || 0),
    discount: Number(qs('#discount').value || 0),
    callAhead: qs('#callAhead').checked,
    callAheadMinutes: Number(qs('#callAheadMinutes').value || 30),
    managerComment: qs('#managerComment').value.trim(),
  };
}

function eventTitle(data) {
  const type = data.visitType === 'delivery' ? 'ДОСТАВКА' : 'ЗАБОР';
  const rugs = data.rugs?.length ? `${data.rugs.length} ${pluralRugs(data.rugs.length)}` : 'ковры';
  return `${type} • ${data.customerName || 'Клиент'} • ${data.district || 'Район'} • ${rugs}`;
}

function pluralRugs(number) {
  const mod10 = number % 10, mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ковёр';
  if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return 'ковра';
  return 'ковров';
}

function eventDescription(data) {
  const rugs = normalizeRugs(data).map((rug, index) => {
    const size = rug.length && rug.width ? `${rug.length} × ${rug.width} м (${(rug.length*rug.width).toFixed(2).replace('.00','')} м²)` : 'размер не указан';
    const issues = rug.issues?.length ? `\n   Загрязнения: ${rug.issues.join(', ')}` : '';
    const services = rug.services?.length ? `\n   Доп. услуги: ${rug.services.join(', ')}` : '';
    return `${index + 1}. ${size}${rug.material ? `, ${rug.material}` : ''}${rug.pile ? `, ${rug.pile}` : ''}${issues}${services}`;
  }).join('\n');
  return [
    `Клиент: ${data.customerName || '—'}`,
    `Телефон: ${data.phone || '—'}`,
    `Источник: ${data.orderSource || 'не указан'}`,
    '',
    `Адрес: ${data.address || '—'}`,
    `Район: ${data.district || '—'}`,
    data.accessInfo ? `Доступ: ${data.accessInfo}` : '',
    `Тип визита: ${data.visitType === 'delivery' ? 'доставка' : 'забор'}`,
    `Статус: ${statusInfo(data.requestStatus, data.visitType).label}`,
    `Время: ${data.startTime || '—'}–${data.endTime || '—'}`,
    '',
    'Ковры:',
    rugs || '—',
    '',
    `Предварительная стоимость: ${data.estimatedPrice ? formatMoney(data.estimatedPrice) : 'не указана'}`,
    `Скидка: ${data.discount || 0}%`,
    data.callAhead ? `Позвонить ${formatCallAhead(getCallAheadMinutes(data))}: да` : 'Позвонить перед визитом: нет',
    data.managerComment ? `\nКомментарий:\n${data.managerComment}` : '',
  ].filter(line => line !== '').join('\n');
}

function updatePreview() {
  const data = getFormData();
  qs('#eventPreviewTitle').textContent = eventTitle(data);
  qs('#eventPreviewDescription').textContent = eventDescription(data);
  checkRoute(data);
  checkMinimum(data);
  checkConflicts(data);
}

function checkRoute(data) {
  const box = qs('#routeHint');
  box.className = 'info-box';
  if (!data.district || !data.visitDate) {
    box.textContent = 'Выберите район и дату — появится проверка маршрута.';
    return true;
  }
  const allowed = ROUTES[data.district];
  if (!allowed) {
    box.textContent = 'Для этого района маршрут не задан. День можно выбрать вручную.';
    return true;
  }
  const weekday = new Date(`${data.visitDate}T12:00:00`).getDay();
  const allowedNames = allowed.map(day => WEEKDAY_ROUTE[day]).join(' или ');
  if (allowed.includes(weekday)) {
    box.classList.add('good');
    box.textContent = `Подходит: ${data.district} обслуживается ${WEEKDAY_ROUTE[weekday]}.`;
    return true;
  }
  box.classList.add('warning');
  box.textContent = `Обратите внимание: ${data.district} обычно обслуживается ${allowedNames}. Выбран ${WEEKDAY_NAMES[weekday]}.`;
  return !state.settings.strictRoute;
}

function checkMinimum(data) {
  const box = qs('#minimumOrderHint');
  const tooLow = data.estimatedPrice > 0 && data.estimatedPrice < Number(state.settings.minimumOrder);
  box.classList.toggle('hidden', !tooLow);
  box.textContent = `Сумма ниже минимального заказа ${formatMoney(state.settings.minimumOrder)}.`;
}

function eventDates(data) {
  // Используется только для проверки порядка времени внутри формы.
  const start = new Date(`2000-01-01T${data.startTime || '00:00'}:00`);
  const end = new Date(`2000-01-01T${data.endTime || '00:00'}:00`);
  return { start, end };
}

function hasExplicitOffset(value = '') {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(String(value));
}

function businessDateTimeParts(value) {
  const raw = String(value || '');
  if (!raw) return { date: '', time: '' };
  if (!hasExplicitOffset(raw)) return { date: raw.slice(0, 10), time: raw.slice(11, 16) };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: state.settings.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(raw));
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${map.year}-${map.month}-${map.day}`, time: `${map.hour}:${map.minute}` };
}

function comparableEventRange(event) {
  const startValue = event.start?.dateTime || event.start;
  const endValue = event.end?.dateTime || event.end;
  const start = businessDateTimeParts(startValue);
  const end = businessDateTimeParts(endValue);
  return { start: `${start.date}T${start.time}`, end: `${end.date}T${end.time}` };
}

function checkConflicts(data) {
  const box = qs('#conflictHint');
  box.className = 'info-box hidden';
  if (!data.visitDate || !data.startTime || !data.endTime) return true;
  const formStart = `${data.visitDate}T${data.startTime}`;
  const formEnd = `${data.visitDate}T${data.endTime}`;
  const conflict = getAllEvents().find(event => {
    if (event.id === data.eventId) return false;
    const range = comparableEventRange(event);
    return formStart < range.end && formEnd > range.start;
  });
  if (!conflict) return true;
  box.className = 'info-box danger';
  box.textContent = `Есть пересечение: ${conflict.summary || 'другая заявка'} (${formatTime(conflict.start?.dateTime || conflict.start)}–${formatTime(conflict.end?.dateTime || conflict.end)}).`;
  return false;
}

function validateForm(data) {
  const required = [
    ['#customerName', data.customerName], ['#phone', data.phone], ['#address', data.address],
    ['#district', data.district], ['#visitDate', data.visitDate], ['#startTime', data.startTime], ['#endTime', data.endTime],
  ];
  required.forEach(([selector, value]) => qs(selector).classList.toggle('invalid', !value));
  if (required.some(([, value]) => !value)) { showToast('Заполните обязательные поля.', 'error'); return false; }
  if (normalizePhone(data.phone).replace('+','').length < 10) { qs('#phone').classList.add('invalid'); showToast('Проверьте номер телефона.', 'error'); return false; }
  const { start, end } = eventDates(data);
  if (!(start < end)) { showToast('Время окончания должно быть позже начала.', 'error'); return false; }
  if (!checkRoute(data)) { showToast('Выбранный день не соответствует маршруту.', 'error'); return false; }
  if (!checkConflicts(data)) { showToast('В выбранное время уже есть заявка.', 'error'); return false; }
  return true;
}

function encodePmkData(data) {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let binary = ''; bytes.forEach(byte => binary += String.fromCharCode(byte));
  const encoded = btoa(binary);
  const chunks = encoded.match(/.{1,850}/g) || [];
  const privateProps = { pmk: '1', pmkChunks: String(chunks.length), pmkId: data.pmkId };
  chunks.forEach((chunk, index) => privateProps[`pmkData${index}`] = chunk);
  return privateProps;
}

function decodePmkData(event) {
  try {
    const props = event.extendedProperties?.private || {};
    const count = Number(props.pmkChunks || 0);
    if (!count) return null;
    let encoded = ''; for (let index = 0; index < count; index++) encoded += props[`pmkData${index}`] || '';
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}

function toGoogleEvent(data) {
  const callAheadMinutes = getCallAheadMinutes(data);
  const currentStatus = statusInfo(data.requestStatus, data.visitType);
  return {
    summary: eventTitle(data),
    description: eventDescription(data),
    location: normalizeAddressForMap(data.address, data.accessInfo),
    start: { dateTime: `${data.visitDate}T${data.startTime}:00`, timeZone: state.settings.timezone },
    end: { dateTime: `${data.visitDate}T${data.endTime}:00`, timeZone: state.settings.timezone },
    colorId: currentStatus.colorId,
    reminders: data.callAhead ? { useDefault: false, overrides: [{ method: 'popup', minutes: callAheadMinutes }] } : { useDefault: true },
    extendedProperties: { private: encodePmkData(data) },
  };
}

async function googleRequest(path, options = {}) {
  if (!state.token) throw new Error('Google Calendar не подключён.');
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: { 'Authorization': `Bearer ${state.token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (response.status === 401) { clearSavedToken(); updateConnectionUI(); autoReconnectGoogle(true); throw new Error('Сессия Google истекла. Пробую переподключить автоматически.'); }
  if (!response.ok) { const body = await response.text(); throw new Error(`Google Calendar: ${response.status} ${body.slice(0,160)}`); }
  return response.status === 204 ? null : response.json();
}

function initializeGoogleTokenClient() {
  if (!state.settings.clientId) return false;
  if (!window.google?.accounts?.oauth2) return false;
  state.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: state.settings.clientId,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    callback: async response => {
      if (response.error) {
        state.silentReconnect = false;
        return response.error === 'interaction_required' ? updateConnectionUI() : showToast(`Google: ${response.error}`, 'error');
      }
      state.silentReconnect = false;
      state.token = response.access_token;
      saveToken(response);
      updateConnectionUI();
      showToast('Google Calendar подключён.', 'success');
      await refreshEvents();
    },
  });
  return true;
}

function connectGoogle() {
  if (!state.settings.clientId) { setView('settings'); showToast('Сначала укажите OAuth Client ID.', 'error'); return; }
  if (!initializeGoogleTokenClient()) { showToast('Библиотека Google ещё загружается. Повторите через несколько секунд.', 'error'); return; }
  state.silentReconnect = false;
  state.tokenClient.requestAccessToken({ prompt: state.token ? '' : 'consent' });
}

function autoReconnectGoogle(force = false) {
  if (state.token || (!force && state.autoReconnectTried)) return;
  state.autoReconnectTried = true;
  if (!initializeGoogleTokenClient()) return;
  try {
    state.silentReconnect = true;
    state.tokenClient.requestAccessToken({ prompt: '' });
  } catch {}
}

function scheduleGoogleAutoReconnect() {
  if (state.token) return refreshEvents();
  const started = Date.now();
  const timer = setInterval(() => {
    if (state.token || Date.now() - started > 10000) return clearInterval(timer);
    autoReconnectGoogle();
  }, 500);
}

function updateConnectionUI() {
  const badge = qs('#connectionBadge');
  badge.textContent = state.token ? 'Google подключён' : 'Демо-режим';
  badge.className = `status-badge ${state.token ? 'online' : 'offline'}`;
  qs('#connectGoogleBtn').textContent = state.token ? 'Переподключить' : 'Подключить Google';
  qs('#submitBtn').textContent = state.token ? (qs('#eventId').value ? 'Обновить в календаре' : 'Создать в календаре') : 'Сохранить в демо-календарь';
}

async function saveRequest(data, localOnly = false) {
  if (!validateForm(data)) return;
  if (!state.token || localOnly) {
    const id = data.eventId?.startsWith('local-') ? data.eventId : `local-${makeId()}`;
    const localData = { ...data, eventId: id };
    const googleEvent = toGoogleEvent(localData);
    const now = new Date().toISOString();
    const localEvent = { id, ...googleEvent, start: googleEvent.start, end: googleEvent.end, htmlLink: '', updated: now };
    state.localEvents = state.localEvents.filter(event => event.id !== id);
    state.localEvents.push(localEvent);
    persistLocalEvents();
    showToast(localOnly ? 'Черновик сохранён на устройстве.' : 'Заявка сохранена в демо-календаре.', 'success');
  } else {
    const body = toGoogleEvent(data);
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    if (data.eventId && !data.eventId.startsWith('local-')) {
      await googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(data.eventId)}`, { method: 'PATCH', body: JSON.stringify(body) });
      showToast('Заявка обновлена в Google Calendar.', 'success');
    } else {
      await googleRequest(`/calendars/${calendarId}/events`, { method: 'POST', body: JSON.stringify(body) });
      if (data.eventId?.startsWith('local-')) {
        state.localEvents = state.localEvents.filter(event => event.id !== data.eventId);
        persistLocalEvents();
      }
      showToast('Заявка создана в Google Calendar.', 'success');
    }
  }
  resetForm();
  setView('today');
}

async function updateEventStatus(id, nextStatus) {
  const event = getAllEvents().find(item => item.id === id);
  if (!event) return showToast('Заявка не найдена.', 'error');
  const data = eventMeta(event);
  const nextData = { ...data, requestStatus: nextStatus, eventId: id };
  const currentStatus = statusInfo(nextStatus, nextData.visitType);
  try {
    if (id.startsWith('local-')) {
      const googleEvent = toGoogleEvent(nextData);
      state.localEvents = state.localEvents.map(item => item.id === id ? { ...item, ...googleEvent, colorId: currentStatus.colorId } : item);
      persistLocalEvents();
    } else {
      const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
      if (isPmkEvent(event)) {
        await googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(toGoogleEvent(nextData)) });
      } else {
        await googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ colorId: currentStatus.colorId, description: appendExternalStatus(event.description || '', currentStatus.label) }),
        });
      }
    }
    showToast(`Статус: ${currentStatus.label}`, 'success');
    await refreshEvents();
  } catch (error) { showToast(error.message, 'error'); }
}

function appendExternalStatus(description = '', label = '') {
  const clean = String(description || '').replace(/\n?Статус ПМК: .*/g, '').trim();
  return `${clean}${clean ? '\n' : ''}Статус ПМК: ${label}`;
}

async function deleteEvent(id) {
  if (!confirm('Удалить эту заявку?')) return;
  try {
    if (id.startsWith('local-')) {
      state.localEvents = state.localEvents.filter(event => event.id !== id);
      persistLocalEvents();
    } else {
      const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
      await googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
    showToast('Заявка удалена.', 'success');
    resetForm();
    setView('today');
  } catch (error) { showToast(error.message, 'error'); }
}

async function refreshEvents() {
  try {
    if (state.token) {
      const start = new Date(); start.setUTCDate(start.getUTCDate() - 2);
      const end = new Date(); end.setUTCDate(end.getUTCDate() + 10);
      const params = new URLSearchParams({
        timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
      });
      const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
      const result = await googleRequest(`/calendars/${calendarId}/events?${params}`);
      state.events = result.items || [];
    }
    renderAll();
  } catch (error) { showToast(error.message, 'error'); renderAll(); }
}

function getAllEvents() {
  return [...state.events, ...state.localEvents].sort((a,b) => new Date(a.start?.dateTime || a.start) - new Date(b.start?.dateTime || b.start));
}

function startOfDay(date) { const value = new Date(date); value.setHours(0,0,0,0); return value; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function formatTime(value) { return businessDateTimeParts(value).time || '—'; }
function formatDateLong(dateKey) { return dateKeyForDisplay(dateKey).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }
function eventDateKey(event) { return businessDateTimeParts(event.start?.dateTime || event.start).date; }
function timeToMinutes(time = '00:00') {
  const [hours, minutes] = String(time).split(':').map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}
function minutesToTime(totalMinutes) {
  const minutes = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
function addMinutesToTime(time, minutes) {
  return minutesToTime(timeToMinutes(time) + Number(minutes || 30));
}
function autoSetEndTime() {
  qs('#endTime').value = addMinutesToTime(qs('#startTime').value || '10:00', REQUEST_DURATION_MINUTES);
  updatePreview();
}

function eventMeta(event) {
  const data = decodePmkData(event);
  if (data) return { ...data, requestStatus: normalizeStatus(data.requestStatus, data.visitType) };
  const summary = event.summary || '';
  const statusFromColor = Object.entries(STATUS_OPTIONS).find(([, item]) => item.colorId === event.colorId)?.[0];
  return {
    customerName: summary.split('•')[1]?.trim() || summary,
    visitType: summary.toUpperCase().includes('ДОСТАВКА') ? 'delivery' : 'pickup',
    phone: '', address: event.location || '', district: summary.split('•')[2]?.trim() || '', estimatedPrice: 0,
    requestStatus: normalizeStatus(statusFromColor, summary.toUpperCase().includes('ДОСТАВКА') ? 'delivery' : 'pickup'),
    visitDate: eventDateKey(event),
    startTime: formatTime(event.start?.dateTime || event.start),
    endTime: formatTime(event.end?.dateTime || event.end),
  };
}

function renderAll() {
  const todayKey = businessTodayKey();
  if (!state.selectedDayKey) state.selectedDayKey = todayKey;
  const all = getAllEvents();
  const weekKeys = Array.from({ length: 7 }, (_, index) => addDaysToKey(todayKey, index));
  const selectedEvents = all.filter(event => eventDateKey(event) === state.selectedDayKey);
  const todayEvents = all.filter(event => eventDateKey(event) === todayKey);
  const tomorrowEvents = all.filter(event => eventDateKey(event) === addDaysToKey(todayKey, 1));
  const weekEvents = all.filter(event => weekKeys.includes(eventDateKey(event)));
  qs('#todayCount').textContent = todayEvents.length;
  qs('#tomorrowCount').textContent = tomorrowEvents.length;
  qs('#weekCount').textContent = weekEvents.length;
  qs('#todayTitle').textContent = dayTitle(state.selectedDayKey);
  qs('#todaySubtitle').textContent = state.token ? 'Данные синхронизированы с Google Calendar.' : 'Работает демо-режим: заявки хранятся на устройстве.';
  qs('#summaryTotal').textContent = selectedEvents.length;
  qs('#summaryPickup').textContent = selectedEvents.filter(event => eventMeta(event).visitType === 'pickup').length;
  qs('#summaryDelivery').textContent = selectedEvents.filter(event => eventMeta(event).visitType === 'delivery').length;
  qs('#summaryAttention').textContent = selectedEvents.filter(event => !eventMeta(event).phone || !event.location).length;
  renderToday(selectedEvents);
  renderWeek(weekEvents);
}

function dayTitle(dateKey) {
  const todayKey = businessTodayKey();
  if (dateKey === todayKey) return `Сегодня, ${formatDateLong(dateKey)}`;
  if (dateKey === addDaysToKey(todayKey, 1)) return `Завтра, ${formatDateLong(dateKey)}`;
  return formatDateLong(dateKey).replace(/^./, char => char.toUpperCase());
}

function renderToday(events) {
  const container = qs('#todayEvents');
  container.innerHTML = renderDayTimeline(events);
  bindEventActions(container);
}

function renderEventCard(event, timelineStyle = '') {
  const data = eventMeta(event);
  const start = event.start?.dateTime || event.start;
  const end = event.end?.dateTime || event.end;
  const currentStatus = statusInfo(data.requestStatus, data.visitType);
  return `<article class="event-card status-${currentStatus.className}" ${timelineStyle}>
      <div class="event-time"><strong>${formatTime(start)}–${formatTime(end)}</strong><span>${data.visitType === 'delivery' ? 'Доставка' : 'Забор'}</span><em class="status-pill">${currentStatus.label}</em></div>
      <div class="event-main"><h3>${escapeHtml(event.summary || 'Заявка')}</h3><p>${addressCapsule(data, event)}${data.phone ? ` · ${escapeHtml(data.phone)}` : ''}${data.estimatedPrice ? ` · ${formatMoney(data.estimatedPrice)}` : ''}</p></div>
      <div class="event-actions">
        ${data.phone ? `<a class="mini-button" href="${phoneLink(data.phone)}">Позвонить</a>` : ''}
        ${routeButtons(data, event)}
        <button class="mini-button" data-edit-event="${escapeHtml(event.id)}">Изменить</button>
        ${statusButtons(event.id, data.requestStatus)}
        <button class="mini-button" data-delete-event="${escapeHtml(event.id)}">Удалить</button>
      </div>
    </article>`;
}

function renderDayTimeline(events) {
  const startHour = 8;
  const endHour = 22;
  const hourHeight = 84;
  const startMinute = startHour * 60;
  const endMinute = endHour * 60;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
  const currentParts = businessDateTimeParts(new Date().toISOString());
  const showNow = state.selectedDayKey === businessTodayKey();
  const nowTop = Math.max(0, Math.min((endMinute - startMinute) / 60 * hourHeight, (timeToMinutes(currentParts.time) - startMinute) / 60 * hourHeight));
  const eventItems = events.map(event => {
    const start = timeToMinutes(formatTime(event.start?.dateTime || event.start));
    const end = Math.max(start + 30, timeToMinutes(formatTime(event.end?.dateTime || event.end)));
    const top = Math.max(0, (start - startMinute) / 60 * hourHeight);
    const height = Math.max(66, Math.min(endMinute - startMinute, end - start) / 60 * hourHeight);
    return renderEventCard(event, `style="top:${top}px;min-height:${height}px"`);
  }).join('');
  return `<div class="day-timeline" style="--timeline-height:${(endHour - startHour) * hourHeight}px">
    <div class="timeline-hours">${hours.map(hour => `<div class="timeline-hour" style="height:${hourHeight}px"><span>${pad(hour)}:00</span></div>`).join('')}</div>
    <div class="timeline-track">
      ${hours.slice(0, -1).map((hour, index) => `<div class="timeline-line" style="top:${index * hourHeight}px"></div>`).join('')}
      ${showNow ? `<div class="timeline-now" style="top:${nowTop}px"><span>сейчас</span></div>` : ''}
      ${eventItems || '<div class="timeline-empty">Свободный день. Нажмите «＋ Заявка» в неделе или добавьте заявку сверху.</div>'}
    </div>
  </div>`;
}

function addressCapsule(data, event) {
  const address = data.address || event.location || '';
  if (!address) return '<span class="address-empty">Адрес не указан</span>';
  return `<a class="address-pill" target="_blank" rel="noopener" href="${yandexMapLink(address, data.accessInfo)}" title="Открыть в Яндекс Картах">${escapeHtml(address)}</a>`;
}

function routeButtons(data, event) {
  const address = data.address || event.location || '';
  if (!address) return '';
  return `<a class="mini-button route-yandex" target="_blank" rel="noopener" href="${yandexMapLink(address, data.accessInfo)}">Я.Карты</a><a class="mini-button" target="_blank" rel="noopener" href="${googleMapLink(address, data.accessInfo)}">Google</a>`;
}

function statusButtons(id, currentStatus) {
  return Object.entries(STATUS_OPTIONS).map(([status, item]) => (
    `<button class="status-dot status-${item.className}${status === currentStatus ? ' active' : ''}" title="${item.label}" aria-label="${item.label}" data-status-event="${escapeHtml(id)}" data-status="${status}"></button>`
  )).join('');
}

function renderWeek(events) {
  const board = qs('#weekEvents');
  const startKey = businessTodayKey();
  board.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const dateKey = addDaysToKey(startKey, index);
    const date = dateKeyForDisplay(dateKey);
    const dayEvents = events.filter(event => eventDateKey(event) === dateKey);
    return `<section class="day-column ${index === 0 ? 'today' : ''}">
      <button class="day-heading day-open" data-open-day="${dateKey}"><strong>${WEEKDAY_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${date.toLocaleDateString('ru-RU',{month:'short', timeZone:'UTC'})}</strong><span>${dayEvents.length} ${pluralPoints(dayEvents.length)}</span></button>
      <button class="mini-button day-add" data-add-day="${dateKey}">＋ Заявка</button>
      ${dayEvents.map(event => {
        const data = eventMeta(event);
        const currentStatus = statusInfo(data.requestStatus, data.visitType);
        return `<button class="day-event status-${currentStatus.className}" data-edit-event="${escapeHtml(event.id)}"><b>${formatTime(event.start?.dateTime || event.start)} · ${escapeHtml(event.summary || 'Заявка')}</b><span>${escapeHtml(event.location || data.address || 'Адрес не указан')}</span><em>${currentStatus.label}</em></button>`;
      }).join('') || '<div class="empty-state">Свободно</div>'}
    </section>`;
  }).join('');
  bindEventActions(board);
  qsa('[data-open-day]', board).forEach(button => button.addEventListener('click', () => openDay(button.dataset.openDay)));
  qsa('[data-add-day]', board).forEach(button => button.addEventListener('click', () => createEventForDay(button.dataset.addDay)));
}

function openDay(dateKey) {
  state.selectedDayKey = dateKey;
  const todayKey = businessTodayKey();
  state.currentView = dateKey === todayKey ? 'today' : (dateKey === addDaysToKey(todayKey, 1) ? 'tomorrow' : 'day');
  qsa('.view').forEach(el => el.classList.toggle('active', el.id === 'view-today'));
  qsa('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === state.currentView));
  qs('#sidebar').classList.remove('open');
  renderAll();
}

function createEventForDay(dateKey) {
  state.selectedDayKey = dateKey;
  resetForm();
  qs('#visitDate').value = dateKey;
  setView('form');
}

function pluralPoints(number) {
  const mod10 = number % 10, mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return 'точка';
  if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return 'точки';
  return 'точек';
}

function bindEventActions(root) {
  qsa('[data-edit-event]', root).forEach(button => button.addEventListener('click', event => { event.preventDefault(); openEvent(button.dataset.editEvent); }));
  qsa('[data-delete-event]', root).forEach(button => button.addEventListener('click', event => { event.preventDefault(); deleteEvent(button.dataset.deleteEvent); }));
  qsa('[data-status-event]', root).forEach(button => button.addEventListener('click', event => { event.preventDefault(); updateEventStatus(button.dataset.statusEvent, button.dataset.status); }));
}

function openEvent(id) {
  const event = getAllEvents().find(item => item.id === id);
  if (!event) return showToast('Заявка не найдена.', 'error');
  const data = decodePmkData(event);
  fillForm({ ...(data || eventMeta(event)), eventId: event.id, externalEvent: !data });
  setView('form');
}

function fillForm(data) {
  resetForm(false);
  qs('#eventId').value = data.eventId || '';
  qs('#eventId').dataset.pmkId = data.pmkId || makeId();
  qs('#customerName').value = data.customerName || '';
  qs('#phone').value = data.phone || '';
  qs('#orderSource').value = data.orderSource || '';
  qs('#address').value = data.address || '';
  qs('#district').value = data.district || '';
  qs('#accessInfo').value = data.accessInfo || '';
  qs(`input[name="visitType"][value="${data.visitType || 'pickup'}"]`).checked = true;
  qs('#visitDate').value = data.visitDate || businessTodayKey();
  qs('#startTime').value = data.startTime || '10:00';
  qs('#endTime').value = data.endTime || addMinutesToTime(qs('#startTime').value, REQUEST_DURATION_MINUTES);
  qs('#requestStatus').value = normalizeStatus(data.requestStatus, data.visitType);
  qs('#estimatedPrice').value = data.estimatedPrice || '';
  qs('#discount').value = data.discount || 0;
  qs('#callAhead').checked = data.callAhead !== false;
  qs('#callAheadMinutes').value = String(getCallAheadMinutes(data));
  qs('#managerComment').value = data.managerComment || '';
  qs('#rugsContainer').innerHTML = '';
  normalizeRugs(data).forEach(addRug);
  qs('#deleteEventBtn').classList.remove('hidden');
  qs('#formTitle').textContent = 'Редактирование заявки';
  updateConnectionUI(); updatePreview();
}

function resetForm(addDefaultRug = true) {
  qs('#requestForm').reset();
  qs('#eventId').value = '';
  qs('#eventId').dataset.pmkId = makeId();
  qs('#orderSource').value = '';
  qs('#visitDate').value = state.selectedDayKey || businessTodayKey();
  qs('#requestStatus').value = 'pending-pickup';
  qs('#startTime').value = '10:00'; qs('#endTime').value = addMinutesToTime('10:00', REQUEST_DURATION_MINUTES); qs('#discount').value = '0'; qs('#callAhead').checked = true; qs('#callAheadMinutes').value = '30';
  qs('#rugsContainer').innerHTML = '';
  if (addDefaultRug) addRug();
  qs('#deleteEventBtn').classList.add('hidden');
  qs('#formTitle').textContent = 'Новая заявка';
  updateConnectionUI(); updatePreview();
}

function setupSettingsUI() {
  qs('#clientIdSetting').value = state.settings.clientId;
  qs('#calendarIdSetting').value = state.settings.calendarId;
  qs('#timezoneSetting').value = state.settings.timezone;
  qs('#minimumOrderSetting').value = state.settings.minimumOrder;
  qs('#durationSetting').value = state.settings.duration;
  qs('#strictRouteSetting').checked = state.settings.strictRoute;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  setupSettingsUI(); initializeForm(); renderAll(); updateConnectionUI(); registerServiceWorker();
  scheduleGoogleAutoReconnect();

  qsa('.nav-item').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  qsa('[data-open-form]').forEach(button => button.addEventListener('click', () => { resetForm(); setView('form'); }));
  qs('#menuToggle').addEventListener('click', () => qs('#sidebar').classList.toggle('open'));
  qs('#connectGoogleBtn').addEventListener('click', connectGoogle);
  qs('#refreshBtn').addEventListener('click', refreshEvents);
  qs('#addRugBtn').addEventListener('click', () => addRug());
  qs('#startTime').addEventListener('input', autoSetEndTime);
  qsa('input[name="visitType"]').forEach(input => input.addEventListener('change', () => {
    if (qs('#requestStatus').value === 'pending-pickup' || qs('#requestStatus').value === 'pending-delivery') {
      qs('#requestStatus').value = defaultStatusForVisit(qs('input[name="visitType"]:checked')?.value);
    }
  }));
  qs('#cancelEditBtn').addEventListener('click', () => { resetForm(); setView('today'); });
  qs('#deleteEventBtn').addEventListener('click', () => {
    const id = qs('#eventId').value;
    if (!id) return showToast('Сначала откройте сохранённую заявку.', 'error');
    deleteEvent(id);
  });
  qs('#saveDraftBtn').addEventListener('click', () => saveRequest(getFormData(), true));
  qs('#requestForm').addEventListener('submit', async event => {
    event.preventDefault();
    try { await saveRequest(getFormData(), false); } catch (error) { showToast(error.message, 'error'); }
  });
  qs('#saveSettingsBtn').addEventListener('click', () => {
    state.settings = {
      clientId: qs('#clientIdSetting').value.trim() || DEFAULT_SETTINGS.clientId,
      calendarId: qs('#calendarIdSetting').value.trim() || 'primary',
      timezone: qs('#timezoneSetting').value.trim() || 'Europe/Moscow',
      minimumOrder: Number(qs('#minimumOrderSetting').value || 1800),
      duration: Number(qs('#durationSetting').value || 120),
      strictRoute: qs('#strictRouteSetting').checked,
    };
    saveSettings(); clearSavedToken(); state.tokenClient = null; state.autoReconnectTried = false; updateConnectionUI(); updatePreview();
    showToast('Настройки сохранены.', 'success');
  });
  qsa('#requestForm input, #requestForm select, #requestForm textarea').forEach(el => el.addEventListener('input', updatePreview));
});
