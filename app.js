'use strict';

const DEFAULT_SETTINGS = {
  clientId: '590025911241-pcl02les7r12l6stk1mb4aesdv294nba.apps.googleusercontent.com',
  calendarId: 'primary',
  timezone: 'Europe/Moscow',
  minimumOrder: 1800,
  duration: 30,
  strictRoute: false,
  theme: 'light',
  districtHours: '',
  notificationsEnabled: false,
  soundEnabled: true,
  notifyMinutes: 30,
};

const DEFAULT_DISTRICT_HOURS = [
  'Понедельник и четверг:',
  '14:00-16:00 Автозаводский',
  '16:00-17:00 Ленинский',
  '17:00-18:00 Канавинский',
  '18:00-19:00 Ленинский, вечерний выезд',
  '19:00-20:00 Автозаводский, вечерний выезд',
  '',
  'Вторник и пятница:',
  '15:00-17:00 Московский',
  '17:00-19:00 Сормовский',
  '19:00-20:00 Московский, вечерний выезд',
  '',
  'Среда и суббота:',
  '15:00-16:00 Приокский',
  '16:00-17:00 Советский',
  '17:00-18:00 Нижегородский',
  '18:00-19:00 Советский и Приокский, вечерний выезд',
  '',
  'Воскресенье: выходной',
].join('\n');

const ROUTES = {
  'Автозаводский': [1, 4],
  'Ленинский': [1, 4],
  'Канавинский': [1, 4],
  'Московский': [2, 5],
  'Сормовский': [2, 5],
  'Нижегородский': [3, 6],
  'Советский': [3, 6],
  'Приокский': [3, 6],
};
const PICKUP_SCHEDULE = {
  1: [
    ['14:00', '16:00', 'Автозаводский'],
    ['16:00', '17:00', 'Ленинский'],
    ['17:00', '18:00', 'Канавинский'],
    ['18:00', '19:00', 'Ленинский', 'вечерний выезд'],
    ['19:00', '20:00', 'Автозаводский', 'вечерний выезд'],
  ],
  2: [
    ['15:00', '17:00', 'Московский'],
    ['17:00', '19:00', 'Сормовский'],
    ['19:00', '20:00', 'Московский', 'вечерний выезд'],
  ],
  3: [
    ['15:00', '16:00', 'Приокский'],
    ['16:00', '17:00', 'Советский'],
    ['17:00', '18:00', 'Нижегородский'],
    ['18:00', '19:00', 'Советский', 'вечерний выезд'],
    ['18:00', '19:00', 'Приокский', 'вечерний выезд'],
  ],
  4: [
    ['14:00', '16:00', 'Автозаводский'],
    ['16:00', '17:00', 'Ленинский'],
    ['17:00', '18:00', 'Канавинский'],
    ['18:00', '19:00', 'Ленинский', 'вечерний выезд'],
    ['19:00', '20:00', 'Автозаводский', 'вечерний выезд'],
  ],
  5: [
    ['15:00', '17:00', 'Московский'],
    ['17:00', '19:00', 'Сормовский'],
    ['19:00', '20:00', 'Московский', 'вечерний выезд'],
  ],
  6: [
    ['15:00', '16:00', 'Приокский'],
    ['16:00', '17:00', 'Советский'],
    ['17:00', '18:00', 'Нижегородский'],
    ['18:00', '19:00', 'Советский', 'вечерний выезд'],
    ['18:00', '19:00', 'Приокский', 'вечерний выезд'],
  ],
};
const PERIOD_LABELS = {
  day: ['День', 'Один рабочий день с заявками и свободными окнами.'],
  'three-days': ['3 дня', 'Три дня рядом для быстрой раскладки маршрутов.'],
  week: ['Неделя', 'Семь дней с разбивкой по маршрутам.'],
  month: ['Месяц', 'Все заявки выбранного месяца.'],
};

const WEEKDAY_NAMES = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAY_ROUTE = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
const TOKEN_STORAGE_KEY = 'pmk-google-token';
const GOOGLE_CONNECTED_KEY = 'pmk-google-connected';
const REQUEST_DURATION_MINUTES = 30;
const STATUS_OPTIONS = {
  'pending-pickup': { label: 'Ожидает забора', short: 'Забор', className: 'pending-pickup', colorId: '9' },
  'picked-up': { label: 'Забрали', short: 'Забрали', className: 'picked-up', colorId: '5' },
  'pending-delivery': { label: 'Ожидает доставки', short: 'Доставка', className: 'pending-delivery', colorId: '11' },
  'completed': { label: 'Выполнено', short: 'Готово', className: 'completed', colorId: '10' },
};
const state = {
  settings: loadSettings(),
  token: loadSavedToken(),
  tokenClient: null,
  events: [],
  localEvents: loadLocalEvents(),
  currentView: 'day',
  returnView: 'day',
  selectedDayKey: null,
  periodAnchorKey: null,
  autoReconnectTried: false,
  silentReconnect: false,
  notifiedEvents: new Set(),
  previewTimer: null,
  conflictCacheKey: '',
  conflictCacheResult: null,
  scheduleSlotSignature: '',
  allEventsSignature: '',
  allEventsCache: [],
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
  invalidateEventCaches();
}

function invalidateEventCaches() {
  state.conflictCacheKey = '';
  state.conflictCacheResult = null;
  state.allEventsSignature = '';
  state.allEventsCache = [];
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
  localStorage.setItem(GOOGLE_CONNECTED_KEY, '1');
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
  const cleanAccess = cleanAccessInfo(accessInfo);
  const entrance = extractEntrance(address, cleanAccess) || cleanAccess.match(/подъезд\s*№?\s*\d+|под\.?\s*\d+/i)?.[0] || '';
  if (entrance && !parts.some(part => part.toLowerCase().includes(entrance.toLowerCase()))) parts.push(entrance);
  return parts.join(', ');
}
function yandexMapLink(address = '', accessInfo = '') { return `https://yandex.ru/maps/?text=${encodeURIComponent(normalizeAddressForMap(address, accessInfo))}`; }
function cleanAccessInfo(value = '') {
  return String(value).replace(/[,\-–—]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function cleanShortField(value = '') {
  return String(value).replace(/[,\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function prefixedValue(prefix, value = '') {
  const clean = cleanShortField(value);
  if (!clean) return '';
  const pattern = new RegExp(`^${prefix}\\.?\\s*`, 'i');
  const separator = ['д', 'кв'].includes(prefix) ? '. ' : ' ';
  return pattern.test(clean) ? clean : `${prefix}${separator}${clean}`;
}
function parseLegacyAddress(address = '', accessInfo = '') {
  const parts = String(address).split(',').map(part => part.trim()).filter(Boolean);
  const result = {
    settlement: '',
    street: '',
    houseNumber: '',
    apartmentNumber: '',
    entrance: '',
    floor: '',
  };
  const entrance = extractEntrance(address, accessInfo).match(/\d+[а-яa-z]?/i)?.[0] || '';
  const floor = String(accessInfo || address).match(/этаж\s*№?\s*(\d+[а-яa-z]?)/i)?.[1] || '';
  result.entrance = entrance;
  result.floor = floor;
  parts.forEach(part => {
    if (/кв\.?|квартира/i.test(part)) result.apartmentNumber = part.replace(/кв\.?|квартира/ig, '').trim();
    else if (/подъезд|под\./i.test(part)) result.entrance = part.match(/\d+[а-яa-z]?/i)?.[0] || result.entrance;
    else if (/этаж/i.test(part)) result.floor = part.match(/\d+[а-яa-z]?/i)?.[0] || result.floor;
    else if (!result.settlement && hasSettlement(part)) result.settlement = part;
    else if (!result.street) result.street = part;
    else if (!result.houseNumber) result.houseNumber = part.replace(/^д\.?\s*/i, '').trim();
  });
  if (!result.street && parts[0]) result.street = parts[0];
  return result;
}
function withAddressParts(data = {}) {
  const legacy = parseLegacyAddress(data.address || '', data.accessInfo || '');
  return {
    ...data,
    settlement: cleanShortField(data.settlement || legacy.settlement),
    street: cleanShortField(data.street || legacy.street),
    houseNumber: cleanShortField(data.houseNumber || legacy.houseNumber),
    apartmentNumber: cleanShortField(data.apartmentNumber || legacy.apartmentNumber),
    entrance: cleanShortField(data.entrance || legacy.entrance),
    floor: cleanShortField(data.floor || legacy.floor),
  };
}
function fullAddress(data = {}) {
  const item = withAddressParts(data);
  const settlement = item.settlement || 'Нижний Новгород';
  const parts = [
    settlement,
    item.district,
    item.street,
    prefixedValue('д', item.houseNumber),
    prefixedValue('кв', item.apartmentNumber),
    prefixedValue('подъезд', item.entrance),
    prefixedValue('этаж', item.floor),
  ].filter(Boolean);
  return parts.join(', ') || item.address || '';
}
function navigationAddress(data = {}) {
  const item = withAddressParts(data);
  const parts = [
    item.settlement || 'Нижний Новгород',
    item.street,
    prefixedValue('д', item.houseNumber),
    prefixedValue('подъезд', item.entrance),
  ].filter(Boolean);
  return parts.join(', ') || normalizeAddressForMap(item.address || '', item.accessInfo || '');
}
function yandexMapLinkForData(data = {}, event = {}) {
  return `https://yandex.ru/navi/?text=${encodeURIComponent(navigationAddress(data) || event.location || '')}`;
}
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
function parseDistrictHours() {
  return String(state.settings.districtHours || '').split(/\n|;/).reduce((map, line) => {
    const match = line.trim().match(/^(.+?)\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})$/);
    if (match) map[match[1].trim().toLowerCase()] = `${match[2]}–${match[3]}`;
    return map;
  }, {});
}
function pickupSlotsForDate(dateKey) {
  const weekday = dateKeyForDisplay(dateKey || businessTodayKey()).getUTCDay();
  return PICKUP_SCHEDULE[weekday] || [];
}
function formatPickupSlot(slot) {
  const [from, to, district, note] = slot;
  return `${from}-${to} ${district}${note ? ` (${note})` : ''}`;
}
function scheduleSlotsForDistrict(district = '', dateKey = '') {
  const districtKey = String(district).trim().toLowerCase();
  if (!districtKey || !dateKey) return [];
  return pickupSlotsForDate(dateKey).filter(([, , slotDistrict]) => String(slotDistrict).trim().toLowerCase() === districtKey);
}
function districtWorkingHours(district = '', dateKey = businessTodayKey()) {
  const districtKey = String(district).trim().toLowerCase();
  const scheduledSlots = scheduleSlotsForDistrict(district, dateKey).map(formatPickupSlot);
  if (scheduledSlots.length) return scheduledSlots.join(', ');
  return parseDistrictHours()[districtKey] || '';
}
function scheduleSlotValue(slot) {
  return `${slot[0]}|${slot[1]}|${slot[2]}|${slot[3] || ''}`;
}
function scheduleSlotLabel(slot) {
  const [, , , note] = slot;
  return `${slot[0]}-${slot[1]}${note ? ` (${note})` : ''}`;
}
function applyScheduleSlot(slot) {
  if (!slot) return;
  qs('#startTime').value = slot[0];
  qs('#endTime').value = slot[1];
  qs('#timeNote').value = `Ждёт по расписанию: ${scheduleSlotLabel(slot)}`;
}
function updateScheduleSlotOptions(force = false) {
  const field = qs('#scheduleSlotField');
  const select = qs('#scheduleSlotSelect');
  if (!field || !select) return;
  const signature = `${qs('#district').value}|${qs('#visitDate').value}|${qs('#startTime').value}|${qs('#endTime').value}|${force ? 'force' : ''}`;
  if (state.scheduleSlotSignature === signature) return;
  state.scheduleSlotSignature = signature;
  const slots = scheduleSlotsForDistrict(qs('#district').value, qs('#visitDate').value);
  field.classList.toggle('hidden', slots.length <= 1);
  select.innerHTML = slots.map(slot => `<option value="${escapeHtml(scheduleSlotValue(slot))}">${escapeHtml(scheduleSlotLabel(slot))}</option>`).join('');
  if (!slots.length) return;
  const current = slots.find(slot => slot[0] === qs('#startTime').value && slot[1] === qs('#endTime').value) || slots[0];
  select.value = scheduleSlotValue(current);
  if (force || !qs('#eventId').value) applyScheduleSlot(current);
}
function isScheduleNote(data = {}) {
  return /жд[её]т\s+по\s+расписанию/i.test(data.timeNote || '');
}
function notificationKey(event) { return event.id || `${event.summary}-${event.start?.dateTime || event.start}`; }
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

function setView(view, options = {}) {
  const previousView = state.currentView;
  state.currentView = view;
  const targetView = (view === 'day' || view === 'delivery-waiting') ? 'today' : (['three-days','week','month'].includes(view) ? 'week' : view);
  if (view === 'day' && !state.selectedDayKey) state.selectedDayKey = businessTodayKey();
  if (view === 'form' || view === 'reminder') state.returnView = options.returnView || (previousView === 'form' || previousView === 'reminder' ? state.returnView : previousView);
  qsa('.view').forEach(el => el.classList.toggle('active', el.id === `view-${targetView}`));
  qsa('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  qs('#sidebar').classList.remove('open');
  if (!options.skipHistory) pushAppHistory(view);
  syncDateControls();
  if (['day','three-days','week','month','delivery-waiting','search'].includes(view)) renderAll();
}

function pushAppHistory(view) {
  if (!history?.pushState) return;
  const hash = view === 'today' ? '#today' : `#${view}`;
  if (location.hash === hash && history.state?.pmkView === view) return;
  history.pushState({ pmkView: view, returnView: state.returnView, selectedDayKey: state.selectedDayKey, periodAnchorKey: state.periodAnchorKey }, '', hash);
}

function restoreFromHistory(event) {
  const view = event.state?.pmkView || state.returnView || 'day';
  if (event.state?.selectedDayKey) state.selectedDayKey = event.state.selectedDayKey;
  if (event.state?.periodAnchorKey) state.periodAnchorKey = event.state.periodAnchorKey;
  setView(view, { skipHistory: true });
}

function returnFromForm() {
  const target = state.returnView || 'day';
  resetForm();
  setView(target);
}

function initializeForm() {
  state.selectedDayKey = businessTodayKey();
  qs('#visitDate').value = businessTodayKey();
  addRug();
  updateScheduleSlotOptions(false);
  schedulePreviewUpdate();
}

function addRug(data = {}) {
  const fragment = qs('#rugTemplate').content.cloneNode(true);
  const card = qs('.rug-card', fragment);
  qs('.rug-length', card).value = clampDimension(data.length || 1, 1, 5);
  qs('.rug-width', card).value = data.width || 0;
  qs('.rug-material', card).value = data.material || '';
  qs('.rug-pile', card).value = data.pile || '';
  setRugChecked(card, '.rug-issues', data.issues || []);
  setRugChecked(card, '.rug-services', data.services || []);
  qs('.remove-rug', card).addEventListener('click', () => {
    if (qsa('.rug-card').length <= 1) return showToast('В заявке должен остаться хотя бы один ковёр.', 'error');
    card.remove();
    renumberRugs(); schedulePreviewUpdate();
  });
  qsa('input,select', card).forEach(el => el.addEventListener('input', () => {
    normalizeRugDimensionInput(el);
    updateRugTotal(card); schedulePreviewUpdate();
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
  qs('.rug-total strong', card).textContent = `${(length * width).toFixed(2).replace('.00','')} м²`;
}

function clampDimension(value, min, max) {
  const number = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function normalizeRugDimensionInput(input) {
  if (!input.classList.contains('rug-length') && !input.classList.contains('rug-width')) return;
  const min = input.classList.contains('rug-length') ? 1 : 0;
  const max = input.classList.contains('rug-length') ? 5 : 4;
  const value = clampDimension(input.value, min, max);
  if (input.value !== '' && document.activeElement !== input) input.value = value.toFixed(1);
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
  const addressData = {
    settlement: cleanShortField(qs('#settlement').value),
    street: cleanShortField(qs('#street').value),
    houseNumber: cleanShortField(qs('#houseNumber').value),
    apartmentNumber: cleanShortField(qs('#apartmentNumber').value),
    entrance: cleanShortField(qs('#entrance').value),
    floor: cleanShortField(qs('#floor').value),
  };
  const data = {
    version: 1,
    pmkId: qs('#eventId').dataset.pmkId || makeId(),
    eventId: qs('#eventId').value || '',
    visitType,
    customerName: qs('#customerName').value.trim(),
    phone: qs('#phone').value.trim(),
    orderSource: qs('#orderSource').value,
    ...addressData,
    district: qs('#district').value,
    visitDate: qs('#visitDate').value,
    startTime: qs('#startTime').value,
    endTime: qs('#endTime').value,
    timeNote: qs('#timeNote').value.trim(),
    requestStatus: normalizeStatus(qs('#requestStatus').value, visitType),
    rugs,
    issues: [...new Set(rugs.flatMap(rug => rug.issues || []))],
    services: [...new Set(rugs.flatMap(rug => rug.services || []))],
    estimatedPrice: Number(qs('#estimatedPrice').value || 0),
    discount: Number(qs('#discount').value || 0),
    contractNumber: cleanShortField(qs('#contractNumber').value),
    regularCustomer: qs('#regularCustomer').checked,
    callAhead: qs('#callAhead').checked,
    callAheadMinutes: Number(qs('#callAheadMinutes').value || 30),
    managerComment: qs('#managerComment').value.trim(),
  };
  data.address = fullAddress(data);
  data.accessInfo = [prefixedValue('подъезд', data.entrance), prefixedValue('этаж', data.floor)].filter(Boolean).join(' ');
  return data;
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
    data.contractNumber ? `Договор: ${data.contractNumber}` : '',
    `Район: ${data.district || '—'}`,
    data.accessInfo ? `Доступ: ${data.accessInfo}` : '',
    `Тип визита: ${data.visitType === 'delivery' ? 'доставка' : 'забор'}`,
    `Статус: ${statusInfo(data.requestStatus, data.visitType).label}`,
    `Время: ${data.startTime || '—'}–${data.endTime || '—'}`,
    data.timeNote ? `Пометка по времени: ${data.timeNote}` : '',
    isScheduleNote(data) && districtWorkingHours(data.district, data.visitDate) ? `Рабочее время района: ${districtWorkingHours(data.district, data.visitDate)}` : '',
    isScheduleNote(data) && !districtWorkingHours(data.district, data.visitDate) ? 'Рабочее время района: не задано в настройках' : '',
    '',
    'Ковры:',
    rugs || '—',
    '',
    `Предварительная стоимость: ${data.estimatedPrice ? formatMoney(data.estimatedPrice) : 'не указана'}`,
    `Скидка: ${data.discount || 0}%`,
    `Постоянный клиент: ${data.regularCustomer ? 'да' : 'нет'}`,
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

function schedulePreviewUpdate() {
  clearTimeout(state.previewTimer);
  state.previewTimer = setTimeout(updatePreview, 120);
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

function isSameRouteWindow(data, event, range) {
  const eventData = eventMeta(event);
  const formStart = `${data.visitDate}T${data.startTime}`;
  const formEnd = `${data.visitDate}T${data.endTime}`;
  return Boolean(
    data.district &&
    eventData.district &&
    data.district.trim().toLowerCase() === eventData.district.trim().toLowerCase() &&
    formStart === range.start &&
    formEnd === range.end
  );
}

function checkConflicts(data) {
  const box = qs('#conflictHint');
  box.className = 'info-box hidden';
  if (!data.visitDate || !data.startTime || !data.endTime) return true;
  const formStart = `${data.visitDate}T${data.startTime}`;
  const formEnd = `${data.visitDate}T${data.endTime}`;
  const events = getAllEvents();
  const cacheKey = [
    data.eventId || '',
    data.district || '',
    formStart,
    formEnd,
    events.length,
    events[events.length - 1]?.updated || '',
  ].join('|');
  if (state.conflictCacheKey === cacheKey && state.conflictCacheResult) {
    box.className = state.conflictCacheResult.className;
    box.textContent = state.conflictCacheResult.text;
    return state.conflictCacheResult.ok;
  }
  let routeWindowCount = 0;
  const conflict = events.find(event => {
    if (event.id === data.eventId) return false;
    const range = comparableEventRange(event);
    if (!range.start.startsWith(`${data.visitDate}T`) && !range.end.startsWith(`${data.visitDate}T`)) return false;
    if (isSameRouteWindow(data, event, range)) {
      routeWindowCount += 1;
      return false;
    }
    return formStart < range.end && formEnd > range.start;
  });
  if (!conflict && routeWindowCount) {
    state.conflictCacheKey = cacheKey;
    state.conflictCacheResult = { ok: true, className: 'info-box good', text: `В это окно уже есть ${routeWindowCount} ${pluralPoints(routeWindowCount)} по району ${data.district}. Можно добавить ещё заявку на это же время.` };
    box.className = state.conflictCacheResult.className;
    box.textContent = state.conflictCacheResult.text;
    return true;
  }
  if (!conflict) {
    state.conflictCacheKey = cacheKey;
    state.conflictCacheResult = { ok: true, className: 'info-box hidden', text: '' };
    return true;
  }
  state.conflictCacheKey = cacheKey;
  state.conflictCacheResult = { ok: false, className: 'info-box danger', text: `Есть пересечение: ${conflict.summary || 'другая заявка'} (${formatTime(conflict.start?.dateTime || conflict.start)}–${formatTime(conflict.end?.dateTime || conflict.end)}).` };
  box.className = state.conflictCacheResult.className;
  box.textContent = state.conflictCacheResult.text;
  return false;
}

function validateForm(data) {
  const required = [
    ['#customerName', data.customerName], ['#phone', data.phone], ['#street', data.street], ['#houseNumber', data.houseNumber],
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
    location: navigationAddress(data),
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
    include_granted_scopes: true,
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
  state.tokenClient.requestAccessToken({ prompt: '' });
}

function autoReconnectGoogle(force = false) {
  if (state.token || (!force && state.autoReconnectTried)) return;
  if (!force && localStorage.getItem(GOOGLE_CONNECTED_KEY) !== '1') return;
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
    if (state.token || Date.now() - started > 18000) return clearInterval(timer);
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
  state.selectedDayKey = data.visitDate || state.selectedDayKey;
  state.periodAnchorKey = state.selectedDayKey;
  if (state.token && !localOnly) await refreshEvents();
  resetForm();
  setView(['three-days','week','month','delivery-waiting','search'].includes(state.returnView) ? state.returnView : 'day');
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

async function updateEventContract(id, contractNumber) {
  const event = getAllEvents().find(item => item.id === id);
  if (!event) return showToast('Заявка не найдена.', 'error');
  const data = eventMeta(event);
  const nextData = { ...data, contractNumber: cleanShortField(contractNumber), eventId: id };
  try {
    if (id.startsWith('local-')) {
      const googleEvent = toGoogleEvent(nextData);
      state.localEvents = state.localEvents.map(item => item.id === id ? { ...item, ...googleEvent } : item);
      persistLocalEvents();
    } else {
      const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
      if (isPmkEvent(event)) {
        await googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(toGoogleEvent(nextData)) });
      } else {
        await googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ description: appendExternalContract(event.description || '', nextData.contractNumber) }),
        });
      }
    }
    showToast('Номер договора сохранен.', 'success');
    await refreshEvents();
  } catch (error) { showToast(error.message, 'error'); }
}

function appendExternalStatus(description = '', label = '') {
  const clean = String(description || '').replace(/\n?Статус ПМК: .*/g, '').trim();
  return `${clean}${clean ? '\n' : ''}Статус ПМК: ${label}`;
}

function appendExternalContract(description = '', contractNumber = '') {
  const clean = String(description || '').replace(/\n?Договор ПМК: .*/g, '').trim();
  return contractNumber ? `${clean}${clean ? '\n' : ''}Договор ПМК: ${contractNumber}` : clean;
}

async function deleteEvent(id) {
  const targetEvent = getAllEvents().find(item => item.id === id);
  const targetName = targetEvent ? (eventMeta(targetEvent).customerName || 'эту заявку') : 'эту заявку';
  if (!confirm(`Удалить заявку ${targetName}?`)) return;
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
    setView(state.returnView || 'day');
  } catch (error) { showToast(error.message, 'error'); }
}

function toReminderEvent(data) {
  const endTime = addMinutesToTime(data.time, data.duration || 30);
  return {
    summary: `НАПОМИНАНИЕ • ${data.text}`,
    description: data.text,
    location: '',
    start: { dateTime: `${data.date}T${data.time}:00`, timeZone: state.settings.timezone },
    end: { dateTime: `${data.date}T${endTime}:00`, timeZone: state.settings.timezone },
    colorId: '5',
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: Number(state.settings.notifyMinutes || 30) }] },
  };
}

async function saveReminder(data) {
  if (!data.date || !data.time || !data.text) return showToast('Заполните дату, время и текст напоминания.', 'error');
  const eventBody = toReminderEvent(data);
  if (!state.token) {
    const id = `local-reminder-${makeId()}`;
    state.localEvents.push({ id, ...eventBody, htmlLink: '', updated: new Date().toISOString() });
    persistLocalEvents();
    showToast('Напоминание сохранено локально.', 'success');
  } else {
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    await googleRequest(`/calendars/${calendarId}/events`, { method: 'POST', body: JSON.stringify(eventBody) });
    showToast('Напоминание создано в Google Calendar.', 'success');
  }
  qs('#reminderForm').reset();
  qs('#reminderDate').value = state.selectedDayKey || businessTodayKey();
  setView(state.returnView || 'day');
}

async function refreshEvents() {
  try {
    if (state.token) {
      const start = new Date(); start.setUTCDate(start.getUTCDate() - 3650);
      const end = new Date(); end.setUTCDate(end.getUTCDate() + 365);
      const params = new URLSearchParams({
        timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '2500',
      });
      const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
      const result = await googleRequest(`/calendars/${calendarId}/events?${params}`);
      state.events = result.items || [];
    }
    invalidateEventCaches();
    renderAll();
    openLinkedEvent();
    checkUpcomingNotifications();
  } catch (error) { invalidateEventCaches(); showToast(error.message, 'error'); renderAll(); }
}

function getAllEvents() {
  const signature = `${state.events.length}:${state.events[state.events.length - 1]?.id || ''}:${state.localEvents.length}:${state.localEvents[state.localEvents.length - 1]?.id || ''}`;
  if (state.allEventsSignature === signature) return state.allEventsCache;
  state.allEventsSignature = signature;
  state.allEventsCache = [...state.events, ...state.localEvents].sort((a,b) => new Date(a.start?.dateTime || a.start) - new Date(b.start?.dateTime || b.start));
  return state.allEventsCache;
}

function startOfDay(date) { const value = new Date(date); value.setHours(0,0,0,0); return value; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function formatTime(value) { return businessDateTimeParts(value).time || '—'; }
function formatDateLong(dateKey) { return dateKeyForDisplay(dateKey).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }
function formatDateShort(dateKey) { return dateKeyForDisplay(dateKey).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' }); }
function eventDateKey(event) { return businessDateTimeParts(event.start?.dateTime || event.start).date; }
function monthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: state.settings.timezone, year: 'numeric', month: '2-digit' }).formatToParts(date);
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}`;
}
function daysInMonthKey(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}
function periodKeys(period) {
  const todayKey = state.periodAnchorKey || businessTodayKey();
  if (period === 'day') return [state.selectedDayKey || todayKey];
  if (period === 'three-days') return Array.from({ length: 3 }, (_, index) => addDaysToKey(todayKey, index));
  if (period === 'month') {
    const base = new Date(`${todayKey}T12:00:00Z`);
    const key = monthKey(base);
    return Array.from({ length: daysInMonthKey(key) }, (_, index) => `${key}-${pad(index + 1)}`);
  }
  return Array.from({ length: 7 }, (_, index) => addDaysToKey(todayKey, index));
}
function routeDistrictsForWeekday(weekday) {
  const slots = PICKUP_SCHEDULE[weekday] || [];
  return slots.length ? slots.map(formatPickupSlot).join('; ') : 'Выходной';
}
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
  schedulePreviewUpdate();
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
  const selectedEvents = all.filter(event => eventDateKey(event) === state.selectedDayKey);
  const deliveryWaitingEvents = all
    .filter(event => eventMeta(event).requestStatus === 'pending-delivery')
    .sort((a, b) => comparableEventRange(a).start.localeCompare(comparableEventRange(b).start));
  const dayKeys = periodKeys('day');
  const threeDayKeys = periodKeys('three-days');
  const weekKeys = periodKeys('week');
  const monthKeys = periodKeys('month');
  const period = ['day','three-days','week','month'].includes(state.currentView) ? state.currentView : 'day';
  const activePeriodKeys = periodKeys(period);
  const periodEvents = all.filter(event => activePeriodKeys.includes(eventDateKey(event)));
  qs('#todayCount').textContent = all.filter(event => dayKeys.includes(eventDateKey(event))).length;
  qs('#threeDaysCount').textContent = all.filter(event => threeDayKeys.includes(eventDateKey(event))).length;
  qs('#weekCount').textContent = all.filter(event => weekKeys.includes(eventDateKey(event))).length;
  qs('#monthCount').textContent = all.filter(event => monthKeys.includes(eventDateKey(event))).length;
  qs('#deliveryWaitingCount').textContent = deliveryWaitingEvents.length;
  qs('#todayTitle').textContent = state.currentView === 'delivery-waiting' ? 'Ожидают доставки' : dayTitle(state.selectedDayKey);
  qs('#todaySubtitle').textContent = state.currentView === 'delivery-waiting'
    ? 'Ковры, которые уже забрали и нужно вернуть клиенту.'
    : (state.token ? 'Данные синхронизированы с Google Calendar.' : 'Работает демо-режим: заявки хранятся на устройстве.');
  const [periodTitle, periodSubtitle] = PERIOD_LABELS[period] || PERIOD_LABELS.week;
  qs('#periodTitle').textContent = periodTitle;
  qs('#periodSubtitle').textContent = periodSubtitle;
  const listEvents = state.currentView === 'delivery-waiting' ? deliveryWaitingEvents : selectedEvents;
  qs('#summaryTotal').textContent = listEvents.length;
  qs('#summaryPickup').textContent = listEvents.filter(event => eventMeta(event).visitType === 'pickup').length;
  qs('#summaryDelivery').textContent = listEvents.filter(event => eventMeta(event).visitType === 'delivery').length;
  qs('#summaryAttention').textContent = listEvents.filter(event => !eventMeta(event).phone || !displayAddress(eventMeta(event), event)).length;
  renderToday(listEvents);
  renderPeriod(periodEvents, activePeriodKeys, period);
  renderSearch();
  syncDateControls();
}

function syncDateControls() {
  const dayInput = qs('#jumpDate');
  if (dayInput) dayInput.value = state.selectedDayKey || businessTodayKey();
  const periodInput = qs('#jumpPeriodDate');
  if (periodInput) periodInput.value = state.periodAnchorKey || businessTodayKey();
}

function shiftSelectedDay(days) {
  state.selectedDayKey = addDaysToKey(state.selectedDayKey || businessTodayKey(), days);
  state.periodAnchorKey = state.selectedDayKey;
  state.currentView = 'day';
  renderAll();
  pushAppHistory('day');
}

function shiftPeriod(days) {
  state.periodAnchorKey = addDaysToKey(state.periodAnchorKey || businessTodayKey(), days);
  if (state.currentView === 'day') state.selectedDayKey = state.periodAnchorKey;
  renderAll();
  pushAppHistory(state.currentView);
}

function periodStepDays() {
  if (state.currentView === 'day') return 1;
  if (state.currentView === 'three-days') return 3;
  if (state.currentView === 'month') return 30;
  return 7;
}

function setupSwipeNavigation() {
  let startX = 0;
  let startY = 0;
  const threshold = 55;
  const start = event => {
    const touch = event.touches?.[0];
    if (!touch) return;
    startX = touch.clientX;
    startY = touch.clientY;
  };
  const end = event => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    if (qs('#sidebar').classList.contains('open') && dx < 0) {
      qs('#sidebar').classList.remove('open');
      return;
    }
    if (!['day', 'three-days', 'week', 'month'].includes(state.currentView)) return;
    shiftPeriod(dx < 0 ? periodStepDays() : -periodStepDays());
  };
  qs('.main-content').addEventListener('touchstart', start, { passive: true });
  qs('.main-content').addEventListener('touchend', end, { passive: true });
  qs('#sidebar').addEventListener('touchstart', start, { passive: true });
  qs('#sidebar').addEventListener('touchend', end, { passive: true });
}

function eventSearchText(event) {
  const data = eventMeta(event);
  return [
    event.summary, event.description, event.location,
    data.customerName, data.phone, data.contractNumber, data.address, data.district,
    data.timeNote, data.managerComment, data.orderSource,
  ].filter(Boolean).join(' ').toLowerCase();
}

function renderSearch() {
  const container = qs('#searchResults');
  const input = qs('#globalSearch');
  if (!container || !input) return;
  const query = input.value.trim().toLowerCase();
  if (!query) {
    container.innerHTML = '<div class="empty-state"><strong>Введите слово для поиска.</strong><br>Например: телефон, договор, улица, имя или район.</div>';
    return;
  }
  const results = getAllEvents().filter(event => eventSearchText(event).includes(query));
  container.innerHTML = results.length ? results.map(event => renderEventCard(event)).join('') : '<div class="empty-state"><strong>Ничего не найдено.</strong></div>';
  bindEventActions(container);
}

function dayTitle(dateKey) {
  const todayKey = businessTodayKey();
  if (dateKey === todayKey) return `Сегодня, ${formatDateLong(dateKey)}`;
  if (dateKey === addDaysToKey(todayKey, 1)) return `Завтра, ${formatDateLong(dateKey)}`;
  return formatDateLong(dateKey).replace(/^./, char => char.toUpperCase());
}

function renderToday(events) {
  const container = qs('#todayEvents');
  if (!events.length) { container.innerHTML = '<div class="empty-state"><strong>На этот день заявок нет.</strong><br>Добавьте первую заявку или подключите Google Calendar.</div>'; return; }
  container.innerHTML = events.map(event => renderEventCard(event)).join('');
  bindEventActions(container);
}

function eventRugs(data = {}) {
  return Array.isArray(data.rugs) ? data.rugs : [];
}

function formatAreaValue(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '';
  return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function rugSummary(data = {}) {
  const rugs = eventRugs(data);
  if (!rugs.length) return 'Ковры не указаны';
  const known = rugs.filter(rug => Number(rug.length) > 0 && Number(rug.width) > 0);
  const unknownCount = rugs.length - known.length;
  const totalArea = known.reduce((sum, rug) => sum + Number(rug.length) * Number(rug.width), 0);
  const countText = `${rugs.length} ${pluralRugs(rugs.length)}`;
  if (!known.length) return `${countText} • площадь не указана`;
  const areaText = `${formatAreaValue(totalArea)} м²`;
  return unknownCount ? `${countText} • ${areaText} + ${unknownCount} без размера` : `${countText} • ${areaText}`;
}

function sourceBadge(data = {}) {
  const source = cleanShortField(data.orderSource || '');
  const isMaxSource = /^(макс|max)$/i.test(source);
  const sourceHtml = source && !isMaxSource
    ? `<span class="quick-badge source-badge">${escapeHtml(source)}</span>`
    : '';
  const phone = normalizePhone(data.phone || '');
  const maxHtml = phone
    ? `<button type="button" class="quick-badge source-badge max-badge max-action" data-max-phone="${escapeHtml(phone)}" title="Скопировать номер и открыть MAX">MAX</button>`
    : '<span class="quick-badge source-badge max-badge max-disabled" title="Телефон клиента не указан">MAX</span>';
  return `${sourceHtml}${maxHtml}`;
}

function copyTextFallback(value) {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try { document.execCommand('copy'); } catch {}
  textarea.remove();
}

function openMaxContact(phone) {
  const normalized = normalizePhone(phone || '');
  if (!normalized) return showToast('В заявке не указан телефон клиента.', 'error');

  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(normalized).catch(() => copyTextFallback(normalized));
    } else copyTextFallback(normalized);
  } catch {
    copyTextFallback(normalized);
  }

  showToast(`Номер ${normalized} скопирован. Вставьте его в поиск MAX.`, 'success');

  if (/Android/i.test(navigator.userAgent)) {
    window.location.href = 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=ru.oneme.app;end';
    return;
  }

  window.location.href = 'https://max.ru/';
}

function scheduleBadge(data = {}) {
  if (data.callAhead) return `<span class="quick-badge schedule-badge">◷ Позвонить ${escapeHtml(formatCallAhead(getCallAheadMinutes(data)))}</span>`;
  if (isScheduleNote(data)) return '<span class="quick-badge schedule-badge">◷ Ждёт по расписанию</span>';
  return '';
}

function eventCommentText(data = {}) {
  return [data.timeNote, data.managerComment]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join('\n');
}

function renderContractControl(event, data = {}) {
  const id = escapeHtml(event.id);
  const number = cleanShortField(data.contractNumber || '');
  return `<div class="contract-control">
    <button type="button" class="contract-chip${number ? '' : ' empty'}" data-contract-toggle="${id}" aria-label="${number ? 'Изменить номер договора' : 'Добавить номер договора'}">
      ${number ? `№ ${escapeHtml(number)}` : '№ договора <span aria-hidden="true">✎</span>'}
    </button>
    <div class="contract-editor hidden" data-contract-editor="${id}">
      <input data-contract-input="${id}" value="${escapeHtml(number)}" placeholder="Номер договора" inputmode="numeric" aria-label="Номер договора" />
      <button type="button" class="mini-button contract-save" data-contract-save="${id}">Сохранить</button>
      <button type="button" class="mini-button contract-cancel" data-contract-cancel="${id}" aria-label="Закрыть">×</button>
    </div>
  </div>`;
}

function renderEventCard(event) {
  const data = eventMeta(event);
  const start = event.start?.dateTime || event.start;
  const end = event.end?.dateTime || event.end;
  const currentStatus = statusInfo(data.requestStatus, data.visitType);
  const title = data.customerName || event.summary || 'Заявка';
  const dateKey = eventDateKey(event);
  const date = dateKeyForDisplay(dateKey);
  const comment = eventCommentText(data);
  const id = escapeHtml(event.id);
  return `<article class="event-card status-${currentStatus.className}" data-event-card="${id}">
      <div class="event-time">
        <small class="event-date">${formatDateShort(dateKey)}</small>
        <small class="event-weekday">${escapeHtml(date.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'UTC' }))}</small>
        <strong>${formatTime(start)}–${formatTime(end)}</strong>
        <span>${data.visitType === 'delivery' ? 'Доставка' : 'Забор'}</span>
      </div>
      <div class="event-main">
        <div class="event-card-header">
          ${renderContractControl(event, data)}
          <h3 title="${escapeHtml(title)}">${escapeHtml(title)}</h3>
        </div>
        <div class="event-quick-badges">
          ${sourceBadge(data)}
          <span class="quick-badge rug-badge">▦ ${escapeHtml(rugSummary(data))}</span>
          ${scheduleBadge(data)}
        </div>
        ${addressCapsule(data, event)}
        ${comment ? `<div class="event-comment"><span aria-hidden="true">◯</span><p>${escapeHtml(comment)}</p><button type="button" data-toggle-comment="${id}">Ещё</button></div>` : ''}
      </div>
      <div class="event-actions">
        <div class="action-row status-row">${statusButtons(event.id, data.requestStatus)}</div>
        <div class="action-row manage-row">
          ${data.phone ? `<a class="mini-button call-button primary-card-action" href="${phoneLink(data.phone)}">☎ Позвонить</a>` : '<button type="button" class="mini-button primary-card-action" disabled>Телефон не указан</button>'}
          <button type="button" class="mini-button open-button secondary-card-action" data-open-event="${id}">Открыть</button>
          <details class="card-menu">
            <summary class="mini-button menu-button" aria-label="Дополнительные действия">⋮</summary>
            <div class="card-menu-popover">
              <button type="button" data-edit-event="${id}">Редактировать заявку</button>
              <button type="button" class="danger-menu-item" data-delete-event="${id}">Удалить заявку</button>
            </div>
          </details>
        </div>
      </div>
    </article>`;
}

function displayAddress(data = {}, event = {}) {
  const item = withAddressParts(data);
  if (item.street || item.houseNumber || item.address) return fullAddress(item);
  return event.location || '';
}

function addressCapsule(data, event) {
  const address = displayAddress(data, event);
  if (!address) return '<div class="address-block address-empty">Адрес не указан</div>';
  return `<a class="address-block" target="_blank" rel="noopener" href="${yandexMapLinkForData(data, event)}" title="Открыть в Яндекс Картах">
    <span class="address-icon" aria-hidden="true">⌖</span>
    <span class="address-text">${escapeHtml(address)}</span>
    <span class="address-arrow" aria-hidden="true">›</span>
  </a>`;
}

function statusButtons(id, currentStatus) {
  return Object.entries(STATUS_OPTIONS).map(([status, item]) => (
    `<button class="status-action status-${item.className}${status === currentStatus ? ' active' : ''}" title="${item.label}" aria-label="${item.label}" data-status-event="${escapeHtml(id)}" data-status="${status}">${item.label}</button>`
  )).join('');
}

function renderPeriod(events, dateKeys, period = 'week') {
  const board = qs('#weekEvents');
  board.className = `week-board ${period}-board ${dateKeys.length > 7 ? 'month-board' : ''}`.trim();
  const todayKey = businessTodayKey();
  board.innerHTML = dateKeys.map((dateKey, index) => {
    const date = dateKeyForDisplay(dateKey);
    const dayEvents = events.filter(event => eventDateKey(event) === dateKey);
    return `<section class="day-column ${dateKey === todayKey ? 'today' : ''}">
      <button class="day-heading day-open" data-open-day="${dateKey}"><strong>${WEEKDAY_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${date.toLocaleDateString('ru-RU',{month:'short', timeZone:'UTC'})}</strong><span>${dayEvents.length} ${pluralPoints(dayEvents.length)}</span><small>Маршрут: ${escapeHtml(routeDistrictsForWeekday(date.getUTCDay()))}</small></button>
      <button class="mini-button day-add" data-add-day="${dateKey}">＋ Заявка</button>
      ${dayEvents.map(event => {
        const data = eventMeta(event);
        const currentStatus = statusInfo(data.requestStatus, data.visitType);
        return `<button class="day-event status-${currentStatus.className}" data-open-event="${escapeHtml(event.id)}"><b>${formatTime(event.start?.dateTime || event.start)} · ${escapeHtml(data.customerName || event.summary || 'Заявка')}</b><span>${currentStatus.label}${data.district ? ` · ${escapeHtml(data.district)}` : ''}</span>${data.contractNumber ? `<span>Договор № ${escapeHtml(data.contractNumber)}</span>` : ''}<span>${escapeHtml(displayAddress(data, event) || 'Адрес не указан')}</span>${data.timeNote ? `<span>Время: ${escapeHtml(data.timeNote)}</span>` : ''}${data.managerComment ? `<span>${escapeHtml(data.managerComment)}</span>` : ''}</button>`;
      }).join('') || '<div class="empty-state">Свободно</div>'}
    </section>`;
  }).join('');
  bindEventActions(board);
  qsa('[data-open-day]', board).forEach(button => button.addEventListener('click', () => openDay(button.dataset.openDay)));
  qsa('[data-add-day]', board).forEach(button => button.addEventListener('click', () => createEventForDay(button.dataset.addDay)));
}

function openDay(dateKey) {
  state.selectedDayKey = dateKey;
  state.periodAnchorKey = dateKey;
  setView('day');
}

function createEventForDay(dateKey) {
  state.selectedDayKey = dateKey;
  resetForm();
  qs('#visitDate').value = dateKey;
  updateScheduleSlotOptions(true);
  setView('form');
}

function pluralPoints(number) {
  const mod10 = number % 10, mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return 'точка';
  if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return 'точки';
  return 'точек';
}

function bindEventActions(root) {
  qsa('[data-open-event]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    openEventDetails(button.dataset.openEvent);
  }));
  qsa('[data-edit-event]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    button.closest('details')?.removeAttribute('open');
    openEvent(button.dataset.editEvent);
  }));
  qsa('[data-delete-event]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    button.closest('details')?.removeAttribute('open');
    deleteEvent(button.dataset.deleteEvent);
  }));
  qsa('[data-status-event]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    updateEventStatus(button.dataset.statusEvent, button.dataset.status);
  }));
  qsa('[data-contract-toggle]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const editor = qsa('[data-contract-editor]', root).find(item => item.dataset.contractEditor === button.dataset.contractToggle);
    if (!editor) return;
    editor.classList.toggle('hidden');
    if (!editor.classList.contains('hidden')) {
      const input = qs('[data-contract-input]', editor);
      input?.focus();
      input?.select();
    }
  }));
  qsa('[data-contract-input]', root).forEach(input => {
    input.addEventListener('click', event => event.stopPropagation());
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      updateEventContract(input.dataset.contractInput, input.value || '');
    });
  });
  qsa('[data-contract-save]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const input = qsa('[data-contract-input]', root).find(item => item.dataset.contractInput === button.dataset.contractSave);
    updateEventContract(button.dataset.contractSave, input?.value || '');
  }));
  qsa('[data-contract-cancel]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const editor = qsa('[data-contract-editor]', root).find(item => item.dataset.contractEditor === button.dataset.contractCancel);
    editor?.classList.add('hidden');
  }));
  qsa('[data-max-phone]', root).forEach(button => button.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  openMaxContact(button.dataset.maxPhone);
}));
  qsa('[data-toggle-comment]', root).forEach(button => {
    const block = button.closest('.event-comment');
    const paragraph = qs('p', block);
    requestAnimationFrame(() => {
      if (paragraph && paragraph.scrollHeight <= paragraph.clientHeight + 2) button.hidden = true;
    });
    button.addEventListener('click', event => {
      event.preventDefault();
      const expanded = block?.classList.toggle('expanded');
      button.textContent = expanded ? 'Свернуть' : 'Ещё';
    });
  });
}

function renderDetailValue(label, value, options = {}) {
  const content = value || '—';
  return `<div class="detail-value${options.wide ? ' wide' : ''}"><span>${escapeHtml(label)}</span><strong>${options.html ? content : escapeHtml(content)}</strong></div>`;
}

function renderRugDetails(data = {}) {
  const rugs = eventRugs(data);
  if (!rugs.length) return '<div class="details-empty">Информация о коврах не указана.</div>';
  return rugs.map((rug, index) => {
    const hasSize = Number(rug.length) > 0 && Number(rug.width) > 0;
    const area = hasSize ? Number(rug.length) * Number(rug.width) : 0;
    const size = hasSize ? `${rug.length} × ${rug.width} м · ${formatAreaValue(area)} м²` : 'Размер не указан';
    const issues = Array.isArray(rug.issues) && rug.issues.length ? rug.issues.join(', ') : 'Не указаны';
    const services = Array.isArray(rug.services) && rug.services.length ? rug.services.join(', ') : 'Не указаны';
    return `<article class="details-rug-card">
      <div class="details-rug-title"><strong>Ковёр ${index + 1}</strong><span>${escapeHtml(size)}</span></div>
      <div class="details-rug-grid">
        ${renderDetailValue('Материал', rug.material || 'Не указан')}
        ${renderDetailValue('Ворс', rug.pile || 'Не указан')}
        ${renderDetailValue('Загрязнения', issues, { wide: true })}
        ${renderDetailValue('Дополнительные услуги', services, { wide: true })}
      </div>
    </article>`;
  }).join('');
}

function renderEventDetailsHtml(event) {
  const data = eventMeta(event);
  const status = statusInfo(data.requestStatus, data.visitType);
  const address = displayAddress(data, event);
  const phoneHtml = data.phone ? `<a href="${phoneLink(data.phone)}">${escapeHtml(data.phone)}</a>` : '—';
  const addressHtml = address ? `<a target="_blank" rel="noopener" href="${yandexMapLinkForData(data, event)}">${escapeHtml(address)} <span aria-hidden="true">›</span></a>` : '—';
  const comment = eventCommentText(data);
  const source = data.orderSource || 'Не указан';
  const contract = data.contractNumber ? `№ ${data.contractNumber}` : 'Не указан';
  const visitDate = eventDateKey(event);
  return `<div class="details-header">
      <div>
        <p class="eyebrow">Просмотр заявки</p>
        <h2>${escapeHtml(data.customerName || event.summary || 'Заявка')}</h2>
        <div class="details-header-badges"><span class="detail-status status-${status.className}">${escapeHtml(status.label)}</span><span>${escapeHtml(rugSummary(data))}</span></div>
      </div>
      <button type="button" class="details-close" data-details-close aria-label="Закрыть">×</button>
    </div>
    <section class="details-section">
      <h3>Клиент</h3>
      <div class="details-grid">
        ${renderDetailValue('Имя', data.customerName || '—')}
        ${renderDetailValue('Телефон', phoneHtml, { html: true })}
        ${renderDetailValue('Договор', contract)}
        ${renderDetailValue('Источник', source)}
        ${renderDetailValue('Клиент', data.regularCustomer ? 'Постоянный' : 'Новый')}
      </div>
    </section>
    <section class="details-section">
      <h3>Визит</h3>
      <div class="details-grid">
        ${renderDetailValue('Тип', data.visitType === 'delivery' ? 'Доставка' : 'Забор')}
        ${renderDetailValue('Дата', formatDateLong(visitDate))}
        ${renderDetailValue('Время', `${formatTime(event.start?.dateTime || event.start)}–${formatTime(event.end?.dateTime || event.end)}`)}
        ${renderDetailValue('Статус', status.label)}
        ${renderDetailValue('Напоминание', data.callAhead ? `Позвонить ${formatCallAhead(getCallAheadMinutes(data))}` : 'Нет')}
      </div>
    </section>
    <section class="details-section">
      <h3>Адрес</h3>
      <div class="details-address">${addressHtml}</div>
      <div class="details-grid compact-details-grid">
        ${renderDetailValue('Населённый пункт', data.settlement || '—')}
        ${renderDetailValue('Район', data.district || '—')}
        ${renderDetailValue('Подъезд', data.entrance || '—')}
        ${renderDetailValue('Этаж', data.floor || '—')}
      </div>
    </section>
    <section class="details-section">
      <div class="details-section-heading"><h3>Ковры</h3><span>${escapeHtml(rugSummary(data))}</span></div>
      <div class="details-rug-list">${renderRugDetails(data)}</div>
    </section>
    <section class="details-section">
      <h3>Стоимость и договорённости</h3>
      <div class="details-grid">
        ${renderDetailValue('Стоимость', data.estimatedPrice ? formatMoney(data.estimatedPrice) : 'Не указана')}
        ${renderDetailValue('Скидка', `${Number(data.discount || 0)}%`)}
      </div>
      ${comment ? `<div class="details-comment"><span>Комментарий</span><p>${escapeHtml(comment)}</p></div>` : ''}
    </section>
    <div class="details-actions">
      ${data.phone ? `<a class="button details-call" href="${phoneLink(data.phone)}">☎ Позвонить</a>` : ''}
      <button type="button" class="button button-primary" data-details-edit="${escapeHtml(event.id)}">Редактировать заявку</button>
    </div>`;
}

function ensureEventDetailsDialog() {
  let dialog = qs('#eventDetailsDialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'eventDetailsDialog';
  dialog.className = 'event-details-dialog';
  dialog.innerHTML = '<div id="eventDetailsContent" class="event-details-content"></div>';
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeEventDetails();
  });
  document.body.appendChild(dialog);
  return dialog;
}

function closeEventDetails() {
  const dialog = qs('#eventDetailsDialog');
  if (!dialog) return;
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else dialog.removeAttribute('open');
}

function openEventDetails(id) {
  const event = getAllEvents().find(item => item.id === id);
  if (!event) return showToast('Заявка не найдена.', 'error');
  const dialog = ensureEventDetailsDialog();
  qs('#eventDetailsContent', dialog).innerHTML = renderEventDetailsHtml(event);
  qs('[data-details-close]', dialog)?.addEventListener('click', closeEventDetails);
  qs('[data-details-edit]', dialog)?.addEventListener('click', buttonEvent => {
    buttonEvent.preventDefault();
    const eventId = buttonEvent.currentTarget.dataset.detailsEdit;
    closeEventDetails();
    openEvent(eventId);
  });
  if (typeof dialog.showModal === 'function') {
    if (dialog.open) dialog.close();
    dialog.showModal();
  } else dialog.setAttribute('open', '');
}

function openEvent(id) {
  closeEventDetails();
  const event = getAllEvents().find(item => item.id === id);
  if (!event) return showToast('Заявка не найдена.', 'error');
  const data = decodePmkData(event);
  fillForm({ ...(data || eventMeta(event)), eventId: event.id, externalEvent: !data });
  setView('form');
}

let linkedEventOpened = false;
function openLinkedEvent() {
  if (linkedEventOpened) return true;
  const params = new URLSearchParams(location.search);
  const id = String(params.get('event') || '').trim();
  const pmkId = String(params.get('pmk') || '').trim();
  if (!id && !pmkId) return false;
  const linkedEvent = getAllEvents().find(item => {
    const itemPmkId = String(decodePmkData(item)?.pmkId || item.extendedProperties?.private?.pmkId || '').trim();
    return (id && String(item.id || '').trim() === id) || (pmkId && itemPmkId === pmkId);
  });
  if (!linkedEvent) return false;
  linkedEventOpened = true;
  openEvent(linkedEvent.id);
  return true;
}

function scheduleLinkedEventOpen() {
  if (openLinkedEvent()) return;
  const started = Date.now();
  const timer = setInterval(() => {
    if (openLinkedEvent() || Date.now() - started > 60000) clearInterval(timer);
  }, 500);
}

function fillForm(data) {
  const item = withAddressParts(data);
  resetForm(false);
  qs('#eventId').value = data.eventId || '';
  qs('#eventId').dataset.pmkId = data.pmkId || makeId();
  qs('#customerName').value = data.customerName || '';
  qs('#phone').value = data.phone || '';
  qs('#orderSource').value = data.orderSource || '';
  qs('#settlement').value = item.settlement || '';
  qs('#street').value = item.street || '';
  qs('#houseNumber').value = item.houseNumber || '';
  qs('#apartmentNumber').value = item.apartmentNumber || '';
  qs('#entrance').value = item.entrance || '';
  qs('#floor').value = item.floor || '';
  qs('#district').value = data.district || '';
  qs(`input[name="visitType"][value="${data.visitType || 'pickup'}"]`).checked = true;
  qs('#visitDate').value = data.visitDate || businessTodayKey();
  qs('#startTime').value = data.startTime || '10:00';
  qs('#endTime').value = data.endTime || addMinutesToTime(qs('#startTime').value, REQUEST_DURATION_MINUTES);
  qs('#timeNote').value = data.timeNote || '';
  qs('#requestStatus').value = normalizeStatus(data.requestStatus, data.visitType);
  qs('#estimatedPrice').value = data.estimatedPrice || '';
  qs('#discount').value = data.discount || 0;
  qs('#contractNumber').value = data.contractNumber || '';
  qs('#regularCustomer').checked = Boolean(data.regularCustomer);
  qs('#callAhead').checked = Boolean(data.callAhead);
  qs('#callAheadMinutes').value = String(getCallAheadMinutes(data));
  qs('#managerComment').value = data.managerComment || '';
  qs('#rugsContainer').innerHTML = '';
  normalizeRugs(data).forEach(addRug);
  qs('#deleteEventBtn').classList.remove('hidden');
  qs('#formTitle').textContent = 'Редактирование заявки';
  updateScheduleSlotOptions(false);
  updateConnectionUI(); schedulePreviewUpdate();
}

function resetForm(addDefaultRug = true) {
  qs('#requestForm').reset();
  qs('#eventId').value = '';
  qs('#eventId').dataset.pmkId = makeId();
  qs('#orderSource').value = '';
  qs('#visitDate').value = state.selectedDayKey || businessTodayKey();
  qs('#requestStatus').value = 'pending-pickup';
  qs('#startTime').value = '10:00'; qs('#endTime').value = addMinutesToTime('10:00', REQUEST_DURATION_MINUTES); qs('#timeNote').value = ''; qs('#discount').value = '0'; qs('#contractNumber').value = ''; qs('#regularCustomer').checked = false; qs('#callAhead').checked = false; qs('#callAheadMinutes').value = '30';
  qs('#rugsContainer').innerHTML = '';
  if (addDefaultRug) addRug();
  qs('#deleteEventBtn').classList.add('hidden');
  qs('#formTitle').textContent = 'Новая заявка';
  updateScheduleSlotOptions(true);
  updateConnectionUI(); schedulePreviewUpdate();
}

function setupSettingsUI() {
  qs('#clientIdSetting').value = state.settings.clientId;
  qs('#calendarIdSetting').value = state.settings.calendarId;
  qs('#timezoneSetting').value = state.settings.timezone;
  qs('#minimumOrderSetting').value = state.settings.minimumOrder;
  qs('#durationSetting').value = state.settings.duration;
  qs('#strictRouteSetting').checked = state.settings.strictRoute;
  qs('#themeSetting').value = state.settings.theme || 'light';
  qs('#districtHoursSetting').value = state.settings.districtHours || DEFAULT_DISTRICT_HOURS;
  qs('#notificationsSetting').checked = Boolean(state.settings.notificationsEnabled);
  qs('#soundSetting').checked = Boolean(state.settings.soundEnabled);
  qs('#notifyMinutesSetting').value = Number(state.settings.notifyMinutes || 30);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
}

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme || 'light';
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return showToast('Браузер не поддерживает уведомления.', 'error');
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    state.settings.notificationsEnabled = true;
    qs('#notificationsSetting').checked = true;
    saveSettings();
    showToast('Уведомления включены.', 'success');
  } else {
    showToast('Уведомления не разрешены в браузере.', 'error');
  }
}

function playNotifySound() {
  if (!state.settings.soundEnabled) return;
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.28);
  } catch {}
}

function checkUpcomingNotifications() {
  if (!state.settings.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = Date.now();
  const warnMs = Number(state.settings.notifyMinutes || 30) * 60000;
  getAllEvents().forEach(event => {
    const start = new Date(event.start?.dateTime || event.start).getTime();
    const key = notificationKey(event);
    if (state.notifiedEvents.has(key) || start < now || start - now > warnMs) return;
    state.notifiedEvents.add(key);
    const data = eventMeta(event);
    new Notification(event.summary || 'ПМК Календарь', {
      body: `${formatTime(event.start?.dateTime || event.start)} ${data.customerName || ''} ${displayAddress(data, event) || ''}`.trim(),
      icon: './icons/icon-192.png',
      tag: key,
    });
    playNotifySound();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(); setupSettingsUI(); initializeForm(); renderAll(); updateConnectionUI(); registerServiceWorker();
  scheduleLinkedEventOpen();
  setupSwipeNavigation();
  history.replaceState({ pmkView: state.currentView, selectedDayKey: state.selectedDayKey, periodAnchorKey: state.periodAnchorKey }, '', location.hash || '#day');
  scheduleGoogleAutoReconnect();

  qsa('.nav-item').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.view === 'form') resetForm();
    if (button.dataset.view === 'reminder') qs('#reminderDate').value = state.selectedDayKey || businessTodayKey();
    setView(button.dataset.view);
  }));
  qsa('[data-open-form]').forEach(button => button.addEventListener('click', () => { resetForm(); setView('form'); }));
  window.addEventListener('popstate', restoreFromHistory);
  qs('#menuToggle').addEventListener('click', () => qs('#sidebar').classList.toggle('open'));
  qs('#connectGoogleBtn').addEventListener('click', connectGoogle);
  qs('#refreshSearchBtn').addEventListener('click', refreshEvents);
  qs('#prevDayBtn').addEventListener('click', () => shiftSelectedDay(-1));
  qs('#nextDayBtn').addEventListener('click', () => shiftSelectedDay(1));
  qs('#jumpDate').addEventListener('change', event => { state.selectedDayKey = event.target.value || businessTodayKey(); state.currentView = 'day'; renderAll(); pushAppHistory('day'); });
  qs('#prevPeriodBtn').addEventListener('click', () => shiftPeriod(-periodStepDays()));
  qs('#nextPeriodBtn').addEventListener('click', () => shiftPeriod(periodStepDays()));
  qs('#jumpPeriodDate').addEventListener('change', event => { state.periodAnchorKey = event.target.value || businessTodayKey(); if (state.currentView === 'day') state.selectedDayKey = state.periodAnchorKey; renderAll(); pushAppHistory(state.currentView); });
  qs('#addRugBtn').addEventListener('click', () => addRug());
  qs('#district').addEventListener('change', () => { updateScheduleSlotOptions(true); schedulePreviewUpdate(); });
  qs('#visitDate').addEventListener('change', () => { updateScheduleSlotOptions(true); schedulePreviewUpdate(); });
  qs('#scheduleSlotSelect').addEventListener('change', event => {
    const slot = scheduleSlotsForDistrict(qs('#district').value, qs('#visitDate').value).find(item => scheduleSlotValue(item) === event.target.value);
    applyScheduleSlot(slot);
    schedulePreviewUpdate();
  });
  qs('#startTime').addEventListener('input', autoSetEndTime);
  qs('#startTime').addEventListener('change', autoSetEndTime);
  qsa('input[name="visitType"]').forEach(input => input.addEventListener('change', () => {
    if (qs('#requestStatus').value === 'pending-pickup' || qs('#requestStatus').value === 'pending-delivery') {
      qs('#requestStatus').value = defaultStatusForVisit(qs('input[name="visitType"]:checked')?.value);
    }
  }));
  qs('#cancelEditBtn').addEventListener('click', returnFromForm);
  qs('#cancelReminderBtn').addEventListener('click', () => setView(state.returnView || 'day'));
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
  qs('#reminderForm').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await saveReminder({
        date: qs('#reminderDate').value,
        time: qs('#reminderTime').value,
        duration: Number(qs('#reminderDuration').value || 30),
        text: qs('#reminderText').value.trim(),
      });
    } catch (error) { showToast(error.message, 'error'); }
  });
  qs('#saveSettingsBtn').addEventListener('click', () => {
    const previousSettings = { ...state.settings };
    state.settings = {
      clientId: qs('#clientIdSetting').value.trim() || DEFAULT_SETTINGS.clientId,
      calendarId: qs('#calendarIdSetting').value.trim() || 'primary',
      timezone: qs('#timezoneSetting').value.trim() || 'Europe/Moscow',
      minimumOrder: Number(qs('#minimumOrderSetting').value || 1800),
      duration: Number(qs('#durationSetting').value || 120),
      strictRoute: qs('#strictRouteSetting').checked,
      theme: qs('#themeSetting').value || 'light',
      districtHours: qs('#districtHoursSetting').value.trim() || DEFAULT_DISTRICT_HOURS,
      notificationsEnabled: qs('#notificationsSetting').checked,
      soundEnabled: qs('#soundSetting').checked,
      notifyMinutes: Number(qs('#notifyMinutesSetting').value || 30),
    };
    const authChanged = previousSettings.clientId !== state.settings.clientId || previousSettings.calendarId !== state.settings.calendarId || previousSettings.timezone !== state.settings.timezone;
    saveSettings(); applyTheme();
    if (authChanged) { clearSavedToken(); state.tokenClient = null; state.autoReconnectTried = false; }
    updateConnectionUI(); schedulePreviewUpdate();
    showToast('Настройки сохранены.', 'success');
  });
  qs('#requestNotificationsBtn').addEventListener('click', requestNotificationPermission);
  qs('#globalSearch').addEventListener('input', renderSearch);
  qsa('#requestForm input, #requestForm select, #requestForm textarea').forEach(el => el.addEventListener('input', schedulePreviewUpdate));
  qsa('[data-time-note]').forEach(button => button.addEventListener('click', () => {
    qs('#timeNote').value = button.dataset.timeNote || '';
    schedulePreviewUpdate();
  }));
  qs('#reminderDate').value = businessTodayKey();
  setInterval(checkUpcomingNotifications, 60000);
});
