'use strict';
window.PMK_STATIC_BUNDLE_VERSION = '97';
document.documentElement.dataset.pmkStaticBundle = '97';

/* ===== app.js ===== */
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
function normalizedCalendarEventId(value) {
  return String(value || '').trim().replace(/@google\.com$/i, '');
}

function openLinkedEvent() {
  if (linkedEventOpened) return true;
  const params = new URLSearchParams(location.search);
  const id = normalizedCalendarEventId(params.get('event'));
  const pmkId = String(params.get('pmk') || '').trim();
  if (!id && !pmkId) return false;
  const linkedEvent = getAllEvents().find(item => {
    const itemPmkId = String(decodePmkData(item)?.pmkId || item.extendedProperties?.private?.pmkId || '').trim();
    return (id && normalizedCalendarEventId(item.id) === id) || (pmkId && itemPmkId === pmkId);
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

function registerServiceWorker() {}

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

//# sourceURL=app.js

/* ===== manager-planner-core.js ===== */
'use strict';

function managerRouteMatch(data = {}) {
  const district = String(data.district || '').trim();
  const dateKey = data.visitDate || '';
  if (!district || !dateKey) return { kind: 'missing', slots: [] };
  if (!ROUTES[district]) return { kind: 'unconfigured', slots: [] };
  const slots = scheduleSlotsForDistrict(district, dateKey);
  const exact = slots.find(slot => slot[0] === data.startTime && slot[1] === data.endTime);
  if (exact) return { kind: 'matched', slots, slot: exact };
  const weekday = dateKeyForDisplay(dateKey).getUTCDay();
  return { kind: ROUTES[district].includes(weekday) ? 'wrong-time' : 'wrong-day', slots };
}

function managerRouteLoad(district, dateKey, startTime, endTime, excludeEventId = '') {
  return getAllEvents().filter(event => {
    if (event.id === excludeEventId) return false;
    const data = eventMeta(event);
    const range = comparableEventRange(event);
    return eventDateKey(event) === dateKey &&
      String(data.district || '').trim().toLowerCase() === String(district || '').trim().toLowerCase() &&
      range.start === `${dateKey}T${startTime}` && range.end === `${dateKey}T${endTime}`;
  }).length;
}

function managerSlotCandidates(district, limit = 8) {
  if (!ROUTES[district]) return [];
  const today = businessTodayKey();
  const nowTime = businessDateTimeParts(new Date().toISOString()).time;
  const result = [];
  for (let offset = 0; offset < 35 && result.length < limit; offset += 1) {
    const dateKey = addDaysToKey(today, offset);
    scheduleSlotsForDistrict(district, dateKey).forEach(slot => {
      if (result.length >= limit) return;
      if (dateKey === today && slot[1] <= nowTime) return;
      result.push({
        dateKey,
        startTime: slot[0],
        endTime: slot[1],
        note: slot[3] || '',
        load: managerRouteLoad(district, dateKey, slot[0], slot[1], qs('#eventId')?.value || ''),
      });
    });
  }
  return result;
}

function managerDateLabel(dateKey) {
  const today = businessTodayKey();
  if (dateKey === today) return 'Сегодня';
  if (dateKey === addDaysToKey(today, 1)) return 'Завтра';
  const date = dateKeyForDisplay(dateKey);
  return `${WEEKDAY_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${date.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' })}`;
}

function managerClearException() {
  if (qs('#routeException')) qs('#routeException').checked = false;
  if (qs('#routeExceptionReason')) qs('#routeExceptionReason').value = '';
  if (qs('#routeExceptionFee')) qs('#routeExceptionFee').value = '';
  if (qs('#routeExceptionApprovedBy')) qs('#routeExceptionApprovedBy').value = '';
  if (qs('#routeExceptionComment')) qs('#routeExceptionComment').value = '';
}

function managerCurrentRouteData() {
  return {
    district: qs('#district')?.value || '',
    visitDate: qs('#visitDate')?.value || '',
    startTime: qs('#startTime')?.value || '',
    endTime: qs('#endTime')?.value || '',
  };
}

function managerSyncException(data = managerCurrentRouteData()) {
  const panel = qs('#routeExceptionPanel');
  if (!panel) return;
  const match = managerRouteMatch(data);
  const outside = match.kind === 'wrong-day' || match.kind === 'wrong-time';
  panel.classList.toggle('hidden', !outside);
  if (!outside && qs('#routeException')?.checked) managerClearException();
}

function renderManagerSlotPlanner() {
  const container = qs('#recommendedSlots');
  const hint = qs('#managerSlotHint');
  if (!container || !hint) return;
  const district = qs('#district')?.value || '';
  if (!district) {
    hint.textContent = 'Сначала выберите район клиента.';
    container.innerHTML = '';
    return;
  }
  if (!ROUTES[district]) {
    hint.textContent = 'Для этого направления график не задан. Выберите время вручную.';
    container.innerHTML = '<div class="manager-slot-empty">Автоматических окон нет.</div>';
    return;
  }
  const candidates = managerSlotCandidates(district);
  if (!candidates.length) {
    hint.textContent = 'Ближайшие окна не найдены.';
    container.innerHTML = '<div class="manager-slot-empty">Укажите дату и время вручную.</div>';
    return;
  }
  const recommended = candidates[0];
  hint.textContent = `Ближайшие окна для района ${district}.`;
  const selectedDate = qs('#visitDate')?.value || '';
  const selectedStart = qs('#startTime')?.value || '';
  const selectedEnd = qs('#endTime')?.value || '';
  container.innerHTML = candidates.map(item => {
    const selected = item.dateKey === selectedDate && item.startTime === selectedStart && item.endTime === selectedEnd;
    const loadText = item.load ? `${item.load} ${pluralPoints(item.load)} уже в окне` : 'Окно свободно';
    return `<button type="button" class="manager-slot-card${item === recommended ? ' recommended' : ''}${selected ? ' selected' : ''}" data-manager-slot data-date="${escapeHtml(item.dateKey)}" data-start="${escapeHtml(item.startTime)}" data-end="${escapeHtml(item.endTime)}" data-note="${escapeHtml(item.note)}">
      ${item === recommended ? '<span class="slot-recommend-label">Ближайшее</span>' : ''}
      <strong>${escapeHtml(managerDateLabel(item.dateKey))}</strong>
      <b>${escapeHtml(item.startTime)}–${escapeHtml(item.endTime)}</b>
      ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}
      <span>${escapeHtml(loadText)}</span>
    </button>`;
  }).join('');
}

function managerApplySlot(button) {
  qs('#visitDate').value = button.dataset.date;
  qs('#startTime').value = button.dataset.start;
  qs('#endTime').value = button.dataset.end;
  qs('#timeNote').value = `Ждёт по расписанию: ${button.dataset.start}-${button.dataset.end}${button.dataset.note ? ` (${button.dataset.note})` : ''}`;
  managerClearException();
  updateScheduleSlotOptions(false);
  managerSyncException();
  renderManagerSlotPlanner();
  schedulePreviewUpdate();
}

//# sourceURL=manager-planner-core.js

/* ===== manager-planner-hooks.js ===== */
'use strict';

const managerOriginalGetFormData = getFormData;
getFormData = function getFormDataWithManagerRoute() {
  const data = managerOriginalGetFormData();
  data.routeException = Boolean(qs('#routeException')?.checked);
  data.routeExceptionReason = qs('#routeExceptionReason')?.value || '';
  data.routeExceptionFee = Number(qs('#routeExceptionFee')?.value || 0);
  data.routeExceptionApprovedBy = cleanShortField(qs('#routeExceptionApprovedBy')?.value || '');
  data.routeExceptionComment = cleanShortField(qs('#routeExceptionComment')?.value || '');
  return data;
};

const managerOriginalFillForm = fillForm;
fillForm = function fillFormWithManagerRoute(data) {
  managerOriginalFillForm(data);
  qs('#routeException').checked = Boolean(data.routeException);
  qs('#routeExceptionReason').value = data.routeExceptionReason || '';
  qs('#routeExceptionFee').value = data.routeExceptionFee || '';
  qs('#routeExceptionApprovedBy').value = data.routeExceptionApprovedBy || '';
  qs('#routeExceptionComment').value = data.routeExceptionComment || '';
  renderManagerSlotPlanner();
  managerSyncException(data);
};

const managerOriginalResetForm = resetForm;
resetForm = function resetFormWithManagerRoute(addDefaultRug = true) {
  managerOriginalResetForm(addDefaultRug);
  managerClearException();
  renderManagerSlotPlanner();
  managerSyncException();
};

const managerOriginalRenderAll = renderAll;
renderAll = function renderAllWithManagerRoute() {
  managerOriginalRenderAll();
  renderManagerSlotPlanner();
};

const managerOriginalCheckRoute = checkRoute;
checkRoute = function checkManagerRoute(data) {
  const box = qs('#routeHint');
  const match = managerRouteMatch(data);
  managerSyncException(data);
  box.className = 'info-box';

  if (match.kind === 'missing') {
    box.textContent = 'Выберите район и дату — появится проверка маршрута.';
    return true;
  }
  if (match.kind === 'unconfigured') {
    box.textContent = 'Для этого района маршрут не задан. День и время можно выбрать вручную.';
    return true;
  }
  if (match.kind === 'matched') {
    box.classList.add('good');
    box.textContent = `Подходит: ${data.district}, окно ${scheduleSlotLabel(match.slot)}.`;
    return true;
  }

  box.classList.add('warning');
  if (match.kind === 'wrong-time') {
    box.textContent = `День подходит, но время вне районного окна. Доступно: ${match.slots.map(scheduleSlotLabel).join(', ') || 'нет окна'}.`;
  } else {
    const allowed = (ROUTES[data.district] || []).map(day => WEEKDAY_ROUTE[day]).join(' или ');
    box.textContent = `Район ${data.district} обычно обслуживается ${allowed}. Выбран ${WEEKDAY_NAMES[dateKeyForDisplay(data.visitDate).getUTCDay()]}.`;
  }
  if (data.routeException) {
    box.textContent += ' Сохранение как исключение подтверждено.';
    return true;
  }
  return false;
};

const managerOriginalValidateForm = validateForm;
validateForm = function validateManagerRoute(data) {
  const valid = managerOriginalValidateForm(data);
  const match = managerRouteMatch(data);
  if (!valid && (match.kind === 'wrong-day' || match.kind === 'wrong-time') && !data.routeException) {
    showToast('Подтвердите сохранение вне маршрута.', 'error');
  }
  if (valid && data.routeException && !data.routeExceptionReason) {
    showToast('Укажите причину исключения.', 'error');
    return false;
  }
  return valid;
};

const managerOriginalEventDescription = eventDescription;
eventDescription = function eventDescriptionWithManagerRoute(data) {
  const base = managerOriginalEventDescription(data);
  if (!data.routeException) return base;
  return [
    base,
    '',
    'ВНЕ МАРШРУТА',
    data.routeExceptionReason ? `Причина: ${data.routeExceptionReason}` : '',
    data.routeExceptionFee ? `Доплата: ${formatMoney(data.routeExceptionFee)}` : '',
    data.routeExceptionApprovedBy ? `Согласовал: ${data.routeExceptionApprovedBy}` : '',
    data.routeExceptionComment ? `Комментарий: ${data.routeExceptionComment}` : '',
  ].filter(Boolean).join('\n');
};

const managerOriginalRenderEventCard = renderEventCard;
renderEventCard = function renderEventCardWithManagerRoute(event) {
  const html = managerOriginalRenderEventCard(event);
  if (!eventMeta(event).routeException) return html;
  return html.replace('<div class="event-quick-badges">', '<div class="event-quick-badges"><span class="quick-badge exception-badge">ВНЕ МАРШРУТА</span>');
};

const managerOriginalRenderEventDetailsHtml = renderEventDetailsHtml;
renderEventDetailsHtml = function renderEventDetailsWithManagerRoute(event) {
  const data = eventMeta(event);
  let html = managerOriginalRenderEventDetailsHtml(event);
  if (!data.routeException) return html;
  html = html.replace('<div class="details-header-badges">', '<div class="details-header-badges"><span class="detail-exception">ВНЕ МАРШРУТА</span>');
  const warning = [
    data.routeExceptionReason ? `Причина: ${escapeHtml(data.routeExceptionReason)}` : '',
    data.routeExceptionApprovedBy ? `Согласовал: ${escapeHtml(data.routeExceptionApprovedBy)}` : '',
    data.routeExceptionFee ? `Доплата: ${escapeHtml(formatMoney(data.routeExceptionFee))}` : '',
  ].filter(Boolean).join(' · ');
  return warning ? html.replace('<section class="details-section">\n      <h3>Адрес</h3>', `<div class="details-route-warning">${warning}</div><section class="details-section">\n      <h3>Адрес</h3>`) : html;
};

document.addEventListener('DOMContentLoaded', () => {
  renderManagerSlotPlanner();
  managerSyncException();

  qs('#recommendedSlots')?.addEventListener('click', event => {
    const button = event.target.closest('[data-manager-slot]');
    if (button) managerApplySlot(button);
  });

  const refreshManagerRoute = () => {
    renderManagerSlotPlanner();
    managerSyncException();
    schedulePreviewUpdate();
  };

  qs('#district')?.addEventListener('change', refreshManagerRoute);
  qs('#visitDate')?.addEventListener('change', refreshManagerRoute);
  qs('#startTime')?.addEventListener('change', refreshManagerRoute);
  qs('#endTime')?.addEventListener('change', refreshManagerRoute);
  qs('#scheduleSlotSelect')?.addEventListener('change', () => setTimeout(refreshManagerRoute, 0));
  qs('#routeException')?.addEventListener('change', schedulePreviewUpdate);
  qsa('#routeExceptionReason, #routeExceptionFee, #routeExceptionApprovedBy, #routeExceptionComment').forEach(element => element.addEventListener('input', schedulePreviewUpdate));
});

//# sourceURL=manager-planner-hooks.js

/* ===== address-autocomplete.js ===== */
'use strict';

const PMK_ADDRESS_API_URL = 'https://lucky-math-8e63pmk-address.standart-media.workers.dev/suggest';
const PMK_DISTRICTS = [
  'Автозаводский', 'Ленинский', 'Канавинский', 'Московский',
  'Сормовский', 'Нижегородский', 'Советский', 'Приокский',
];

let addressAbortController = null;
let addressDebounceTimer = null;
let addressActiveIndex = -1;
let addressSuggestions = [];

function normalizePmkDistrict(value = '') {
  const clean = String(value)
    .replace(/\b(район|р-н)\b/gi, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return PMK_DISTRICTS.find(item => item.toLowerCase() === clean) || '';
}

function settlementFromAddressData(data = {}) {
  return cleanShortField(data.city || data.settlement || '');
}

function districtFromAddressData(data = {}) {
  const settlement = settlementFromAddressData(data).toLowerCase();
  const normalized = normalizePmkDistrict(data.city_district || '');
  if (normalized) return normalized;
  if (settlement && settlement !== 'нижний новгород') return 'За городом';
  return '';
}

function addressStatus(message, type = '') {
  const status = qs('#addressSearchStatus');
  if (!status) return;
  status.textContent = message;
  status.className = `address-search-status${type ? ` ${type}` : ''}`;
}

function addressErrorMessage(error = {}) {
  const status = Number(error.status || 0);
  const payload = error.payload || {};
  const details = String(payload.details || '').toLowerCase();
  const backendMessage = String(payload.error || error.message || '');

  if (backendMessage.includes('DADATA_API_KEY is not configured')) {
    return 'В Cloudflare не найден секрет DADATA_API_KEY. Проверьте точное имя переменной и выполните Deploy.';
  }
  if (status === 401) {
    return 'DaData отклонила API-ключ: ошибка 401. Проверьте, что в Value вставлен верхний «API-ключ», без слова Token и без пробелов.';
  }
  if (status === 403) {
    return 'DaData запретила доступ: ошибка 403. Проверьте подтверждение почты и активность API-ключа в личном кабинете.';
  }
  if (status === 429) {
    return 'Превышен лимит запросов DaData. Попробуйте позже.';
  }
  if (status >= 500) {
    return `Cloudflare Worker вернул ошибку ${status}${backendMessage ? `: ${backendMessage}` : ''}.`;
  }
  if (details.includes('unauthorized') || details.includes('token')) {
    return 'DaData не приняла API-ключ. Проверьте значение секрета DADATA_API_KEY.';
  }
  if (error.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(backendMessage)) {
    return 'Нет соединения с Cloudflare Worker или запрос заблокирован браузером. Откройте страницу проверки сервиса.';
  }
  return `Адресный сервис недоступен${status ? ` — ошибка ${status}` : ''}${backendMessage ? `: ${backendMessage}` : ''}.`;
}

async function requestAddressSuggestions(query, count = 8) {
  if (!PMK_ADDRESS_API_URL) return [];
  addressAbortController?.abort();
  addressAbortController = new AbortController();
  const response = await fetch(PMK_ADDRESS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, count }),
    signal: addressAbortController.signal,
  });

  const raw = await response.text();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; }
  catch { payload = { error: raw || `Ошибка адресного сервиса: ${response.status}` }; }

  if (!response.ok) {
    const error = new Error(payload.error || `Ошибка адресного сервиса: ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    window.PMK_ADDRESS_LAST_ERROR = { status: response.status, payload };
    throw error;
  }

  window.PMK_ADDRESS_LAST_ERROR = null;
  return Array.isArray(payload.suggestions) ? payload.suggestions : [];
}

function closeAddressSuggestions() {
  const list = qs('#addressSuggestions');
  if (!list) return;
  list.classList.add('hidden');
  list.innerHTML = '';
  addressSuggestions = [];
  addressActiveIndex = -1;
}

function renderAddressSuggestions(items = []) {
  const list = qs('#addressSuggestions');
  if (!list) return;
  addressSuggestions = items;
  addressActiveIndex = -1;
  if (!items.length) {
    list.innerHTML = '<div class="address-suggestion-empty">Ничего не найдено. Можно заполнить адрес вручную.</div>';
    list.classList.remove('hidden');
    return;
  }
  list.innerHTML = items.map((item, index) => `
    <button type="button" class="address-suggestion" data-address-index="${index}">
      <strong>${escapeHtml(item.value || '')}</strong>
      <small>${escapeHtml(item.data?.city_district || item.data?.settlement || item.data?.city || '')}</small>
    </button>
  `).join('');
  list.classList.remove('hidden');
}

function highlightAddressSuggestion() {
  qsa('.address-suggestion', qs('#addressSuggestions')).forEach((button, index) => {
    button.classList.toggle('active', index === addressActiveIndex);
    if (index === addressActiveIndex) button.scrollIntoView({ block: 'nearest' });
  });
}

async function applyAddressSuggestion(item) {
  const input = qs('#addressSearch');
  if (!input || !item) return;
  input.value = item.value || '';
  closeAddressSuggestions();
  addressStatus('Уточняем дом и район…', 'loading');

  let selected = item;
  try {
    const detailed = await requestAddressSuggestions(item.unrestricted_value || item.value || '', 1);
    if (detailed[0]) selected = detailed[0];
  } catch (error) {
    if (error.name !== 'AbortError') console.warn(error);
  }

  const data = selected.data || {};
  const settlement = settlementFromAddressData(data);
  const district = districtFromAddressData(data);
  const house = [data.house, data.block ? `к ${data.block}` : ''].filter(Boolean).join(' ');

  if (settlement) qs('#settlement').value = settlement;
  if (data.street_with_type || data.street) qs('#street').value = data.street_with_type || data.street;
  if (house) qs('#houseNumber').value = house;
  if (data.flat) qs('#apartmentNumber').value = data.flat;
  if (district) {
    qs('#district').value = district;
    qs('#district').dispatchEvent(new Event('change', { bubbles: true }));
  }

  input.value = selected.value || item.value || '';
  schedulePreviewUpdate();

  if (district && district !== 'За городом') {
    addressStatus(`Район определён: ${district}`, 'success');
  } else if (district === 'За городом') {
    addressStatus('Адрес определён как выезд за город. Проверьте район и стоимость доставки.', 'warning');
  } else {
    addressStatus('Адрес найден, но район не определён. Выберите район вручную.', 'warning');
  }
}

function createAddressSearchUI() {
  const settlementField = qs('#settlement')?.closest('.field-grid');
  if (!settlementField || qs('#addressSearchWrap')) return;
  const wrap = document.createElement('div');
  wrap.id = 'addressSearchWrap';
  wrap.className = 'address-search-wrap';
  wrap.innerHTML = `
    <label class="field address-search-field">
      Адрес клиента
      <span class="address-search-input-wrap">
        <input id="addressSearch" autocomplete="off" inputmode="search" placeholder="Начните вводить улицу и дом" />
        <span class="address-search-icon" aria-hidden="true">⌕</span>
      </span>
    </label>
    <div id="addressSuggestions" class="address-suggestions hidden" role="listbox"></div>
    <div id="addressSearchStatus" class="address-search-status"></div>
  `;
  settlementField.parentNode.insertBefore(wrap, settlementField);

  if (!PMK_ADDRESS_API_URL) {
    addressStatus('Автоопределение адреса подготовлено. Осталось подключить Cloudflare Worker.', 'pending');
    qs('#addressSearch').disabled = true;
    return;
  }

  addressStatus('Введите минимум 3 символа и выберите адрес из списка.');
  const input = qs('#addressSearch');
  input.addEventListener('input', () => {
    clearTimeout(addressDebounceTimer);
    const query = input.value.trim();
    if (query.length < 3) {
      closeAddressSuggestions();
      addressStatus('Введите минимум 3 символа.');
      return;
    }
    addressDebounceTimer = setTimeout(async () => {
      addressStatus('Ищем адрес…', 'loading');
      try {
        const items = await requestAddressSuggestions(query, 8);
        renderAddressSuggestions(items);
        addressStatus(items.length ? 'Выберите точный адрес из списка.' : 'Адрес не найден.', items.length ? '' : 'warning');
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error(error);
        closeAddressSuggestions();
        addressStatus(addressErrorMessage(error), 'error');
      }
    }, 350);
  });

  input.addEventListener('keydown', event => {
    if (!addressSuggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      addressActiveIndex = Math.min(addressActiveIndex + 1, addressSuggestions.length - 1);
      highlightAddressSuggestion();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      addressActiveIndex = Math.max(addressActiveIndex - 1, 0);
      highlightAddressSuggestion();
    } else if (event.key === 'Enter' && addressActiveIndex >= 0) {
      event.preventDefault();
      applyAddressSuggestion(addressSuggestions[addressActiveIndex]);
    } else if (event.key === 'Escape') {
      closeAddressSuggestions();
    }
  });

  qs('#addressSuggestions').addEventListener('click', event => {
    const button = event.target.closest('[data-address-index]');
    if (!button) return;
    applyAddressSuggestion(addressSuggestions[Number(button.dataset.addressIndex)]);
  });

  document.addEventListener('click', event => {
    if (!wrap.contains(event.target)) closeAddressSuggestions();
  });
}

const addressOriginalFillForm = fillForm;
fillForm = function fillFormWithAddressSearch(data) {
  addressOriginalFillForm(data);
  if (qs('#addressSearch')) qs('#addressSearch').value = data.address || fullAddress(data) || '';
};

const addressOriginalResetForm = resetForm;
resetForm = function resetFormWithAddressSearch(addDefaultRug = true) {
  addressOriginalResetForm(addDefaultRug);
  if (qs('#addressSearch')) qs('#addressSearch').value = '';
  closeAddressSuggestions();
  if (PMK_ADDRESS_API_URL) addressStatus('Введите минимум 3 символа и выберите адрес из списка.');
};

document.addEventListener('DOMContentLoaded', createAddressSearchUI);

//# sourceURL=address-autocomplete.js

/* ===== address-mobile-v46.js ===== */
'use strict';

(() => {
  async function parseAddressResponse(response) {
    const raw = await response.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { error: raw || `Ошибка адресного сервиса: ${response.status}` };
    }

    if (!response.ok) {
      const error = new Error(payload.error || `Ошибка адресного сервиса: ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      window.PMK_ADDRESS_LAST_ERROR = { status: response.status, payload };
      throw error;
    }

    window.PMK_ADDRESS_LAST_ERROR = null;
    return Array.isArray(payload.suggestions) ? payload.suggestions : [];
  }

  async function mobileGetRequest(query, count, signal) {
    const url = new URL(PMK_ADDRESS_API_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(count));
    url.searchParams.set('_', String(Date.now()));

    const response = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal,
    });
    return parseAddressResponse(response);
  }

  async function postFallback(query, count, signal) {
    const response = await fetch(PMK_ADDRESS_API_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, count }),
      signal,
    });
    return parseAddressResponse(response);
  }

  requestAddressSuggestions = async function requestAddressSuggestionsMobile(query, count = 8) {
    if (!PMK_ADDRESS_API_URL) return [];
    addressAbortController?.abort();
    const controller = new AbortController();
    addressAbortController = controller;
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      try {
        return await mobileGetRequest(query, count, controller.signal);
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        if (![404, 405].includes(Number(error.status || 0))) throw error;
        return await postFallback(query, count, controller.signal);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const previousErrorMessage = addressErrorMessage;
  addressErrorMessage = function addressErrorMessageMobile(error = {}) {
    if (error.name === 'AbortError') {
      return 'Адресный сервис не ответил за 12 секунд. Проверьте интернет и повторите ввод.';
    }
    if (error.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(String(error.message || ''))) {
      return 'Мобильный браузер заблокировал старую версию Worker. Установите обновление v46 и разверните исправленный Worker.';
    }
    return previousErrorMessage(error);
  };

  window.PMK_ADDRESS_TRANSPORT = 'GET-CORS-v46';
})();

//# sourceURL=address-mobile-v46.js

/* ===== stability-route.js ===== */
'use strict';

const pmkSyncRouteOriginal = managerSyncException;
managerSyncException = (data = managerCurrentRouteData()) => {
  if (!state.settings.strictRoute) return qs('#routeExceptionPanel')?.classList.add('hidden');
  return pmkSyncRouteOriginal(data);
};
const pmkCheckRouteOriginal = checkRoute;
checkRoute = data => {
  if (state.settings.strictRoute) return pmkCheckRouteOriginal(data);
  const box = qs('#routeHint');
  const match = managerRouteMatch(data);
  managerSyncException(data);
  box.className = 'info-box';
  if (match.kind === 'missing') box.textContent = 'Выберите район и дату — появится проверка маршрута.';
  else if (match.kind === 'unconfigured') box.textContent = 'Для этого района маршрут не задан. Время можно выбрать вручную.';
  else if (match.kind === 'matched') {
    box.classList.add('good');
    box.textContent = `Подходит: ${data.district}, окно ${scheduleSlotLabel(match.slot)}.`;
  } else {
    box.classList.add('warning');
    box.textContent = match.kind === 'wrong-time'
      ? 'Время вне обычного районного окна. Заявку всё равно можно сохранить.'
      : 'День вне обычного маршрута. Заявку всё равно можно сохранить.';
  }
  return true;
};

let pmkConflictSource = null;
let pmkEventsByDate = new Map();
function pmkDayEvents(dateKey) {
  const all = getAllEvents();
  if (all !== pmkConflictSource) {
    pmkConflictSource = all;
    pmkEventsByDate = new Map();
    all.forEach(event => {
      const key = eventDateKey(event);
      if (!pmkEventsByDate.has(key)) pmkEventsByDate.set(key, []);
      pmkEventsByDate.get(key).push(event);
    });
  }
  return pmkEventsByDate.get(dateKey) || [];
}
checkConflicts = data => {
  const box = qs('#conflictHint');
  box.className = 'info-box hidden';
  if (!data.visitDate || !data.startTime || !data.endTime) return true;
  const from = `${data.visitDate}T${data.startTime}`;
  const to = `${data.visitDate}T${data.endTime}`;
  let sameWindow = 0;
  const conflict = pmkDayEvents(data.visitDate).find(event => {
    if (event.id === data.eventId) return false;
    const range = comparableEventRange(event);
    if (isSameRouteWindow(data, event, range)) { sameWindow += 1; return false; }
    return from < range.end && to > range.start;
  });
  if (!conflict && sameWindow) {
    box.className = 'info-box good';
    box.textContent = `В это окно уже есть ${sameWindow} ${pluralPoints(sameWindow)} по району. Можно добавить ещё заявку.`;
  }
  if (!conflict) return true;
  box.className = 'info-box danger';
  box.textContent = `Есть пересечение: ${conflict.summary || 'другая заявка'} (${formatTime(conflict.start?.dateTime || conflict.start)}–${formatTime(conflict.end?.dateTime || conflict.end)}).`;
  return false;
};

//# sourceURL=stability-route.js

/* ===== stability-cache.js ===== */
'use strict';

const PMK_CACHE_KEY = 'pmk-google-events-cache-v1';
function pmkCacheLoad() {
  try {
    const saved = JSON.parse(localStorage.getItem(PMK_CACHE_KEY) || 'null');
    if (!state.events.length && Array.isArray(saved?.events)) state.events = saved.events;
  } catch {}
}
function pmkCacheSave(events) {
  try {
    const items = [...events]
      .sort((a,b) => new Date(a.start?.dateTime || a.start || 0) - new Date(b.start?.dateTime || b.start || 0))
      .slice(-300);
    localStorage.setItem(PMK_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), events: items }));
  } catch {}
}
pmkCacheLoad();

const pmkDecodeCache = new WeakMap();
const pmkDecodeOriginal = decodePmkData;
decodePmkData = event => {
  if (!event || typeof event !== 'object') return pmkDecodeOriginal(event);
  if (pmkDecodeCache.has(event)) return pmkDecodeCache.get(event);
  const value = pmkDecodeOriginal(event);
  pmkDecodeCache.set(event, value);
  return value;
};
const pmkMetaCache = new WeakMap();
const pmkMetaOriginal = eventMeta;
eventMeta = event => {
  if (!event || typeof event !== 'object') return pmkMetaOriginal(event);
  if (pmkMetaCache.has(event)) return pmkMetaCache.get(event);
  const value = pmkMetaOriginal(event);
  pmkMetaCache.set(event, value);
  return value;
};

const pmkRenderSearchOriginal = renderSearch;
renderSearch = () => state.currentView === 'search' && pmkRenderSearchOriginal();
const pmkRenderPeriodOriginal = renderPeriod;
renderPeriod = (...args) => ['three-days','week','month'].includes(state.currentView) && pmkRenderPeriodOriginal(...args);
const pmkRenderTodayOriginal = renderToday;
renderToday = events => ['day','delivery-waiting'].includes(state.currentView) && pmkRenderTodayOriginal(events);

schedulePreviewUpdate = () => {
  clearTimeout(state.previewTimer);
  state.previewTimer = setTimeout(() => state.currentView === 'form' && updatePreview(), 280);
};

refreshEvents = async () => {
  try {
    if (state.token) {
      const start = new Date(); start.setUTCDate(start.getUTCDate() - 400);
      const end = new Date(); end.setUTCDate(end.getUTCDate() + 210);
      const params = new URLSearchParams({
        timeMin: start.toISOString(), timeMax: end.toISOString(),
        singleEvents: 'true', orderBy: 'startTime', maxResults: '1000',
      });
      const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
      const result = await googleRequest(`/calendars/${calendarId}/events?${params}`);
      state.events = result.items || [];
      pmkCacheSave(state.events);
    }
    invalidateEventCaches();
    pmkConflictSource = null;
    renderAll();
    checkUpcomingNotifications();
  } catch (error) {
    invalidateEventCaches();
    pmkConflictSource = null;
    renderAll();
    showToast(`${error.message} Показана последняя сохранённая синхронизация.`, 'error');
  }
};

const pmkConnectionOriginal = updateConnectionUI;
updateConnectionUI = () => {
  pmkConnectionOriginal();
  if (!state.token && state.events.length) {
    qs('#connectionBadge').textContent = 'Последняя синхронизация';
    qs('#connectionBadge').className = 'status-badge offline';
    qs('#submitBtn').textContent = 'Сохранить на устройстве';
  }
};

//# sourceURL=stability-cache.js

/* ===== stability-copy.js ===== */
'use strict';

function pmkCopyRequest(id) {
  const event = getAllEvents().find(item => item.id === id);
  if (!event) return showToast('Заявка не найдена.', 'error');
  const data = JSON.parse(JSON.stringify(eventMeta(event)));
  const date = state.selectedDayKey || businessTodayKey();
  const slot = scheduleSlotsForDistrict(data.district || '', date)[0];
  const pmkId = makeId();
  fillForm({
    ...data,
    eventId: '', pmkId, visitDate: date,
    startTime: slot?.[0] || '10:00',
    endTime: slot?.[1] || addMinutesToTime('10:00', REQUEST_DURATION_MINUTES),
    timeNote: slot ? `Ждёт по расписанию: ${scheduleSlotLabel(slot)}` : '',
    requestStatus: defaultStatusForVisit(data.visitType || 'pickup'),
    contractNumber: '', regularCustomer: true,
    orderSource: 'Постоянный клиент', discount: Number(data.discount || 10),
    managerComment: '', routeException: false, routeExceptionReason: '',
    routeExceptionFee: 0, routeExceptionApprovedBy: '', routeExceptionComment: '',
  });
  qs('#eventId').value = '';
  qs('#eventId').dataset.pmkId = pmkId;
  qs('#deleteEventBtn').classList.add('hidden');
  qs('#formTitle').textContent = 'Новая заявка — копия';
  setView('form');
  showToast('Копия создана. Проверьте дату, время и состав заказа.', 'success');
}
const pmkCardOriginal = renderEventCard;
renderEventCard = event => {
  const html = pmkCardOriginal(event);
  const edit = `<button type="button" data-edit-event="${escapeHtml(event.id)}">Редактировать заявку</button>`;
  return html.replace(edit, `<button type="button" data-copy-event="${escapeHtml(event.id)}">Создать копию заявки</button>${edit}`);
};
const pmkBindOriginal = bindEventActions;
bindEventActions = root => {
  pmkBindOriginal(root);
  qsa('[data-copy-event]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    button.closest('details')?.removeAttribute('open');
    pmkCopyRequest(button.dataset.copyEvent);
  }));
};
const pmkDetailsOriginal = renderEventDetailsHtml;
renderEventDetailsHtml = event => {
  const html = pmkDetailsOriginal(event);
  const edit = `<button type="button" class="button button-primary" data-details-edit="${escapeHtml(event.id)}">Редактировать заявку</button>`;
  return html.replace(edit, `<button type="button" class="button button-secondary" data-details-copy="${escapeHtml(event.id)}">Создать копию</button>${edit}`);
};
const pmkOpenDetailsOriginal = openEventDetails;
openEventDetails = id => {
  pmkOpenDetailsOriginal(id);
  qs('[data-details-copy]', qs('#eventDetailsDialog'))?.addEventListener('click', event => {
    closeEventDetails();
    pmkCopyRequest(event.currentTarget.dataset.detailsCopy);
  });
};

//# sourceURL=stability-copy.js

/* ===== stability-draft.js ===== */
'use strict';

const PMK_DRAFT_KEY = 'pmk-form-autodraft-v1';
function pmkDraftRead() {
  try {
    const value = JSON.parse(localStorage.getItem(PMK_DRAFT_KEY) || 'null');
    return value?.data && Date.now() - value.savedAt < 604800000 ? value : null;
  } catch { return null; }
}
let pmkDraftTimer;
function pmkDraftSave() {
  clearTimeout(pmkDraftTimer);
  pmkDraftTimer = setTimeout(() => {
    if (state.currentView !== 'form' || qs('#eventId').value) return;
    const data = getFormData();
    const useful = data.customerName || data.phone || data.street || data.managerComment || data.estimatedPrice;
    if (useful) localStorage.setItem(PMK_DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  }, 500);
}
function pmkDraftRestore() {
  const saved = pmkDraftRead();
  if (!saved) return showToast('Черновик не найден.', 'error');
  fillForm({ ...saved.data, eventId: '', pmkId: makeId() });
  qs('#eventId').value = '';
  qs('#deleteEventBtn').classList.add('hidden');
  qs('#formTitle').textContent = 'Новая заявка — восстановленный черновик';
  setView('form');
}

const pmkSaveOriginal = saveRequest;
saveRequest = async (data, localOnly = false) => {
  const button = qs('#submitBtn');
  const oldText = button?.textContent || '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Сохраняем…';
  }
  try {
    await pmkSaveOriginal(data, localOnly);
    if (state.currentView !== 'form') localStorage.removeItem(PMK_DRAFT_KEY);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = oldText;
    }
    updateConnectionUI();
  }
};

function pmkDraftInit() {
  if (!PMK_ADDRESS_API_URL) qs('#addressSearchWrap')?.remove();
  const form = qs('#requestForm');
  form?.addEventListener('input', pmkDraftSave);
  form?.addEventListener('change', pmkDraftSave);
  const saved = pmkDraftRead();
  if (saved && form && !qs('#pmkDraftRestore')) {
    const bar = document.createElement('div');
    bar.id = 'pmkDraftRestore';
    bar.className = 'warning-box';
    bar.innerHTML = '<strong>Есть незавершённая заявка.</strong> <button type="button" class="mini-button">Восстановить</button>';
    form.insertBefore(bar, form.firstChild);
    qs('button', bar).addEventListener('click', pmkDraftRestore);
  }
  updateConnectionUI();
  renderAll();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pmkDraftInit, { once: true });
else pmkDraftInit();

//# sourceURL=stability-draft.js

/* ===== google-freeform-import.js ===== */
'use strict';

const PMK_DISTRICT_NAMES = ['Автозаводский','Ленинский','Канавинский','Московский','Сормовский','Нижегородский','Советский','Приокский'];

function pmkTextNumber(value = '') {
  return Number(String(value).replace(/\s/g, '').replace(',', '.')) || 0;
}

function pmkExternalText(event = {}) {
  return [event.summary, event.description, event.location].filter(Boolean).join('\n').replace(/\u00a0/g, ' ').trim();
}

function pmkFindDistrict(text = '') {
  return PMK_DISTRICT_NAMES.find(name => new RegExp(name, 'i').test(text)) || '';
}

function pmkFindSource(text = '') {
  const match = text.match(/\b(авито\s*\d*|яндекс|вк|макс|max|сайт|квиз|рекомендац\w*)\b/i);
  if (!match) return '';
  const raw = match[1].replace(/\s+/g, ' ').trim();
  if (/авито/i.test(raw)) return raw.replace(/^./, char => char.toUpperCase());
  if (/макс|max/i.test(raw)) return 'Макс';
  if (/вк/i.test(raw)) return 'ВК';
  return raw.replace(/^./, char => char.toUpperCase());
}

function pmkFindName(text = '') {
  const direct = text.match(/(?:клиент|имя)\s*[:\-]?\s*([А-ЯЁ][а-яё]{1,24})/);
  if (direct) return direct[1];
  const contextual = text.match(/(?:^|[.\n])\s*([А-ЯЁ][а-яё]{1,24})\s*[.,]?\s*(?:дома|будет|жд[её]т|после|до|с\s*\d)/i);
  if (contextual) return contextual[1];
  return '';
}

function pmkFindAddressParts(text = '', event = {}) {
  const source = event.location || text;
  const streetMatch = source.match(/(?:ул(?:ица)?\.?\s*)([А-ЯЁа-яёA-Za-z0-9\- ]+?)\s+(\d+[А-Яа-яA-Za-z]?)(?=\s|,|\.|$)/i);
  if (streetMatch) {
    return {
      street: cleanShortField(streetMatch[1]),
      houseNumber: cleanShortField(streetMatch[2]),
      address: cleanShortField(event.location || streetMatch[0]),
    };
  }
  return { address: cleanShortField(event.location || '') };
}

function pmkFindRug(text = '') {
  const size = text.match(/(\d+(?:[.,]\d+)?)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)/i);
  const issues = [];
  const services = [];
  if (/пятн/i.test(text)) issues.push('Пятна');
  if (/шерст/i.test(text)) issues.push('Шерсть');
  if (/волос/i.test(text)) issues.push('Волосы');
  if (/запах\s*мочи|моч[аи]/i.test(text)) issues.push('Запах мочи');
  if (/дезинф/i.test(text)) issues.push('Дезинфекция');
  if (/слайм|пластилин/i.test(text)) issues.push('Слайм / пластилин');
  if (/поднят(?:ие|ь)\s*ворс|подъ[её]м\s*ворс/i.test(text)) services.push('Подъём ворса');
  if (/удален\w*\s*запах|удалить\s*запах/i.test(text)) services.push('Удаление запаха мочи');
  if (/озон/i.test(text)) services.push('Озонация');
  if (/кондиционер/i.test(text)) services.push('Кондиционер');
  if (/экспресс/i.test(text)) services.push('Экспресс-стирка');
  return [{
    length: size ? pmkTextNumber(size[1]) : 0,
    width: size ? pmkTextNumber(size[2]) : 0,
    material: '',
    pile: /шегги|длинн\w*\s*ворс|высок\w*\s*ворс/i.test(text) ? 'Более 1 см' : '',
    issues,
    services,
  }];
}

function pmkParseExternalEvent(event = {}) {
  const text = pmkExternalText(event);
  const phone = text.match(/(?:\+7|8)[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/)?.[0] || '';
  const priceMatch = text.match(/(?:цена|стоимость|итого)\s*[:\-]?\s*(\d[\d\s]{2,})\s*(?:р|₽|руб)?/i);
  const address = pmkFindAddressParts(text, event);
  const startValue = event.start?.dateTime || event.start;
  const endValue = event.end?.dateTime || event.end;
  const rugs = pmkFindRug(text);
  return {
    version: 1,
    pmkId: makeId(),
    eventId: event.id || '',
    externalEvent: true,
    visitType: /доставк/i.test(text) ? 'delivery' : 'pickup',
    customerName: pmkFindName(text),
    phone: cleanShortField(phone),
    orderSource: pmkFindSource(text),
    settlement: 'Нижний Новгород',
    district: pmkFindDistrict(text),
    street: address.street || '',
    houseNumber: address.houseNumber || '',
    apartmentNumber: '',
    entrance: '',
    floor: '',
    address: address.address || event.location || '',
    visitDate: eventDateKey(event),
    startTime: formatTime(startValue),
    endTime: formatTime(endValue),
    timeNote: '',
    requestStatus: defaultStatusForVisit(/доставк/i.test(text) ? 'delivery' : 'pickup'),
    rugs,
    issues: rugs[0].issues,
    services: rugs[0].services,
    estimatedPrice: priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : 0,
    discount: 0,
    contractNumber: '',
    regularCustomer: false,
    callAhead: false,
    callAheadMinutes: 30,
    managerComment: text,
  };
}

const pmkExternalMetaOriginal = eventMeta;
eventMeta = event => {
  const decoded = decodePmkData(event);
  if (decoded) return pmkExternalMetaOriginal(event);
  return pmkParseExternalEvent(event);
};

const pmkExternalCardOriginal = renderEventCard;
renderEventCard = event => {
  const html = pmkExternalCardOriginal(event);
  if (isPmkEvent(event)) return html;
  return html.replace('<div class="event-quick-badges">', '<div class="event-quick-badges"><span class="quick-badge exception-badge">ИЗ GOOGLE — ПРОВЕРИТЬ</span>');
};

const pmkExternalDetailsOriginal = renderEventDetailsHtml;
renderEventDetailsHtml = event => {
  let html = pmkExternalDetailsOriginal(event);
  if (isPmkEvent(event)) return html;
  const note = '<div class="details-route-warning"><strong>Событие создано вручную в Google Calendar.</strong><br>ПМК распознал данные автоматически. Нажмите «Редактировать заявку», проверьте поля и сохраните — событие будет преобразовано в формат ПМК.</div>';
  return html.replace('<section class="details-section">', `${note}<section class="details-section">`);
};

//# sourceURL=google-freeform-import.js

/* ===== runtime-stability-v37.js ===== */
'use strict';

(() => {
  const EVENT_CACHE_KEY = 'pmk-google-events-cache-v2';
  const LEGACY_EVENT_CACHE_KEY = 'pmk-google-events-cache-v1';
  let refreshPromise = null;
  let refreshSequence = 0;
  let dayRenderSequence = 0;
  let indexedEventsRef = null;
  let eventsByDate = new Map();
  let lastRefreshAt = 0;

  function readCachedEvents() {
    for (const key of [EVENT_CACHE_KEY, LEGACY_EVENT_CACHE_KEY]) {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (Array.isArray(saved?.events) && saved.events.length) return saved.events;
      } catch {}
    }
    return [];
  }

  function saveCachedEvents(events) {
    try {
      const items = [...events]
        .sort((a, b) => new Date(a.start?.dateTime || a.start || 0) - new Date(b.start?.dateTime || b.start || 0))
        .slice(-2000);
      localStorage.setItem(EVENT_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), events: items }));
    } catch {}
  }

  function restoreCachedEvents() {
    if (state.events.length) return;
    const cached = readCachedEvents();
    if (!cached.length) return;
    state.events = cached;
    invalidateEventCaches();
  }

  restoreCachedEvents();

  const originalEventDateKey = eventDateKey;
  const dateKeyCache = new WeakMap();
  eventDateKey = event => {
    if (!event || typeof event !== 'object') return originalEventDateKey(event);
    if (dateKeyCache.has(event)) return dateKeyCache.get(event);
    const key = originalEventDateKey(event);
    dateKeyCache.set(event, key);
    return key;
  };

  function rebuildDateIndex() {
    const all = getAllEvents();
    if (all === indexedEventsRef) return eventsByDate;
    indexedEventsRef = all;
    eventsByDate = new Map();
    all.forEach(event => {
      const key = eventDateKey(event);
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key).push(event);
    });
    return eventsByDate;
  }

  function countKeys(keys, index) {
    return keys.reduce((sum, key) => sum + (index.get(key)?.length || 0), 0);
  }

  function updateNavigationCounts(index) {
    const anchor = state.periodAnchorKey || state.selectedDayKey || businessTodayKey();
    const three = Array.from({ length: 3 }, (_, i) => addDaysToKey(anchor, i));
    const week = Array.from({ length: 7 }, (_, i) => addDaysToKey(anchor, i));
    const monthBase = new Date(`${anchor}T12:00:00Z`);
    const month = monthKey(monthBase);
    const monthKeys = Array.from({ length: daysInMonthKey(month) }, (_, i) => `${month}-${pad(i + 1)}`);
    qs('#todayCount').textContent = index.get(state.selectedDayKey || anchor)?.length || 0;
    qs('#threeDaysCount').textContent = countKeys(three, index);
    qs('#weekCount').textContent = countKeys(week, index);
    qs('#monthCount').textContent = countKeys(monthKeys, index);

    const updateDelivery = () => {
      const count = getAllEvents().reduce((sum, event) => sum + (eventMeta(event).requestStatus === 'pending-delivery' ? 1 : 0), 0);
      qs('#deliveryWaitingCount').textContent = count;
    };
    if ('requestIdleCallback' in window) requestIdleCallback(updateDelivery, { timeout: 1000 });
    else setTimeout(updateDelivery, 0);
  }

  function renderDayFast() {
    const renderId = ++dayRenderSequence;
    const key = state.selectedDayKey || businessTodayKey();
    state.selectedDayKey = key;
    state.periodAnchorKey = key;

    qs('#todayTitle').textContent = dayTitle(key);
    qs('#todaySubtitle').textContent = state.token
      ? 'Данные синхронизированы с Google Calendar.'
      : (state.events.length ? 'Показана последняя сохранённая синхронизация.' : 'Google Calendar не подключён.');
    syncDateControls();

    requestAnimationFrame(() => {
      if (renderId !== dayRenderSequence || state.currentView !== 'day') return;
      const index = rebuildDateIndex();
      const events = index.get(key) || [];
      qs('#summaryTotal').textContent = events.length;
      qs('#summaryPickup').textContent = events.filter(event => eventMeta(event).visitType === 'pickup').length;
      qs('#summaryDelivery').textContent = events.filter(event => eventMeta(event).visitType === 'delivery').length;
      qs('#summaryAttention').textContent = events.filter(event => {
        const data = eventMeta(event);
        return !data.phone || !displayAddress(data, event);
      }).length;
      renderToday(events);
      updateNavigationCounts(index);
    });
  }

  const originalRenderAll = renderAll;
  renderAll = function stableRenderAll() {
    if (state.currentView === 'day') {
      renderDayFast();
      return;
    }
    originalRenderAll();
  };

  const originalShiftPeriod = shiftPeriod;
  shiftSelectedDay = function stableShiftSelectedDay(days) {
    state.selectedDayKey = addDaysToKey(state.selectedDayKey || businessTodayKey(), days);
    state.periodAnchorKey = state.selectedDayKey;
    state.currentView = 'day';
    renderDayFast();
    pushAppHistory('day');
  };
  shiftPeriod = function stableShiftPeriod(days) {
    if (state.currentView === 'day') {
      shiftSelectedDay(days);
      return;
    }
    originalShiftPeriod(days);
  };

  googleRequest = async function stableGoogleRequest(path, options = {}) {
    if (!state.token) throw new Error('Google Calendar не подключён. Показаны сохранённые данные.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          Authorization: `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      if (response.status === 401) {
        clearSavedToken();
        updateConnectionUI();
        throw new Error('Сессия Google закончилась. Заявки сохранены — нажмите «Подключить Google» вручную.');
      }
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Google Calendar: ${response.status} ${body.slice(0, 160)}`);
      }
      return response.status === 204 ? null : response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Google Calendar не ответил за 20 секунд. Показаны сохранённые заявки.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  async function loadGooglePages() {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 730);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 365);
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const items = [];
    let pageToken = '';
    let pages = 0;

    do {
      const params = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '2500',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const result = await googleRequest(`/calendars/${calendarId}/events?${params}`);
      items.push(...(result?.items || []));
      pageToken = result?.nextPageToken || '';
      pages += 1;
    } while (pageToken && pages < 4);

    return items;
  }

  function looksLikeWrongAccount(previous, next) {
    if (!previous.length) return false;
    if (!next.length) return true;
    const previousHasPmk = previous.some(event => isPmkEvent(event));
    const nextHasPmk = next.some(event => isPmkEvent(event));
    return previousHasPmk && !nextHasPmk;
  }

  refreshEvents = function stableRefreshEvents() {
    restoreCachedEvents();
    if (!state.token) {
      invalidateEventCaches();
      indexedEventsRef = null;
      renderAll();
      updateConnectionUI();
      return Promise.resolve();
    }
    if (refreshPromise) return refreshPromise;

    const requestId = ++refreshSequence;
    const previous = [...state.events];
    refreshPromise = (async () => {
      try {
        const items = await loadGooglePages();
        if (requestId !== refreshSequence) return;
        if (looksLikeWrongAccount(previous, items)) {
          state.events = previous;
          showToast('Google вернул пустой или другой календарь. Сохранённые заявки оставлены на экране.', 'error');
        } else {
          state.events = items;
          saveCachedEvents(items);
          lastRefreshAt = Date.now();
        }
      } catch (error) {
        if (previous.length) state.events = previous;
        showToast(error.message, 'error');
      } finally {
        invalidateEventCaches();
        indexedEventsRef = null;
        renderAll();
        updateConnectionUI();
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  };

  autoReconnectGoogle = function disabledAutomaticReconnect() {};
  scheduleGoogleAutoReconnect = function stableGoogleStartup() {
    restoreCachedEvents();
    updateConnectionUI();
    if (state.token) setTimeout(() => refreshEvents(), 150);
  };

  connectGoogle = function manualGoogleConnect() {
    if (!state.settings.clientId) {
      setView('settings');
      showToast('Сначала укажите OAuth Client ID.', 'error');
      return;
    }
    if (!initializeGoogleTokenClient()) {
      showToast('Библиотека Google ещё загружается. Повторите через несколько секунд.', 'error');
      return;
    }
    state.silentReconnect = false;
    state.tokenClient.requestAccessToken({ prompt: state.token ? '' : 'select_account' });
  };

  updateConnectionUI = function stableConnectionUI() {
    const badge = qs('#connectionBadge');
    if (!badge) return;
    if (state.token) {
      badge.textContent = 'Google подключён';
      badge.className = 'status-badge online';
    } else if (state.events.length) {
      badge.textContent = 'Последняя синхронизация';
      badge.className = 'status-badge offline';
    } else {
      badge.textContent = 'Google не подключён';
      badge.className = 'status-badge offline';
    }
    qs('#connectGoogleBtn').textContent = state.token ? 'Переподключить' : 'Подключить Google';
    const submit = qs('#submitBtn');
    if (submit) submit.textContent = state.token
      ? (qs('#eventId').value ? 'Обновить в календаре' : 'Создать в календаре')
      : 'Сохранить на устройстве';
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !state.token) return;
    if (Date.now() - lastRefreshAt > 5 * 60 * 1000) refreshEvents();
  });
})();

//# sourceURL=runtime-stability-v37.js

/* ===== fast-calendar-sync-v68.js ===== */
'use strict';

(() => {
  if (window.PMK_FAST_CALENDAR_SYNC_V68) return;
  window.PMK_FAST_CALENDAR_SYNC_V68 = true;

  const CACHE_NAME = 'pmk-calendar-data-v68';
  const CACHE_PATH = './__pmk-calendar-events-v68.json';
  const LAST_SYNC_KEY = 'pmk-calendar-last-sync-v68';
  const CALENDAR_KEY = 'pmk-calendar-cache-id-v68';
  let activeSync = null;
  let cachePromise = null;

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function calendarId() {
    return String(state.settings.calendarId || 'primary');
  }

  function bumpRevision() {
    window.PMK_EVENTS_REVISION = Number(window.PMK_EVENTS_REVISION || 0) + 1;
  }

  function readLastSync() {
    try {
      if (localStorage.getItem(CALENDAR_KEY) !== calendarId()) return '';
      return localStorage.getItem(LAST_SYNC_KEY) || '';
    } catch { return ''; }
  }

  function saveLastSync(value) {
    try {
      localStorage.setItem(CALENDAR_KEY, calendarId());
      if (value) localStorage.setItem(LAST_SYNC_KEY, value);
      else localStorage.removeItem(LAST_SYNC_KEY);
    } catch {}
  }

  async function readCache() {
    if (!('caches' in window)) return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(CACHE_PATH);
      if (!response) return null;
      const payload = await response.json();
      if (payload?.calendarId !== calendarId() || !Array.isArray(payload?.events)) return null;
      return payload;
    } catch { return null; }
  }

  async function writeCache(events) {
    if (!('caches' in window)) return;
    try {
      const cache = await caches.open(CACHE_NAME);
      const payload = JSON.stringify({ calendarId:calendarId(), savedAt:Date.now(), events });
      await cache.put(CACHE_PATH, new Response(payload, { headers:{ 'Content-Type':'application/json' } }));
    } catch {}
  }

  async function hydrateCachedEvents() {
    if (cachePromise) return cachePromise;
    cachePromise = (async () => {
      const payload = await readCache();
      if (!payload?.events?.length) return false;
      if (!state.events.length || payload.events.length >= state.events.length) {
        state.events = payload.events;
        window.PMK_FULL_CALENDAR_EVENT_COUNT = payload.events.length;
        window.PMK_FULL_CALENDAR_CACHE_READY = true;
        window.PMK_FULL_CALENDAR_SYNC_READY = true;
        bumpRevision();
        invalidateEventCaches();
        renderAll();
        emit('pmk-calendar-cache-ready', { count:payload.events.length, savedAt:payload.savedAt || 0 });
      }
      return true;
    })().finally(() => { cachePromise = null; });
    return cachePromise;
  }

  async function requestPages(params, onPage) {
    const id = encodeURIComponent(calendarId());
    let pageToken = '';
    let page = 0;
    do {
      const query = new URLSearchParams(params);
      if (pageToken) query.set('pageToken', pageToken);
      const result = await googleRequest(`/calendars/${id}/events?${query}`);
      const items = Array.isArray(result?.items) ? result.items : [];
      onPage(items);
      pageToken = result?.nextPageToken || '';
      page += 1;
      emit('pmk-calendar-sync-progress', { page, count:Number(onPage.count?.() || 0) });
    } while (pageToken && page < 200);
  }

  async function fullSync() {
    const events = [];
    const append = items => events.push(...items);
    append.count = () => events.length;
    await requestPages({
      timeMin:'1970-01-01T00:00:00Z',
      timeMax:'2100-01-01T00:00:00Z',
      singleEvents:'true',
      orderBy:'startTime',
      showDeleted:'false',
      maxResults:'2500',
    }, append);
    return events;
  }

  async function incrementalSync(updatedMin) {
    const map = new Map((state.events || []).map(event => [event.id, event]));
    let processed = 0;
    const apply = items => {
      items.forEach(event => {
        processed += 1;
        if (!event?.id) return;
        if (event.status === 'cancelled') map.delete(event.id);
        else map.set(event.id, event);
      });
    };
    apply.count = () => processed;
    await requestPages({
      updatedMin,
      singleEvents:'true',
      showDeleted:'true',
      maxResults:'2500',
    }, apply);
    return [...map.values()].sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0));
  }

  async function performSync() {
    if (!state.token) {
      await hydrateCachedEvents();
      invalidateEventCaches();
      renderAll();
      return;
    }
    if (activeSync) return activeSync;

    activeSync = (async () => {
      emit('pmk-calendar-sync-start');
      const syncStartedAt = new Date().toISOString();
      try {
        await hydrateCachedEvents();
        const lastSync = readLastSync();
        let events;
        if (lastSync && state.events.length) {
          try {
            events = await incrementalSync(lastSync);
          } catch {
            events = await fullSync();
          }
        } else {
          events = await fullSync();
        }
        state.events = events;
        saveLastSync(syncStartedAt);
        window.PMK_FULL_CALENDAR_SYNC_READY = true;
        window.PMK_FULL_CALENDAR_CACHE_READY = true;
        window.PMK_FULL_CALENDAR_EVENT_COUNT = events.length;
        bumpRevision();
        invalidateEventCaches();
        renderAll();
        checkUpcomingNotifications();
        await writeCache(events);
        emit('pmk-calendar-sync-done', { count:events.length });
      } catch (error) {
        window.PMK_FULL_CALENDAR_SYNC_READY = Boolean(state.events.length);
        invalidateEventCaches();
        renderAll();
        emit('pmk-calendar-sync-error', { message:error?.message || String(error) });
        showToast(error?.message || 'Не удалось синхронизировать Google Calendar.', 'error');
      } finally {
        activeSync = null;
      }
    })();

    return activeSync;
  }

  refreshEvents = performSync;
  window.PMK_FULL_CALENDAR_SYNC = { refresh:performSync, hydrate:hydrateCachedEvents };

  const previousPersistLocalEvents = persistLocalEvents;
  persistLocalEvents = function persistLocalEventsWithRevisionV68() {
    const result = previousPersistLocalEvents();
    bumpRevision();
    emit('pmk-local-events-changed', { count:state.localEvents.length });
    return result;
  };

  const start = () => requestAnimationFrame(() => hydrateCachedEvents());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
//# sourceURL=fast-calendar-sync-v68.js

/* ===== returning-client-search.js ===== */
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
//# sourceURL=returning-client-search.js

/* ===== client-search-fast-v68.js ===== */
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
    pmkLastClientQuery = query;
    const normalized = normalize(query);
    const exactContract = contractQuery(normalized);
    const digits = normalized.replace(/\D/g, '');
    if (normalized.length < 2 && !exactContract) return pmkCloseClientResults();

    const matches = buildIndex().filter(item => {
      if (exactContract) return item.contractDigits === exactContract;
      if (digits.length >= 5 && item.phoneDigits.includes(digits)) return true;
      return item.search.includes(normalized);
    }).slice(0, 60);

    if (!matches.length) {
      results.innerHTML = '<div class="client-quick-empty">Ничего не найдено. Для договора используйте: <b>Д453</b>, <b>договор 453</b> или <b>453</b>.</div>';
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
//# sourceURL=client-search-fast-v68.js

/* ===== smart-paste-v38.js ===== */
'use strict';

(() => {
  const STORAGE_KEY = 'pmk-smart-paste-draft-v1';
  const DISTRICTS = ['Автозаводский','Ленинский','Канавинский','Московский','Сормовский','Нижегородский','Советский','Приокский'];
  const SETTLEMENTS = ['Нижний Новгород','Бор','Дзержинск','Кстово','Богородск','Балахна','Городец','Павлово','Арзамас'];
  const WEEKDAYS = {
    воскресенье: 0,
    понедельник: 1,
    вторник: 2,
    среда: 3,
    четверг: 4,
    пятница: 5,
    суббота: 6,
  };

  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const numberValue = value => Number(String(value || '').replace(/\s/g, '').replace(',', '.')) || 0;
  const unique = values => [...new Set(values.filter(Boolean))];
  const has = (text, pattern) => pattern.test(text);

  function formatPhone(raw = '') {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
    if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
    if (digits.length === 10) return `+7${digits}`;
    return clean(raw);
  }

  function extractPhone(text) {
    const match = text.match(/(?:\+?7|8)?[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/);
    return match ? formatPhone(match[0]) : '';
  }

  function extractName(text) {
    const explicit = text.match(/(?:^|\n|[.;])\s*(?:имя|клиент|заказчик)\s*[:\-]?\s*([А-ЯЁ][а-яё]{1,30})(?=\s|[.,;\n]|$)/i);
    if (explicit) return explicit[1].replace(/^./, char => char.toUpperCase());

    const contextual = text.match(/(?:^|[.\n;])\s*([А-ЯЁ][а-яё]{1,30})\s*[.,]?\s*(?=дома|будет|жд[её]т|можно|после|до|с\s*\d)/i);
    if (contextual) return contextual[1].replace(/^./, char => char.toUpperCase());

    const blocked = new Set([...DISTRICTS, ...SETTLEMENTS, 'Сегодня', 'Завтра', 'Забор', 'Доставка']);
    const lines = text.split(/\n+/).map(clean).filter(Boolean);
    for (const line of lines) {
      if (/телефон|адрес|район|ков[её]р|цена|стоимость|размер|авито|яндекс|сайт/i.test(line)) continue;
      const single = line.match(/^([А-ЯЁ][а-яё]{2,24})(?:[.,])?$/);
      if (single && !blocked.has(single[1])) return single[1];
    }
    return '';
  }

  function extractSource(text) {
    const avito = text.match(/авито\s*([123])?/i);
    if (avito) return `Avito ${avito[1] || '1'}`;
    if (/яндекс/i.test(text)) return 'Яндекс';
    if (/рекомендац|посоветовал|посоветовала/i.test(text)) return 'Рекомендации';
    if (/(?:^|\s)вк(?:\s|$)|вконтакте/i.test(text)) return 'ВК';
    if (/\bmax\b|макс/i.test(text)) return 'Макс';
    if (/квиз/i.test(text)) return 'Квиз';
    if (/сайт|форма\s+заказа|заявка\s+с\s+сайта/i.test(text)) return 'Сайт';
    if (/постоянн\w*\s+клиент|повторн\w*\s+заказ/i.test(text)) return 'Постоянный клиент';
    return '';
  }

  function extractDistrict(text) {
    return DISTRICTS.find(item => new RegExp(item, 'i').test(text)) || '';
  }

  function extractSettlement(text) {
    return SETTLEMENTS.find(item => new RegExp(item.replace(' ', '\\s+'), 'i').test(text)) || '';
  }

  function extractAddress(text) {
    const result = {
      settlement: extractSettlement(text),
      district: extractDistrict(text),
      street: '',
      houseNumber: '',
      apartmentNumber: '',
      entrance: '',
      floor: '',
    };

    const explicitAddress = text.match(/(?:^|\n)\s*адрес\s*[:\-]\s*([^\n]+)/i)?.[1] || '';
    const source = explicitAddress || text;
    const streetPatterns = [
      /(?:ул(?:ица)?\.?|пр(?:оспект)?\.?|пр-т|пер(?:еулок)?\.?|шоссе|наб(?:ережная)?\.?)\s*([А-ЯЁа-яёA-Za-z0-9\- ]+?)\s*,?\s*(?:д(?:ом)?\.?\s*)?(\d+[А-ЯЁа-яёA-Za-z\/-]*)/i,
      /(?:^|\n)\s*(?:район\s*[:\-]?\s*)?(?:Автозаводский|Ленинский|Канавинский|Московский|Сормовский|Нижегородский|Советский|Приокский)?\s*([А-ЯЁ][А-ЯЁа-яё\- ]{2,40})\s+(\d+[А-ЯЁа-яёA-Za-z\/-]*)(?=\s|,|\.|$)/i,
    ];
    for (const pattern of streetPatterns) {
      const match = source.match(pattern);
      if (!match) continue;
      result.street = clean(match[1]).replace(/^(?:ул(?:ица)?\.?|пр(?:оспект)?\.?|пр-т|пер(?:еулок)?\.?)\s*/i, '');
      result.houseNumber = clean(match[2]);
      break;
    }

    result.apartmentNumber = clean(text.match(/(?:кв(?:артира)?\.?\s*)(\d+[А-ЯЁа-яёA-Za-z\/-]*)/i)?.[1] || '');
    result.entrance = clean(text.match(/(?:подъезд|под\.)\s*№?\s*(\d+)/i)?.[1] || '');
    result.floor = clean(text.match(/(?:этаж|эт\.)\s*№?\s*(\d+)/i)?.[1] || '');
    return result;
  }

  function nextWeekdayKey(targetDay) {
    const currentKey = state.selectedDayKey || businessTodayKey();
    const current = dateKeyForDisplay(currentKey);
    const delta = (targetDay - current.getUTCDay() + 7) % 7 || 7;
    return addDaysToKey(currentKey, delta);
  }

  function extractDate(text) {
    if (/\bсегодня\b/i.test(text)) return businessTodayKey();
    if (/\bзавтра\b/i.test(text)) return addDaysToKey(businessTodayKey(), 1);

    const date = text.match(/(?:^|\s)(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?(?=\s|$|[.,])/);
    if (date) {
      const nowYear = Number(businessTodayKey().slice(0, 4));
      let year = date[3] ? Number(date[3]) : nowYear;
      if (year < 100) year += 2000;
      const month = Math.max(1, Math.min(12, Number(date[2])));
      const day = Math.max(1, Math.min(31, Number(date[1])));
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const lower = text.toLowerCase();
    for (const [name, day] of Object.entries(WEEKDAYS)) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(lower)) return nextWeekdayKey(day);
    }
    return '';
  }

  function extractTime(text) {
    const rangePatterns = [
      /(?:с\s*)?(\d{1,2})[:.](\d{2})\s*(?:до|[-–—])\s*(\d{1,2})[:.](\d{2})/i,
      /(?:с\s*)?(\d{1,2})\s*(?:до|[-–—])\s*(\d{1,2})(?=\s|$|[.,])/i,
    ];
    for (const pattern of rangePatterns) {
      const match = text.match(pattern);
      if (!match) continue;
      if (match.length === 5) {
        return {
          startTime: `${String(match[1]).padStart(2, '0')}:${match[2]}`,
          endTime: `${String(match[3]).padStart(2, '0')}:${match[4]}`,
          timeNote: '',
        };
      }
      return {
        startTime: `${String(match[1]).padStart(2, '0')}:00`,
        endTime: `${String(match[2]).padStart(2, '0')}:00`,
        timeNote: '',
      };
    }

    const single = text.match(/(?:дома\s*)?(?:с|после|к)\s*(\d{1,2})[:.](\d{2})/i);
    if (single) {
      const startTime = `${String(single[1]).padStart(2, '0')}:${single[2]}`;
      return {
        startTime,
        endTime: addMinutesToTime(startTime, REQUEST_DURATION_MINUTES),
        timeNote: clean(single[0]),
      };
    }
    return {};
  }

  function extractIssues(text) {
    return unique([
      has(text, /пятн/i) ? 'Пятна' : '',
      has(text, /шерст/i) ? 'Шерсть' : '',
      has(text, /волос/i) ? 'Волосы' : '',
      has(text, /запах\s*мочи|моч[аи]|описал|описала/i) ? 'Запах мочи' : '',
      has(text, /дезинф/i) ? 'Дезинфекция' : '',
      has(text, /слайм|пластилин/i) ? 'Слайм / пластилин' : '',
    ]);
  }

  function extractServices(text) {
    return unique([
      has(text, /поднят(?:ие|ь)\s*ворс|подъ[её]м\s*ворс/i) ? 'Подъём ворса' : '',
      has(text, /удален\w*\s*запах|удалить\s*запах/i) ? 'Удаление запаха мочи' : '',
      has(text, /озон/i) ? 'Озонация' : '',
      has(text, /кондиционер/i) ? 'Кондиционер' : '',
      has(text, /экспресс|срочн/i) ? 'Экспресс-стирка' : '',
    ]);
  }

  function extractMaterial(text) {
    if (/вискоз/i.test(text)) return 'Вискоза';
    if (/ш[её]лк/i.test(text)) return 'Шёлк';
    if (/хлопок|хлопков/i.test(text)) return 'Хлопок';
    if (/шерст/i.test(text) && !/шерсть\s+(?:животн|кош|собак)/i.test(text)) return 'Шерсть';
    if (/безворс/i.test(text)) return 'Безворсный';
    if (/синтет/i.test(text)) return 'Синтетика';
    return '';
  }

  function extractPile(text) {
    if (/без\s*ворс|безворс/i.test(text)) return 'Без ворса';
    if (/шегги|длинн\w*\s*ворс|высок\w*\s*ворс|более\s*1\s*см/i.test(text)) return 'Более 1 см';
    if (/средн\w*\s*ворс|коротк\w*\s*ворс|до\s*1\s*см/i.test(text)) return 'До 1 см';
    return '';
  }

  function rugFromText(text, length, width) {
    return {
      length,
      width,
      material: extractMaterial(text),
      pile: extractPile(text),
      issues: extractIssues(text),
      services: extractServices(text),
    };
  }

  function extractRugs(text) {
    const explicit = text.match(/ширин[аы]?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:м)?[^\n]{0,30}?длин[аы]?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i);
    if (explicit) return [rugFromText(text, numberValue(explicit[2]), numberValue(explicit[1]))];

    const rugs = [];
    const lines = text.split(/\n+/).map(clean).filter(Boolean);
    const pattern = /(\d+(?:[.,]\d+)?)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)/ig;
    for (const line of lines) {
      let match;
      while ((match = pattern.exec(line))) {
        rugs.push(rugFromText(line, numberValue(match[1]), numberValue(match[2])));
      }
      pattern.lastIndex = 0;
    }

    if (!rugs.length) {
      let match;
      while ((match = pattern.exec(text))) rugs.push(rugFromText(text, numberValue(match[1]), numberValue(match[2])));
    }

    if (rugs.length === 1) {
      rugs[0].issues = extractIssues(text);
      rugs[0].services = extractServices(text);
      rugs[0].material ||= extractMaterial(text);
      rugs[0].pile ||= extractPile(text);
    }
    return rugs;
  }

  function extractPrice(text) {
    const explicit = text.match(/(?:итого|цена|стоимость|сумма)\s*[:\-]?\s*(\d[\d\s]{2,})\s*(?:₽|р\.?|руб)/i);
    if (explicit) return Number(explicit[1].replace(/\s/g, ''));
    const trailing = [...text.matchAll(/(\d[\d\s]{2,})\s*(?:₽|р\.?|руб(?:лей)?)/ig)]
      .map(match => Number(match[1].replace(/\s/g, '')))
      .filter(value => value >= 300 && value <= 200000);
    return trailing.at(-1) || 0;
  }

  function extractDiscount(text) {
    const match = text.match(/скидк[аи]?\s*[:\-]?\s*(\d{1,2})\s*%/i);
    return match ? Number(match[1]) : 0;
  }

  function extractCallAhead(text) {
    const match = text.match(/(?:позвонить|набрать|предупредить)[^\n]{0,20}?(?:за\s*)?(\d{1,3})\s*мин/i);
    if (match) return { callAhead: true, callAheadMinutes: Number(match[1]) };
    if (/позвонить\s+заранее|предварительно\s+позвонить/i.test(text)) return { callAhead: true, callAheadMinutes: 30 };
    return {};
  }

  function parseText(text) {
    const normalized = clean(text.replace(/\r/g, '\n')).replace(/\n{3,}/g, '\n\n');
    const address = extractAddress(normalized);
    const time = extractTime(normalized);
    const rugs = extractRugs(normalized);
    const source = extractSource(normalized);
    const regular = /постоянн\w*\s+клиент|повторн\w*\s+заказ|уже\s+обращал/i.test(normalized) || source === 'Постоянный клиент';
    const visitType = /\bдоставк/i.test(normalized) && !/забор/i.test(normalized) ? 'delivery' : 'pickup';
    return {
      text: normalized,
      customerName: extractName(normalized),
      phone: extractPhone(normalized),
      orderSource: source,
      ...address,
      visitType,
      visitDate: extractDate(normalized),
      ...time,
      rugs,
      estimatedPrice: extractPrice(normalized),
      discount: extractDiscount(normalized),
      regularCustomer: regular,
      ...extractCallAhead(normalized),
    };
  }

  function recognizedLabels(parsed) {
    const values = [];
    if (parsed.customerName) values.push(`Имя: ${parsed.customerName}`);
    if (parsed.phone) values.push(`Телефон: ${parsed.phone}`);
    if (parsed.street || parsed.houseNumber) values.push(`Адрес: ${[parsed.street, parsed.houseNumber].filter(Boolean).join(', ')}`);
    if (parsed.district) values.push(`Район: ${parsed.district}`);
    if (parsed.visitDate) values.push(`Дата: ${formatDateShort(parsed.visitDate)}`);
    if (parsed.startTime) values.push(`Время: ${parsed.startTime}${parsed.endTime ? `–${parsed.endTime}` : ''}`);
    if (parsed.rugs.length) values.push(`Ковров: ${parsed.rugs.length}`);
    if (parsed.estimatedPrice) values.push(`Стоимость: ${formatMoney(parsed.estimatedPrice)}`);
    if (parsed.orderSource) values.push(`Источник: ${parsed.orderSource}`);
    return values;
  }

  function applyParsedText() {
    const textarea = qs('#smartPasteInput');
    const raw = textarea?.value.trim() || '';
    if (!raw) {
      textarea?.focus();
      showToast('Сначала вставьте текст клиента.', 'error');
      return;
    }

    const parsed = parseText(raw);
    const current = getFormData();
    const wasEditing = Boolean(current.eventId);
    const currentComment = clean(current.managerComment);
    const rawComment = `Исходный текст клиента:\n${parsed.text}`;
    const next = {
      ...current,
      customerName: parsed.customerName || current.customerName,
      phone: parsed.phone || current.phone,
      orderSource: parsed.orderSource || current.orderSource,
      settlement: parsed.settlement || current.settlement || 'Нижний Новгород',
      district: parsed.district || current.district,
      street: parsed.street || current.street,
      houseNumber: parsed.houseNumber || current.houseNumber,
      apartmentNumber: parsed.apartmentNumber || current.apartmentNumber,
      entrance: parsed.entrance || current.entrance,
      floor: parsed.floor || current.floor,
      visitType: parsed.visitType || current.visitType,
      visitDate: parsed.visitDate || current.visitDate,
      startTime: parsed.startTime || current.startTime,
      endTime: parsed.endTime || current.endTime,
      timeNote: parsed.timeNote || current.timeNote,
      rugs: parsed.rugs.length ? parsed.rugs : current.rugs,
      estimatedPrice: parsed.estimatedPrice || current.estimatedPrice,
      discount: parsed.discount || current.discount,
      regularCustomer: parsed.regularCustomer || current.regularCustomer,
      callAhead: parsed.callAhead ?? current.callAhead,
      callAheadMinutes: parsed.callAheadMinutes || current.callAheadMinutes,
      managerComment: currentComment.includes(parsed.text) ? currentComment : [currentComment, rawComment].filter(Boolean).join('\n\n'),
      eventId: current.eventId,
      pmkId: current.pmkId,
    };

    fillForm(next);
    textarea.value = raw;
    localStorage.setItem(STORAGE_KEY, raw);
    if (!wasEditing) {
      qs('#eventId').value = '';
      qs('#eventId').dataset.pmkId = current.pmkId || makeId();
      qs('#deleteEventBtn').classList.add('hidden');
      qs('#formTitle').textContent = 'Новая заявка — данные распределены';
    }

    const labels = recognizedLabels(parsed);
    const result = qs('#smartPasteResult');
    result.className = `smart-paste-result ${labels.length ? 'success' : 'warning'}`;
    result.innerHTML = labels.length
      ? `<strong>Распознано:</strong><div>${labels.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div><small>Проверьте заполненные поля перед сохранением.</small>`
      : '<strong>Точные поля не распознаны.</strong><small>Исходный текст перенесён в комментарий — заполните нужные данные вручную.</small>';
    schedulePreviewUpdate();
    showToast(labels.length ? 'Данные распределены по форме.' : 'Текст сохранён в комментарии.', labels.length ? 'success' : 'error');
  }

  async function pasteFromClipboard() {
    const textarea = qs('#smartPasteInput');
    if (!textarea) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) throw new Error('Буфер обмена пуст.');
      textarea.value = text;
      localStorage.setItem(STORAGE_KEY, text);
      textarea.focus();
      showToast('Текст вставлен. Нажмите «Распределить по полям».', 'success');
    } catch {
      textarea.focus();
      showToast('Нажмите и удерживайте поле, затем выберите «Вставить».', 'error');
    }
  }

  function clearSmartPaste() {
    const textarea = qs('#smartPasteInput');
    if (textarea) textarea.value = '';
    localStorage.removeItem(STORAGE_KEY);
    const result = qs('#smartPasteResult');
    if (result) {
      result.className = 'smart-paste-result hidden';
      result.innerHTML = '';
    }
  }

  function createSmartPasteBlock() {
    const form = qs('#requestForm');
    const layout = qs('.form-layout', form);
    if (!form || !layout || qs('#smartPasteCard')) return;

    const style = document.createElement('style');
    style.textContent = `
      .smart-paste-card{margin-bottom:18px;border:2px solid rgba(245,183,0,.42);background:linear-gradient(135deg,rgba(255,193,7,.12),rgba(255,255,255,.92))}
      .smart-paste-heading{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}.smart-paste-heading>span{display:grid;place-items:center;min-width:38px;height:38px;border-radius:12px;background:#f5b700;color:#111;font-weight:900}.smart-paste-heading h2{margin:0 0 3px}.smart-paste-heading p{margin:0;opacity:.7}
      .smart-paste-card textarea{width:100%;min-height:132px;box-sizing:border-box;resize:vertical;font:inherit;line-height:1.45}
      .smart-paste-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.smart-paste-actions .button{min-height:44px}.smart-paste-primary{font-weight:800}
      .smart-paste-result{margin-top:10px;padding:12px;border-radius:12px}.smart-paste-result.hidden{display:none}.smart-paste-result.success{background:rgba(31,157,85,.1);border:1px solid rgba(31,157,85,.25)}.smart-paste-result.warning{background:rgba(191,115,0,.1);border:1px solid rgba(191,115,0,.25)}
      .smart-paste-result>div{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.smart-paste-result span{padding:5px 8px;border-radius:999px;background:rgba(0,0,0,.06);font-size:13px}.smart-paste-result small{display:block;opacity:.7}
      @media(max-width:700px){.smart-paste-card{margin:0 0 14px}.smart-paste-card textarea{min-height:150px}.smart-paste-actions{display:grid;grid-template-columns:1fr 1fr}.smart-paste-actions .smart-paste-primary{grid-column:1/-1;order:-1}.smart-paste-actions .button{width:100%;padding-inline:10px}}
    `;
    document.head.appendChild(style);

    const card = document.createElement('section');
    card.id = 'smartPasteCard';
    card.className = 'form-card smart-paste-card';
    card.innerHTML = `
      <div class="smart-paste-heading"><span>⚡</span><div><h2>Быстро вставить заявку</h2><p>Вставьте весь текст из сайта, MAX, СМС или переписки — приложение распределит данные по полям.</p></div></div>
      <label class="field">Информация клиента
        <textarea id="smartPasteInput" rows="6" placeholder="Например: Ленинский, ул. Пограничников 3, Ольга, +79200388933, Авито 1, шегги, подъём ворса, 3,9 × 2,6, цена 6080 ₽, завтра с 18:00"></textarea>
      </label>
      <div class="smart-paste-actions">
        <button type="button" id="smartPasteParseBtn" class="button button-primary smart-paste-primary">Распределить по полям</button>
        <button type="button" id="smartPasteClipboardBtn" class="button button-secondary">Вставить из буфера</button>
        <button type="button" id="smartPasteClearBtn" class="button button-ghost">Очистить</button>
      </div>
      <div id="smartPasteResult" class="smart-paste-result hidden"></div>
    `;
    form.insertBefore(card, layout);

    const textarea = qs('#smartPasteInput');
    try { textarea.value = localStorage.getItem(STORAGE_KEY) || ''; } catch {}
    textarea.addEventListener('input', () => {
      try {
        if (textarea.value.trim()) localStorage.setItem(STORAGE_KEY, textarea.value);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {}
    });
    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        applyParsedText();
      }
    });
    qs('#smartPasteParseBtn').addEventListener('click', applyParsedText);
    qs('#smartPasteClipboardBtn').addEventListener('click', pasteFromClipboard);
    qs('#smartPasteClearBtn').addEventListener('click', clearSmartPaste);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createSmartPasteBlock, { once: true });
  else createSmartPasteBlock();
})();

//# sourceURL=smart-paste-v38.js

/* ===== smart-paste-lifecycle-v38.js ===== */
'use strict';

(() => {
  const STORAGE_KEY = 'pmk-smart-paste-draft-v1';
  const originalSaveRequest = saveRequest;

  saveRequest = async function saveRequestWithSmartPasteCleanup(...args) {
    await originalSaveRequest(...args);
    if (state.currentView === 'form') return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    const textarea = qs('#smartPasteInput');
    if (textarea) textarea.value = '';
    const result = qs('#smartPasteResult');
    if (result) {
      result.className = 'smart-paste-result hidden';
      result.innerHTML = '';
    }
  };
})();

//# sourceURL=smart-paste-lifecycle-v38.js

/* ===== smart-parser-v45.js ===== */
'use strict';

(() => {
  const STORAGE_KEY = 'pmk-smart-paste-draft-v1';
  const MONTHS = {
    января: 1, январь: 1, февраля: 2, февраль: 2, марта: 3, март: 3,
    апреля: 4, апрель: 4, мая: 5, май: 5, июня: 6, июнь: 6,
    июля: 7, июль: 7, августа: 8, август: 8, сентября: 9, сентябрь: 9,
    октября: 10, октябрь: 10, ноября: 11, ноябрь: 11, декабря: 12, декабрь: 12,
  };
  const WEEKDAYS = {
    воскресенье: 0, воскресенья: 0,
    понедельник: 1, понедельника: 1,
    вторник: 2, вторника: 2,
    среда: 3, среду: 3, среды: 3,
    четверг: 4, четверга: 4,
    пятница: 5, пятницу: 5, пятницы: 5,
    суббота: 6, субботу: 6, субботы: 6,
  };
  const SETTLEMENT_ALIASES = [
    ['Нижний Новгород', /нижн(?:ий|его)?\s+новгород|\bнн\b/i],
    ['Бор', /(?:город\s+)?бор\b/i],
    ['Дзержинск', /дзержинск/i],
    ['Кстово', /кстов/i],
    ['Богородск', /богородск/i],
    ['Балахна', /балахн/i],
    ['Городец', /городец/i],
    ['Павлово', /павлов/i],
    ['Арзамас', /арзамас/i],
  ];
  const DISTRICT_ALIASES = [
    ['Автозаводский', /автозаводск|автозавод|автоз/i],
    ['Ленинский', /ленинск/i],
    ['Канавинский', /канавинск|канавин/i],
    ['Московский', /московск(?:ий|ого)?\s+(?:район|р-н)|московский\s+район/i],
    ['Сормовский', /сормовск|сормов/i],
    ['Нижегородский', /нижегородск(?:ий|ого)?\s+(?:район|р-н)|нижегородский\s+район/i],
    ['Советский', /советск(?:ий|ого)?\s+(?:район|р-н)|советский\s+район/i],
    ['Приокский', /приокск|приок/i],
  ];
  const UNITS = {
    ноль: 0, нуль: 0, один: 1, одна: 1, одно: 1, первого: 1, первый: 1, первая: 1, первом: 1,
    два: 2, две: 2, второго: 2, второй: 2, вторая: 2, втором: 2,
    три: 3, третьего: 3, третий: 3, третья: 3, третьем: 3,
    четыре: 4, четвертого: 4, четвёртого: 4, четвертый: 4, четвёртый: 4, четвертая: 4, четвёртая: 4,
    пять: 5, пятого: 5, пятый: 5, пятая: 5, пятом: 5,
    шесть: 6, шестого: 6, шестой: 6, шестая: 6,
    семь: 7, седьмого: 7, седьмой: 7, седьмая: 7,
    восемь: 8, восьмого: 8, восьмой: 8, восьмая: 8,
    девять: 9, девятого: 9, девятый: 9, девятая: 9,
  };
  const TEENS = {
    десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14,
    пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18, девятнадцать: 19,
  };
  const TENS = {
    двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50,
    шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90,
  };
  const HUNDREDS = {
    сто: 100, двести: 200, триста: 300, четыреста: 400, пятьсот: 500,
    шестьсот: 600, семьсот: 700, восемьсот: 800, девятьсот: 900,
  };
  const DIGIT_WORDS = {
    ноль: '0', нуль: '0', один: '1', одна: '1', два: '2', две: '2', три: '3', четыре: '4',
    пять: '5', шесть: '6', семь: '7', восемь: '8', девять: '9',
  };
  const NUMBER_WORD_SOURCE = [
    ...Object.keys(UNITS), ...Object.keys(TEENS), ...Object.keys(TENS), ...Object.keys(HUNDREDS),
    'тысяча', 'тысячи', 'тысяч', 'полтора', 'полторы', 'половина', 'половиной',
    'четверть', 'четвертью', 'целая', 'целых', 'десятая', 'десятых', 'сотая', 'сотых',
    'точка', 'запятая',
  ].sort((a, b) => b.length - a.length).join('|');
  const NUMBER_PHRASE = `(?:\\d+(?:[.,]\\d+)?|(?:${NUMBER_WORD_SOURCE})(?:[\\s-]+(?:${NUMBER_WORD_SOURCE}|\\d+))*)`;

  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const unique = values => [...new Set((values || []).filter(Boolean))];
  const titleCase = value => clean(value).toLowerCase().replace(/(^|[\s-])[а-яё]/g, char => char.toUpperCase());
  const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function normalizeSpeech(text = '') {
    return String(text)
      .replace(/\r/g, '\n')
      .replace(/[«»„“”]/g, '"')
      .replace(/\bномер\s+номер\b/gi, 'номер')
      .replace(/\bикс\b/gi, ' на ')
      .replace(/\bумножить\s+на\b/gi, ' на ')
      .replace(/\s*([,;])\s*/g, '$1 ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function tokensOf(value = '') {
    return clean(value)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^а-яa-z0-9.,-]+/gi, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function integerFromWords(value = '') {
    const tokens = tokensOf(value);
    let total = 0;
    let current = 0;
    let found = false;
    for (const original of tokens) {
      const token = original.replace(/ё/g, 'е');
      if (/^\d+$/.test(token)) {
        current += Number(token);
        found = true;
      } else if (UNITS[token] !== undefined) {
        current += UNITS[token];
        found = true;
      } else if (TEENS[token] !== undefined) {
        current += TEENS[token];
        found = true;
      } else if (TENS[token] !== undefined) {
        current += TENS[token];
        found = true;
      } else if (HUNDREDS[token] !== undefined) {
        current += HUNDREDS[token];
        found = true;
      } else if (/^тысяч/.test(token)) {
        total += (current || 1) * 1000;
        current = 0;
        found = true;
      }
    }
    return found ? total + current : NaN;
  }

  function decimalDigitsFromWords(value = '') {
    const tokens = tokensOf(value);
    const digits = [];
    for (const token of tokens) {
      if (/^\d+$/.test(token)) digits.push(token);
      else if (DIGIT_WORDS[token] !== undefined) digits.push(DIGIT_WORDS[token]);
      else {
        const number = integerFromWords(token);
        if (Number.isFinite(number)) digits.push(String(number));
      }
    }
    return digits.join('');
  }

  function parseNumberPhrase(value = '', options = {}) {
    const raw = clean(value).toLowerCase().replace(/ё/g, 'е');
    if (!raw) return NaN;
    const direct = raw.match(/\d+(?:[.,]\d+)?/);
    if (direct && direct[0].length === raw.replace(/\s/g, '').length) return Number(direct[0].replace(',', '.'));
    if (/^полтор[аы]$/.test(raw)) return 1.5;

    const half = raw.match(/^(.+?)\s+с\s+половин(?:ой|а)$/);
    if (half) {
      const whole = integerFromWords(half[1]);
      if (Number.isFinite(whole)) return whole + 0.5;
    }
    const quarter = raw.match(/^(.+?)\s+с\s+четверт(?:ью|ь)$/);
    if (quarter) {
      const whole = integerFromWords(quarter[1]);
      if (Number.isFinite(whole)) return whole + 0.25;
    }
    const fraction = raw.match(/^(.+?)\s+цел(?:ая|ых)\s+(.+?)\s+(десят(?:ая|ых)|сот(?:ая|ых))$/);
    if (fraction) {
      const whole = integerFromWords(fraction[1]);
      const numerator = integerFromWords(fraction[2]);
      const divisor = fraction[3].startsWith('десят') ? 10 : 100;
      if (Number.isFinite(whole) && Number.isFinite(numerator)) return whole + numerator / divisor;
    }
    const spokenDecimal = raw.match(/^(.+?)\s+(?:точка|запятая)\s+(.+)$/);
    if (spokenDecimal) {
      const whole = integerFromWords(spokenDecimal[1]);
      const digits = decimalDigitsFromWords(spokenDecimal[2]);
      if (Number.isFinite(whole) && digits) return Number(`${whole}.${digits}`);
    }

    if (options.dimension) {
      const parts = raw.split(/\s+/);
      if (parts.length === 2) {
        const first = integerFromWords(parts[0]);
        const second = integerFromWords(parts[1]);
        if (Number.isFinite(first) && first <= 20 && Number.isFinite(second) && second >= 10 && second < 100) {
          return first + second / 100;
        }
      }
    }

    const words = integerFromWords(raw);
    if (Number.isFinite(words)) return words;
    const fallback = raw.match(/\d+(?:[.,]\d+)?/);
    return fallback ? Number(fallback[0].replace(',', '.')) : NaN;
  }

  function extractNearbyNumber(text, labelPattern, options = {}) {
    const after = text.match(new RegExp(`(?:${labelPattern})\\s*(?:номер|№|:|-)?\\s*(${NUMBER_PHRASE})`, 'i'));
    if (after) return parseNumberPhrase(after[1], options);
    const before = text.match(new RegExp(`(${NUMBER_PHRASE})\\s*(?:-?й|-?я|-?го)?\\s*(?:${labelPattern})`, 'i'));
    return before ? parseNumberPhrase(before[1], options) : NaN;
  }

  function formatPhone(raw = '') {
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
    if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
    if (digits.length === 10) return `+7${digits}`;
    return digits.length >= 10 ? `+${digits}` : '';
  }

  function extractPhone(text) {
    const numeric = text.match(/(?:\+?7|8)?[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/);
    if (numeric) return formatPhone(numeric[0]);

    const segment = text.match(/(?:телефон|номер\s+телефона|мобильный)\s*[:\-]?\s*([^\n.;]{10,120})/i)?.[1] || '';
    if (!segment) return '';
    const digitTokens = tokensOf(segment).map(token => DIGIT_WORDS[token]).filter(value => value !== undefined);
    if (digitTokens.length >= 10) return formatPhone(digitTokens.join('').slice(0, 11));
    return '';
  }

  function extractName(text) {
    const patterns = [
      /(?:имя(?:\s+клиента)?|клиент|заказчик)\s*[:\-]?\s*(?:зовут\s+)?([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/i,
      /(?:клиента|е[её]|его|меня)\s+зовут\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/i,
      /(?:обращается|записать|запишите)\s+([А-ЯЁ][а-яё]+)(?=\s|,|\.|$)/i,
      /(?:это|я)\s+([А-ЯЁ][а-яё]+)(?=\s|,|\.|$)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return titleCase(match[1]);
    }

    const blocked = /адрес|улиц|дом|квартир|подъезд|этаж|район|ков[её]р|размер|цена|стоимость|телефон|авито|яндекс|сайт|забор|доставка/i;
    const lines = text.split(/\n+/).map(clean).filter(Boolean);
    for (const line of lines) {
      if (blocked.test(line)) continue;
      const match = line.match(/^([А-ЯЁ][а-яё]{2,24})(?:\s+([А-ЯЁ][а-яё]{2,24}))?[,.;]?$/);
      if (match) return titleCase([match[1], match[2]].filter(Boolean).join(' '));
    }
    return '';
  }

  function extractSource(text) {
    const avito = text.match(/авито\s*([123])?/i);
    if (avito) return `Avito ${avito[1] || '1'}`;
    if (/яндекс/i.test(text)) return 'Яндекс';
    if (/рекомендац|посоветовал|посоветовала|по\s+совету/i.test(text)) return 'Рекомендации';
    if (/(?:^|\s)вк(?:\s|$)|вконтакте/i.test(text)) return 'ВК';
    if (/\bmax\b|макс/i.test(text)) return 'Макс';
    if (/квиз/i.test(text)) return 'Квиз';
    if (/сайт|форма\s+заказа|заявка\s+с\s+сайта/i.test(text)) return 'Сайт';
    if (/постоянн\w*\s+клиент|повторн\w*\s+заказ|уже\s+обращал/i.test(text)) return 'Постоянный клиент';
    return '';
  }

  function extractSettlement(text) {
    return SETTLEMENT_ALIASES.find(([, pattern]) => pattern.test(text))?.[0] || '';
  }

  function extractDistrict(text) {
    return DISTRICT_ALIASES.find(([, pattern]) => pattern.test(text))?.[0] || '';
  }

  function accessValue(text, labels) {
    const value = extractNearbyNumber(text, labels);
    return Number.isFinite(value) ? String(Math.round(value)) : '';
  }

  function extractAddress(text) {
    const settlement = extractSettlement(text);
    const district = extractDistrict(text);
    const addressLine = text.match(/(?:^|\n|[.;])\s*(?:адрес|жив[её]т|находится|забрать\s+по\s+адресу)\s*[:\-]?\s*([^\n.;]+)/i)?.[1] || '';
    const source = addressLine || text;

    let houseNumber = accessValue(source, 'дом|д\\.');
    const corpus = accessValue(source, 'корпус|корп\\.|к\\.');
    const building = accessValue(source, 'строение|стр\\.');
    if (houseNumber && corpus) houseNumber += ` к ${corpus}`;
    if (houseNumber && building) houseNumber += ` стр ${building}`;

    const apartmentNumber = accessValue(source, 'квартира|кв\\.');
    const entrance = accessValue(source, 'подъезд|под\\.');
    const floor = accessValue(source, 'этаж|эт\\.');

    let street = '';
    const typed = source.match(/\b(улица|ул\.?|проспект|пр-т|проезд|переулок|пер\.?|шоссе|набережная|наб\.?|бульвар|площадь|микрорайон)\s+([А-ЯЁа-яёA-Za-z0-9][А-ЯЁа-яёA-Za-z0-9\s'’-]{1,55}?)(?=\s*(?:,|дом\b|д\.|квартира\b|кв\.|подъезд\b|этаж\b|корпус\b|$))/i);
    if (typed) {
      const type = typed[1].replace(/\.$/, '');
      street = clean(`${type} ${typed[2]}`);
    }

    if (!street && addressLine) {
      let remainder = addressLine
        .replace(new RegExp(SETTLEMENT_ALIASES.map(([, pattern]) => pattern.source).join('|'), 'ig'), ' ')
        .replace(/(?:автозаводск\w*|ленинск\w*|канавинск\w*|московск\w*|сормовск\w*|нижегородск\w*|советск\w*|приокск\w*)\s*(?:район|р-н)?/ig, ' ')
        .replace(/(?:дом|д\.|квартира|кв\.|подъезд|под\.|этаж|эт\.|корпус|корп\.|строение|стр\.).*$/i, ' ')
        .replace(/^[,\s-]+|[,\s-]+$/g, ' ');
      street = clean(remainder);
    }

    if (!houseNumber) {
      const generic = source.match(new RegExp(`([А-ЯЁа-яё][А-ЯЁа-яё\\s'’-]{2,50}?)\\s+(${NUMBER_PHRASE})(?=\\s*(?:,|квартира|кв\\.|подъезд|этаж|$))`, 'i'));
      if (generic) {
        street ||= clean(generic[1]);
        const number = parseNumberPhrase(generic[2]);
        if (Number.isFinite(number)) houseNumber = String(Math.round(number));
      }
    }

    return {
      settlement,
      district,
      street,
      houseNumber,
      apartmentNumber,
      entrance,
      floor,
    };
  }

  function nextWeekdayKey(targetDay, nextWeek = false) {
    const currentKey = state.selectedDayKey || businessTodayKey();
    const current = dateKeyForDisplay(currentKey);
    let delta = (targetDay - current.getUTCDay() + 7) % 7;
    if (!delta || nextWeek) delta += 7;
    return addDaysToKey(currentKey, delta);
  }

  function extractDate(text) {
    if (/\bсегодня\b/i.test(text)) return businessTodayKey();
    if (/\bпослезавтра\b/i.test(text)) return addDaysToKey(businessTodayKey(), 2);
    if (/\bзавтра\b/i.test(text)) return addDaysToKey(businessTodayKey(), 1);

    const numeric = text.match(/(?:^|\s)(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?(?=\s|$|[.,])/);
    if (numeric) {
      const nowYear = Number(businessTodayKey().slice(0, 4));
      let year = numeric[3] ? Number(numeric[3]) : nowYear;
      if (year < 100) year += 2000;
      return `${year}-${String(Number(numeric[2])).padStart(2, '0')}-${String(Number(numeric[1])).padStart(2, '0')}`;
    }

    for (const [monthName, month] of Object.entries(MONTHS)) {
      const match = text.match(new RegExp(`(${NUMBER_PHRASE})\\s+${monthName}\\b`, 'i'));
      if (!match) continue;
      const day = parseNumberPhrase(match[1]);
      if (!Number.isFinite(day) || day < 1 || day > 31) continue;
      const today = businessTodayKey();
      let year = Number(today.slice(0, 4));
      const candidate = `${year}-${String(month).padStart(2, '0')}-${String(Math.round(day)).padStart(2, '0')}`;
      if (candidate < today && !/прошл/i.test(text)) year += 1;
      return `${year}-${String(month).padStart(2, '0')}-${String(Math.round(day)).padStart(2, '0')}`;
    }

    const lower = text.toLowerCase();
    for (const [name, weekday] of Object.entries(WEEKDAYS)) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(lower)) return nextWeekdayKey(weekday, /следующ/i.test(lower));
    }
    return '';
  }

  function normalizeHour(hour, context = '') {
    let value = Number(hour);
    if (!Number.isFinite(value)) return NaN;
    if (/вечер|дня/i.test(context) && value < 12) value += 12;
    if (/ноч/i.test(context) && value === 12) value = 0;
    return Math.max(0, Math.min(23, value));
  }

  function timeValue(hour, minute = 0, context = '') {
    const h = normalizeHour(hour, context);
    if (!Number.isFinite(h)) return '';
    return `${String(h).padStart(2, '0')}:${String(Math.max(0, Math.min(59, Number(minute) || 0))).padStart(2, '0')}`;
  }

  function extractTime(text) {
    const numericRange = text.match(/(?:с\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:до|[-–—])\s*(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи)?/i);
    if (numericRange) {
      const context = numericRange[5] || '';
      return {
        startTime: timeValue(numericRange[1], numericRange[2] || 0, context),
        endTime: timeValue(numericRange[3], numericRange[4] || 0, context),
        timeNote: clean(numericRange[0]),
      };
    }

    const wordRange = text.match(new RegExp(`(?:с\\s*)(${NUMBER_PHRASE})\\s*(?:до|[-–—])\\s*(${NUMBER_PHRASE})\\s*(утра|дня|вечера|ночи)?`, 'i'));
    if (wordRange) {
      const start = parseNumberPhrase(wordRange[1]);
      const end = parseNumberPhrase(wordRange[2]);
      const context = wordRange[3] || '';
      if (Number.isFinite(start) && Number.isFinite(end)) {
        return {
          startTime: timeValue(start, 0, context),
          endTime: timeValue(end, 0, context),
          timeNote: clean(wordRange[0]),
        };
      }
    }

    const singleNumeric = text.match(/(?:после|к|в|на)\s*(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи)?/i);
    if (singleNumeric) {
      const startTime = timeValue(singleNumeric[1], singleNumeric[2] || 0, singleNumeric[3] || '');
      return { startTime, endTime: addMinutesToTime(startTime, REQUEST_DURATION_MINUTES), timeNote: clean(singleNumeric[0]) };
    }

    const singleWord = text.match(new RegExp(`(?:после|к|в|на)\\s*(${NUMBER_PHRASE})\\s*(утра|дня|вечера|ночи)?`, 'i'));
    if (singleWord) {
      const hour = parseNumberPhrase(singleWord[1]);
      if (Number.isFinite(hour)) {
        const startTime = timeValue(hour, 0, singleWord[2] || '');
        return { startTime, endTime: addMinutesToTime(startTime, REQUEST_DURATION_MINUTES), timeNote: clean(singleWord[0]) };
      }
    }
    return {};
  }

  function extractMaterial(text) {
    if (/вискоз/i.test(text)) return 'Вискоза';
    if (/ш[её]лк|silk/i.test(text)) return 'Шёлк';
    if (/хлопок|хлопков|cotton/i.test(text)) return 'Хлопок';
    if (/без\s*ворс|безворс|циновк|килим/i.test(text)) return 'Безворсный';
    if (/шерстян|100\s*%\s*шерст|материал[^\n]{0,20}шерст/i.test(text) && !/шерсть\s+(?:кош|собак|животн)/i.test(text)) return 'Шерсть';
    if (/ш[еёа]гги|шагги|shaggy|синтет|полипропилен|полиэстер|акрил|нейлон|микрофибр|хит[-\s]*сет|heat\s*set|\bbcf\b|фризе/i.test(text)) return 'Синтетика';
    return '';
  }

  function extractPile(text) {
    if (/без\s*ворс|безворс|циновк|килим/i.test(text)) return 'Без ворса';
    if (/ш[еёа]гги|шагги|shaggy|длинн\w*\s*ворс|высок\w*\s*ворс|более\s*(?:одного|1)\s*см|травк/i.test(text)) return 'Более 1 см';
    if (/средн\w*\s*ворс|коротк\w*\s*ворс|низк\w*\s*ворс|до\s*(?:одного|1)\s*см/i.test(text)) return 'До 1 см';
    const measured = text.match(/ворс[^\dа-яё]{0,8}(${NUMBER_PHRASE})\s*(мм|см)/i);
    if (measured) {
      const amount = parseNumberPhrase(measured[1]);
      const cm = measured[2].toLowerCase() === 'мм' ? amount / 10 : amount;
      if (Number.isFinite(cm)) return cm > 1 ? 'Более 1 см' : 'До 1 см';
    }
    return '';
  }

  function extractServices(text) {
    return unique([
      /пятн|вино|кофе|кровь|краск|жирн\w*\s+след/i.test(text) ? 'Удаление пятен' : '',
      /шерст(?:ь|и)?\s*(?:животн|кош|собак)?|волос|вычес|выч[её]с/i.test(text) ? 'Вычёсывание шерсти и волос' : '',
      /запах\s*мочи|моч[аи]|описал|описала|метк[аи]\s+животн/i.test(text) ? 'Удаление запаха мочи' : '',
      /дезинф|обеззараж/i.test(text) ? 'Дезинфекция' : '',
      /слайм|пластилин/i.test(text) ? 'Удаление слайма / пластилина' : '',
      /расч[её]с|поднят(?:ие|ь)\s*ворс|подъ[её]м\s*ворс|причес/i.test(text) ? 'Подъём ворса' : '',
      /озон/i.test(text) ? 'Озонация' : '',
      /кондиционер/i.test(text) ? 'Кондиционер' : '',
      /экспресс|срочн|быстрее\s+обычного/i.test(text) ? 'Экспресс-стирка' : '',
    ]);
  }

  function rugFromContext(context, length, width) {
    return {
      length: Number(length || 0),
      width: Number(width || 0),
      material: extractMaterial(context),
      pile: extractPile(context),
      issues: [],
      services: extractServices(context),
    };
  }

  function dimensionMatches(text) {
    const matches = [];
    const numeric = /(\d+(?:[.,]\d+)?)\s*(?:м(?:етра|етров)?\s*)?(?:[xх×*]|на)\s*(\d+(?:[.,]\d+)?)\s*(?:м(?:етра|етров)?)?/ig;
    let match;
    while ((match = numeric.exec(text))) {
      matches.push({ index: match.index, end: numeric.lastIndex, a: Number(match[1].replace(',', '.')), b: Number(match[2].replace(',', '.')) });
    }

    const word = new RegExp(`(${NUMBER_PHRASE})\\s*(?:метр(?:а|ов)?\\s*)?(?:на|x|х|×)\\s*(${NUMBER_PHRASE})\\s*(?:метр(?:а|ов)?)?`, 'ig');
    while ((match = word.exec(text))) {
      if (/\d/.test(match[0])) continue;
      const a = parseNumberPhrase(match[1], { dimension: true });
      const b = parseNumberPhrase(match[2], { dimension: true });
      if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0 && a <= 20 && b <= 20) {
        matches.push({ index: match.index, end: word.lastIndex, a, b });
      }
    }
    return matches.sort((a, b) => a.index - b.index).filter((item, index, all) => !index || item.index !== all[index - 1].index);
  }

  function extractRugs(text) {
    const explicitWidth = text.match(new RegExp(`ширин[аы]?\\s*[:\\-]?\\s*(${NUMBER_PHRASE}).{0,45}?длин[аы]?\\s*[:\\-]?\\s*(${NUMBER_PHRASE})`, 'i'));
    if (explicitWidth) {
      const width = parseNumberPhrase(explicitWidth[1], { dimension: true });
      const length = parseNumberPhrase(explicitWidth[2], { dimension: true });
      if (Number.isFinite(width) && Number.isFinite(length)) return [rugFromContext(text, length, width)];
    }

    const matches = dimensionMatches(text);
    const rugs = matches.map((item, index) => {
      const previousEnd = index ? matches[index - 1].end : 0;
      const nextIndex = matches[index + 1]?.index ?? text.length;
      const contextStart = Math.max(previousEnd, item.index - 140);
      const contextEnd = Math.min(nextIndex, item.end + 180);
      return rugFromContext(text.slice(contextStart, contextEnd), item.a, item.b);
    });

    if (rugs.length === 1) {
      rugs[0].material ||= extractMaterial(text);
      rugs[0].pile ||= extractPile(text);
      rugs[0].services = unique([...rugs[0].services, ...extractServices(text)]);
    }
    return rugs;
  }

  function extractPrice(text) {
    const numeric = text.match(/(?:итого|цена|стоимость|сумма|насчитали|получается)\s*[:\-]?\s*(\d[\d\s]{2,})\s*(?:₽|р\.?|руб)/i);
    if (numeric) return Number(numeric[1].replace(/\s/g, ''));
    const words = text.match(new RegExp(`(?:итого|цена|стоимость|сумма|насчитали|получается)\\s*[:\\-]?\\s*(${NUMBER_PHRASE})\\s*(?:руб|рублей|рубля)`, 'i'));
    if (words) {
      const value = parseNumberPhrase(words[1]);
      if (Number.isFinite(value) && value >= 100) return Math.round(value);
    }
    return 0;
  }

  function extractDiscount(text) {
    const numeric = text.match(/скидк[аи]?\s*[:\-]?\s*(\d{1,2})\s*%/i);
    if (numeric) return Number(numeric[1]);
    const words = text.match(new RegExp(`скидк[аи]?\\s*[:\\-]?\\s*(${NUMBER_PHRASE})\\s*процент`, 'i'));
    const value = words ? parseNumberPhrase(words[1]) : NaN;
    return Number.isFinite(value) ? value : 0;
  }

  function extractCallAhead(text) {
    const numeric = text.match(/(?:позвонить|набрать|предупредить)[^\n]{0,30}?(?:за\s*)?(\d{1,3})\s*мин/i);
    if (numeric) return { callAhead: true, callAheadMinutes: Number(numeric[1]) };
    const words = text.match(new RegExp(`(?:позвонить|набрать|предупредить)[^\\n]{0,30}?(?:за\\s*)?(${NUMBER_PHRASE})\\s*мин`, 'i'));
    if (words) {
      const minutes = parseNumberPhrase(words[1]);
      if (Number.isFinite(minutes)) return { callAhead: true, callAheadMinutes: Math.round(minutes) };
    }
    if (/позвонить\s+заранее|предварительно\s+позвонить/i.test(text)) return { callAhead: true, callAheadMinutes: 30 };
    return {};
  }

  function parseText(rawText) {
    const text = normalizeSpeech(rawText);
    const source = extractSource(text);
    const regular = /постоянн\w*\s+клиент|повторн\w*\s+заказ|уже\s+обращал/i.test(text) || source === 'Постоянный клиент';
    const visitType = /\bдоставк/i.test(text) && !/\bзабор/i.test(text) ? 'delivery' : 'pickup';
    return {
      text,
      customerName: extractName(text),
      phone: extractPhone(text),
      orderSource: source,
      ...extractAddress(text),
      visitType,
      visitDate: extractDate(text),
      ...extractTime(text),
      rugs: extractRugs(text),
      estimatedPrice: extractPrice(text),
      discount: extractDiscount(text),
      regularCustomer: regular,
      ...extractCallAhead(text),
    };
  }

  function recognizedLabels(parsed) {
    const values = [];
    if (parsed.customerName) values.push(`Имя: ${parsed.customerName}`);
    if (parsed.phone) values.push(`Телефон: ${parsed.phone}`);
    const address = [parsed.settlement, parsed.street, parsed.houseNumber && `д. ${parsed.houseNumber}`, parsed.apartmentNumber && `кв. ${parsed.apartmentNumber}`, parsed.entrance && `подъезд ${parsed.entrance}`, parsed.floor && `этаж ${parsed.floor}`].filter(Boolean).join(', ');
    if (address) values.push(`Адрес: ${address}`);
    if (parsed.district) values.push(`Район: ${parsed.district}`);
    if (parsed.visitDate) values.push(`Дата: ${formatDateShort(parsed.visitDate)}`);
    if (parsed.startTime) values.push(`Время: ${parsed.startTime}${parsed.endTime ? `–${parsed.endTime}` : ''}`);
    parsed.rugs.forEach((rug, index) => {
      const details = [`${rug.length}×${rug.width} м`, rug.material, rug.pile, ...(rug.services || [])].filter(Boolean).join(', ');
      values.push(`Ковёр ${index + 1}: ${details}`);
    });
    if (parsed.estimatedPrice) values.push(`Стоимость: ${formatMoney(parsed.estimatedPrice)}`);
    if (parsed.regularCustomer) values.push('Постоянный клиент: скидка 10%');
    if (parsed.orderSource) values.push(`Источник: ${parsed.orderSource}`);
    return values;
  }

  function applyParsedText() {
    const textarea = qs('#smartPasteInput');
    const raw = textarea?.value.trim() || '';
    if (!raw) {
      textarea?.focus();
      showToast('Сначала вставьте или продиктуйте текст заявки.', 'error');
      return;
    }

    const parsed = parseText(raw);
    const current = getFormData();
    const wasEditing = Boolean(current.eventId);
    const currentComment = clean(current.managerComment);
    const rawComment = `Исходный текст клиента:\n${parsed.text}`;
    const next = {
      ...current,
      customerName: parsed.customerName || current.customerName,
      phone: parsed.phone || current.phone,
      orderSource: parsed.orderSource || current.orderSource,
      settlement: parsed.settlement || current.settlement || 'Нижний Новгород',
      district: parsed.district || current.district,
      street: parsed.street || current.street,
      houseNumber: parsed.houseNumber || current.houseNumber,
      apartmentNumber: parsed.apartmentNumber || current.apartmentNumber,
      entrance: parsed.entrance || current.entrance,
      floor: parsed.floor || current.floor,
      visitType: parsed.visitType || current.visitType,
      visitDate: parsed.visitDate || current.visitDate,
      startTime: parsed.startTime || current.startTime,
      endTime: parsed.endTime || current.endTime,
      timeNote: parsed.timeNote || current.timeNote,
      rugs: parsed.rugs.length ? parsed.rugs : current.rugs,
      estimatedPrice: parsed.estimatedPrice || current.estimatedPrice,
      discount: parsed.discount || current.discount,
      regularCustomer: parsed.regularCustomer || current.regularCustomer,
      callAhead: parsed.callAhead ?? current.callAhead,
      callAheadMinutes: parsed.callAheadMinutes || current.callAheadMinutes,
      managerComment: currentComment.includes(parsed.text) ? currentComment : [currentComment, rawComment].filter(Boolean).join('\n\n'),
      eventId: current.eventId,
      pmkId: current.pmkId,
    };

    fillForm(next);
    textarea.value = raw;
    try { localStorage.setItem(STORAGE_KEY, raw); } catch {}
    if (!wasEditing) {
      qs('#eventId').value = '';
      qs('#eventId').dataset.pmkId = current.pmkId || makeId();
      qs('#deleteEventBtn').classList.add('hidden');
      qs('#formTitle').textContent = 'Новая заявка — данные распределены';
    }

    const labels = recognizedLabels(parsed);
    const result = qs('#smartPasteResult');
    result.className = `smart-paste-result ${labels.length ? 'success' : 'warning'}`;
    result.innerHTML = labels.length
      ? `<strong>Распознано расширенным парсером:</strong><div>${labels.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div><small>Проверьте адрес и параметры ковров перед сохранением.</small>`
      : '<strong>Точные поля не распознаны.</strong><small>Исходный текст сохранён в комментарии. Добавьте больше ориентиров: имя, адрес, размеры и услуги.</small>';
    schedulePreviewUpdate();
    showToast(labels.length ? 'Данные подробно распределены по форме.' : 'Текст сохранён в комментарии.', labels.length ? 'success' : 'error');
  }

  function installEnhancedParser() {
    const textarea = qs('#smartPasteInput');
    const oldButton = qs('#smartPasteParseBtn');
    if (!textarea || !oldButton || oldButton.dataset.parserVersion === '45') return;

    const button = oldButton.cloneNode(true);
    button.dataset.parserVersion = '45';
    button.textContent = 'Распознать и распределить';
    oldButton.replaceWith(button);
    button.addEventListener('click', applyParsedText);

    textarea.placeholder = 'Можно продиктовать обычной фразой: Клиент Ольга, телефон 920 000 00 00, адрес улица Коминтерна дом сто пятнадцать, квартира сорок пять, пятый подъезд, третий этаж. Ковёр шегги два на три, пятна и шерсть, расчёсывание ворса. Постоянный клиент, завтра с трёх до пяти вечера.';
    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        applyParsedText();
      }
    }, true);

    const note = qs('.smart-paste-heading p');
    if (note) note.textContent = 'Вставьте текст или надиктуйте заявку обычными словами — приложение распознает числа, адрес, ковры и услуги.';
  }

  window.PMK_SMART_PARSER_V45 = { parseText, parseNumberPhrase, extractAddress, extractRugs };

  const start = () => setTimeout(installEnhancedParser, 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

//# sourceURL=smart-parser-v45.js

/* ===== voice-parser-fast-v68.js ===== */
'use strict';

(() => {
  if (window.PMK_VOICE_PARSER_FAST_V68) return;
  window.PMK_VOICE_PARSER_FAST_V68 = true;

  const STORAGE_KEY = 'pmk-smart-paste-draft-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const title = value => clean(value).toLowerCase().replace(/(^|[\s-])[а-яё]/g, letter => letter.toUpperCase());
  const unique = values => [...new Set((values || []).filter(Boolean))];

  const NAMES = new Set(`
    александр алексей анатолий андрей антон аркадий артем артём борис вадим валентин валерий василий виктор виталий владимир владислав вячеслав геннадий георгий герман глеб григорий данила даниил денис дмитрий евгений егор иван игорь илья кирилл константин леонид лев макар максим марат марк матвей михаил никита николай олег павел петр пётр роман руслан сергей станислав степан тимофей федор фёдор юрий ярослав
    агата аглая алевтина александра алина алиса алла алёна алена анастасия ангелина анжела анжелика анна антонина арина валентина валерия варвара вера вероника виктория виолетта галина дарья диана ева евгения екатерина елена елизавета жанна зинаида злата зоя инна ирина карина каролина кристина ксения лариса лидия лилия любовь людмила майя маргарита марина мария марьяна надежда наталья нина нонна оксана олеся ольга полина раиса регина римма роза светлана снежана софия софья таисия тамара татьяна ульяна юлия яна
  `.trim().split(/\s+/));

  const NUMBER_WORDS = {
    ноль:0, нуль:0, один:1, одна:1, одно:1, первую:1, первый:1,
    два:2, две:2, три:3, четыре:4, пять:5, шесть:6, семь:7, восемь:8, девять:9, десять:10,
  };
  const NUMBER_WORD_PATTERN = '(?:полтора|полторы|ноль|нуль|один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)';
  const NUMBER_PHRASE_PATTERN = `(?:\\d+(?:[.,]\\d+)?|${NUMBER_WORD_PATTERN}(?:\\s+с\\s+(?:половиной|четвертью))?|${NUMBER_WORD_PATTERN}\\s+цел(?:ая|ых|ое)\\s+${NUMBER_WORD_PATTERN}\\s+десят(?:ая|ых|ые)?|${NUMBER_WORD_PATTERN}\\s+${NUMBER_WORD_PATTERN})`;

  const DISTRICTS = [
    ['Автозаводский', /автозаводск|автозавод|автоз/i], ['Ленинский', /ленинск/i],
    ['Канавинский', /канавин/i], ['Московский', /московск(?:ий|ого)?\s*(?:район|р-н)?/i],
    ['Сормовский', /сормов/i], ['Нижегородский', /нижегородск(?:ий|ого)?\s*(?:район|р-н)?/i],
    ['Советский', /советск(?:ий|ого)?\s*(?:район|р-н)?/i], ['Приокский', /приок/i],
  ];
  const SETTLEMENTS = [
    ['Нижний Новгород', /нижн(?:ий|его)?\s+новгород|\bнн\b/i], ['Бор', /(?:г\.?|город\s+)?бор\b/i],
    ['Дзержинск', /дзержинск/i], ['Кстово', /кстов/i], ['Богородск', /богородск/i],
    ['Балахна', /балахн/i], ['Городец', /городец/i], ['Павлово', /павлов/i], ['Арзамас', /арзамас/i],
  ];
  const MONTHS = { января:1, февраля:2, марта:3, апреля:4, мая:5, июня:6, июля:7, августа:8, сентября:9, октября:10, ноября:11, декабря:12 };
  const WEEKDAYS = { воскресенье:0, понедельник:1, вторник:2, среда:3, четверг:4, пятница:5, суббота:6 };

  function normalizedText(value = '') {
    return String(value)
      .replace(/\r/g, '\n')
      .replace(/[«»„“”]/g, '"')
      .replace(/\bикс\b/gi, ' на ')
      .replace(/\bумножить\s+на\b/gi, ' на ')
      .replace(/\s*([,;])\s*/g, '$1 ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function labeled(text, labels, max = 100) {
    const match = text.match(new RegExp(`(?:^|\\n|[.;])\\s*(?:${labels.join('|')})\\s*[:—–-]?\\s*([^\\n.;]{1,${max}})`, 'i'));
    return clean(match?.[1] || '');
  }

  function parseSpokenNumber(raw = '') {
    const source = clean(raw).toLowerCase().replace(/ё/g, 'е');
    const direct = Number(source.replace(',', '.'));
    if (Number.isFinite(direct)) return direct;
    if (/^полтор[аы]$/.test(source)) return 1.5;
    const half = source.match(new RegExp(`^(${NUMBER_WORD_PATTERN})\\s+с\\s+половиной$`));
    if (half) return Number(NUMBER_WORDS[half[1]] || 0) + 0.5;
    const quarter = source.match(new RegExp(`^(${NUMBER_WORD_PATTERN})\\s+с\\s+четвертью$`));
    if (quarter) return Number(NUMBER_WORDS[quarter[1]] || 0) + 0.25;
    const decimal = source.match(new RegExp(`^(${NUMBER_WORD_PATTERN})\\s+цел(?:ая|ых|ое)\\s+(${NUMBER_WORD_PATTERN})\\s+десят(?:ая|ых|ые)?$`));
    if (decimal) return Number(NUMBER_WORDS[decimal[1]] || 0) + Number(NUMBER_WORDS[decimal[2]] || 0) / 10;
    const pair = source.match(new RegExp(`^(${NUMBER_WORD_PATTERN})\\s+(${NUMBER_WORD_PATTERN})$`));
    if (pair && NUMBER_WORDS[pair[1]] >= 0 && NUMBER_WORDS[pair[2]] >= 0 && NUMBER_WORDS[pair[2]] < 10) {
      return Number(NUMBER_WORDS[pair[1]]) + Number(NUMBER_WORDS[pair[2]]) / 10;
    }
    return Number(NUMBER_WORDS[source] ?? NaN);
  }

  function extractName(text, fallback = '') {
    const explicit = labeled(text, ['имя(?:\\s+клиента)?', 'клиент(?:ка)?', 'заказчик', 'зовут'], 70)
      .replace(/\b(?:телефон|номер|адрес|улица|ков[её]р|размер).*$/i, '');
    if (explicit) {
      const first = normalizeNameToken(explicit.split(/\s+/)[0]);
      if (first) return title(first);
    }

    const tokens = text.toLowerCase().replace(/ё/g, 'е').match(/[а-я-]+/g) || [];
    const blockedPrevious = new Set(['улица','ул','проспект','проезд','переулок','район','поселок','деревня','село']);
    for (let index = 0; index < tokens.length; index += 1) {
      const token = normalizeNameToken(tokens[index]);
      if (!token || !NAMES.has(token) || blockedPrevious.has(tokens[index - 1])) continue;
      return title(token);
    }
    const fallbackToken = normalizeNameToken(String(fallback).split(/\s+/)[0]);
    return fallbackToken && NAMES.has(fallbackToken) ? title(fallbackToken) : '';
  }

  function normalizeNameToken(value = '') {
    return String(value).toLowerCase().replace(/ё/g, 'е').replace(/[^а-я-]/g, '');
  }

  function extractPhone(text, fallback = '') {
    const match = text.match(/(?:\+?7|8)?[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/);
    if (!match) return fallback || '';
    let digits = match[0].replace(/\D/g, '');
    if (digits.length === 10) digits = `7${digits}`;
    if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    return digits.length === 11 ? `+${digits}` : fallback || '';
  }

  function extractAddress(text, fallback = {}) {
    const result = { ...fallback };
    for (const [name, pattern] of SETTLEMENTS) if (pattern.test(text)) { result.settlement = name; break; }
    for (const [name, pattern] of DISTRICTS) if (pattern.test(text)) { result.district = name; break; }
    const street = text.match(/(?:^|[\s,.;\n])(улица|ул\.?|проспект|пр-т|проезд|переулок|пер\.?|шоссе|набережная|наб\.?|бульвар|площадь|микрорайон|мкр\.?)\s+([а-яёa-z0-9'’\-]+(?:\s+[а-яёa-z0-9'’\-]+){0,5}?)(?=\s*(?:,|дом|д\.?|квартира|кв\.?|подъезд|этаж|корпус|стр\.?|$))/i);
    if (street) result.street = clean(`${street[1].replace(/\.$/, '')} ${street[2]}`);
    const addressLabel = labeled(text, ['адрес'], 160);
    if (!result.street && addressLabel) {
      const generic = addressLabel.match(/^(.*?)(?=\s+(?:дом|д\.?)\s*\d|,\s*\d)/i)?.[1];
      if (generic) result.street = clean(generic.replace(/^(?:г\.?\s*[^,]+,?\s*)/i, ''));
    }
    const house = text.match(/(?:дом|д\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?(?:[\/-]\d+[а-яa-z]?)?)/i);
    const flat = text.match(/(?:квартира|кв\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?)/i);
    const entrance = text.match(/(?:подъезд|под\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?)/i);
    const floor = text.match(/(?:этаж|эт\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?)/i);
    if (house) result.houseNumber = house[1];
    if (flat) result.apartmentNumber = flat[1];
    if (entrance) result.entrance = entrance[1];
    if (floor) result.floor = floor[1];
    result.settlement ||= 'Нижний Новгород';
    return result;
  }

  function extractContract(text, fallback = '') {
    const match = text.match(/(?:договор(?:\s+пмк)?|номер\s+договора|№\s*договора|\bд)\s*[:№#-]?\s*([дd]?\s*\d{3,4})\b/i);
    return clean(match?.[1] || fallback).replace(/\s+/g, '');
  }

  function extractDate(text, fallback = '') {
    if (/послезавтра/i.test(text)) return addDaysToKey(businessTodayKey(), 2);
    if (/завтра/i.test(text)) return addDaysToKey(businessTodayKey(), 1);
    if (/сегодня/i.test(text)) return businessTodayKey();
    const numeric = text.match(/(?:^|\D)(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?(?=\D|$)/);
    if (numeric) {
      let year = numeric[3] ? Number(numeric[3]) : Number(businessTodayKey().slice(0, 4));
      if (year < 100) year += 2000;
      return `${year}-${String(Number(numeric[2])).padStart(2, '0')}-${String(Number(numeric[1])).padStart(2, '0')}`;
    }
    for (const [monthName, month] of Object.entries(MONTHS)) {
      const match = text.match(new RegExp(`(?:^|\\D)(\\d{1,2})\\s+${monthName}(?:\\s+(\\d{4}))?`, 'i'));
      if (!match) continue;
      return `${Number(match[2] || businessTodayKey().slice(0, 4))}-${String(month).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`;
    }
    const lower = text.toLowerCase().replace(/ё/g, 'е');
    for (const [word, day] of Object.entries(WEEKDAYS)) {
      if (!new RegExp(`\\b${word.slice(0, -1)}`, 'i').test(lower)) continue;
      const today = dateKeyForDisplay(businessTodayKey()).getUTCDay();
      let delta = (day - today + 7) % 7;
      if (!delta || /следующ/i.test(lower)) delta += 7;
      return addDaysToKey(businessTodayKey(), delta);
    }
    return fallback || '';
  }

  function timeString(hour, minute = 0, context = '') {
    let value = Number(hour);
    if (/вечер|дня/i.test(context) && value < 12) value += 12;
    if (/ноч/i.test(context) && value === 12) value = 0;
    if (!(value >= 0 && value <= 23)) return '';
    return `${String(value).padStart(2, '0')}:${String(Number(minute || 0)).padStart(2, '0')}`;
  }

  function extractTime(text, fallback = {}) {
    const range = text.match(/(?:с\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:до|[-–—])\s*(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи)?/i);
    if (range) return { startTime: timeString(range[1], range[2], range[5]), endTime: timeString(range[3], range[4], range[5]), timeNote: clean(range[0]) };
    const single = text.match(/(?:после|к|в)\s*(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи)?/i);
    if (single) {
      const startTime = timeString(single[1], single[2], single[3]);
      return { startTime, endTime: addMinutesToTime(startTime, REQUEST_DURATION_MINUTES), timeNote: clean(single[0]) };
    }
    return { startTime: fallback.startTime || '', endTime: fallback.endTime || '', timeNote: fallback.timeNote || '' };
  }

  function material(text = '') {
    if (/вискоз/i.test(text)) return 'Вискоза';
    if (/ш[её]лк/i.test(text)) return 'Шёлк';
    if (/хлопок/i.test(text)) return 'Хлопок';
    if (/безворс|палас|циновк|килим/i.test(text)) return 'Безворсный';
    if (/шерстян|100\s*%\s*шерст/i.test(text)) return 'Шерсть';
    if (/синтет|полипропилен|полиэстер|акрил|нейлон|ш[еёа]гги|shaggy/i.test(text)) return 'Синтетика';
    return '';
  }

  function pile(text = '') {
    if (/безворс|палас|циновк|килим/i.test(text)) return 'Без ворса';
    if (/высок\w*\s+ворс|длинн\w*\s+ворс|ш[еёа]гги|shaggy|ворс\s*(?:более|свыше)\s*1/i.test(text)) return 'Более 1 см';
    if (/средн\w*\s+ворс|коротк\w*\s+ворс|низк\w*\s+ворс|ворс\s*до\s*1/i.test(text)) return 'До 1 см';
    return '';
  }

  function serviceData(text = '') {
    const urine = /запах\s*(?:мочи|кошач|собач)|моч[аи]|описал|описала|метк[аи]|туалет/i.test(text);
    const hair = /выч[её]с|вычес|шерсть\s*(?:кош|собак|животн)|много\s+шерсти|волос/i.test(text);
    const stain = /пятн|пятновывед|слайм|пластилин|маркер|фломастер|вино|кофе|кровь|краск|жир|гуашь/i.test(text);
    const disinfect = /дезинф|обеззараж|потоп|затоп|плесен/i.test(text);
    const lift = /подъ[её]м\s*ворс|поднять\s*ворс|расч[её]с|расчес|причес/i.test(text);
    const ozone = /озон|озонирован/i.test(text);
    const conditioner = /кондиционер|ароматиз|смягчител/i.test(text);
    const express = /экспресс|срочн|ускоренн|быстрее\s+обычного/i.test(text);
    return {
      issues: unique([stain ? 'Пятна' : '', hair ? (/волос/i.test(text) ? 'Волосы' : 'Шерсть') : '', urine ? 'Запах мочи' : '', disinfect ? 'Дезинфекция' : '', /слайм|пластилин/i.test(text) ? 'Слайм / пластилин' : '']),
      services: unique([stain ? 'Удаление пятен' : '', hair ? 'Вычёсывание шерсти и волос' : '', urine ? 'Удаление запаха мочи' : '', disinfect ? 'Дезинфекция' : '', lift ? 'Подъём ворса' : '', ozone ? 'Озонация' : '', conditioner ? 'Кондиционер' : '', express ? 'Экспресс-стирка' : '']),
    };
  }

  function dimensionMatches(text = '') {
    const results = [];
    const pattern = new RegExp(`(${NUMBER_PHRASE_PATTERN})\\s*(?:м(?:етр(?:а|ов)?)?|см)?\\s*(?:на|x|х|×|\\*)\\s*(${NUMBER_PHRASE_PATTERN})\\s*(?:м(?:етр(?:а|ов)?)?|см)?`, 'gi');
    let match;
    while ((match = pattern.exec(text))) {
      let length = parseSpokenNumber(match[1]);
      let width = parseSpokenNumber(match[2]);
      if (/см/i.test(match[0]) || length > 20 || width > 20) { length /= 100; width /= 100; }
      if (length > 0 && width > 0 && length <= 20 && width <= 20) results.push({ length: Number(length.toFixed(2)), width: Number(width.toFixed(2)), index: match.index, end: pattern.lastIndex });
    }
    const explicit = text.match(new RegExp(`длин[аы]?\\s*[:=-]?\\s*(${NUMBER_PHRASE_PATTERN}).{0,70}?ширин[аы]?\\s*[:=-]?\\s*(${NUMBER_PHRASE_PATTERN})`, 'i'));
    if (!results.length && explicit) {
      const length = parseSpokenNumber(explicit[1]);
      const width = parseSpokenNumber(explicit[2]);
      if (length > 0 && width > 0) results.push({ length, width, index: explicit.index || 0, end: (explicit.index || 0) + explicit[0].length });
    }
    return results;
  }

  function rugCount(text = '') {
    const numeric = text.match(/\b(\d{1,2})\s+ковр/i);
    if (numeric) return Math.min(30, Number(numeric[1]));
    const words = text.match(new RegExp(`\\b(${NUMBER_WORD_PATTERN})\\s+ковр`, 'i'))?.[1];
    return Math.min(30, Number(NUMBER_WORDS[words] || 0));
  }

  function extractRugs(text, fallback = []) {
    const found = dimensionMatches(text);
    let rugs = found.map((item, index) => {
      const start = index === 0 ? Math.max(0, item.index - 100) : found[index - 1].end;
      const end = found[index + 1]?.index ?? Math.min(text.length, item.end + 220);
      const context = text.slice(start, end);
      return { length: item.length, width: item.width, material: material(context), pile: pile(context), ...serviceData(context) };
    });
    if (!rugs.length && Array.isArray(fallback)) rugs = fallback.map(rug => ({ ...rug }));
    const count = rugCount(text);
    while (count && rugs.length < count) rugs.push({ length:0, width:0, material:'', pile:'', issues:[], services:[] });
    if (rugs.length === 1) {
      rugs[0].material ||= material(text);
      rugs[0].pile ||= pile(text);
      const services = serviceData(text);
      rugs[0].issues = unique([...(rugs[0].issues || []), ...services.issues]);
      rugs[0].services = unique([...(rugs[0].services || []), ...services.services]);
    }
    return rugs;
  }

  function parse(raw) {
    const text = normalizedText(raw);
    const baseParser = window.PMK_SMART_PARSER_V45?.parseText;
    let base = {};
    try { if (typeof baseParser === 'function' && baseParser !== parse) base = baseParser(text) || {}; } catch {}
    const address = extractAddress(text, base);
    const timing = extractTime(text, base);
    const priceMatch = text.match(/(?:итого|цена|стоимость|сумма)\s*[:=-]?\s*(\d[\d\s]{2,})\s*(?:₽|р\.?|руб)/i);
    const discountMatch = text.match(/скидк[аи]?\s*[:=-]?\s*(\d{1,2})\s*%/i);
    return {
      ...base,
      text,
      customerName: extractName(text, base.customerName),
      phone: extractPhone(text, base.phone),
      ...address,
      contractNumber: extractContract(text, base.contractNumber),
      visitDate: extractDate(text, base.visitDate),
      ...timing,
      rugs: extractRugs(text, base.rugs),
      estimatedPrice: priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : Number(base.estimatedPrice || 0),
      discount: discountMatch ? Number(discountMatch[1]) : Number(base.discount || 0),
      regularCustomer: /постоянн\w*\s+клиент|повторн\w*\s+заказ|уже\s+обращал/i.test(text) || Boolean(base.regularCustomer),
    };
  }

  function labels(parsed) {
    const values = [];
    if (parsed.customerName) values.push(`Имя: ${parsed.customerName}`);
    if (parsed.phone) values.push(`Телефон: ${parsed.phone}`);
    const address = [parsed.settlement, parsed.street, parsed.houseNumber && `д. ${parsed.houseNumber}`, parsed.apartmentNumber && `кв. ${parsed.apartmentNumber}`, parsed.entrance && `подъезд ${parsed.entrance}`, parsed.floor && `этаж ${parsed.floor}`].filter(Boolean).join(', ');
    if (address) values.push(`Адрес: ${address}`);
    if (parsed.district) values.push(`Район: ${parsed.district}`);
    if (parsed.contractNumber) values.push(`Договор: ${parsed.contractNumber}`);
    if (parsed.visitDate) values.push(`Дата: ${formatDateShort(parsed.visitDate)}`);
    if (parsed.startTime) values.push(`Время: ${parsed.startTime}${parsed.endTime ? `–${parsed.endTime}` : ''}`);
    (parsed.rugs || []).forEach((rug, index) => values.push(`Ковёр ${index + 1}: ${rug.length || '?'}×${rug.width || '?'} м${rug.material ? `, ${rug.material}` : ''}${rug.services?.length ? `, ${rug.services.join(', ')}` : ''}`));
    if (parsed.estimatedPrice) values.push(`Стоимость: ${formatMoney(parsed.estimatedPrice)}`);
    return values;
  }

  function missing(parsed) {
    const values = [];
    if (!parsed.customerName) values.push('имя');
    if (!parsed.phone) values.push('телефон');
    if (!parsed.street || !parsed.houseNumber) values.push('адрес');
    if (!parsed.district) values.push('район');
    if (!parsed.visitDate) values.push('дату');
    if (!parsed.startTime) values.push('время');
    if (!(parsed.rugs || []).length) values.push('размеры ковров');
    else if (parsed.rugs.some(rug => !rug.length || !rug.width || !rug.material)) values.push('параметры ковров');
    return unique(values);
  }

  function apply() {
    const textarea = $('#smartPasteInput');
    const raw = textarea?.value.trim() || '';
    if (!raw) return showToast('Вставьте или продиктуйте информацию клиента.', 'error');
    const parsed = parse(raw);
    const current = getFormData();
    const sourceComment = `Исходный текст клиента:\n${raw}`;
    const next = {
      ...current,
      customerName: parsed.customerName || current.customerName,
      phone: parsed.phone || current.phone,
      orderSource: parsed.orderSource || current.orderSource,
      settlement: parsed.settlement || current.settlement || 'Нижний Новгород',
      district: parsed.district || current.district,
      street: parsed.street || current.street,
      houseNumber: parsed.houseNumber || current.houseNumber,
      apartmentNumber: parsed.apartmentNumber || current.apartmentNumber,
      entrance: parsed.entrance || current.entrance,
      floor: parsed.floor || current.floor,
      contractNumber: parsed.contractNumber || current.contractNumber,
      visitType: parsed.visitType || current.visitType || 'pickup',
      visitDate: parsed.visitDate || current.visitDate,
      startTime: parsed.startTime || current.startTime,
      endTime: parsed.endTime || current.endTime,
      timeNote: parsed.timeNote || current.timeNote,
      rugs: parsed.rugs?.length ? parsed.rugs : current.rugs,
      estimatedPrice: parsed.estimatedPrice || current.estimatedPrice,
      discount: parsed.discount || current.discount,
      regularCustomer: parsed.regularCustomer || current.regularCustomer,
      managerComment: clean(current.managerComment).includes(raw) ? current.managerComment : [clean(current.managerComment), sourceComment].filter(Boolean).join('\n\n'),
      eventId: current.eventId,
      pmkId: current.pmkId,
    };
    fillForm(next);
    textarea.value = raw;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    try { localStorage.setItem(STORAGE_KEY, raw); } catch {}
    if (!current.eventId) {
      $('#eventId').value = '';
      $('#eventId').dataset.pmkId = current.pmkId || makeId();
      $('#deleteEventBtn')?.classList.add('hidden');
      $('#formTitle').textContent = 'Новая заявка — информация распределена';
    }
    const recognized = labels(parsed);
    const absent = missing(parsed);
    const result = $('#smartPasteResult');
    if (result) {
      result.className = `smart-paste-result ${recognized.length ? 'success' : 'warning'}`;
      result.innerHTML = `<strong>${recognized.length ? 'Распознано и распределено:' : 'Точные поля не найдены'}</strong>${recognized.length ? `<div>${recognized.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div>` : ''}${absent.length ? `<small>Нужно уточнить: ${escapeHtml(absent.join(', '))}.</small>` : '<small>Основные данные заполнены. Проверьте результат.</small>'}`;
    }
    const completeRugs = next.rugs?.length && next.rugs.every(rug => Number(rug.length) > 0 && Number(rug.width) > 0 && rug.material);
    if (completeRugs) {
      const toggle = $('#autoPrice');
      if (toggle) toggle.checked = true;
      window.PMK_PRICING_V48?.calculatePrice?.();
    }
    schedulePreviewUpdate();
    showToast(absent.length ? `Данные распределены. Уточните: ${absent.join(', ')}.` : 'Все распознанные данные распределены.', absent.length ? '' : 'success');
  }

  function install() {
    const oldButton = $('#smartPasteParseBtn');
    const textarea = $('#smartPasteInput');
    if (!oldButton || !textarea) return false;
    if (oldButton.dataset.voiceParser === '68') return true;
    const button = oldButton.cloneNode(true);
    button.dataset.voiceParser = '68';
    button.textContent = 'Разобрать и заполнить заявку';
    oldButton.replaceWith(button);
    button.addEventListener('click', apply);
    textarea.placeholder = 'Например: Светлана, Сормовский район, улица Коминтерна, дом 115. Два ковра: два на три, синтетика, пятна и шерсть; полтора на два, шерсть. Дополнительно удаление запаха мочи и озонирование.';
    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        apply();
      }
    }, true);
    if (window.PMK_SMART_PARSER_V45) window.PMK_SMART_PARSER_V45.parseText = parse;
    return true;
  }

  window.PMK_VOICE_PARSER_FAST_V68_API = { parse, apply, parseSpokenNumber, dimensionMatches, serviceData };
  const start = () => requestAnimationFrame(() => { if (!install()) setTimeout(install, 180); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
//# sourceURL=voice-parser-fast-v68.js

/* ===== empty-rug-dimensions-v42.js ===== */
'use strict';

(() => {
  const originalAddRug = addRug;

  addRug = function addRugWithEmptyDimensions(data = {}) {
    const before = qsa('.rug-card').length;
    originalAddRug(data);

    const cards = qsa('.rug-card');
    const card = cards[before] || cards.at(-1);
    if (!card) return;

    const hasLength = Number(data.length || 0) > 0;
    const hasWidth = Number(data.width || 0) > 0;

    const lengthInput = qs('.rug-length', card);
    const widthInput = qs('.rug-width', card);

    if (!hasLength && lengthInput) lengthInput.value = '';
    if (!hasWidth && widthInput) widthInput.value = '';

    lengthInput?.removeAttribute('value');
    widthInput?.removeAttribute('value');
    updateRugTotal(card);
  };
})();

//# sourceURL=empty-rug-dimensions-v42.js

/* ===== unified-rug-services-v43.js ===== */
'use strict';

(() => {
  const SERVICE_VALUES = [
    'Удаление пятен',
    'Вычёсывание шерсти и волос',
    'Удаление запаха мочи',
    'Дезинфекция',
    'Подъём ворса',
    'Озонация',
    'Кондиционер',
    'Экспресс-стирка',
  ];

  const ISSUE_TO_SERVICE = {
    'Пятна': 'Удаление пятен',
    'Обычные пятна': 'Удаление пятен',
    'Слайм': 'Удаление пятен',
    'Пластилин': 'Удаление пятен',
    'Слайм / пластилин': 'Удаление пятен',
    'Удаление слайма / пластилина': 'Удаление пятен',
    'Маркеры': 'Удаление пятен',
    'Шерсть': 'Вычёсывание шерсти и волос',
    'Волосы': 'Вычёсывание шерсти и волос',
    'Запах мочи': 'Удаление запаха мочи',
    'Дезинфекция': 'Дезинфекция',
  };

  const SERVICE_ALIASES = {
    'Пятна': 'Удаление пятен',
    'Обычные пятна': 'Удаление пятен',
    'Удаление пятен': 'Удаление пятен',
    'Слайм': 'Удаление пятен',
    'Пластилин': 'Удаление пятен',
    'Слайм / пластилин': 'Удаление пятен',
    'Удаление слайма / пластилина': 'Удаление пятен',
    'Маркеры': 'Удаление пятен',
    'Шерсть': 'Вычёсывание шерсти и волос',
    'Волосы': 'Вычёсывание шерсти и волос',
    'Шерсть и волосы': 'Вычёсывание шерсти и волос',
    'Вычёсывание шерсти': 'Вычёсывание шерсти и волос',
    'Вычёсывание шерсти и волос': 'Вычёсывание шерсти и волос',
    'Запах мочи': 'Удаление запаха мочи',
    'Удаление запаха': 'Удаление запаха мочи',
    'Удаление запаха мочи': 'Удаление запаха мочи',
    'Дезинфекция': 'Дезинфекция',
    'Ковёр после потопа': 'Дезинфекция',
    'Мокрый ковёр': 'Дезинфекция',
    'Расчёсывание ворса': 'Подъём ворса',
    'Расчесывание ворса': 'Подъём ворса',
    'Расчёсывание': 'Подъём ворса',
    'Расчесывание': 'Подъём ворса',
    'Поднятие ворса': 'Подъём ворса',
    'Подъём ворса': 'Подъём ворса',
    'Озонация': 'Озонация',
    'Кондиционер': 'Кондиционер',
    'Экспресс': 'Экспресс-стирка',
    'Экспресс-стирка': 'Экспресс-стирка',
  };

  function unique(values = []) {
    return [...new Set(values.filter(Boolean))];
  }

  function canonicalService(value = '') {
    const clean = String(value || '').trim();
    return SERVICE_ALIASES[clean] || (SERVICE_VALUES.includes(clean) ? clean : '');
  }

  function migrateRug(rug = {}) {
    const fromIssues = (Array.isArray(rug.issues) ? rug.issues : []).map(value => ISSUE_TO_SERVICE[value] || canonicalService(value));
    const fromServices = (Array.isArray(rug.services) ? rug.services : []).map(canonicalService);
    return {
      ...rug,
      issues: [],
      services: unique([...fromIssues, ...fromServices]),
    };
  }

  function migrateData(data = {}) {
    const rugs = Array.isArray(data.rugs) ? data.rugs.map(migrateRug) : [];
    const legacyIssues = (Array.isArray(data.issues) ? data.issues : []).map(value => ISSUE_TO_SERVICE[value] || canonicalService(value));
    const legacyServices = (Array.isArray(data.services) ? data.services : []).map(canonicalService);

    if (rugs.length && (legacyIssues.length || legacyServices.length)) rugs[0].services = unique([...rugs[0].services, ...legacyIssues, ...legacyServices]);

    return {
      ...data,
      rugs,
      issues: [],
      services: unique(rugs.flatMap(rug => rug.services || [])),
    };
  }

  function servicesFromCard(card) {
    if (!card) return [];
    return unique(qsa('input[type="checkbox"]:checked', card).map(input => canonicalService(input.value)));
  }

  function replaceRugTemplate() {
    const template = qs('#rugTemplate');
    const details = template?.content?.querySelector('.rug-details-grid');
    if (!details) return;

    details.className = 'rug-details-grid rug-services-only';
    details.innerHTML = `
      <div class="rug-service-section">
        <p class="field-label">Услуги для этого ковра</p>
        <div class="chip-grid rug-services">
          <label><input type="checkbox" value="Удаление пятен" /><span>Пятна / слайм / пластилин / маркеры · 500 ₽/ковёр</span></label>
          <label><input type="checkbox" value="Вычёсывание шерсти и волос" /><span>Вычёсывание шерсти и волос · 150 ₽/м²</span></label>
          <label><input type="checkbox" value="Удаление запаха мочи" /><span>Удаление запаха мочи · 700 ₽ до 6 м² / 1000 ₽ свыше 6 м²</span></label>
          <label><input type="checkbox" value="Дезинфекция" /><span>Дезинфекция / ковёр после потопа · 700 ₽/ковёр</span></label>
          <label><input type="checkbox" value="Подъём ворса" /><span>Расчёсывание / подъём ворса · 150 ₽/м²</span></label>
          <label><input type="checkbox" value="Озонация" /><span>Озонация · 300 ₽/ковёр</span></label>
          <label><input type="checkbox" value="Кондиционер" /><span>Кондиционер · 300 ₽/ковёр</span></label>
          <label><input type="checkbox" value="Экспресс-стирка" /><span>Экспресс-стирка · 1000 ₽/заказ</span></label>
        </div>
      </div>`;
  }

  replaceRugTemplate();

  const originalCollectRugs = collectRugs;
  collectRugs = function collectRugsWithUnifiedServices() {
    const rugs = originalCollectRugs();
    const cards = qsa('.rug-card');
    return rugs.map((rug, index) => migrateRug({ ...rug, services: servicesFromCard(cards[index]) }));
  };

  const originalEventMeta = eventMeta;
  eventMeta = event => migrateData(originalEventMeta(event));

  const originalGetFormData = getFormData;
  getFormData = function getFormDataWithUnifiedServices() {
    return migrateData(originalGetFormData());
  };

  const originalFillForm = fillForm;
  fillForm = function fillFormWithUnifiedServices(data) {
    originalFillForm(migrateData(data));
  };

  const originalEventDescription = eventDescription;
  eventDescription = function eventDescriptionWithUnifiedServices(data) {
    return originalEventDescription(migrateData(data)).replace(/Доп\. услуги:/g, 'Услуги:');
  };

  renderRugDetails = function renderRugDetailsWithUnifiedServices(data = {}) {
    const rugs = eventRugs(migrateData(data));
    if (!rugs.length) return '<div class="details-empty">Информация о коврах не указана.</div>';

    return rugs.map((rug, index) => {
      const hasSize = Number(rug.length) > 0 && Number(rug.width) > 0;
      const area = hasSize ? Number(rug.length) * Number(rug.width) : 0;
      const size = hasSize ? `${rug.length} × ${rug.width} м · ${formatAreaValue(area)} м²` : 'Размер не указан';
      const services = Array.isArray(rug.services) && rug.services.length ? rug.services.join(', ') : 'Не выбраны';
      return `<article class="details-rug-card">
        <div class="details-rug-title"><strong>Ковёр ${index + 1}</strong><span>${escapeHtml(size)}</span></div>
        <div class="details-rug-grid">
          ${renderDetailValue('Материал', rug.material || 'Не указан')}
          ${renderDetailValue('Ворс', rug.pile || 'Не указан')}
          ${renderDetailValue('Услуги', services, { wide: true })}
        </div>
      </article>`;
    }).join('');
  };
})();
//# sourceURL=unified-rug-services-v43.js

/* ===== pricing-v48.js ===== */
'use strict';

(() => {
  if (window.PMK_PRICING_V48) return;

  const DEFAULT_PRICE = Object.freeze({
    noPile: 300,
    synthetic: 350,
    syntheticWide: 450,
    wool: 400,
    highPile: 450,
    delicate: 800,
    conditioner: 300,
    odorSmall: 700,
    odorLarge: 1000,
    hair: 150,
    stain: 500,
    pileLift: 150,
    disinfection: 700,
    ozonation: 300,
    express: 1000,
    minimum: 1800,
    regularDiscount: 10,
    wideThreshold: 3,
    odorAreaThreshold: 6,
  });

  let calculationTimer = 0;
  let applyingCalculatedValues = false;

  const clampDiscount = value => Math.max(0, Math.min(100, Number(value) || 0));
  const money = value => formatMoney(Math.round(Number(value) || 0));
  const areaText = value => Number(value || 0).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  const clean = value => String(value || '').trim();

  function priceTable() {
    let custom = {};
    try { custom = state?.settings?.pricing || {}; } catch {}
    const table = {};
    Object.entries(DEFAULT_PRICE).forEach(([key, fallback]) => {
      const value = Number(custom?.[key]);
      table[key] = Number.isFinite(value) && value >= 0 ? value : fallback;
    });
    table.regularDiscount = Math.min(100, table.regularDiscount);
    return table;
  }

  function baseRate(rug = {}) {
    const price = priceTable();
    const material = clean(rug.material);
    const pile = clean(rug.pile);
    const width = Number(rug.width || 0);

    if (!material) return 0;
    if (['Вискоза', 'Шёлк', 'Хлопок'].includes(material)) return price.delicate;
    if (material === 'Безворсный') return price.noPile;
    if (!pile) return 0;
    if (pile === 'Более 1 см') return price.highPile;
    if (material === 'Шерсть') return price.wool;
    if (material === 'Синтетика' && pile === 'Без ворса') return price.noPile;
    if (material === 'Синтетика' && pile === 'До 1 см') return width > price.wideThreshold ? price.syntheticWide : price.synthetic;
    return 0;
  }

  function ensurePricingUI() {
    const priceInput = qs('#estimatedPrice');
    const priceGrid = priceInput?.closest('.field-grid');
    if (!priceInput || !priceGrid) return false;

    let toggle = qs('#autoPrice');
    if (!toggle) {
      const row = document.createElement('label');
      row.className = 'toggle-row auto-price-toggle';
      row.innerHTML = '<input type="checkbox" id="autoPrice"><span><strong>Рассчитать стоимость автоматически</strong><small>Расчёт по прайсу из настроек без скидки за количество ковров.</small></span>';
      priceGrid.parentNode.insertBefore(row, priceGrid);
      toggle = qs('#autoPrice');
    }

    if (!qs('#autoPriceBreakdown')) {
      const breakdown = document.createElement('div');
      breakdown.id = 'autoPriceBreakdown';
      breakdown.className = 'auto-price-breakdown hidden';
      priceGrid.parentNode.insertBefore(breakdown, priceGrid.nextSibling);
    }

    priceInput.step = '1';
    return Boolean(toggle);
  }

  function updateServiceLabels() {
    const price = priceTable();
    const labels = {
      'Удаление пятен': `Пятна / слайм / пластилин / маркеры · ${money(price.stain)}/ковёр`,
      'Вычёсывание шерсти и волос': `Вычёсывание шерсти и волос · ${money(price.hair)}/м²`,
      'Удаление запаха мочи': `Удаление запаха мочи · ${money(price.odorSmall)} до ${areaText(price.odorAreaThreshold)} м² / ${money(price.odorLarge)} свыше`,
      'Дезинфекция': `Дезинфекция / ковёр после потопа · ${money(price.disinfection)}/ковёр`,
      'Подъём ворса': `Расчёсывание / подъём ворса · ${money(price.pileLift)}/м²`,
      'Озонация': `Озонация · ${money(price.ozonation)}/ковёр`,
      'Кондиционер': `Кондиционер · ${money(price.conditioner)}/ковёр`,
      'Экспресс-стирка': `Экспресс-стирка · ${money(price.express)}/заказ`,
    };

    Object.entries(labels).forEach(([value, text]) => {
      document.querySelectorAll(`.rug-services input[value="${value}"], .v51-services input[value="${value}"]`).forEach(input => {
        if (input.nextElementSibling && input.nextElementSibling.textContent !== text) input.nextElementSibling.textContent = text;
      });
    });
  }

  function setCalculatedPrice(value) {
    const input = qs('#estimatedPrice');
    if (!input) return;
    applyingCalculatedValues = true;
    input.value = value ? String(Math.round(value)) : '';
    applyingCalculatedValues = false;
  }

  function currentDiscount() {
    const input = qs('#discount');
    if (!input) return qs('#regularCustomer')?.checked ? priceTable().regularDiscount : 0;
    const value = clampDiscount(input.value);
    if (String(value) !== input.value) input.value = String(value);
    return value;
  }

  function syncRegularCustomerDiscount(force = false) {
    const regular = qs('#regularCustomer');
    const discount = qs('#discount');
    if (!regular || !discount) return;
    if (regular.checked && (force || discount.dataset.manualDiscount !== '1')) discount.value = String(priceTable().regularDiscount);
    if (!regular.checked && force) discount.value = '0';
  }

  function calculatePrice() {
    if (!ensurePricingUI()) return;
    updateServiceLabels();

    const price = priceTable();
    const toggle = qs('#autoPrice');
    const priceInput = qs('#estimatedPrice');
    const breakdown = qs('#autoPriceBreakdown');
    const enabled = Boolean(toggle?.checked);

    priceInput.readOnly = enabled;
    priceInput.classList.toggle('auto-price-readonly', enabled);
    breakdown.classList.toggle('hidden', !enabled);
    if (!enabled) return;

    const rugs = collectRugs();
    const lines = [];
    const errors = [];
    let subtotal = 0;
    let expressAdded = false;

    rugs.forEach((rug, index) => {
      const length = Number(rug.length || 0);
      const width = Number(rug.width || 0);
      const area = length * width;
      const rate = baseRate(rug);
      const services = Array.isArray(rug.services) ? [...new Set(rug.services)] : [];

      if (!(length > 0 && width > 0)) {
        errors.push(`Ковёр ${index + 1}: укажите длину и ширину`);
        return;
      }
      if (!rate) {
        errors.push(`Ковёр ${index + 1}: проверьте материал и ворс`);
        return;
      }

      const base = Math.round(area * rate);
      subtotal += base;
      lines.push(`Ковёр ${index + 1}: ${areaText(area)} м² × ${rate} ₽ = ${money(base)}`);

      const addFixed = (service, value, label) => {
        if (!services.includes(service)) return;
        subtotal += value;
        lines.push(`${label}: ${money(value)}`);
      };
      const addArea = (service, value, label) => {
        if (!services.includes(service)) return;
        const amount = Math.round(area * value);
        subtotal += amount;
        lines.push(`${label}: ${areaText(area)} м² × ${value} ₽ = ${money(amount)}`);
      };

      addFixed('Удаление пятен', price.stain, 'Пятна / слайм / пластилин / маркеры');
      addArea('Вычёсывание шерсти и волос', price.hair, 'Вычёсывание шерсти и волос');
      if (services.includes('Удаление запаха мочи')) {
        const value = area <= price.odorAreaThreshold ? price.odorSmall : price.odorLarge;
        subtotal += value;
        lines.push(`Удаление запаха мочи: ${money(value)}`);
      }
      addFixed('Дезинфекция', price.disinfection, 'Дезинфекция / ковёр после потопа');
      addArea('Подъём ворса', price.pileLift, 'Расчёсывание / подъём ворса');
      addFixed('Озонация', price.ozonation, 'Озонация');
      addFixed('Кондиционер', price.conditioner, 'Кондиционер');
      if (services.includes('Экспресс-стирка') && !expressAdded) {
        expressAdded = true;
        subtotal += price.express;
        lines.push(`Экспресс-заказ: ${money(price.express)}`);
      }
    });

    if (errors.length) {
      setCalculatedPrice(0);
      breakdown.className = 'auto-price-breakdown warning';
      breakdown.innerHTML = `<strong>Авторасчёт пока невозможен</strong><span>${errors.map(escapeHtml).join('<br>')}</span>`;
      schedulePreviewUpdate();
      return;
    }

    if (!subtotal) {
      setCalculatedPrice(0);
      breakdown.className = 'auto-price-breakdown';
      breakdown.innerHTML = '<strong>Заполните параметры ковра</strong><span>После заполнения сумма появится автоматически.</span>';
      schedulePreviewUpdate();
      return;
    }

    const discount = currentDiscount();
    const discounted = Math.round(subtotal * (100 - discount) / 100);
    const total = Math.max(discounted, price.minimum);
    setCalculatedPrice(total);

    if (discount) lines.push(`Скидка ${discount}%: −${money(subtotal - discounted)}`);
    if (total > discounted) lines.push(`Минимальный заказ: ${money(price.minimum)}`);
    lines.push(`Итого: ${money(total)}`);

    breakdown.className = 'auto-price-breakdown success';
    breakdown.innerHTML = `<strong>Стоимость рассчитана автоматически</strong><span>${lines.map(escapeHtml).join('<br>')}</span>`;
    schedulePreviewUpdate();
  }

  function scheduleCalculation() {
    clearTimeout(calculationTimer);
    calculationTimer = setTimeout(calculatePrice, 180);
  }

  function installListeners() {
    const form = qs('#requestForm');
    if (!form || form.dataset.pricingV48 === '1') return;
    form.dataset.pricingV48 = '1';

    form.addEventListener('input', event => {
      if (event.target?.id === 'discount' && !applyingCalculatedValues) event.target.dataset.manualDiscount = '1';
      if (event.target?.matches('.rug-length, .rug-width, .rug-material, .rug-pile, .rug-services input, .v51-services input, #discount')) scheduleCalculation();
    });

    form.addEventListener('change', event => {
      if (event.target?.id === 'autoPrice') {
        if (event.target.checked) syncRegularCustomerDiscount(false);
        calculatePrice();
        return;
      }
      if (event.target?.id === 'regularCustomer') {
        const discount = qs('#discount');
        if (discount) discount.dataset.manualDiscount = '0';
        syncRegularCustomerDiscount(true);
        calculatePrice();
        return;
      }
      if (event.target?.matches('.rug-length, .rug-width, .rug-material, .rug-pile, .rug-services input, .v51-services input, #discount')) scheduleCalculation();
    });

    const rugs = qs('#rugsContainer');
    if (rugs && rugs.dataset.pricingObserverV48 !== '1') {
      rugs.dataset.pricingObserverV48 = '1';
      new MutationObserver(() => {
        updateServiceLabels();
        scheduleCalculation();
      }).observe(rugs, { childList: true, subtree: true });
    }

    window.addEventListener('pmk-pricing-updated', () => {
      const discount = qs('#discount');
      if (qs('#regularCustomer')?.checked && discount?.dataset.manualDiscount !== '1') syncRegularCustomerDiscount(true);
      updateServiceLabels();
      calculatePrice();
    });
  }

  ensurePricingUI();

  const previousGetFormData = getFormData;
  getFormData = function getFormDataWithPricingV48() {
    const data = previousGetFormData();
    data.autoPrice = Boolean(qs('#autoPrice')?.checked);
    return data;
  };

  const previousFillForm = fillForm;
  fillForm = function fillFormWithPricingV48(data = {}) {
    previousFillForm(data);
    ensurePricingUI();
    const toggle = qs('#autoPrice');
    if (toggle) toggle.checked = Boolean(data.autoPrice);
    const discount = qs('#discount');
    if (discount) {
      discount.dataset.manualDiscount = data.discount !== undefined ? '1' : '0';
      if (data.discount !== undefined) discount.value = String(clampDiscount(data.discount));
    }
    syncRegularCustomerDiscount(false);
    calculatePrice();
  };

  const previousResetForm = resetForm;
  resetForm = function resetFormWithPricingV48(addDefaultRug = true) {
    previousResetForm(addDefaultRug);
    ensurePricingUI();
    const toggle = qs('#autoPrice');
    if (toggle) toggle.checked = false;
    const price = qs('#estimatedPrice');
    if (price) {
      price.readOnly = false;
      price.classList.remove('auto-price-readonly');
    }
    const discount = qs('#discount');
    if (discount) {
      discount.dataset.manualDiscount = '0';
      discount.value = '0';
    }
    const breakdown = qs('#autoPriceBreakdown');
    if (breakdown) breakdown.className = 'auto-price-breakdown hidden';
  };

  function install() {
    ensurePricingUI();
    installListeners();
    updateServiceLabels();
    syncRegularCustomerDiscount(false);
    calculatePrice();
  }

  window.PMK_PRICING_V48 = { DEFAULT_PRICE, priceTable, calculatePrice, scheduleCalculation, baseRate };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
//# sourceURL=pricing-v48.js

/* ===== pricing-settings-v67.js ===== */
'use strict';

(() => {
  if (window.PMK_PRICING_SETTINGS_V67) return;
  window.PMK_PRICING_SETTINGS_V67 = true;

  const DEFAULTS = Object.freeze({
    noPile: 300,
    synthetic: 350,
    syntheticWide: 450,
    wool: 400,
    highPile: 450,
    delicate: 800,
    stain: 500,
    odorSmall: 700,
    odorLarge: 1000,
    disinfection: 700,
    hair: 150,
    pileLift: 150,
    conditioner: 300,
    ozonation: 300,
    express: 1000,
    minimum: 1800,
    regularDiscount: 10,
    wideThreshold: 3,
    odorAreaThreshold: 6,
  });

  const GROUPS = [
    {
      title: 'Основная стирка, ₽/м²',
      fields: [
        ['noPile', 'Безворсная синтетика', '₽/м²', 50],
        ['synthetic', 'Синтетика, ворс до 1 см', '₽/м²', 50],
        ['syntheticWide', 'Синтетика шире порога', '₽/м²', 50],
        ['wool', 'Шерсть, ворс до 1 см', '₽/м²', 50],
        ['highPile', 'Ворс более 1 см', '₽/м²', 50],
        ['delicate', 'Вискоза / шёлк / хлопок', '₽/м²', 50],
      ],
    },
    {
      title: 'Дополнительные услуги',
      fields: [
        ['stain', 'Пятна / слайм / пластилин / маркеры', '₽/ковёр', 50],
        ['odorSmall', 'Запах мочи до порога площади', '₽/ковёр', 50],
        ['odorLarge', 'Запах мочи свыше порога', '₽/ковёр', 50],
        ['disinfection', 'Дезинфекция / после потопа', '₽/ковёр', 50],
        ['hair', 'Вычёсывание шерсти и волос', '₽/м²', 50],
        ['pileLift', 'Расчёсывание / подъём ворса', '₽/м²', 50],
        ['conditioner', 'Кондиционер', '₽/ковёр', 50],
        ['ozonation', 'Озонирование', '₽/ковёр', 50],
        ['express', 'Экспресс-выполнение', '₽/заказ', 50],
      ],
    },
    {
      title: 'Правила калькулятора',
      fields: [
        ['minimum', 'Минимальный заказ', '₽', 50],
        ['regularDiscount', 'Скидка постоянного клиента', '%', 1],
        ['wideThreshold', 'Повышенный тариф при ширине строго больше', 'м', 0.1],
        ['odorAreaThreshold', 'Порог площади для запаха мочи', 'м²', 0.1],
      ],
    },
  ];

  const $ = selector => document.querySelector(selector);
  const fieldId = key => `pricingSetting-${key}`;

  function normalized(source = {}) {
    const result = {};
    Object.entries(DEFAULTS).forEach(([key, fallback]) => {
      const value = Number(source?.[key]);
      result[key] = Number.isFinite(value) && value >= 0 ? value : fallback;
    });
    result.regularDiscount = Math.min(100, result.regularDiscount);
    return result;
  }

  function currentPricing() {
    try {
      const source = { ...(state?.settings?.pricing || {}) };
      if (source.minimum === undefined && Number.isFinite(Number(state?.settings?.minimumOrder))) source.minimum = Number(state.settings.minimumOrder);
      return normalized(source);
    } catch {
      return normalized({});
    }
  }

  function fieldMarkup([key, label, unit, step]) {
    return `<label class="pmk-price-field">
      <span>${label}</span>
      <span class="pmk-price-input-wrap">
        <input type="number" id="${fieldId(key)}" min="0" step="${step}" inputmode="decimal">
        <small>${unit}</small>
      </span>
    </label>`;
  }

  function cardMarkup() {
    return `<details id="pricingSettingsCard" class="form-card pricing-settings-card">
      <summary>Прайс калькулятора</summary>
      <p class="pricing-settings-intro">Все значения хранятся на этом устройстве и применяются сразу после сохранения настроек.</p>
      <div class="pricing-settings-groups">
        ${GROUPS.map(group => `<section class="pricing-settings-group">
          <h3>${group.title}</h3>
          <div class="pricing-settings-fields">${group.fields.map(fieldMarkup).join('')}</div>
        </section>`).join('')}
      </div>
      <div class="pricing-settings-footer">
        <button type="button" id="resetPricingDefaultsBtn" class="button button-secondary">Вернуть стандартный прайс</button>
        <span id="pricingSettingsState" aria-live="polite"></span>
      </div>
    </details>`;
  }

  function fill(pricing = currentPricing()) {
    const values = normalized(pricing);
    Object.entries(values).forEach(([key, value]) => {
      const input = $(`#${fieldId(key)}`);
      if (input) input.value = String(value);
    });
  }

  function read() {
    const values = {};
    Object.keys(DEFAULTS).forEach(key => {
      const input = $(`#${fieldId(key)}`);
      const value = Number(input?.value);
      values[key] = Number.isFinite(value) && value >= 0 ? value : DEFAULTS[key];
    });
    return normalized(values);
  }

  function markChanged() {
    const stateLabel = $('#pricingSettingsState');
    if (stateLabel) stateLabel.textContent = 'Есть несохранённые изменения';
  }

  function syncLegacyMinimum(pricing = read()) {
    const legacy = $('#minimumOrderSetting');
    if (legacy) legacy.value = String(pricing.minimum);
  }

  function persistAfterBaseSave() {
    const pricing = read();
    try {
      state.settings.pricing = pricing;
      state.settings.minimumOrder = pricing.minimum;
      saveSettings();
    } catch (error) {
      console.error('Не удалось сохранить прайс калькулятора', error);
      return;
    }
    const stateLabel = $('#pricingSettingsState');
    if (stateLabel) stateLabel.textContent = 'Прайс сохранён';
    window.dispatchEvent(new CustomEvent('pmk-pricing-updated', { detail: pricing }));
  }

  function install() {
    if ($('#pricingSettingsCard')) return true;
    const grid = $('#view-settings .settings-grid');
    if (!grid) return false;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = cardMarkup();
    const rulesCard = $('#minimumOrderSetting')?.closest('.form-card');
    const card = wrapper.firstElementChild;
    if (rulesCard?.nextSibling) grid.insertBefore(card, rulesCard.nextSibling);
    else grid.appendChild(card);

    $('#minimumOrderSetting')?.closest('.field')?.classList.add('pmk-price-legacy-minimum');
    fill();
    syncLegacyMinimum(currentPricing());

    Object.keys(DEFAULTS).forEach(key => $(`#${fieldId(key)}`)?.addEventListener('input', markChanged));
    $('#resetPricingDefaultsBtn')?.addEventListener('click', () => {
      fill(DEFAULTS);
      syncLegacyMinimum(DEFAULTS);
      markChanged();
    });

    const saveButton = $('#saveSettingsBtn');
    saveButton?.addEventListener('click', () => syncLegacyMinimum(read()), true);
    saveButton?.addEventListener('click', persistAfterBaseSave);
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 100) clearInterval(timer);
    }, 50);
  }

  window.PMK_PRICING_DEFAULTS = DEFAULTS;
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
//# sourceURL=pricing-settings-v67.js

/* ===== manager-ui-v50-preview.js ===== */
'use strict';

(() => {
  if (window.PMK_MANAGER_UI_V50) return;
  window.PMK_MANAGER_UI_V50 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const value = selector => $(selector)?.value?.trim() || '';
  const checked = selector => Boolean($(selector)?.checked);
  const money = amount => new Intl.NumberFormat('ru-RU').format(Number(amount || 0)) + ' ₽';
  const safe = text => String(text || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  let summary;
  let clientSection;
  let dateSection;
  let rugsSection;
  let costSection;
  let previewSection;
  let updateTimer;

  function sectionFor(selector) {
    return $(selector)?.closest('.form-card, .preview-card') || null;
  }

  function formatDate(dateKey) {
    if (!dateKey) return 'Дата не указана';
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;
    const today = typeof businessTodayKey === 'function' ? businessTodayKey() : '';
    const tomorrow = today && typeof addDaysToKey === 'function' ? addDaysToKey(today, 1) : '';
    const label = dateKey === today ? 'Сегодня' : dateKey === tomorrow ? 'Завтра' : '';
    const formatted = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
    return label ? `${label}, ${formatted}` : formatted;
  }

  function addressText() {
    const street = value('#street');
    const house = value('#houseNumber');
    const apartment = value('#apartmentNumber');
    const entrance = value('#entrance');
    const floor = value('#floor');
    const first = [street && `ул. ${street.replace(/^ул(?:ица)?\.?\s*/i, '')}`, house && `д. ${house}`, apartment && `кв. ${apartment}`].filter(Boolean).join(', ');
    const second = [entrance && `подъезд ${entrance}`, floor && `этаж ${floor}`].filter(Boolean).join(', ');
    return [first, second, value('#district') && `${value('#district')} район`].filter(Boolean);
  }

  function rugData() {
    return $$('.rug-card', $('#rugsContainer') || document).map((card, index) => {
      const length = $('.rug-length', card)?.value || '';
      const width = $('.rug-width', card)?.value || '';
      const material = $('.rug-material', card)?.value || '';
      const pile = $('.rug-pile', card)?.value || '';
      const services = $$('input:checked', card)
        .map(input => input.value)
        .filter(item => item && !['Пятна','Шерсть','Волосы','Запах мочи','Дезинфекция','Слайм / пластилин'].includes(item));
      const issues = $$('.rug-issues input:checked', card).map(input => input.value);
      return { index: index + 1, length, width, material, pile, details: [...issues, ...services] };
    });
  }

  function missingCount() {
    let count = 0;
    ['#customerName','#phone','#district','#street','#houseNumber','#visitDate','#startTime','#endTime'].forEach(selector => { if (!value(selector)) count += 1; });
    rugData().forEach(rug => {
      if (!rug.length || !rug.width) count += 1;
      if (!rug.material) count += 1;
    });
    return count;
  }

  function summaryMarkup() {
    const client = value('#customerName') || 'Имя не указано';
    const phone = value('#phone') || 'Телефон не указан';
    const address = addressText();
    const date = formatDate(value('#visitDate'));
    const start = value('#startTime') || '—';
    const end = value('#endTime') || '—';
    const callAhead = checked('#callAhead') ? `Позвонить за ${value('#callAheadMinutes') || 30} минут` : 'Звонок перед приездом не включён';
    const rugs = rugData();
    const price = Number(value('#estimatedPrice') || 0);
    const discount = Number(value('#discount') || 0);
    const warning = missingCount();

    const rugsHtml = rugs.length ? rugs.map(rug => {
      const size = rug.length && rug.width ? `${rug.length}×${rug.width} м` : 'Размер не указан';
      const line = [size, rug.material, rug.pile].filter(Boolean).join(' · ');
      const details = rug.details.length ? rug.details.join(', ') : 'Услуги не выбраны';
      return `<button type="button" class="v50-rug-row" data-v50-open="rugs"><span class="v50-rug-number">${rug.index}</span><span><strong>Ковёр ${rug.index}</strong><b>${safe(line)}</b><small>${safe(details)}</small></span><i>›</i></button>`;
    }).join('') : '<p class="v50-empty">Ковры пока не добавлены</p>';

    return `
      <div class="v50-status ${warning ? 'v50-status-warning' : ''}">
        <span>${warning ? '!' : '✓'}</span>
        <div><strong>${warning ? `Нужно проверить: ${warning}` : 'Заявка готова к созданию'}</strong><small>${warning ? 'Незаполненные поля выделены в редакторах' : 'Все основные данные заполнены'}</small></div>
      </div>

      <div class="v50-automation-grid" aria-label="Автоматизации">
        <button type="button" data-v50-action="paste"><span>✨</span><b>Вставка<br>из текста</b></button>
        <button type="button" data-v50-action="client"><span>👤</span><b>Постоянный<br>клиент</b></button>
        <button type="button" data-v50-action="address"><span>📍</span><b>Адрес<br>DaData</b></button>
        <button type="button" data-v50-action="slots"><span>🕒</span><b>Окна<br>маршрута</b></button>
        <button type="button" data-v50-action="price"><span>₽</span><b>Авто<br>стоимость</b></button>
      </div>

      <button type="button" class="v50-summary-card" data-v50-open="client">
        <span class="v50-card-icon">👤</span><span class="v50-card-body"><em>Клиент и адрес</em><strong>${safe(client)}</strong><b>${safe(phone)}</b>${address.map(line => `<small>${safe(line)}</small>`).join('')}</span><span class="v50-edit">Изменить</span>
      </button>

      <button type="button" class="v50-summary-card" data-v50-open="date">
        <span class="v50-card-icon">📅</span><span class="v50-card-body"><em>Дата и время</em><strong>${safe(date)}</strong><b>${safe(start)}–${safe(end)}</b><small>${safe(callAhead)}</small></span><span class="v50-edit">Изменить</span>
      </button>

      <section class="v50-summary-card v50-rugs-summary">
        <div class="v50-card-head"><span class="v50-card-icon">▣</span><strong>Ковры — ${rugs.length}</strong><button type="button" data-v50-open="rugs">Изменить</button></div>
        <div>${rugsHtml}</div>
      </section>

      <button type="button" class="v50-summary-card v50-price-card" data-v50-open="cost">
        <span class="v50-card-icon">₽</span><span class="v50-card-body"><em>Стоимость и договорённости</em><strong>${price ? money(price) : 'Не рассчитана'}</strong><b>Скидка: ${discount}%</b><small>${value('#managerComment') || 'Комментарий не добавлен'}</small></span><span class="v50-edit">Изменить</span>
      </button>

      <button type="button" class="v50-preview-button" data-v50-open="preview">Проверить событие перед созданием <span>›</span></button>
      <button type="button" class="v50-full-button" data-v50-action="full">Открыть полную форму</button>
    `;
  }

  function updateSummary() {
    if (!summary) return;
    summary.innerHTML = summaryMarkup();
  }

  function scheduleUpdate() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(updateSummary, 80);
  }

  function editorTitle(type) {
    return ({ client: 'Клиент и адрес', date: 'Дата и время', rugs: 'Ковры и услуги', cost: 'Стоимость и договорённости', preview: 'Предпросмотр события' })[type] || 'Редактирование';
  }

  function openEditor(type, focusSelector = '') {
    const section = ({ client: clientSection, date: dateSection, rugs: rugsSection, cost: costSection, preview: previewSection })[type];
    if (!section) return;
    closeEditor(false);
    section.classList.add('v50-editor-open');
    section.dataset.v50Editor = type;
    document.body.classList.add('v50-modal-active');

    if (!$('.v50-editor-bar', section)) {
      const top = document.createElement('div');
      top.className = 'v50-editor-bar';
      top.innerHTML = `<button type="button" class="v50-editor-back" aria-label="Назад">←</button><strong>${editorTitle(type)}</strong><button type="button" class="v50-editor-done">Готово</button>`;
      section.prepend(top);
      const bottom = document.createElement('button');
      bottom.type = 'button';
      bottom.className = 'button button-primary v50-editor-save';
      bottom.textContent = type === 'rugs' ? 'Сохранить ковры' : type === 'preview' ? 'Вернуться к заявке' : 'Сохранить изменения';
      section.append(bottom);
    }

    requestAnimationFrame(() => {
      section.scrollTop = 0;
      if (focusSelector) $(focusSelector, section)?.focus();
    });
  }

  function closeEditor(refresh = true) {
    $$('.v50-editor-open').forEach(section => section.classList.remove('v50-editor-open'));
    document.body.classList.remove('v50-modal-active');
    if (refresh) scheduleUpdate();
  }

  function automationAction(action) {
    if (action === 'paste') {
      const input = $('#smartPasteInput');
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus();
      }
      return;
    }
    if (action === 'client') {
      openEditor('client');
      setTimeout(() => ($('#returningClientSearch, .returning-client-search input, input[placeholder*="постоян"]') || $('#customerName'))?.focus(), 120);
      return;
    }
    if (action === 'address') {
      openEditor('client', '#street');
      return;
    }
    if (action === 'slots') {
      openEditor('date');
      setTimeout(() => $('#managerSlotPlanner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      return;
    }
    if (action === 'price') {
      openEditor('cost');
      setTimeout(() => {
        const toggle = $('#autoPrice');
        if (toggle && !toggle.checked) toggle.click();
        toggle?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
      return;
    }
    if (action === 'full') {
      document.body.classList.toggle('v50-full-form');
      const button = $('[data-v50-action="full"]', summary);
      if (button) button.textContent = document.body.classList.contains('v50-full-form') ? 'Вернуться к краткой сводке' : 'Открыть полную форму';
      $('.form-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function addStickyActions(form) {
    if ($('#v50StickyActions')) return;
    const bar = document.createElement('div');
    bar.id = 'v50StickyActions';
    bar.className = 'v50-sticky-actions';
    bar.innerHTML = '<button type="button" class="v50-draft">Черновик</button><button type="button" class="v50-submit">Создать в календаре</button>';
    form.append(bar);
    $('.v50-draft', bar).addEventListener('click', () => $('#saveDraftBtn')?.click());
    $('.v50-submit', bar).addEventListener('click', () => $('#submitBtn')?.click());
  }

  function install() {
    const form = $('#requestForm');
    const layout = $('.form-layout', form || document);
    if (!form || !layout || !$('#customerName') || !$('#rugsContainer')) return false;

    document.body.classList.add('v50-manager-preview');
    clientSection = sectionFor('#customerName');
    dateSection = sectionFor('#visitDate');
    rugsSection = sectionFor('#rugsContainer');
    costSection = sectionFor('#estimatedPrice');
    previewSection = $('.preview-card', form);

    [clientSection, dateSection, rugsSection, costSection, previewSection].filter(Boolean).forEach(section => section.classList.add('v50-source-section'));

    summary = document.createElement('div');
    summary.id = 'v50Summary';
    summary.className = 'v50-summary';
    layout.before(summary);

    summary.addEventListener('click', event => {
      const open = event.target.closest('[data-v50-open]');
      if (open) openEditor(open.dataset.v50Open);
      const action = event.target.closest('[data-v50-action]');
      if (action) automationAction(action.dataset.v50Action);
    });

    form.addEventListener('click', event => {
      if (event.target.closest('.v50-editor-back, .v50-editor-done, .v50-editor-save')) closeEditor();
    });
    form.addEventListener('input', scheduleUpdate);
    form.addEventListener('change', scheduleUpdate);

    new MutationObserver(scheduleUpdate).observe($('#rugsContainer'), { childList: true, subtree: true, attributes: true });
    addStickyActions(form);
    updateSummary();
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 80) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

//# sourceURL=manager-ui-v50-preview.js

/* ===== manager-ui-v50-refinements.js ===== */
'use strict';

(() => {
  if (window.PMK_MANAGER_UI_V50_REFINEMENTS) return;
  window.PMK_MANAGER_UI_V50_REFINEMENTS = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const DRAFT_KEY = 'pmk-form-autodraft-v1';

  function readDraft() {
    try {
      const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return value?.data && Date.now() - Number(value.savedAt || 0) < 604800000 ? value : null;
    } catch {
      return null;
    }
  }

  function renderDraftNotice() {
    const summary = $('#v50Summary');
    if (!summary) return;
    $('#v50DraftNotice')?.remove();
    if (!readDraft()) return;

    const notice = document.createElement('section');
    notice.id = 'v50DraftNotice';
    notice.className = 'v50-draft-notice';
    notice.innerHTML = `
      <div class="v50-draft-copy">
        <span class="v50-draft-dot"></span>
        <div><strong>Незавершённая заявка</strong><small>Продолжить заполнение или удалить черновик.</small></div>
      </div>
      <div class="v50-draft-actions">
        <button type="button" data-v50-draft="view">Посмотреть</button>
        <button type="button" data-v50-draft="delete">Удалить</button>
      </div>`;
    summary.prepend(notice);

    notice.addEventListener('click', event => {
      const action = event.target.closest('[data-v50-draft]')?.dataset.v50Draft;
      if (action === 'view') {
        if (typeof pmkDraftRestore === 'function') pmkDraftRestore();
        else document.body.classList.add('v50-full-form');
        setTimeout(() => $('.form-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
      if (action === 'delete') {
        if (!window.confirm('Удалить незавершённую заявку?')) return;
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
        $('#pmkDraftRestore')?.remove();
        notice.remove();
      }
    });
  }

  function compactSmartPaste() {
    const input = $('#smartPasteInput');
    if (!input) return;
    const card = input.closest('.form-card, section, .card');
    if (!card) return;
    card.classList.add('v50-smart-paste-compact');
    const heading = $('.section-heading', card);
    if (heading) $$('p,small', heading).forEach(node => node.remove());
    $$(':scope > p, :scope > .helper-text, :scope > .hint, :scope > small', card).forEach(node => {
      if (!node.closest('#smartPasteResult')) node.remove();
    });
  }

  function compactAutomationBar() {
    const grid = $('.v50-automation-grid');
    if (!grid) return;
    grid.classList.add('v50-automation-grid-compact');
    $$('[data-v50-action="paste"]', grid).forEach(button => button.remove());

    const labels = {
      client: ['К', 'Клиент'],
      address: ['⌖', 'Адрес'],
      slots: ['◷', 'Окна'],
      price: ['₽', 'Стоимость'],
    };
    Object.entries(labels).forEach(([action, [icon, text]]) => {
      const button = $(`[data-v50-action="${action}"]`, grid);
      if (!button) return;
      button.innerHTML = `<span aria-hidden="true">${icon}</span><b>${text}</b>`;
      button.setAttribute('aria-label', text);
    });
  }

  const services = [
    ['Удаление пятен', 'Пятна'],
    ['Удаление запаха мочи', 'Запах мочи'],
    ['Кондиционер', 'Кондиционер'],
    ['Вычёсывание шерсти и волос', 'Шерсть / волосы'],
    ['Озонация', 'Озон'],
    ['Подъём ворса', 'Расчёсывание ворса'],
  ];

  function rebuildRugServices(card) {
    if (!card) return;
    const container = $('.rug-services', card);
    if (!container || container.dataset.v50Built === '1') return;

    const checked = new Set($$('input[type="checkbox"]:checked', container).map(input => input.value));
    container.className = 'rug-services v50-service-grid';
    container.innerHTML = services.map(([value, label]) => `
      <label class="v50-service-chip">
        <input type="checkbox" value="${value}" ${checked.has(value) ? 'checked' : ''} />
        <span>${label}</span>
      </label>`).join('');
    container.dataset.v50Built = '1';
  }

  function refineRugs() {
    $$('.rug-card', $('#rugsContainer') || document).forEach(rebuildRugServices);
  }

  function install() {
    if (!$('#v50Summary')) return false;
    renderDraftNotice();
    compactSmartPaste();
    compactAutomationBar();
    refineRugs();

    const rugs = $('#rugsContainer');
    if (rugs && rugs.dataset.v50RefinementObserver !== '1') {
      rugs.dataset.v50RefinementObserver = '1';
      new MutationObserver(() => setTimeout(refineRugs, 30)).observe(rugs, { childList: true, subtree: true });
    }

    window.addEventListener('storage', renderDraftNotice);
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 100) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

//# sourceURL=manager-ui-v50-refinements.js

/* ===== manager-ui-v51.js ===== */
'use strict';

(() => {
  if (window.PMK_MANAGER_UI_V51) return;
  window.PMK_MANAGER_UI_V51 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const FALLBACK_PRICE = {
    stain: 500,
    odorSmall: 700,
    odorLarge: 1000,
    odorAreaThreshold: 6,
    disinfection: 700,
    conditioner: 300,
    hair: 150,
    pileLift: 150,
    ozonation: 300,
    express: 1000,
  };

  function priceTable() {
    return { ...FALLBACK_PRICE, ...(window.PMK_PRICING_V48?.priceTable?.() || {}) };
  }

  function money(value) {
    return new Intl.NumberFormat('ru-RU').format(Number(value || 0)) + ' ₽';
  }

  function area(value) {
    return Number(value || 0).toFixed(1).replace(/\.0$/, '');
  }

  function serviceDefinitions() {
    const price = priceTable();
    return [
      ['Удаление пятен', `Пятна / слайм / пластилин / маркеры · ${money(price.stain)}/ковёр`],
      ['Удаление запаха мочи', `Удаление запаха мочи · ${money(price.odorSmall)} до ${area(price.odorAreaThreshold)} м² / ${money(price.odorLarge)} свыше`],
      ['Дезинфекция', `Дезинфекция / ковёр после потопа · ${money(price.disinfection)}/ковёр`],
      ['Кондиционер', `Кондиционер · ${money(price.conditioner)}/ковёр`],
      ['Вычёсывание шерсти и волос', `Вычёсывание шерсти и волос · ${money(price.hair)}/м²`],
      ['Подъём ворса', `Расчёсывание / подъём ворса · ${money(price.pileLift)}/м²`],
      ['Озонация', `Озонация · ${money(price.ozonation)}/ковёр`],
      ['Экспресс-стирка', `Экспресс-стирка · ${money(price.express)}/заказ`],
    ];
  }

  function selectedServices(root) {
    const selected = new Set();
    $$('input[type="checkbox"]:checked', root).forEach(input => {
      const value = String(input.value || '');
      if (/пят|слайм|пластилин|маркер/i.test(value)) selected.add('Удаление пятен');
      if (/запах.*моч|моч[аи]/i.test(value)) selected.add('Удаление запаха мочи');
      if (/дезинф|потоп|мокр/i.test(value)) selected.add('Дезинфекция');
      if (/кондиционер/i.test(value)) selected.add('Кондиционер');
      if (/шерст|волос|выч[её]с/i.test(value)) selected.add('Вычёсывание шерсти и волос');
      if (/подъ[её]м.*ворс|расч[её]с|расчес/i.test(value)) selected.add('Подъём ворса');
      if (/озон/i.test(value)) selected.add('Озонация');
      if (/экспресс/i.test(value)) selected.add('Экспресс-стирка');
    });
    return selected;
  }

  function serviceMarkup(selected = new Set()) {
    return serviceDefinitions().map(([value, label]) => `
      <label class="v51-service">
        <input type="checkbox" value="${value}" ${selected.has(value) ? 'checked' : ''}>
        <span>${label}</span>
      </label>`).join('');
  }

  function updateExistingLabels(details) {
    const definitions = new Map(serviceDefinitions());
    let changed = false;
    $$('.v51-service', details).forEach(label => {
      const input = $('input[type="checkbox"]', label);
      const text = $('span', label);
      if (!input || !text || !definitions.has(input.value)) return;
      const nextText = definitions.get(input.value);
      if (text.textContent !== nextText) {
        text.textContent = nextText;
        changed = true;
      }
    });
    return changed;
  }

  function rebuildRugDetails(details) {
    if (!details) return false;
    const expectedValues = serviceDefinitions().map(item => item[0]);
    const currentValues = $$('.v51-service input', details).map(input => input.value);
    const structureOk = currentValues.length === expectedValues.length
      && currentValues.every((value, index) => value === expectedValues[index]);

    if (structureOk) {
      updateExistingLabels(details);
      return true;
    }

    const selected = selectedServices(details);
    details.className = 'rug-details-grid v51-clean-details';
    details.innerHTML = `
      <section class="v51-service-section">
        <h4 class="v51-service-title">Услуги для этого ковра</h4>
        <div class="v51-services">${serviceMarkup(selected)}</div>
      </section>`;
    return true;
  }

  function rebuildServices() {
    rebuildRugDetails($('#rugTemplate')?.content?.querySelector('.rug-details-grid'));
    $$('.rug-card .rug-details-grid').forEach(rebuildRugDetails);
  }

  function smartPasteCard() {
    const input = $('#smartPasteInput');
    return input?.closest('.form-card, section, .card') || null;
  }

  function cleanSmartPaste() {
    const card = smartPasteCard();
    if (!card) return false;
    card.classList.add('v51-smart-paste-clean');
    $$('p,small,.helper-text,.hint', card).forEach(node => {
      if (!node.closest('#smartPasteResult')) node.remove();
    });
    return true;
  }

  function verify() {
    const expectedValues = serviceDefinitions().map(item => item[0]);
    const cards = $$('.rug-card');
    const servicesOk = cards.length > 0 && cards.every(card => {
      const values = $$('.v51-service input', card).map(input => input.value);
      return values.length === expectedValues.length
        && values.every((value, index) => value === expectedValues[index]);
    });
    const ok = Boolean(servicesOk && smartPasteCard()?.classList.contains('v51-smart-paste-clean'));
    document.documentElement.dataset.v51ServicesReady = ok ? '1' : '0';
    return ok;
  }

  function run() {
    cleanSmartPaste();
    rebuildServices();
    verify();
  }

  function boot() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      run();
      if (verify() || attempts > 200) clearInterval(timer);
    }, 50);

    const rugs = $('#rugsContainer');
    if (rugs) {
      let pending = false;
      new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          rebuildServices();
          verify();
        });
      }).observe(rugs, { childList: true, subtree: true });
    }

    window.addEventListener('pmk-pricing-updated', () => {
      rebuildServices();
      verify();
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
//# sourceURL=manager-ui-v51.js

/* ===== manager-ui-v51-tools-stable.js ===== */
'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  const ICONS = {
    paste: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5h6M9 3h6v5H9zM7 5H5.8A1.8 1.8 0 0 0 4 6.8v12.4A1.8 1.8 0 0 0 5.8 21h12.4a1.8 1.8 0 0 0 1.8-1.8V6.8A1.8 1.8 0 0 0 18.2 5H17"/><path d="M8 13h8M8 17h5"/></svg>',
    client: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="8" r="3.5"/><path d="M4.5 19c.8-3.4 3-5.2 6.5-5.2 2 0 3.6.6 4.7 1.8"/><circle cx="18" cy="17.5" r="3"/><path d="m20.2 19.7 1.8 1.8"/></svg>',
    slots: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6"/></svg>',
    calculate: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/></svg>',
  };

  function clickSummaryAction(action) {
    const summary = $('#v50Summary');
    const proxy = summary?.querySelector(`[data-v50-action="${action}"]`);
    if (proxy) {
      proxy.click();
      return true;
    }
    return false;
  }

  function openSummaryEditor(type) {
    const summary = $('#v50Summary');
    const target = summary?.querySelector(`[data-v50-open="${type}"]`);
    if (!target) return false;
    target.click();
    return true;
  }

  function runAction(action) {
    if (action === 'paste') {
      if (clickSummaryAction('paste')) return;
      const input = $('#smartPasteInput');
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus();
      return;
    }

    if (action === 'client') {
      if (clickSummaryAction('client')) return;
      openSummaryEditor('client');
      setTimeout(() => ($('#returningClientSearch, .returning-client-search input') || $('#customerName'))?.focus(), 120);
      return;
    }

    if (action === 'slots') {
      if (!clickSummaryAction('slots')) openSummaryEditor('date');
      setTimeout(() => $('#managerSlotPlanner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 140);
      return;
    }

    if (action === 'calculate') {
      openSummaryEditor('rugs');
      setTimeout(() => {
        const toggle = $('#autoPrice');
        if (toggle && !toggle.checked) {
          toggle.checked = true;
          toggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
        window.PMK_PRICING_V48?.calculatePrice?.();
        const firstRug = $('#rugsContainer .rug-card');
        firstRug?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstIncomplete = firstRug?.querySelector('.rug-width[value="0.0"], .rug-width, .rug-material');
        firstIncomplete?.focus?.();
      }, 160);
    }
  }

  function createTools() {
    const section = document.createElement('nav');
    section.id = 'v51Tools';
    section.className = 'v51-tools-stable v51-quick-menu';
    section.setAttribute('aria-label', 'Быстрые действия заявки');
    section.innerHTML = `
      <button type="button" class="v51-quick-action" data-v51-action="paste">
        <span class="v51-quick-icon">${ICONS.paste}</span><strong>Вставить</strong>
      </button>
      <button type="button" class="v51-quick-action" data-v51-action="client">
        <span class="v51-quick-icon">${ICONS.client}</span><strong>Найти клиента</strong>
      </button>
      <button type="button" class="v51-quick-action" data-v51-action="slots">
        <span class="v51-quick-icon">${ICONS.slots}</span><strong>Выбрать окно</strong>
      </button>
      <button type="button" class="v51-quick-action" data-v51-action="calculate">
        <span class="v51-quick-icon">${ICONS.calculate}</span><strong>Рассчитать</strong>
      </button>`;

    section.addEventListener('click', event => {
      const button = event.target.closest('[data-v51-action]');
      if (button) runAction(button.dataset.v51Action);
    });
    return section;
  }

  function install() {
    const summary = $('#v50Summary');
    if (!summary) return false;

    const existing = $('#v51Tools');
    if (!existing?.classList.contains('v51-quick-menu')) {
      existing?.remove();
      summary.before(createTools());
    }

    const input = $('#smartPasteInput');
    if (input) input.placeholder = 'Вставьте или продиктуйте текст заявки';
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 200) clearInterval(timer);
    }, 50);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
//# sourceURL=manager-ui-v51-tools-stable.js

/* ===== android-autofill-off-v53.js ===== */
'use strict';

(() => {
  if (window.PMK_ANDROID_AUTOFILL_OFF_V53) return;
  window.PMK_ANDROID_AUTOFILL_OFF_V53 = true;

  const PERSONAL_SELECTORS = [
    '#customerName',
    '#phone',
    '#settlement',
    '#street',
    '#houseNumber',
    '#apartmentNumber',
    '#entrance',
    '#floor',
    '#managerComment',
    '#globalSearch',
    '#reminderText',
  ].join(',');

  function markInput(input) {
    if (!input || input.dataset.pmkAutofillOff === '1') return;
    input.dataset.pmkAutofillOff = '1';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'none');
    input.setAttribute('data-form-type', 'other');
    input.setAttribute('data-lpignore', 'true');
    input.setAttribute('data-1p-ignore', 'true');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', input.id === 'customerName' ? 'words' : 'none');
    input.spellcheck = false;
  }

  function addAutofillDecoys(form) {
    if (!form || form.querySelector('[data-pmk-autofill-decoys]')) return;
    const box = document.createElement('div');
    box.dataset.pmkAutofillDecoys = '1';
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    box.innerHTML = '<input type="text" tabindex="-1" autocomplete="username"><input type="password" tabindex="-1" autocomplete="new-password">';
    form.prepend(box);
  }

  function protectForm(form) {
    if (!form) return;
    form.setAttribute('autocomplete', 'off');
    form.setAttribute('data-form-type', 'other');
    form.setAttribute('data-lpignore', 'true');
    form.setAttribute('data-1p-ignore', 'true');
    addAutofillDecoys(form);
    form.querySelectorAll(PERSONAL_SELECTORS).forEach(markInput);
  }

  function protectAll() {
    document.querySelectorAll('form').forEach(protectForm);
    document.querySelectorAll(PERSONAL_SELECTORS).forEach(markInput);
  }

  function boot() {
    protectAll();

    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        protectAll();
      });
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener('focusin', event => {
      if (event.target?.matches?.(PERSONAL_SELECTORS)) markInput(event.target);
    }, true);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
//# sourceURL=android-autofill-off-v53.js

/* ===== preview-description-v53.js ===== */
'use strict';

// В событии показываем только фактически выбранное время заявки.
// Полный список рабочих окон района нужен для выбора слота, но не для описания события.
eventDescription = function eventDescription(data) {
  const rugs = normalizeRugs(data).map((rug, index) => {
    const size = rug.length && rug.width
      ? `${rug.length} × ${rug.width} м (${(rug.length * rug.width).toFixed(2).replace('.00', '')} м²)`
      : 'размер не указан';
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
};
//# sourceURL=preview-description-v53.js

/* ===== edit-save-hotfix-v54.js ===== */
'use strict';

(() => {
  if (window.PMK_EDIT_SAVE_HOTFIX_V54) return;
  window.PMK_EDIT_SAVE_HOTFIX_V54 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let pendingGoogleUpdate = false;
  let pendingTimer = 0;

  function eventId() {
    return String($('#eventId')?.value || '');
  }

  function isExistingGoogleEvent() {
    const id = eventId();
    return Boolean(id && !id.startsWith('local-'));
  }

  function isGoogleConnected() {
    return Boolean($('#connectionBadge')?.classList.contains('online'));
  }

  function notify(message, type = 'error') {
    if (typeof showToast === 'function') showToast(message, type);
  }

  function syncActionLabels() {
    const id = eventId();
    const editing = Boolean(id);
    const sticky = $('#v50StickyActions .v50-submit');
    const submit = $('#submitBtn');

    if (sticky) {
      if (editing && isExistingGoogleEvent() && !isGoogleConnected()) sticky.textContent = 'Подключить Google и обновить';
      else sticky.textContent = editing ? 'Обновить заявку' : (isGoogleConnected() ? 'Создать в календаре' : 'Сохранить заявку');
    }

    if (submit && editing) {
      submit.textContent = isExistingGoogleEvent() && !isGoogleConnected()
        ? 'Подключить Google и обновить'
        : 'Обновить заявку';
    }

    document.querySelectorAll('.v50-editor-save').forEach(button => {
      button.textContent = 'Готово';
    });
  }

  function submitForm() {
    const form = $('#requestForm');
    const submit = $('#submitBtn');
    if (!form || !submit) return;
    if (typeof form.requestSubmit === 'function') form.requestSubmit(submit);
    else submit.click();
  }

  function waitForReconnectAndRetry() {
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      if (!pendingGoogleUpdate) return;
      pendingGoogleUpdate = false;
      notify('Google не подключился. Нажмите «Подключить Google» и повторите сохранение.', 'error');
      syncActionLabels();
    }, 20000);
  }

  function interceptOfflineGoogleEdit(event) {
    if (!isExistingGoogleEvent() || isGoogleConnected()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    pendingGoogleUpdate = true;
    notify('Для обновления существующей заявки нужно восстановить подключение Google. После подключения сохранение продолжится автоматически.', 'error');
    $('#connectGoogleBtn')?.click();
    waitForReconnectAndRetry();
    syncActionLabels();
  }

  function install() {
    const form = $('#requestForm');
    if (!form || form.dataset.pmkEditSaveV54 === '1') return Boolean(form);
    form.dataset.pmkEditSaveV54 = '1';

    form.addEventListener('submit', interceptOfflineGoogleEdit, true);

    const sticky = $('#v50StickyActions .v50-submit');
    if (sticky && sticky.dataset.pmkEditSaveV54 !== '1') {
      sticky.dataset.pmkEditSaveV54 = '1';
      sticky.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitForm();
      }, true);
    }

    const badge = $('#connectionBadge');
    if (badge) {
      new MutationObserver(() => {
        syncActionLabels();
        if (!pendingGoogleUpdate || !isGoogleConnected()) return;
        pendingGoogleUpdate = false;
        clearTimeout(pendingTimer);
        notify('Google подключён. Обновляем заявку…', 'success');
        setTimeout(submitForm, 150);
      }).observe(badge, { attributes: true, childList: true, characterData: true, subtree: true });
    }

    form.addEventListener('input', syncActionLabels);
    form.addEventListener('change', syncActionLabels);
    document.addEventListener('click', () => setTimeout(syncActionLabels, 0));
    syncActionLabels();
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
//# sourceURL=edit-save-hotfix-v54.js

/* ===== address-placeholders-off-v56.js ===== */
'use strict';

(() => {
  if (window.PMK_ADDRESS_PLACEHOLDERS_OFF_V56) return;
  window.PMK_ADDRESS_PLACEHOLDERS_OFF_V56 = true;

  const selectors = [
    '#addressSearch',
    '#settlement',
    '#street',
    '#houseNumber',
    '#apartmentNumber',
    '#entrance',
    '#floor',
  ].join(',');

  function clearPlaceholders(root = document) {
    root.querySelectorAll?.(selectors).forEach(input => {
      if (input.hasAttribute('placeholder')) input.removeAttribute('placeholder');
    });
  }

  function boot() {
    clearPlaceholders();

    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        clearPlaceholders();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
//# sourceURL=address-placeholders-off-v56.js

/* ===== workshop-measurement-v58.js ===== */
'use strict';

(() => {
  if (window.PMK_WORKSHOP_MEASUREMENT_V58) return;
  window.PMK_WORKSHOP_MEASUREMENT_V58 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clampCount = value => Math.max(1, Math.min(30, Math.round(Number(value) || 1)));

  function isEnabled() {
    return Boolean($('#workshopMeasurement')?.checked);
  }

  function rugCount() {
    return clampCount($('#workshopRugCount')?.value || 1);
  }

  function syncSummary() {
    if (!isEnabled()) return;
    const count = rugCount();
    const summary = $('#v50Summary');
    if (!summary) return;

    const card = $('.v50-rugs-summary', summary);
    const heading = $('.v50-card-head strong', card || summary);
    const headingText = `Ковры — ${count}`;
    if (heading && heading.textContent !== headingText) heading.textContent = headingText;

    if (card && card.dataset.workshopSummaryCount !== String(count)) {
      const body = [...card.children].find(child => !child.classList.contains('v50-card-head'));
      if (body) {
        body.innerHTML = `
          <button type="button" class="v50-rug-row" data-v50-open="rugs">
            <span class="v50-rug-number">✓</span>
            <span><strong>Замер в цеху</strong><b>${count} ${typeof pluralRugs === 'function' ? pluralRugs(count) : 'ковров'}</b><small>Размеры будут внесены после забора</small></span>
            <i>›</i>
          </button>`;
      }
      card.dataset.workshopSummaryCount = String(count);
    }

    const missing = ['#customerName','#phone','#district','#street','#houseNumber','#visitDate','#startTime','#endTime']
      .reduce((total, selector) => total + ($(selector)?.value?.trim() ? 0 : 1), 0);
    const status = $('.v50-status', summary);
    if (status && status.dataset.workshopMissing !== String(missing)) {
      status.classList.toggle('v50-status-warning', missing > 0);
      status.innerHTML = missing
        ? `<span>!</span><div><strong>Нужно проверить: ${missing}</strong><small>Незаполненные обязательные поля выделены в редакторах</small></div>`
        : '<span>✓</span><div><strong>Заявка готова к созданию</strong><small>Количество ковров указано, размеры определим в цеху</small></div>';
      status.dataset.workshopMissing = String(missing);
    }
  }

  function applyMode() {
    const enabled = isEnabled();
    const countRow = $('#workshopRugCountRow');
    const list = $('#rugsContainer');
    const addButton = $('#addRugBtn');
    const note = $('#workshopMeasurementNote');

    countRow?.classList.toggle('hidden', !enabled);
    list?.classList.toggle('workshop-rugs-hidden', enabled);
    addButton?.classList.toggle('hidden', enabled);
    note?.classList.toggle('hidden', !enabled);

    if (enabled) {
      const input = $('#workshopRugCount');
      if (input && !input.value) input.value = String(Math.max(1, $$('.rug-card', list || document).length));
    }

    if (typeof schedulePreviewUpdate === 'function') schedulePreviewUpdate();
    setTimeout(syncSummary, 100);
  }

  function installUi() {
    const rugs = $('#rugsContainer');
    const section = rugs?.closest('.form-card');
    if (!rugs || !section || $('#workshopMeasurementPanel')) return Boolean(rugs && section);

    const panel = document.createElement('div');
    panel.id = 'workshopMeasurementPanel';
    panel.className = 'workshop-measurement-panel';
    panel.innerHTML = `
      <label class="workshop-measurement-toggle">
        <input type="checkbox" id="workshopMeasurement">
        <span><strong>Замер в цеху</strong><small>Размеры ковров определим после забора</small></span>
      </label>
      <label id="workshopRugCountRow" class="field workshop-rug-count hidden">
        Количество ковров
        <input type="number" id="workshopRugCount" min="1" max="30" step="1" value="1" inputmode="numeric">
      </label>
      <div id="workshopMeasurementNote" class="workshop-measurement-note hidden">Карточки размеров сохранены, но в заявку сейчас попадёт только количество ковров и отметка о замере в цеху.</div>`;
    section.insertBefore(panel, rugs);

    $('#workshopMeasurement').addEventListener('change', applyMode);
    $('#workshopRugCount').addEventListener('input', event => {
      event.target.value = String(clampCount(event.target.value));
      if (typeof schedulePreviewUpdate === 'function') schedulePreviewUpdate();
      setTimeout(syncSummary, 100);
    });

    const summary = $('#v50Summary');
    if (summary) {
      let pending = false;
      new MutationObserver(() => {
        if (!isEnabled() || pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          syncSummary();
        });
      }).observe(summary, { childList: true, subtree: true });
    }

    return true;
  }

  const originalGetFormData = getFormData;
  getFormData = function getFormDataWithWorkshopMeasurement() {
    const data = originalGetFormData();
    if (!isEnabled()) {
      data.measurementAtWorkshop = false;
      data.workshopRugCount = 0;
      return data;
    }

    const firstRug = data.rugs?.[0] || {};
    data.measurementAtWorkshop = true;
    data.workshopRugCount = rugCount();
    data.rugs = [{
      ...firstRug,
      length: 0,
      width: 0,
      measurementAtWorkshop: true,
    }];
    data.issues = [...new Set(data.rugs.flatMap(rug => rug.issues || []))];
    data.services = [...new Set(data.rugs.flatMap(rug => rug.services || []))];
    return data;
  };

  const originalFillForm = fillForm;
  fillForm = function fillFormWithWorkshopMeasurement(data = {}) {
    originalFillForm(data);
    const enabled = Boolean(data.measurementAtWorkshop);
    const toggle = $('#workshopMeasurement');
    const input = $('#workshopRugCount');
    if (toggle) toggle.checked = enabled;
    if (input) input.value = String(clampCount(data.workshopRugCount || data.rugCount || 1));
    applyMode();
  };

  const originalResetForm = resetForm;
  resetForm = function resetFormWithWorkshopMeasurement(addDefaultRug = true) {
    originalResetForm(addDefaultRug);
    const toggle = $('#workshopMeasurement');
    const input = $('#workshopRugCount');
    if (toggle) toggle.checked = false;
    if (input) input.value = '1';
    applyMode();
  };

  const originalEventTitle = eventTitle;
  eventTitle = function eventTitleWithWorkshopMeasurement(data = {}) {
    if (!data.measurementAtWorkshop) return originalEventTitle(data);
    const count = clampCount(data.workshopRugCount || 1);
    return originalEventTitle({ ...data, rugs: Array.from({ length: count }, () => ({})) });
  };

  const originalEventDescription = eventDescription;
  eventDescription = function eventDescriptionWithWorkshopMeasurement(data = {}) {
    const text = originalEventDescription(data);
    if (!data.measurementAtWorkshop) return text;

    const count = clampCount(data.workshopRugCount || 1);
    const start = text.indexOf('Ковры:\n');
    const end = start >= 0 ? text.indexOf('\n\nПредварительная стоимость:', start) : -1;
    const block = `Ковры:\nЗамер в цеху: да\nКоличество ковров: ${count}\nРазмеры: определить после забора`;
    if (start >= 0 && end > start) return `${text.slice(0, start)}${block}${text.slice(end)}`;
    return `${text}\n\n${block}`;
  };

  function boot() {
    if (installUi()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installUi() || attempts > 200) clearInterval(timer);
    }, 50);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
//# sourceURL=workshop-measurement-v58.js

/* ===== settings-version-header-v59.js ===== */
'use strict';

(() => {
  if (window.PMK_SETTINGS_VERSION_HEADER_V59) return;
  window.PMK_SETTINGS_VERSION_HEADER_V59 = true;
  const $ = (selector, root = document) => root.querySelector(selector);

  async function install() {
    const view = $('#view-settings');
    const heading = $('#view-settings > .page-heading');
    if (!view || !heading || $('#settingsVersionHeader')) return Boolean($('#settingsVersionHeader'));
    $('#view-settings .settings-actions a[href*="reset.html"]')?.remove();
    const panel = document.createElement('section');
    panel.id = 'settingsVersionHeader';
    panel.className = 'settings-version-header';
    panel.innerHTML = '<div class="settings-version-info"><span class="settings-version-label">Версия приложения</span><strong id="settingsVersionValue">v87</strong><small id="settingsVersionRelease">Настоящий свайп, статусы 2×2 и заметка в 2 строки · 2026-07-01</small></div><a id="settingsUpdateButton" class="button button-primary settings-update-button" href="./reset.html?v=87-settings">Обновить приложение</a>';
    heading.insertAdjacentElement('afterend', panel);
    return true;
  }

  const start = () => requestAnimationFrame(() => { if (!install()) setTimeout(install, 200); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
//# sourceURL=settings-version-header-v59.js

/* ===== navigation-layer-swipe-fix-v60.js ===== */
'use strict';

(() => {
  if (window.PMK_NAVIGATION_LAYER_SWIPE_FIX_V60) return;
  window.PMK_NAVIGATION_LAYER_SWIPE_FIX_V60 = true;

  setupSwipeNavigation = function setupSafeSwipeNavigation() {
    const main = qs('.main-content');
    const sidebar = qs('#sidebar');
    if (!main || !sidebar || main.dataset.pmkSafeSwipeV60 === '1') return;
    main.dataset.pmkSafeSwipeV60 = '1';

    let startX = 0;
    let startY = 0;
    let startTarget = null;
    let startedAt = 0;

    const reset = () => {
      startX = 0;
      startY = 0;
      startTarget = null;
      startedAt = 0;
    };

    const start = event => {
      const touch = event.touches?.[0];
      if (!touch) return reset();
      startX = touch.clientX;
      startY = touch.clientY;
      startTarget = event.target;
      startedAt = Date.now();
    };

    const end = event => {
      const touch = event.changedTouches?.[0];
      if (!touch || !startedAt) return reset();

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const elapsed = Date.now() - startedAt;
      const horizontal = Math.abs(dx) >= 85 && Math.abs(dx) > Math.abs(dy) * 1.6;

      if (sidebar.classList.contains('open') && dx < -55 && horizontal) {
        sidebar.classList.remove('open');
        reset();
        return;
      }

      // В многодневных режимах горизонтальное движение используется только
      // для просмотра колонок. Смена периода выполняется кнопками навигации.
      if (state.currentView !== 'day') return reset();

      const interactive = startTarget?.closest?.('input,textarea,select,button,a,[contenteditable="true"],.event-card,.day-column,.week-board');
      if (interactive || elapsed > 900 || !horizontal) return reset();

      shiftSelectedDay(dx < 0 ? 1 : -1);
      reset();
    };

    const cancel = () => reset();

    main.addEventListener('touchstart', start, { passive: true });
    main.addEventListener('touchend', end, { passive: true });
    main.addEventListener('touchcancel', cancel, { passive: true });
    sidebar.addEventListener('touchstart', start, { passive: true });
    sidebar.addEventListener('touchend', end, { passive: true });
    sidebar.addEventListener('touchcancel', cancel, { passive: true });
  };

  document.addEventListener('DOMContentLoaded', () => {
    const menu = qs('#menuToggle');
    const sidebar = qs('#sidebar');
    if (!menu || !sidebar) return;

    const syncMenuState = () => {
      const open = sidebar.classList.contains('open');
      document.body.classList.toggle('pmk-sidebar-open', open);
      menu.setAttribute('aria-expanded', String(open));
    };

    menu.addEventListener('click', () => requestAnimationFrame(syncMenuState));
    qsa('.nav-item', sidebar).forEach(item => item.addEventListener('click', () => {
      sidebar.classList.remove('open');
      syncMenuState();
    }));

    new MutationObserver(syncMenuState).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    syncMenuState();
  });
})();
//# sourceURL=navigation-layer-swipe-fix-v60.js

/* ===== planning-refresh-remove-v62.js ===== */
'use strict';

(() => {
  if (window.PMK_PLANNING_REFRESH_REMOVE_V62) return;
  window.PMK_PLANNING_REFRESH_REMOVE_V62 = true;

  function removePlanningRefresh() {
    document.querySelector('#view-week #refreshBtn')?.remove();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', removePlanningRefresh, { once: true })
    : removePlanningRefresh();
})();
//# sourceURL=planning-refresh-remove-v62.js

/* ===== header-sync-status-v65.js ===== */
'use strict';

(() => {
  if (window.PMK_HEADER_SYNC_STATUS_V65) return;
  window.PMK_HEADER_SYNC_STATUS_V65 = true;

  const STORAGE_KEY = 'pmk-calendar-sync-status-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  let manualSync = false;
  let syncing = false;

  function nowIso() {
    return new Date().toISOString();
  }

  function formatDateTime(iso) {
    if (!iso) return 'Дата и время отсутствуют';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Дата и время отсутствуют';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date).replace(',', ' ·');
  }

  function readSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function saveStatus(status, extra = {}) {
    const data = { status, time: nowIso(), ...extra };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    return data;
  }

  function render(status, data = {}) {
    const panel = $('#pmkHeaderSync');
    const label = $('#pmkSyncStatus');
    const time = $('#pmkSyncTime');
    const button = $('#pmkSyncButton');
    if (!panel || !label || !time || !button) return;

    panel.dataset.status = status;
    button.disabled = status === 'syncing';
    button.setAttribute('aria-busy', String(status === 'syncing'));

    if (status === 'syncing') {
      label.textContent = data.count != null ? `Синхронизация · ${data.count}` : 'Синхронизация…';
      time.textContent = 'Получаем данные Google Calendar';
      return;
    }

    if (status === 'success') {
      label.textContent = 'Синхронизировано';
      time.textContent = `${formatDateTime(data.time)}${data.count != null ? ` · ${data.count} событий` : ''}`;
      return;
    }

    if (status === 'error') {
      label.textContent = 'Ошибка синхронизации';
      time.textContent = formatDateTime(data.time);
      return;
    }

    if (status === 'disconnected') {
      label.textContent = 'Google не подключён';
      time.textContent = 'Синхронизация недоступна';
      return;
    }

    label.textContent = 'Не синхронизировано';
    time.textContent = 'Нажмите кнопку синхронизации';
  }

  function install() {
    const actions = $('.app-header .header-actions');
    if (!actions) return false;
    if ($('#pmkHeaderSync')) return true;

    const panel = document.createElement('div');
    panel.id = 'pmkHeaderSync';
    panel.className = 'pmk-header-sync';
    panel.innerHTML = `
      <button type="button" id="pmkSyncButton" class="pmk-sync-button" aria-label="Синхронизировать Google Calendar">
        <span class="pmk-sync-icon" aria-hidden="true">↻</span>
        <span class="pmk-sync-button-text">Синхронизация</span>
      </button>
      <div class="pmk-sync-info" aria-live="polite">
        <strong id="pmkSyncStatus">Не синхронизировано</strong>
        <small id="pmkSyncTime">Нажмите кнопку синхронизации</small>
      </div>`;

    actions.insertBefore(panel, actions.firstChild);

    const saved = readSaved();
    if (saved?.status === 'success' || saved?.status === 'error') render(saved.status, saved);
    else render('idle');

    $('#pmkSyncButton').addEventListener('click', async () => {
      if (syncing) return;
      const hasToken = typeof state !== 'undefined' && Boolean(state?.token);
      if (!hasToken) {
        const failed = saveStatus('error', { message: 'Google Calendar не подключён' });
        render('disconnected', failed);
        if (typeof showToast === 'function') showToast('Сначала подключите Google Calendar.', 'error');
        return;
      }

      manualSync = true;
      syncing = true;
      render('syncing');
      try {
        const sync = window.PMK_FULL_CALENDAR_SYNC?.refresh;
        if (typeof sync !== 'function') throw new Error('Модуль синхронизации недоступен');
        await sync();
      } catch (error) {
        const failed = saveStatus('error', { message: error?.message || String(error) });
        render('error', failed);
        syncing = false;
        manualSync = false;
      }
    });

    window.addEventListener('pmk-calendar-sync-start', () => {
      syncing = true;
      render('syncing');
    });

    window.addEventListener('pmk-calendar-sync-progress', event => {
      render('syncing', { count: Number(event.detail?.count || 0) });
    });

    window.addEventListener('pmk-calendar-sync-done', event => {
      const success = saveStatus('success', { count: Number(event.detail?.count || 0), manual: manualSync });
      render('success', success);
      syncing = false;
      manualSync = false;
    });

    window.addEventListener('pmk-calendar-sync-error', event => {
      const failed = saveStatus('error', { message: event.detail?.message || 'Неизвестная ошибка', manual: manualSync });
      render('error', failed);
      syncing = false;
      manualSync = false;
    });

    window.addEventListener('online', () => {
      const savedOnline = readSaved();
      if (savedOnline?.status === 'success' || savedOnline?.status === 'error') render(savedOnline.status, savedOnline);
    });

    window.addEventListener('offline', () => {
      const savedOffline = readSaved();
      if (savedOffline?.status === 'success') {
        render('success', savedOffline);
        $('#pmkSyncTime').textContent += ' · сейчас нет сети';
      } else {
        render('error', { time: nowIso() });
        $('#pmkSyncTime').textContent = 'Нет подключения к интернету';
      }
    });

    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 100) clearInterval(timer);
    }, 50);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
//# sourceURL=header-sync-status-v65.js

/* ===== reminder-save-confirm-v66.js ===== */
'use strict';

(() => {
  if (window.PMK_REMINDER_SAVE_CONFIRM_V66) return;
  window.PMK_REMINDER_SAVE_CONFIRM_V66 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let saving = false;

  function formatReminderDate(dateKey, time) {
    if (!dateKey) return '';
    const date = new Date(`${dateKey}T12:00:00`);
    const dateText = Number.isNaN(date.getTime())
      ? dateKey
      : new Intl.DateTimeFormat('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(date);
    return `${dateText} в ${time || '—'}`;
  }

  function ensureDialog() {
    let dialog = $('#pmkReminderConfirmDialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'pmkReminderConfirmDialog';
    dialog.className = 'pmk-reminder-confirm-dialog';
    dialog.innerHTML = `
      <form method="dialog" class="pmk-reminder-confirm-card">
        <div class="pmk-reminder-confirm-icon">✓</div>
        <h2>Добавить напоминание?</h2>
        <p id="pmkReminderConfirmText"></p>
        <div class="pmk-reminder-confirm-actions">
          <button type="button" id="pmkReminderConfirmCancel" class="button button-secondary">Отмена</button>
          <button type="button" id="pmkReminderConfirmSave" class="button button-primary">Добавить в календарь</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);

    $('#pmkReminderConfirmCancel', dialog).addEventListener('click', () => {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    });

    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    });

    return dialog;
  }

  function readData() {
    return {
      date: $('#reminderDate')?.value || '',
      time: $('#reminderTime')?.value || '',
      duration: Number($('#reminderDuration')?.value || 30),
      text: $('#reminderText')?.value?.trim() || '',
    };
  }

  function validate(data) {
    const fields = [
      ['#reminderDate', data.date],
      ['#reminderTime', data.time],
      ['#reminderText', data.text],
    ];
    fields.forEach(([selector, value]) => $(selector)?.classList.toggle('invalid', !value));
    if (fields.some(([, value]) => !value)) {
      if (typeof showToast === 'function') showToast('Заполните дату, время и текст напоминания.', 'error');
      return false;
    }
    return true;
  }

  function updateButtonText() {
    const button = $('#pmkReminderSaveButton');
    if (!button) return;
    const connected = typeof state !== 'undefined' && Boolean(state?.token);
    button.textContent = connected ? 'Добавить в Google Calendar' : 'Сохранить напоминание';
  }

  async function confirmAndSave(data, dialog) {
    if (saving) return;
    saving = true;
    const confirmButton = $('#pmkReminderConfirmSave', dialog);
    const mainButton = $('#pmkReminderSaveButton');
    if (confirmButton) {
      confirmButton.disabled = true;
      confirmButton.textContent = 'Сохраняем…';
    }
    if (mainButton) mainButton.disabled = true;

    try {
      if (typeof saveReminder !== 'function') throw new Error('Функция сохранения напоминания недоступна.');
      await saveReminder(data);
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      if (typeof showToast === 'function') {
        const connected = typeof state !== 'undefined' && Boolean(state?.token);
        showToast(connected ? 'Напоминание добавлено в Google Calendar.' : 'Напоминание сохранено на устройстве.', 'success');
      }
    } catch (error) {
      if (typeof showToast === 'function') showToast(error?.message || 'Не удалось сохранить напоминание.', 'error');
    } finally {
      saving = false;
      if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = 'Добавить в календарь';
      }
      if (mainButton) mainButton.disabled = false;
      updateButtonText();
    }
  }

  function openConfirmation(data) {
    const dialog = ensureDialog();
    const summary = $('#pmkReminderConfirmText', dialog);
    const connected = typeof state !== 'undefined' && Boolean(state?.token);
    if (summary) {
      summary.innerHTML = `
        <strong>${formatReminderDate(data.date, data.time)}</strong>
        <span>${data.text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))}</span>
        <small>${connected ? 'Будет добавлено в Google Calendar' : 'Google не подключён — сохранится на устройстве'}</small>`;
    }

    const saveButton = $('#pmkReminderConfirmSave', dialog);
    saveButton.onclick = () => confirmAndSave(data, dialog);

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function install() {
    const form = $('#reminderForm');
    if (!form) return false;
    if (form.dataset.pmkReminderConfirm === '1') return true;
    form.dataset.pmkReminderConfirm = '1';

    const actions = $('.form-actions', form) || (() => {
      const element = document.createElement('div');
      element.className = 'form-actions';
      form.appendChild(element);
      return element;
    })();

    let button = $('button[type="submit"]', actions);
    if (!button) {
      button = document.createElement('button');
      button.type = 'submit';
      button.className = 'button button-primary';
      actions.appendChild(button);
    }
    button.id = 'pmkReminderSaveButton';
    button.classList.add('pmk-reminder-save-button');
    updateButtonText();

    if (!$('#pmkReminderSaveHint', form)) {
      const hint = document.createElement('p');
      hint.id = 'pmkReminderSaveHint';
      hint.className = 'pmk-reminder-save-hint';
      hint.textContent = 'После нажатия появится подтверждение даты, времени и текста напоминания.';
      actions.insertBefore(hint, button);
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const data = readData();
      if (!validate(data)) return;
      openConfirmation(data);
    }, true);

    window.addEventListener('pmk-calendar-sync-done', updateButtonText);
    $('#connectGoogleBtn')?.addEventListener('click', () => setTimeout(updateButtonText, 1200));
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 100) clearInterval(timer);
    }, 50);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
//# sourceURL=reminder-save-confirm-v66.js

/* ===== manager-workspace-fast-v68.js ===== */
'use strict';

(() => {
  if (window.PMK_MANAGER_WORKSPACE_FAST_V68) return;
  window.PMK_MANAGER_WORKSPACE_FAST_V68 = true;

  const DRAFTS_KEY = 'pmk-manual-drafts-v66';
  const AUTO_DRAFT_KEY = 'pmk-form-autodraft-v1';
  const SMART_KEY = 'pmk-smart-paste-draft-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clean = value => String(value || '').trim();
  const unique = values => [...new Set((values || []).filter(Boolean))];
  const money = value => new Intl.NumberFormat('ru-RU').format(Math.round(Number(value || 0))) + ' ₽';

  function readDrafts() {
    try {
      const value = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function autoDraft() {
    try {
      const value = JSON.parse(localStorage.getItem(AUTO_DRAFT_KEY) || 'null');
      return value?.data ? { id: 'auto', savedAt: Number(value.savedAt || 0), data: value.data, automatic: true } : null;
    } catch { return null; }
  }

  function allDrafts() {
    const items = readDrafts();
    const automatic = autoDraft();
    if (automatic) items.push(automatic);
    return items.sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
  }

  function writeDrafts(items) {
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(items.slice(0, 100))); } catch {}
    updateDraftCount();
  }

  function formatSavedAt(value) {
    if (!value) return 'Время не указано';
    return new Intl.DateTimeFormat('ru-RU', {
      day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit',
    }).format(new Date(value)).replace(',', ' ·');
  }

  function updateDraftCount() {
    const badge = $('#draftsCount');
    if (badge) badge.textContent = String(allDrafts().length);
  }

  function saveManualDraft() {
    const data = getFormData();
    const form = $('#requestForm');
    const activeId = form?.dataset.activeDraftId || data.pmkId || makeId();
    const item = { id: activeId, savedAt: Date.now(), data: { ...data, eventId:'', pmkId:data.pmkId || makeId() } };
    writeDrafts([item, ...readDrafts().filter(entry => entry.id !== activeId)]);
    if (form) form.dataset.activeDraftId = activeId;
    try { localStorage.removeItem(AUTO_DRAFT_KEY); } catch {}
    $('#v50DraftNotice')?.remove();
    $('#pmkDraftRestore')?.remove();
    showToast('Черновик сохранён в разделе «Черновики».', 'success');
  }

  function restoreDraft(item) {
    if (!item?.data) return;
    fillForm({ ...item.data, eventId:'', pmkId:item.data.pmkId || makeId() });
    $('#eventId').value = '';
    $('#deleteEventBtn')?.classList.add('hidden');
    $('#formTitle').textContent = item.automatic ? 'Новая заявка — автосохранение' : 'Новая заявка — черновик';
    $('#requestForm').dataset.activeDraftId = item.automatic ? '' : item.id;
    setView('form');
    showToast('Черновик открыт.', 'success');
  }

  function deleteDraft(id) {
    if (!confirm('Удалить этот черновик?')) return;
    if (id === 'auto') {
      try { localStorage.removeItem(AUTO_DRAFT_KEY); } catch {}
    } else {
      writeDrafts(readDrafts().filter(item => item.id !== id));
    }
    renderDrafts();
    updateDraftCount();
  }

  function renderDrafts() {
    const container = $('#pmkDraftList');
    if (!container) return;
    const items = allDrafts();
    container.innerHTML = items.length ? items.map(item => {
      const data = item.data || {};
      const address = [data.street, data.houseNumber && `д. ${data.houseNumber}`].filter(Boolean).join(', ') || data.district || 'Адрес не указан';
      return `<article class="pmk-draft-card">
        <div class="pmk-draft-main"><div class="pmk-draft-label">${item.automatic ? 'Автосохранение' : 'Черновик'}</div><strong>${escapeHtml(data.customerName || 'Клиент не указан')}</strong><span>${escapeHtml(address)}</span><small>${escapeHtml(formatSavedAt(item.savedAt))}${data.estimatedPrice ? ` · ${escapeHtml(money(data.estimatedPrice))}` : ''}</small></div>
        <div class="pmk-draft-actions"><button type="button" class="button button-primary" data-draft-open="${escapeHtml(item.id)}">Открыть</button><button type="button" class="button button-danger" data-draft-delete="${escapeHtml(item.id)}">Удалить</button></div>
      </article>`;
    }).join('') : '<div class="empty-state"><strong>Черновиков нет.</strong><br>Нажмите «Черновик» в новой заявке, чтобы сохранить её здесь.</div>';
    $$('[data-draft-open]', container).forEach(button => button.addEventListener('click', () => restoreDraft(items.find(item => item.id === button.dataset.draftOpen))));
    $$('[data-draft-delete]', container).forEach(button => button.addEventListener('click', () => deleteDraft(button.dataset.draftDelete)));
  }

  function createDraftView() {
    if ($('#view-drafts')) return;
    const main = $('.main-content');
    if (!main) return;
    const section = document.createElement('section');
    section.id = 'view-drafts';
    section.className = 'view';
    section.innerHTML = '<div class="page-heading compact"><div><p class="eyebrow">Незавершённые заявки</p><h1>Черновики</h1><p>Откройте, продолжите или удалите сохранённую заявку.</p></div><button type="button" class="button button-primary" data-workspace-action="new">＋ Новая заявка</button></div><div id="pmkDraftList" class="pmk-draft-list"></div>';
    main.append(section);

    const nav = document.createElement('button');
    nav.className = 'nav-item nav-drafts';
    nav.dataset.view = 'drafts';
    nav.innerHTML = '<span>Черновики</span><b id="draftsCount">0</b>';
    const reminder = $('.nav-item.nav-reminder');
    reminder?.insertAdjacentElement('afterend', nav);
    nav.addEventListener('click', () => { setView('drafts'); renderDrafts(); });
  }

  function clearSmartPaste() {
    const source = $('#smartPasteInput');
    if (source) {
      source.value = '';
      source.dispatchEvent(new Event('input', { bubbles:true }));
    }
    const mirror = $('#pmkClientInfoMirrorInput');
    if (mirror) mirror.value = '';
    const result = $('#smartPasteResult');
    if (result) { result.className = 'smart-paste-result'; result.innerHTML = ''; }
    try { localStorage.removeItem(SMART_KEY); } catch {}
  }

  function clearUnfinishedRequest() {
    const id = $('#eventId')?.value || '';
    if (id) {
      deleteEvent(id);
      return;
    }
    if (!confirm('Удалить незавершённую заявку и очистить все данные?')) return;
    const form = $('#requestForm');
    const activeId = form?.dataset.activeDraftId;
    if (activeId) writeDrafts(readDrafts().filter(item => item.id !== activeId));
    try {
      localStorage.removeItem(AUTO_DRAFT_KEY);
      localStorage.removeItem(SMART_KEY);
    } catch {}
    if (form) form.dataset.activeDraftId = '';
    resetForm();
    clearSmartPaste();
    const search = $('#clientQuickSearch');
    if (search) search.value = '';
    pmkCloseClientResults?.();
    $('#v50DraftNotice')?.remove();
    $('#pmkDraftRestore')?.remove();
    document.body.classList.remove('v50-modal-active');
    $$('.v50-editor-open').forEach(node => node.classList.remove('v50-editor-open'));
    form?.dispatchEvent(new Event('input', { bubbles:true }));
    form?.dispatchEvent(new Event('change', { bubbles:true }));
    schedulePreviewUpdate();
    setView('form');
    updateDraftCount();
    showToast('Незавершённая заявка полностью удалена.', 'success');
  }

  function wireDraftAndDeleteButtons() {
    const oldDraft = $('#saveDraftBtn');
    if (oldDraft && oldDraft.dataset.fastDraft !== '68') {
      const button = oldDraft.cloneNode(true);
      button.dataset.fastDraft = '68';
      button.textContent = 'Черновик';
      oldDraft.replaceWith(button);
      button.addEventListener('click', saveManualDraft);
    }

    const sticky = $('#v50StickyActions');
    if (sticky && !$('.pmk-clear-request', sticky)) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'pmk-clear-request';
      clear.textContent = 'Удалить';
      clear.addEventListener('click', clearUnfinishedRequest);
      sticky.insertBefore(clear, $('.v50-submit', sticky) || null);
    }

    const actions = $('.form-actions');
    if (actions && !$('.pmk-clear-request-inline', actions)) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'button button-danger pmk-clear-request-inline';
      clear.textContent = 'Удалить';
      clear.addEventListener('click', clearUnfinishedRequest);
      actions.insertBefore(clear, $('#saveDraftBtn'));
    }
  }

  function ensureForm(reset = false) {
    if (state.currentView !== 'form') {
      if (reset) resetForm();
      setView('form');
    }
  }

  function openEditor(type) {
    $(`#v50Summary [data-v50-open="${type}"]`)?.click();
  }

  function showNextStep(message, actions = []) {
    const panel = $('#pmkLaunchpadNext');
    if (!panel) return;
    panel.innerHTML = `<strong>${escapeHtml(message)}</strong><div>${actions.map(action => `<button type="button" data-workspace-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>`).join('')}</div>`;
    panel.classList.remove('hidden');
  }

  function runAction(action) {
    if (action === 'new') { resetForm(); clearSmartPaste(); setView('form'); $('#customerName')?.focus(); return; }
    if (action === 'paste') { ensureForm(state.currentView !== 'form'); requestAnimationFrame(() => { $('#smartPasteInput')?.scrollIntoView({ behavior:'smooth', block:'center' }); $('#smartPasteInput')?.focus(); }); return; }
    if (action === 'client') { ensureForm(state.currentView !== 'form'); requestAnimationFrame(() => { openEditor('client'); setTimeout(() => $('#clientQuickSearch')?.focus(), 80); }); return; }
    if (action === 'slots') return openSlotExplorer();
    if (action === 'price' || action === 'calculate') return openCalculator();
    if (action === 'drafts') { setView('drafts'); renderDrafts(); }
  }

  function createLaunchpad() {
    if ($('#pmkManagerLaunchpad')) return;
    const main = $('.main-content');
    if (!main) return;
    const panel = document.createElement('section');
    panel.id = 'pmkManagerLaunchpad';
    panel.className = 'pmk-manager-launchpad';
    panel.innerHTML = '<div class="pmk-launchpad-title"><div><span>Быстрый старт</span><strong>Что нужно сделать сейчас?</strong></div></div><nav class="pmk-launchpad-actions"><button type="button" data-workspace-action="paste"><b>Вставить</b><small>Разобрать текст клиента</small></button><button type="button" data-workspace-action="client"><b>Найти клиента</b><small>История и прошлые заказы</small></button><button type="button" data-workspace-action="slots"><b>Выбрать окно</b><small>Районы, время и загрузка</small></button><button type="button" data-workspace-action="calculate"><b>Рассчитать</b><small>Калькулятор без заявки</small></button><button type="button" data-workspace-action="drafts"><b>Черновики</b><small>Продолжить заполнение</small></button></nav><div id="pmkLaunchpadNext" class="pmk-launchpad-next hidden"></div>';
    main.insertBefore(panel, main.querySelector('.view'));
  }

  function slotEvents(dateKey, start, end, district) {
    return getAllEvents().filter(event => {
      const data = eventMeta(event);
      const range = comparableEventRange(event);
      return eventDateKey(event) === dateKey && clean(data.district).toLowerCase() === clean(district).toLowerCase() && range.start === `${dateKey}T${start}` && range.end === `${dateKey}T${end}`;
    });
  }

  function allSlots(days = 21) {
    const result = [];
    const today = businessTodayKey();
    for (let offset = 0; offset < days; offset += 1) {
      const dateKey = addDaysToKey(today, offset);
      const weekday = dateKeyForDisplay(dateKey).getUTCDay();
      (PICKUP_SCHEDULE[weekday] || []).forEach(([start, end, district, note = '']) => result.push({ dateKey, start, end, district, note, events:slotEvents(dateKey, start, end, district) }));
    }
    return result;
  }

  function dateLabel(dateKey) {
    return dateKeyForDisplay(dateKey).toLocaleDateString('ru-RU', { weekday:'short', day:'numeric', month:'short', timeZone:'UTC' });
  }

  function createSlotDialog() {
    let dialog = $('#pmkSlotExplorer');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'pmkSlotExplorer';
    dialog.className = 'pmk-workspace-dialog pmk-slot-dialog';
    dialog.innerHTML = '<div class="pmk-dialog-shell"><header><div><span>Планирование маршрута</span><h2>Выберите окно для клиента</h2><p>Показаны районы, время и уже поставленные заявки.</p></div><button type="button" data-dialog-close>×</button></header><div class="pmk-slot-filters"><select id="pmkSlotDistrict"><option value="">Все районы</option></select><label><input type="checkbox" id="pmkOnlyFreeSlots"> Только свободные</label><button type="button" id="pmkRefreshSlots">Обновить загрузку</button></div><div id="pmkSlotResults" class="pmk-slot-results"></div></div>';
    document.body.append(dialog);
    $('[data-dialog-close]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    $('#pmkSlotDistrict', dialog).addEventListener('change', renderSlotExplorer);
    $('#pmkOnlyFreeSlots', dialog).addEventListener('change', renderSlotExplorer);
    $('#pmkRefreshSlots', dialog).addEventListener('click', renderSlotExplorer);
    return dialog;
  }

  function renderSlotExplorer() {
    const dialog = createSlotDialog();
    const select = $('#pmkSlotDistrict', dialog);
    if (!select.dataset.ready) {
      const districts = [...new Set(Object.values(PICKUP_SCHEDULE).flat().map(slot => slot[2]))];
      select.insertAdjacentHTML('beforeend', districts.map(value => `<option>${escapeHtml(value)}</option>`).join(''));
      select.dataset.ready = '1';
    }
    const district = select.value;
    const onlyFree = $('#pmkOnlyFreeSlots', dialog).checked;
    const items = allSlots().filter(item => (!district || item.district === district) && (!onlyFree || !item.events.length));
    const container = $('#pmkSlotResults', dialog);
    container.innerHTML = items.length ? items.map((item, index) => {
      const clients = item.events.map(event => eventMeta(event).customerName || event.summary || 'Клиент').slice(0, 5);
      return `<article class="pmk-slot-option ${item.events.length ? 'loaded' : 'free'}"><div><time>${escapeHtml(dateLabel(item.dateKey))}</time><strong>${escapeHtml(item.district)}</strong><b>${escapeHtml(item.start)}–${escapeHtml(item.end)}</b>${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}</div><div class="pmk-slot-load"><span>${item.events.length ? `${item.events.length} ${pluralPoints(item.events.length)} в окне` : 'Окно свободно'}</span><small>${clients.length ? clients.map(escapeHtml).join(', ') : 'Можно поставить первого клиента'}</small></div><button type="button" data-slot-index="${index}">Выбрать</button></article>`;
    }).join('') : '<div class="empty-state"><strong>Подходящих окон нет.</strong></div>';
    $$('[data-slot-index]', container).forEach(button => button.addEventListener('click', () => applySlot(items[Number(button.dataset.slotIndex)])));
  }

  function applySlot(item) {
    if (!item) return;
    ensureForm(state.currentView !== 'form');
    $('#district').value = item.district;
    $('#visitDate').value = item.dateKey;
    $('#startTime').value = item.start;
    $('#endTime').value = item.end;
    $('#timeNote').value = `Ждёт по расписанию: ${item.start}-${item.end}${item.note ? ` (${item.note})` : ''}`;
    updateScheduleSlotOptions(false);
    managerClearException?.();
    renderManagerSlotPlanner?.();
    schedulePreviewUpdate();
    $('#pmkSlotExplorer')?.close();
    showNextStep(`Выбрано: ${dateLabel(item.dateKey)}, ${item.district}, ${item.start}–${item.end}`, [{id:'paste',label:'Вставить данные клиента'},{id:'client',label:'Найти клиента'},{id:'calculate',label:'Рассчитать стоимость'}]);
    showToast('Окно перенесено в заявку.', 'success');
  }

  function openSlotExplorer() {
    const dialog = createSlotDialog();
    renderSlotExplorer();
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open','');
  }

  function calculatorRow(data = {}) {
    const services = new Set(data.services || []);
    return `<article class="pmk-calc-rug"><div class="pmk-calc-rug-head"><strong>Ковёр</strong><button type="button" data-calc-remove>Удалить</button></div><div class="pmk-calc-grid"><label>Длина, м<input type="number" min="0" max="20" step="0.1" class="calc-length" value="${Number(data.length || 0) || ''}"></label><label>Ширина, м<input type="number" min="0" max="20" step="0.1" class="calc-width" value="${Number(data.width || 0) || ''}"></label><label>Материал<select class="calc-material"><option value="">Выберите</option>${['Синтетика','Шерсть','Вискоза','Шёлк','Хлопок','Безворсный'].map(value => `<option ${data.material === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label>Ворс<select class="calc-pile"><option value="">Выберите</option>${['Без ворса','До 1 см','Более 1 см'].map(value => `<option ${data.pile === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label></div><div class="pmk-calc-services">${['Удаление пятен','Вычёсывание шерсти и волос','Удаление запаха мочи','Дезинфекция','Подъём ворса','Озонация','Кондиционер','Экспресс-стирка'].map(value => `<label><input type="checkbox" value="${value}" ${services.has(value) ? 'checked' : ''}><span>${value}</span></label>`).join('')}</div></article>`;
  }

  function createCalculator() {
    let dialog = $('#pmkQuickCalculator');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'pmkQuickCalculator';
    dialog.className = 'pmk-workspace-dialog pmk-calculator-dialog';
    dialog.innerHTML = '<div class="pmk-dialog-shell"><header><div><span>Быстрый расчёт</span><h2>Калькулятор стоимости</h2><p>Можно просто посчитать или перенести результат в заявку.</p></div><button type="button" data-dialog-close>×</button></header><div id="pmkCalcRugs" class="pmk-calc-rugs"></div><div class="pmk-calc-controls"><button type="button" id="pmkCalcAdd">＋ Добавить ковёр</button><label>Скидка, %<input id="pmkCalcDiscount" type="number" min="0" max="100" value="0"></label></div><div id="pmkCalcResult" class="pmk-calc-result"><strong>Заполните параметры ковра</strong></div><div class="pmk-calc-actions"><button type="button" id="pmkCalcRun" class="button button-secondary">Рассчитать</button><button type="button" id="pmkCalcApply" class="button button-primary">Перенести в заявку</button></div></div>';
    document.body.append(dialog);
    $('[data-dialog-close]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    $('#pmkCalcAdd', dialog).addEventListener('click', () => { $('#pmkCalcRugs', dialog).insertAdjacentHTML('beforeend', calculatorRow()); bindCalcRows(); });
    $('#pmkCalcRun', dialog).addEventListener('click', () => calculateQuick(true));
    $('#pmkCalcApply', dialog).addEventListener('click', applyQuick);
    let timer = 0;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => calculateQuick(false), 100); };
    dialog.addEventListener('input', schedule);
    dialog.addEventListener('change', schedule);
    return dialog;
  }

  function bindCalcRows() {
    $$('[data-calc-remove]', createCalculator()).forEach(button => {
      if (button.dataset.bound) return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        const rows = $$('.pmk-calc-rug', $('#pmkQuickCalculator'));
        if (rows.length <= 1) return showToast('Оставьте хотя бы один ковёр.', 'error');
        button.closest('.pmk-calc-rug').remove();
        calculateQuick(false);
      });
    });
  }

  function calculatorData() {
    return $$('.pmk-calc-rug', createCalculator()).map(row => ({
      length:Number($('.calc-length', row).value || 0), width:Number($('.calc-width', row).value || 0),
      material:$('.calc-material', row).value, pile:$('.calc-pile', row).value,
      issues:[], services:$$('input[type="checkbox"]:checked', row).map(input => input.value),
    }));
  }

  function quickTotal() {
    const price = window.PMK_PRICING_V48?.priceTable?.();
    const rugs = calculatorData();
    const errors = [];
    const lines = [];
    let subtotal = 0;
    let express = false;
    rugs.forEach((rug, index) => {
      const area = rug.length * rug.width;
      const rate = price ? window.PMK_PRICING_V48.baseRate(rug) : 0;
      if (!(rug.length > 0 && rug.width > 0)) errors.push(`Ковёр ${index + 1}: укажите размеры`);
      if (!rug.material || !rate) errors.push(`Ковёр ${index + 1}: выберите материал и ворс`);
      if (!(area > 0 && rate)) return;
      const base = Math.round(area * rate);
      subtotal += base;
      lines.push(`Ковёр ${index + 1}: ${area.toFixed(2).replace('.00','')} м² × ${rate} ₽ = ${money(base)}`);
      const fixed = (name, amount) => { if (rug.services.includes(name)) { subtotal += amount; lines.push(`${name}: ${money(amount)}`); } };
      const byArea = (name, amount) => { if (rug.services.includes(name)) { const value = Math.round(area * amount); subtotal += value; lines.push(`${name}: ${money(value)}`); } };
      fixed('Удаление пятен', price.stain); byArea('Вычёсывание шерсти и волос', price.hair);
      if (rug.services.includes('Удаление запаха мочи')) fixed('Удаление запаха мочи', area <= price.odorAreaThreshold ? price.odorSmall : price.odorLarge);
      fixed('Дезинфекция', price.disinfection); byArea('Подъём ворса', price.pileLift); fixed('Озонация', price.ozonation); fixed('Кондиционер', price.conditioner);
      if (rug.services.includes('Экспресс-стирка') && !express) { express = true; subtotal += price.express; lines.push(`Экспресс-стирка: ${money(price.express)}`); }
    });
    if (!price) errors.push('Прайс не загружен');
    const discount = Math.max(0, Math.min(100, Number($('#pmkCalcDiscount').value || 0)));
    const discounted = Math.round(subtotal * (100 - discount) / 100);
    const total = errors.length || !price ? 0 : Math.max(discounted, price.minimum);
    if (discount && subtotal) lines.push(`Скидка ${discount}%: −${money(subtotal - discounted)}`);
    if (price && total > discounted) lines.push(`Минимальный заказ: ${money(price.minimum)}`);
    if (total) lines.push(`Итого: ${money(total)}`);
    return { rugs, errors:unique(errors), lines, total, discount };
  }

  function calculateQuick(notify = true) {
    const data = quickTotal();
    const result = $('#pmkCalcResult');
    result.className = `pmk-calc-result ${data.errors.length ? 'warning' : 'success'}`;
    result.innerHTML = data.errors.length ? `<strong>Нужно заполнить данные</strong><span>${data.errors.map(escapeHtml).join('<br>')}</span>` : `<strong>${money(data.total)}</strong><span>${data.lines.map(escapeHtml).join('<br>')}</span>`;
    if (notify) showNextStep(data.errors.length ? 'Дополните параметры ковров.' : `Стоимость рассчитана: ${money(data.total)}`, [{id:'calculate',label:'Продолжить расчёт'},{id:'paste',label:'Заполнить заявку'},{id:'slots',label:'Выбрать окно'}]);
    return data;
  }

  function applyQuick() {
    const calculated = calculateQuick(false);
    if (calculated.errors.length) return showToast('Сначала заполните недостающие параметры.', 'error');
    ensureForm(state.currentView !== 'form');
    const current = getFormData();
    fillForm({ ...current, rugs:calculated.rugs, estimatedPrice:calculated.total, discount:calculated.discount, autoPrice:true, eventId:current.eventId, pmkId:current.pmkId });
    const toggle = $('#autoPrice');
    if (toggle) toggle.checked = true;
    window.PMK_PRICING_V48?.calculatePrice?.();
    $('#pmkQuickCalculator')?.close();
    showNextStep(`Расчёт ${money(calculated.total)} перенесён в заявку.`, [{id:'paste',label:'Добавить клиента'},{id:'client',label:'Найти клиента'},{id:'slots',label:'Выбрать окно'}]);
    showToast('Расчёт перенесён в заявку.', 'success');
  }

  function openCalculator() {
    const dialog = createCalculator();
    const current = state.currentView === 'form' ? getFormData() : null;
    $('#pmkCalcRugs', dialog).innerHTML = (current?.rugs?.length ? current.rugs : [{}]).map(calculatorRow).join('');
    $('#pmkCalcDiscount').value = Number(current?.discount || 0);
    bindCalcRows();
    calculateQuick(false);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open','');
  }

  function installDelegation() {
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-workspace-action], [data-v50-action]');
      if (!target) return;
      const action = target.dataset.workspaceAction || target.dataset.v50Action;
      if (!['new','paste','client','slots','price','calculate','drafts'].includes(action)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      runAction(action);
    }, true);
  }

  function install() {
    createDraftView();
    createLaunchpad();
    wireDraftAndDeleteButtons();
    updateDraftCount();
    return Boolean($('#pmkManagerLaunchpad') && $('#view-drafts'));
  }

  window.PMK_MANAGER_WORKSPACE_FAST_V68_API = { openSlotExplorer, openCalculator, renderDrafts, saveManualDraft, clearUnfinishedRequest };
  installDelegation();
  const start = () => requestAnimationFrame(() => { if (!install()) setTimeout(install, 200); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
//# sourceURL=manager-workspace-fast-v68.js

/* ===== yandex-calendar-sync-v69.js ===== */
'use strict';

(() => {
  if (window.PMK_YANDEX_CALENDAR_SYNC_V69) return;
  window.PMK_YANDEX_CALENDAR_SYNC_V69 = true;

  const CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const CACHE_KEY = 'pmk-yandex-calendar-cache-v1';
  const DEFAULT_API_URL = 'https://lucky-math-8e63pmk-address.standart-media.workers.dev/calendar';
  const YANDEX_ID_PREFIX = 'local-yandex-';

  const previous = {
    refreshEvents,
    saveRequest,
    updateEventStatus,
    updateEventContract,
    deleteEvent,
    saveReminder,
    updateConnectionUI,
  };

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function loadConfig() {
    return {
      enabled: true,
      apiUrl: DEFAULT_API_URL,
      syncToken: '',
      ...readJson(CONFIG_KEY, {}),
    };
  }

  let config = loadConfig();
  let yandexOnline = false;
  let yandexEvents = readJson(CACHE_KEY, []);
  let activeRefresh = null;

  function saveConfig(next = config) {
    config = {
      enabled: Boolean(next.enabled),
      apiUrl: String(next.apiUrl || DEFAULT_API_URL).trim().replace(/\/+$/, ''),
      syncToken: String(next.syncToken || '').trim(),
    };
    writeJson(CONFIG_KEY, config);
    updateConnectionUI();
    renderYandexStatus();
  }

  function isConfigured() {
    return Boolean(config.enabled && config.apiUrl && config.syncToken);
  }

  function queueItems() {
    return readJson(QUEUE_KEY, []);
  }

  function saveQueue(items) {
    writeJson(QUEUE_KEY, items.slice(-300));
    renderYandexStatus();
  }

  function enqueue(provider, op, data) {
    const pmkId = String(data?.pmkId || '');
    if (!pmkId) return;
    const items = queueItems().filter(item => !(item.provider === provider && item.pmkId === pmkId));
    items.push({ provider, op, pmkId, data: op === 'upsert' ? data : null, savedAt: new Date().toISOString() });
    saveQueue(items);
  }

  function removeQueued(provider, pmkId) {
    saveQueue(queueItems().filter(item => !(item.provider === provider && item.pmkId === pmkId)));
  }

  function errorMessage(error, fallback = 'Ошибка синхронизации') {
    return String(error?.message || fallback).replace(/^Error:\s*/i, '');
  }

  async function yandexRequest(path, options = {}) {
    if (!isConfigured()) throw new Error('Яндекс.Календарь ещё не настроен.');
    const response = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.syncToken}`,
        ...(options.headers || {}),
      },
      cache: 'no-store',
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; }
    catch { payload = text ? { error: text } : null; }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('Яндекс: неверный ключ синхронизации.');
      throw new Error(payload?.error || `Яндекс.Календарь: ошибка ${response.status}`);
    }
    return payload;
  }

  function pmkDataOf(event) {
    try { return decodePmkData(event) || event?.pmkData || null; }
    catch { return event?.pmkData || null; }
  }

  function pmkIdOf(event) {
    return String(pmkDataOf(event)?.pmkId || event?._pmkId || '').trim();
  }

  function normalizeYandexEvent(event) {
    const data = event?.pmkData || null;
    if (!data?.pmkId) return null;
    const normalized = {
      ...event,
      id: `${YANDEX_ID_PREFIX}${data.pmkId}`,
      _provider: 'yandex',
      _pmkId: data.pmkId,
      htmlLink: event.htmlLink || 'https://calendar.yandex.ru/',
    };
    normalized.extendedProperties = { private: encodePmkData(data) };
    return normalized;
  }

  function mergeProviderEvents(googleSource = [], yandexSource = []) {
    const pending = queueItems();
    const pendingGoogleUpserts = new Set(pending.filter(item => item.provider === 'google' && item.op === 'upsert').map(item => item.pmkId));
    const deletedPmkIds = new Set(pending.filter(item => item.op === 'delete').map(item => item.pmkId));
    const result = new Map();
    const add = (event, provider) => {
      if (!event) return;
      const pmkId = pmkIdOf(event);
      const key = pmkId ? `pmk:${pmkId}` : `${provider}:${event.id}`;
      const existing = result.get(key);
      if (!existing) {
        result.set(key, { ...event, _providers: [provider] });
        return;
      }
      const providers = [...new Set([...(existing._providers || []), provider])];
      if (provider === 'google' && !pendingGoogleUpserts.has(pmkId)) result.set(key, { ...event, _providers: providers, _yandexMirror: true });
      else result.set(key, { ...existing, _providers: providers, _yandexMirror: true });
    };
    yandexSource.forEach(event => add(event, 'yandex'));
    googleSource.forEach(event => add(event, 'google'));
    return [...result.values()]
      .filter(event => !deletedPmkIds.has(pmkIdOf(event)))
      .sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0));
  }

  async function fetchYandexEvents() {
    const payload = await yandexRequest('/events?from=1970-01-01&to=2100-01-01');
    const events = (Array.isArray(payload?.events) ? payload.events : []).map(normalizeYandexEvent).filter(Boolean);
    yandexEvents = events;
    writeJson(CACHE_KEY, events);
    yandexOnline = true;
    window.dispatchEvent(new CustomEvent('pmk-yandex-sync-done', { detail: { count: events.length } }));
    return events;
  }

  function googleRemoteId(event) {
    const id = String(event?.id || '');
    if (!id || id.startsWith('local-')) return '';
    return id;
  }

  function findGoogleEventByPmkId(pmkId) {
    return (state.events || []).find(event => event?._provider !== 'yandex' && pmkIdOf(event) === pmkId && googleRemoteId(event));
  }

  async function upsertGoogle(data, preferredId = '') {
    if (!state.token) throw new Error('Google Calendar не подключён.');
    const body = toGoogleEvent(data);
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const currentId = preferredId && !preferredId.startsWith('local-') ? preferredId : (findGoogleEventByPmkId(data.pmkId)?.id || '');
    if (currentId) {
      return googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(currentId)}`, { method: 'PATCH', body: JSON.stringify(body) });
    }
    return googleRequest(`/calendars/${calendarId}/events`, { method: 'POST', body: JSON.stringify(body) });
  }

  async function deleteGoogle(pmkId, preferredId = '') {
    if (!state.token) throw new Error('Google Calendar не подключён.');
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const currentId = preferredId && !preferredId.startsWith('local-') ? preferredId : (findGoogleEventByPmkId(pmkId)?.id || '');
    if (!currentId) return null;
    return googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(currentId)}`, { method: 'DELETE' });
  }

  async function upsertYandex(data) {
    const payload = await yandexRequest(`/events/${encodeURIComponent(data.pmkId)}`, {
      method: 'PUT',
      body: JSON.stringify({ event: toGoogleEvent(data), pmkData: data }),
    });
    yandexOnline = true;
    removeQueued('yandex', data.pmkId);
    return payload;
  }

  async function deleteYandex(pmkId) {
    const payload = await yandexRequest(`/events/${encodeURIComponent(pmkId)}`, { method: 'DELETE' });
    yandexOnline = true;
    removeQueued('yandex', pmkId);
    return payload;
  }

  async function flushQueue() {
    let items = queueItems();
    if (!items.length) return { completed: 0, remaining: 0 };
    let completed = 0;
    for (const item of [...items]) {
      try {
        if (item.provider === 'google' && state.token) {
          if (item.op === 'delete') await deleteGoogle(item.pmkId);
          else await upsertGoogle(item.data);
          removeQueued('google', item.pmkId);
          completed += 1;
        }
        if (item.provider === 'yandex' && isConfigured()) {
          if (item.op === 'delete') await deleteYandex(item.pmkId);
          else await upsertYandex(item.data);
          completed += 1;
        }
      } catch (error) {
        console.warn('PMK provider queue:', item.provider, item.op, error);
      }
    }
    items = queueItems();
    return { completed, remaining: items.length };
  }

  async function providerRefresh() {
    if (activeRefresh) return activeRefresh;
    activeRefresh = (async () => {
      const googleBefore = (state.events || []).filter(event => event?._provider !== 'yandex');
      state.events = googleBefore;
      try { await previous.refreshEvents(); } catch (error) { console.warn('Google refresh:', error); }
      let googleEvents = (state.events || []).filter(event => event?._provider !== 'yandex');
      if (!googleEvents.length && googleBefore.length) googleEvents = googleBefore;

      if (isConfigured()) {
        try {
          await flushQueue();
          await fetchYandexEvents();
        } catch (error) {
          yandexOnline = false;
          window.dispatchEvent(new CustomEvent('pmk-yandex-sync-error', { detail: { message: errorMessage(error) } }));
          console.warn('Yandex refresh:', error);
        }
      }

      state.events = mergeProviderEvents(googleEvents, yandexEvents);
      window.PMK_EVENTS_REVISION = Number(window.PMK_EVENTS_REVISION || 0) + 1;
      invalidateEventCaches();
      renderAll();
      checkUpcomingNotifications();
      updateConnectionUI();
      renderYandexStatus();
      return state.events;
    })().finally(() => { activeRefresh = null; });
    return activeRefresh;
  }

  function resultLabel(results) {
    const ok = results.filter(item => item.status === 'fulfilled').map(item => item.provider);
    const failed = results.filter(item => item.status === 'rejected').map(item => item.provider);
    if (ok.includes('Google') && ok.includes('Яндекс')) return { text: 'Заявка сохранена в Google и Яндекс.Календаре.', type: 'success' };
    if (ok.length && failed.length) return { text: `Заявка сохранена в ${ok.join(' и ')}. ${failed.join(' и ')} будет синхронизирован позже.`, type: 'error' };
    if (ok.length) return { text: `Заявка сохранена в ${ok.join(' и ')}.`, type: 'success' };
    return { text: 'Не удалось сохранить заявку во внешние календари.', type: 'error' };
  }

  async function saveRemoteData(data, preferredId = '') {
    const tasks = [];
    if (state.token) {
      tasks.push(upsertGoogle(data, preferredId)
        .then(value => ({ status: 'fulfilled', provider: 'Google', value }))
        .catch(reason => ({ status: 'rejected', provider: 'Google', reason })));
    } else {
      enqueue('google', 'upsert', data);
    }

    if (isConfigured()) {
      tasks.push(upsertYandex(data)
        .then(value => ({ status: 'fulfilled', provider: 'Яндекс', value }))
        .catch(reason => {
          enqueue('yandex', 'upsert', data);
          return { status: 'rejected', provider: 'Яндекс', reason };
        }));
    }

    const results = await Promise.all(tasks);
    return results;
  }

  saveRequest = async function saveRequestWithYandex(data, localOnly = false) {
    if (localOnly) return previous.saveRequest(data, true);
    if (!validateForm(data)) return;

    if (!state.token && !isConfigured()) return previous.saveRequest(data, false);

    const results = await saveRemoteData(data, data.eventId || '');
    const successes = results.filter(item => item.status === 'fulfilled');
    if (!successes.length && results.length) {
      const detail = results.map(item => errorMessage(item.reason)).join(' ');
      throw new Error(detail || 'Не удалось сохранить заявку.');
    }

    if (data.eventId?.startsWith('local-')) {
      state.localEvents = state.localEvents.filter(event => event.id !== data.eventId);
      persistLocalEvents();
    }

    const label = resultLabel(results);
    showToast(label.text, label.type);
    state.selectedDayKey = data.visitDate || state.selectedDayKey;
    state.periodAnchorKey = state.selectedDayKey;
    await providerRefresh();
    resetForm();
    setView(['three-days', 'week', 'month', 'delivery-waiting', 'search'].includes(state.returnView) ? state.returnView : 'day');
  };

  async function updateStructuredEvent(id, mutate, successText) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    const current = eventMeta(event);
    const data = mutate({ ...current, eventId: id, pmkId: current.pmkId || pmkIdOf(event) || makeId() });
    const results = await saveRemoteData(data, googleRemoteId(event));
    if (!results.some(item => item.status === 'fulfilled') && results.length) throw new Error(results.map(item => errorMessage(item.reason)).join(' '));
    showToast(successText, 'success');
    await providerRefresh();
  }

  updateEventStatus = async function updateEventStatusWithYandex(id, nextStatus) {
    if (id.startsWith('local-') && !id.startsWith(YANDEX_ID_PREFIX) && state.localEvents.some(item => item.id === id)) {
      return previous.updateEventStatus(id, nextStatus);
    }
    try {
      await updateStructuredEvent(id, data => ({ ...data, requestStatus: nextStatus }), `Статус: ${statusInfo(nextStatus).label}`);
    } catch (error) { showToast(errorMessage(error), 'error'); }
  };

  updateEventContract = async function updateEventContractWithYandex(id, contractNumber) {
    if (id.startsWith('local-') && !id.startsWith(YANDEX_ID_PREFIX) && state.localEvents.some(item => item.id === id)) {
      return previous.updateEventContract(id, contractNumber);
    }
    try {
      await updateStructuredEvent(id, data => ({ ...data, contractNumber: cleanShortField(contractNumber) }), 'Номер договора сохранён.');
    } catch (error) { showToast(errorMessage(error), 'error'); }
  };

  deleteEvent = async function deleteEventWithYandex(id) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    if (id.startsWith('local-') && !id.startsWith(YANDEX_ID_PREFIX) && state.localEvents.some(item => item.id === id)) return previous.deleteEvent(id);
    const data = eventMeta(event);
    const pmkId = data.pmkId || pmkIdOf(event);
    const name = data.customerName || 'эту заявку';
    if (!confirm(`Удалить заявку ${name}?`)) return;

    const tasks = [];
    if (state.token) tasks.push(deleteGoogle(pmkId, googleRemoteId(event)).catch(error => { enqueue('google', 'delete', { pmkId }); throw error; }));
    else enqueue('google', 'delete', { pmkId });
    if (isConfigured()) tasks.push(deleteYandex(pmkId).catch(error => { enqueue('yandex', 'delete', { pmkId }); throw error; }));
    else enqueue('yandex', 'delete', { pmkId });

    const settled = await Promise.allSettled(tasks);
    if (settled.length && settled.every(item => item.status === 'rejected')) {
      showToast('Удаление поставлено в очередь синхронизации.', 'error');
    } else {
      showToast('Заявка удалена. Недоступные календари обновятся позже.', 'success');
    }
    state.events = state.events.filter(item => pmkIdOf(item) !== pmkId);
    invalidateEventCaches();
    renderAll();
    resetForm();
    setView(state.returnView || 'day');
  };

  saveReminder = async function saveReminderWithYandex(data) {
    if (!isConfigured()) return previous.saveReminder(data);
    if (!data.date || !data.time || !data.text) return showToast('Заполните дату, время и текст напоминания.', 'error');
    const pmkId = `reminder-${makeId()}`;
    const reminderData = {
      version: 1,
      pmkId,
      eventId: '',
      visitType: 'reminder',
      customerName: data.text,
      phone: '',
      district: '',
      address: '',
      visitDate: data.date,
      startTime: data.time,
      endTime: addMinutesToTime(data.time, data.duration || 30),
      requestStatus: 'completed',
      rugs: [],
      estimatedPrice: 0,
      discount: 0,
      managerComment: data.text,
    };
    const eventBody = toReminderEvent(data);
    const tasks = [];
    if (state.token) {
      const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
      tasks.push(googleRequest(`/calendars/${calendarId}/events`, { method: 'POST', body: JSON.stringify(eventBody) }));
    } else enqueue('google', 'upsert', reminderData);
    tasks.push(yandexRequest(`/events/${encodeURIComponent(pmkId)}`, { method: 'PUT', body: JSON.stringify({ event: eventBody, pmkData: reminderData }) }));
    await Promise.allSettled(tasks);
    showToast('Напоминание сохранено в доступных календарях.', 'success');
    qs('#reminderForm').reset();
    qs('#reminderDate').value = state.selectedDayKey || businessTodayKey();
    await providerRefresh();
    setView(state.returnView || 'day');
  };

  updateConnectionUI = function updateConnectionUIWithYandex() {
    previous.updateConnectionUI();
    const google = Boolean(state.token);
    const yandex = Boolean(isConfigured() && yandexOnline);
    const yandexReady = Boolean(isConfigured());
    const badge = qs('#connectionBadge');
    if (badge) {
      if (google && yandex) badge.textContent = 'Google + Яндекс';
      else if (google && yandexReady) badge.textContent = 'Google + Яндекс настроен';
      else if (google) badge.textContent = 'Google подключён';
      else if (yandex) badge.textContent = 'Яндекс подключён';
      else if (yandexReady) badge.textContent = 'Яндекс настроен';
      else badge.textContent = 'Демо-режим';
      badge.className = `status-badge ${(google || yandexReady) ? 'online' : 'offline'}`;
    }
    const submit = qs('#submitBtn');
    if (submit && (google || yandexReady)) submit.textContent = qs('#eventId').value ? 'Обновить в календарях' : 'Создать в календарях';
  };

  refreshEvents = providerRefresh;
  if (window.PMK_FULL_CALENDAR_SYNC) window.PMK_FULL_CALENDAR_SYNC.refresh = providerRefresh;
  window.PMK_YANDEX_CALENDAR = {
    refresh: providerRefresh,
    test: () => yandexRequest('/health'),
    flushQueue,
    configured: isConfigured,
  };

  async function testConnection() {
    const button = document.querySelector('#pmkYandexTestBtn');
    if (button) button.disabled = true;
    try {
      const result = await yandexRequest('/health');
      yandexOnline = true;
      showToast(`Яндекс.Календарь подключён${result?.calendar ? `: ${result.calendar}` : ''}.`, 'success');
      await providerRefresh();
    } catch (error) {
      yandexOnline = false;
      showToast(errorMessage(error), 'error');
    } finally {
      if (button) button.disabled = false;
      updateConnectionUI();
      renderYandexStatus();
    }
  }

  async function backfillToYandex() {
    if (!isConfigured()) return showToast('Сначала настройте Яндекс.Календарь.', 'error');
    const source = (state.events || []).filter(event => event?._provider !== 'yandex').map(event => pmkDataOf(event)).filter(data => data?.pmkId);
    if (!source.length) return showToast('В Google Calendar не найдено заявок ПМК для переноса.', 'error');
    const button = document.querySelector('#pmkYandexBackfillBtn');
    if (button) button.disabled = true;
    let completed = 0;
    let failed = 0;
    for (const data of source) {
      try { await upsertYandex(data); completed += 1; }
      catch { enqueue('yandex', 'upsert', data); failed += 1; }
      const status = document.querySelector('#pmkYandexStatus');
      if (status) status.textContent = `Перенос: ${completed + failed} из ${source.length}`;
    }
    if (button) button.disabled = false;
    showToast(`Перенос в Яндекс: ${completed} успешно${failed ? `, ${failed} в очереди` : ''}.`, failed ? 'error' : 'success');
    await providerRefresh();
  }

  function injectSettings() {
    const settingsGrid = document.querySelector('#view-settings .settings-grid');
    if (!settingsGrid || document.querySelector('#pmkYandexSettings')) return;
    const card = document.createElement('section');
    card.id = 'pmkYandexSettings';
    card.className = 'form-card';
    card.innerHTML = `
      <h2>Яндекс.Календарь</h2>
      <p style="margin:0 0 14px;color:var(--muted,#777)">Заявки дублируются через защищённый Cloudflare Worker. Логин и пароль Яндекса в браузере не хранятся.</p>
      <label class="toggle-row"><input type="checkbox" id="pmkYandexEnabled"><span><strong>Дублировать заявки в Яндекс</strong><small>При недоступности одного календаря операция останется в очереди.</small></span></label>
      <label class="field">Адрес календарного Worker<input id="pmkYandexApiUrl" autocomplete="off" placeholder="https://...workers.dev/calendar"></label>
      <label class="field">Ключ синхронизации<input id="pmkYandexSyncToken" type="password" autocomplete="new-password" placeholder="Отдельный ключ PMK_SYNC_TOKEN"></label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
        <button type="button" id="pmkYandexTestBtn" class="button button-secondary">Проверить Яндекс</button>
        <button type="button" id="pmkYandexBackfillBtn" class="button button-secondary">Перенести заявки из Google</button>
      </div>
      <div id="pmkYandexStatus" class="info-box" style="margin-top:12px"></div>`;
    settingsGrid.appendChild(card);

    document.querySelector('#pmkYandexEnabled').checked = config.enabled;
    document.querySelector('#pmkYandexApiUrl').value = config.apiUrl;
    document.querySelector('#pmkYandexSyncToken').value = config.syncToken;
    document.querySelector('#pmkYandexTestBtn').addEventListener('click', testConnection);
    document.querySelector('#pmkYandexBackfillBtn').addEventListener('click', backfillToYandex);
    document.querySelector('#saveSettingsBtn')?.addEventListener('click', () => {
      saveConfig({
        enabled: document.querySelector('#pmkYandexEnabled').checked,
        apiUrl: document.querySelector('#pmkYandexApiUrl').value,
        syncToken: document.querySelector('#pmkYandexSyncToken').value,
      });
      showToast('Настройки Яндекс.Календаря сохранены.', 'success');
    });
    renderYandexStatus();
  }

  function renderYandexStatus() {
    const status = document.querySelector('#pmkYandexStatus');
    if (!status) return;
    const queued = queueItems().length;
    if (!config.enabled) {
      status.textContent = 'Дублирование в Яндекс отключено.';
      status.className = 'info-box';
    } else if (!config.syncToken) {
      status.textContent = 'Нужно указать ключ синхронизации и настроить секреты Worker.';
      status.className = 'info-box danger';
    } else if (yandexOnline) {
      status.textContent = `Яндекс.Календарь доступен${queued ? ` • в очереди: ${queued}` : ''}.`;
      status.className = 'info-box good';
    } else {
      status.textContent = `Яндекс настроен, соединение ещё не проверено${queued ? ` • в очереди: ${queued}` : ''}.`;
      status.className = 'info-box';
    }
  }

  function enhanceHeaderStatus() {
    const info = document.querySelector('#pmkSyncTime');
    if (!info) return;
    const queued = queueItems().length;
    if (isConfigured()) info.textContent = `${info.textContent.replace(/\s·\sЯндекс.*$/, '')} · Яндекс${yandexOnline ? ' ✓' : ' ожидает'}${queued ? ` · очередь ${queued}` : ''}`;
  }

  window.addEventListener('pmk-calendar-sync-done', () => setTimeout(enhanceHeaderStatus, 0));
  window.addEventListener('pmk-yandex-sync-done', () => setTimeout(enhanceHeaderStatus, 0));
  window.addEventListener('online', () => isConfigured() && providerRefresh());

  const boot = () => {
    injectSettings();
    updateConnectionUI();
    renderYandexStatus();
    if (isConfigured()) providerRefresh();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();

//# sourceURL=yandex-calendar-sync-v69.js

/* ===== provider-status-manager-v70.js ===== */
'use strict';

(() => {
  if (window.PMK_PROVIDER_STATUS_MANAGER_V70) return;
  window.PMK_PROVIDER_STATUS_MANAGER_V70 = true;

  const CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const GOOGLE_STATUS_KEY = 'pmk-calendar-sync-status-v1';
  const YANDEX_STATUS_KEY = 'pmk-yandex-provider-status-v1';
  const APP_URL = 'https://kivme1984.github.io/pmk-calendar/';
  const DEFAULT_WORKER_URL = 'https://lucky-math-8e63pmk-address.standart-media.workers.dev/calendar';

  const runtime = {
    google: 'idle',
    yandex: 'idle',
    googleMessage: '',
    yandexMessage: '',
  };

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function readJson(key, fallback = null) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function yandexConfig() {
    return {
      enabled: true,
      apiUrl: DEFAULT_WORKER_URL,
      syncToken: '',
      ...(readJson(CONFIG_KEY, {}) || {}),
    };
  }

  function yandexConfigured() {
    const config = yandexConfig();
    return Boolean(config.enabled && config.apiUrl && config.syncToken);
  }

  function queueCount(provider = '') {
    const items = readJson(QUEUE_KEY, []);
    if (!Array.isArray(items)) return 0;
    return provider ? items.filter(item => item?.provider === provider).length : items.length;
  }

  function timeLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date).replace(',', ' ·');
  }

  function providerSnapshot(provider) {
    if (provider === 'google') {
      const connected = typeof state !== 'undefined' && Boolean(state?.token);
      const saved = readJson(GOOGLE_STATUS_KEY, {}) || {};
      const queued = queueCount('google');
      if (runtime.google === 'syncing') return { state: 'syncing', text: 'Синхронизация…', detail: runtime.googleMessage || '' };
      if (!connected) return { state: queued ? 'warning' : 'offline', text: 'Не подключён', detail: queued ? `В очереди: ${queued}` : 'Нажмите для подключения' };
      if (runtime.google === 'error' || saved.status === 'error') return { state: 'error', text: 'Ошибка связи', detail: runtime.googleMessage || timeLabel(saved.time) };
      if (saved.status === 'success') return { state: queued ? 'warning' : 'success', text: queued ? 'Подключён, есть очередь' : 'Подключён', detail: `${timeLabel(saved.time)}${saved.count != null ? ` · ${saved.count}` : ''}` };
      return { state: queued ? 'warning' : 'success', text: 'Подключён', detail: queued ? `В очереди: ${queued}` : 'Ожидает первой синхронизации' };
    }

    const configured = yandexConfigured();
    const saved = readJson(YANDEX_STATUS_KEY, {}) || {};
    const queued = queueCount('yandex');
    if (runtime.yandex === 'syncing') return { state: 'syncing', text: 'Синхронизация…', detail: runtime.yandexMessage || '' };
    if (!configured) return { state: 'offline', text: 'Не настроен', detail: 'Откройте настройки' };
    if (runtime.yandex === 'error' || saved.status === 'error') return { state: 'error', text: 'Ошибка связи', detail: runtime.yandexMessage || saved.message || timeLabel(saved.time) };
    if (saved.status === 'success') return { state: queued ? 'warning' : 'success', text: queued ? 'Подключён, есть очередь' : 'Подключён', detail: `${timeLabel(saved.time)}${saved.count != null ? ` · ${saved.count}` : ''}` };
    return { state: queued ? 'warning' : 'pending', text: 'Настроен', detail: queued ? `В очереди: ${queued}` : 'Нужно проверить подключение' };
  }

  function cardHtml(provider, title, letter) {
    return `
      <button type="button" class="pmk-provider-card" data-provider="${provider}" aria-label="Статус ${title}">
        <span class="pmk-provider-logo pmk-provider-logo-${provider}" aria-hidden="true">${letter}</span>
        <span class="pmk-provider-copy">
          <strong>${title}</strong>
          <small data-provider-text>Проверяем…</small>
          <em data-provider-detail></em>
        </span>
        <span class="pmk-provider-dot" aria-hidden="true"></span>
      </button>`;
  }

  function installHeader() {
    const actions = $('.app-header .header-actions');
    if (!actions || $('#pmkProviderStatusPanel')) return Boolean(actions);

    const panel = document.createElement('div');
    panel.id = 'pmkProviderStatusPanel';
    panel.className = 'pmk-provider-status-panel';
    panel.innerHTML = `
      ${cardHtml('google', 'Google', 'G')}
      ${cardHtml('yandex', 'Яндекс', 'Я')}
      <button type="button" id="pmkProvidersSyncBtn" class="pmk-provider-sync-button" aria-label="Синхронизировать оба календаря" title="Синхронизировать оба календаря">↻</button>`;
    actions.insertBefore(panel, actions.firstChild);

    panel.addEventListener('click', async event => {
      const providerButton = event.target.closest('[data-provider]');
      if (providerButton) {
        const provider = providerButton.dataset.provider;
        if (provider === 'google') {
          if (!(typeof state !== 'undefined' && state?.token)) {
            if (typeof connectGoogle === 'function') connectGoogle();
          } else {
            await syncAll();
          }
        } else if (!yandexConfigured()) {
          openYandexSettings();
        } else {
          runtime.yandex = 'syncing';
          render();
          try {
            if (typeof window.PMK_YANDEX_CALENDAR?.test === 'function') await window.PMK_YANDEX_CALENDAR.test();
            await syncAll();
          } catch (error) {
            runtime.yandex = 'error';
            runtime.yandexMessage = error?.message || 'Не удалось проверить Яндекс';
            writeJson(YANDEX_STATUS_KEY, { status: 'error', time: new Date().toISOString(), message: runtime.yandexMessage });
            render();
          }
        }
        return;
      }
      if (event.target.closest('#pmkProvidersSyncBtn')) await syncAll();
    });
    return true;
  }

  async function syncAll() {
    const button = $('#pmkProvidersSyncBtn');
    if (button) button.disabled = true;
    runtime.google = (typeof state !== 'undefined' && state?.token) ? 'syncing' : 'idle';
    runtime.yandex = yandexConfigured() ? 'syncing' : 'idle';
    render();
    try {
      if (typeof refreshEvents === 'function') await refreshEvents();
    } catch (error) {
      if (typeof showToast === 'function') showToast(error?.message || 'Ошибка синхронизации.', 'error');
    } finally {
      runtime.google = 'idle';
      runtime.yandex = 'idle';
      if (button) button.disabled = false;
      render();
    }
  }

  function openYandexSettings() {
    if (typeof setView === 'function') setView('settings');
    setTimeout(() => {
      const card = $('#pmkYandexSettings');
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#pmkYandexSyncToken')?.focus();
    }, 120);
  }

  function renderProvider(provider) {
    const card = $(`.pmk-provider-card[data-provider="${provider}"]`);
    if (!card) return;
    const snapshot = providerSnapshot(provider);
    card.dataset.status = snapshot.state;
    $('[data-provider-text]', card).textContent = snapshot.text;
    $('[data-provider-detail]', card).textContent = snapshot.detail || '';
  }

  function render() {
    installHeader();
    renderProvider('google');
    renderProvider('yandex');
    const queue = queueCount();
    const syncButton = $('#pmkProvidersSyncBtn');
    if (syncButton) {
      syncButton.dataset.queue = String(queue);
      syncButton.title = queue ? `Синхронизировать оба календаря. В очереди: ${queue}` : 'Синхронизировать оба календаря';
    }
  }

  function managerSetupText(includeSecret = true) {
    const config = yandexConfig();
    const token = includeSecret ? config.syncToken : 'введите технический ключ PMK_SYNC_TOKEN';
    return [
      'Подключение ПМК Календаря на устройстве менеджера',
      '',
      `1. Откройте: ${APP_URL}`,
      '2. Перейдите: Настройки → Яндекс.Календарь.',
      `3. Адрес Worker: ${config.apiUrl || DEFAULT_WORKER_URL}`,
      `4. Ключ синхронизации: ${token}`,
      '5. Включите «Дублировать заявки в Яндекс».',
      '6. Нажмите «Сохранить настройки», затем «Проверить Яндекс».',
      '',
      'Логин Яндекса и пароль приложения менеджеру не передаются.',
    ].join('\n');
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      if (typeof showToast === 'function') showToast(successMessage, 'success');
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      if (typeof showToast === 'function') showToast(successMessage, 'success');
    }
  }

  function installManagerSetup() {
    const settingsGrid = $('#view-settings .settings-grid');
    const yandexCard = $('#pmkYandexSettings');
    if (!settingsGrid || !yandexCard || $('#pmkManagerDeviceSetup')) return Boolean(settingsGrid && yandexCard);

    const card = document.createElement('section');
    card.id = 'pmkManagerDeviceSetup';
    card.className = 'form-card pmk-manager-device-card';
    card.innerHTML = `
      <div class="pmk-manager-device-heading">
        <div>
          <h2>Подключение устройства менеджера</h2>
          <p>На телефоне или компьютере менеджера вводится только технический ключ. Пароль Яндекса остаётся в Cloudflare.</p>
        </div>
        <span class="pmk-manager-safe-badge">Без пароля Яндекса</span>
      </div>
      <div class="pmk-manager-device-grid">
        <label class="field">Адрес приложения<input id="pmkManagerAppUrl" value="${APP_URL}" readonly></label>
        <label class="field">Адрес Worker<input id="pmkManagerWorkerUrl" readonly></label>
        <label class="field pmk-manager-token-field">Ключ подключения PMK_SYNC_TOKEN
          <span class="pmk-manager-token-wrap">
            <input id="pmkManagerSyncToken" type="password" readonly autocomplete="off">
            <button type="button" id="pmkManagerToggleToken" class="mini-button">Показать</button>
          </span>
        </label>
      </div>
      <div class="pmk-manager-device-actions">
        <button type="button" id="pmkManagerCopyLink" class="button button-secondary">Скопировать ссылку</button>
        <button type="button" id="pmkManagerCopySetup" class="button button-primary">Скопировать данные для менеджера</button>
      </div>
      <div class="info-box pmk-manager-security-note">Передавайте технический ключ только сотрудникам, которым разрешена работа с заявками. При увольнении сотрудника замените PMK_SYNC_TOKEN в Cloudflare и на действующих устройствах.</div>`;
    yandexCard.insertAdjacentElement('afterend', card);

    function fill() {
      const config = yandexConfig();
      $('#pmkManagerWorkerUrl').value = config.apiUrl || DEFAULT_WORKER_URL;
      $('#pmkManagerSyncToken').value = config.syncToken || '';
      $('#pmkManagerCopySetup').disabled = !config.syncToken;
    }

    $('#pmkManagerToggleToken').addEventListener('click', () => {
      const input = $('#pmkManagerSyncToken');
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      $('#pmkManagerToggleToken').textContent = showing ? 'Показать' : 'Скрыть';
    });
    $('#pmkManagerCopyLink').addEventListener('click', () => copyText(APP_URL, 'Ссылка на календарь скопирована.'));
    $('#pmkManagerCopySetup').addEventListener('click', async () => {
      if (!yandexConfig().syncToken) return openYandexSettings();
      if (!confirm('Скопировать технический ключ подключения в буфер обмена? Передавайте его только доверенному менеджеру.')) return;
      await copyText(managerSetupText(true), 'Данные для устройства менеджера скопированы.');
    });
    $('#saveSettingsBtn')?.addEventListener('click', () => setTimeout(() => { fill(); render(); }, 0));
    fill();
    return true;
  }

  function bindEvents() {
    window.addEventListener('pmk-calendar-sync-start', () => {
      runtime.google = 'syncing';
      render();
    });
    window.addEventListener('pmk-calendar-sync-progress', event => {
      runtime.google = 'syncing';
      runtime.googleMessage = event.detail?.count != null ? `${event.detail.count} событий` : '';
      render();
    });
    window.addEventListener('pmk-calendar-sync-done', () => {
      runtime.google = 'idle';
      runtime.googleMessage = '';
      render();
    });
    window.addEventListener('pmk-calendar-sync-error', event => {
      runtime.google = 'error';
      runtime.googleMessage = event.detail?.message || 'Ошибка Google';
      render();
    });
    window.addEventListener('pmk-yandex-sync-done', event => {
      const data = { status: 'success', time: new Date().toISOString(), count: Number(event.detail?.count || 0) };
      writeJson(YANDEX_STATUS_KEY, data);
      runtime.yandex = 'idle';
      runtime.yandexMessage = '';
      render();
    });
    window.addEventListener('pmk-yandex-sync-error', event => {
      const data = { status: 'error', time: new Date().toISOString(), message: event.detail?.message || 'Ошибка Яндекс' };
      writeJson(YANDEX_STATUS_KEY, data);
      runtime.yandex = 'error';
      runtime.yandexMessage = data.message;
      render();
    });
    window.addEventListener('online', render);
    window.addEventListener('offline', render);
    window.addEventListener('storage', event => {
      if ([CONFIG_KEY, QUEUE_KEY, GOOGLE_STATUS_KEY, YANDEX_STATUS_KEY].includes(event.key)) render();
    });
  }

  function boot() {
    installHeader();
    installManagerSetup();
    bindEvents();
    render();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installHeader();
      installManagerSetup();
      render();
      if (($('#pmkProviderStatusPanel') && $('#pmkManagerDeviceSetup')) || attempts > 120) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();

//# sourceURL=provider-status-manager-v70.js

/* ===== unlimited-overlaps-v69.js ===== */
'use strict';

(() => {
  if (window.PMK_UNLIMITED_OVERLAPS_V69) return;
  window.PMK_UNLIMITED_OVERLAPS_V69 = true;

  function overlapEvents(data = {}) {
    if (!data.visitDate || !data.startTime || !data.endTime) return [];
    const formStart = `${data.visitDate}T${data.startTime}`;
    const formEnd = `${data.visitDate}T${data.endTime}`;
    return getAllEvents().filter(event => {
      if (event.id === data.eventId) return false;
      const range = comparableEventRange(event);
      if (!range.start || !range.end) return false;
      return formStart < range.end && formEnd > range.start;
    });
  }

  checkConflicts = function checkConflictsInformationalV69(data = {}) {
    const box = qs('#conflictHint');
    if (!box) return true;
    box.className = 'info-box hidden';

    const overlaps = overlapEvents(data);
    state.conflictCacheKey = '';
    state.conflictCacheResult = null;

    if (!overlaps.length) return true;

    const names = overlaps
      .slice(0, 3)
      .map(event => {
        const item = eventMeta(event);
        const name = item.customerName || event.summary || 'заявка';
        const start = formatTime(event.start?.dateTime || event.start);
        const end = formatTime(event.end?.dateTime || event.end);
        return `${name} ${start}–${end}`;
      });

    const extra = overlaps.length > names.length ? ` и ещё ${overlaps.length - names.length}` : '';
    box.className = 'info-box warning pmk-overlap-information';
    box.textContent = `На это время уже есть ${overlaps.length} ${pluralPoints(overlaps.length)}: ${names.join('; ')}${extra}. Это только информация — новую заявку можно сохранить без ограничений.`;
    return true;
  };

  window.PMK_UNLIMITED_OVERLAPS_V69_API = { overlapEvents };
})();
//# sourceURL=unlimited-overlaps-v69.js

/* ===== provider-crud-any-calendar-v72.js ===== */
'use strict';

(() => {
  if (window.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72) return;
  window.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72 = true;

  const CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const QUEUE_KEY = 'pmk-calendar-provider-queue-v1';
  const DEFAULT_API_URL = 'https://lucky-math-8e63pmk-address.standart-media.workers.dev/calendar';
  const YANDEX_PREFIX = 'local-yandex-';

  const previous = {
    saveRequest,
    updateEventStatus,
    updateEventContract,
    deleteEvent,
  };

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function yandexConfig() {
    return {
      enabled: true,
      apiUrl: DEFAULT_API_URL,
      syncToken: '',
      ...(readJson(CONFIG_KEY, {}) || {}),
    };
  }

  function yandexConfigured() {
    const config = yandexConfig();
    return Boolean(config.enabled && config.apiUrl && config.syncToken);
  }

  async function yandexRequest(path, options = {}) {
    const config = yandexConfig();
    if (!yandexConfigured()) throw new Error('Яндекс.Календарь не настроен.');
    const response = await fetch(`${String(config.apiUrl).replace(/\/+$/, '')}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.syncToken}`,
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; }
    catch { payload = text ? { error: text } : null; }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('Яндекс: неверный ключ синхронизации.');
      throw new Error(payload?.error || `Яндекс.Календарь: ошибка ${response.status}`);
    }
    return payload;
  }

  function pmkData(event) {
    try { return decodePmkData(event) || event?.pmkData || null; }
    catch { return event?.pmkData || null; }
  }

  function pmkIdOf(event) {
    return String(pmkData(event)?.pmkId || event?._pmkId || '').trim();
  }

  function ensurePmkId(data = {}, event = null) {
    return String(data.pmkId || pmkIdOf(event) || qs('#eventId')?.dataset?.pmkId || makeId());
  }

  function isYandexEvent(event) {
    return Boolean(event?._provider === 'yandex' || String(event?.id || '').startsWith(YANDEX_PREFIX));
  }

  function findGoogleEvent(pmkId, preferredId = '') {
    const events = state.events || [];
    if (preferredId && !String(preferredId).startsWith('local-')) {
      const direct = events.find(event => event.id === preferredId && !isYandexEvent(event));
      if (direct) return direct;
    }
    return events.find(event => !isYandexEvent(event) && pmkIdOf(event) === pmkId && !String(event.id || '').startsWith('local-')) || null;
  }

  function queue(provider, op, data) {
    const pmkId = String(data?.pmkId || '');
    if (!pmkId) return;
    const items = readJson(QUEUE_KEY, []);
    const next = (Array.isArray(items) ? items : []).filter(item => !(item?.provider === provider && item?.pmkId === pmkId));
    next.push({ provider, op, pmkId, data: op === 'upsert' ? data : null, savedAt: new Date().toISOString() });
    writeJson(QUEUE_KEY, next.slice(-300));
  }

  function removeQueued(provider, pmkId) {
    const items = readJson(QUEUE_KEY, []);
    writeJson(QUEUE_KEY, (Array.isArray(items) ? items : []).filter(item => !(item?.provider === provider && item?.pmkId === pmkId)));
  }

  async function upsertGoogle(data, preferredId = '') {
    if (!state.token) throw new Error('Google Calendar не подключён.');
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const existing = findGoogleEvent(data.pmkId, preferredId);
    const path = existing
      ? `/calendars/${calendarId}/events/${encodeURIComponent(existing.id)}`
      : `/calendars/${calendarId}/events`;
    const result = await googleRequest(path, {
      method: existing ? 'PATCH' : 'POST',
      body: JSON.stringify(toGoogleEvent(data)),
    });
    removeQueued('google', data.pmkId);
    return result;
  }

  async function upsertYandex(data) {
    const result = await yandexRequest(`/events/${encodeURIComponent(data.pmkId)}`, {
      method: 'PUT',
      body: JSON.stringify({ event: toGoogleEvent(data), pmkData: data }),
    });
    removeQueued('yandex', data.pmkId);
    return result;
  }

  async function deleteGoogle(pmkId, preferredId = '') {
    if (!state.token) throw new Error('Google Calendar не подключён.');
    const event = findGoogleEvent(pmkId, preferredId);
    if (!event) return null;
    const calendarId = encodeURIComponent(state.settings.calendarId || 'primary');
    const result = await googleRequest(`/calendars/${calendarId}/events/${encodeURIComponent(event.id)}`, { method: 'DELETE' });
    removeQueued('google', pmkId);
    return result;
  }

  async function deleteYandex(pmkId) {
    const result = await yandexRequest(`/events/${encodeURIComponent(pmkId)}`, { method: 'DELETE' });
    removeQueued('yandex', pmkId);
    return result;
  }

  function availableProviders() {
    return {
      google: Boolean(state.token),
      yandex: yandexConfigured(),
    };
  }

  async function saveToAvailableProviders(data, preferredId = '') {
    const providers = availableProviders();
    const tasks = [];

    if (providers.google) {
      tasks.push(upsertGoogle(data, preferredId)
        .then(value => ({ provider: 'Google', ok: true, value }))
        .catch(error => {
          queue('google', 'upsert', data);
          return { provider: 'Google', ok: false, error };
        }));
    }

    if (providers.yandex) {
      tasks.push(upsertYandex(data)
        .then(value => ({ provider: 'Яндекс', ok: true, value }))
        .catch(error => {
          queue('yandex', 'upsert', data);
          return { provider: 'Яндекс', ok: false, error };
        }));
    }

    if (!tasks.length) return { providers, results: [] };
    return { providers, results: await Promise.all(tasks) };
  }

  function resultMessage(results, action = 'сохранена') {
    const success = results.filter(item => item.ok).map(item => item.provider);
    const failed = results.filter(item => !item.ok).map(item => item.provider);
    if (success.length && !failed.length) return { text: `Заявка ${action} в ${success.join(' и ')}.`, type: 'success' };
    if (success.length) return { text: `Заявка ${action} в ${success.join(' и ')}. ${failed.join(' и ')} будет обновлён позже.`, type: 'error' };
    const error = results.map(item => item.error?.message).filter(Boolean).join(' ');
    return { text: error || 'Не удалось сохранить заявку.', type: 'error' };
  }

  async function refreshProviders() {
    try {
      if (typeof window.PMK_YANDEX_CALENDAR?.refresh === 'function') await window.PMK_YANDEX_CALENDAR.refresh();
      else if (typeof refreshEvents === 'function') await refreshEvents();
    } catch (error) {
      console.warn('PMK provider refresh v72:', error);
      invalidateEventCaches();
      renderAll();
    }
  }

  saveRequest = async function saveRequestAnyCalendarV72(sourceData, localOnly = false) {
    if (localOnly) return previous.saveRequest(sourceData, true);
    if (!validateForm(sourceData)) return;

    const sourceEvent = getAllEvents().find(event => event.id === sourceData.eventId) || null;
    const data = {
      ...sourceData,
      pmkId: ensurePmkId(sourceData, sourceEvent),
    };
    qs('#eventId').dataset.pmkId = data.pmkId;

    const { results } = await saveToAvailableProviders(data, sourceData.eventId || '');
    if (!results.length) return previous.saveRequest(data, false);

    const label = resultMessage(results, sourceData.eventId ? 'обновлена' : 'создана');
    if (!results.some(item => item.ok)) throw new Error(label.text);

    if (sourceData.eventId?.startsWith('local-') && !sourceData.eventId.startsWith(YANDEX_PREFIX)) {
      state.localEvents = state.localEvents.filter(event => event.id !== sourceData.eventId);
      persistLocalEvents();
    }

    showToast(label.text, label.type);
    state.selectedDayKey = data.visitDate || state.selectedDayKey;
    state.periodAnchorKey = state.selectedDayKey;
    await refreshProviders();
    resetForm();
    setView(['three-days','week','month','delivery-waiting','search'].includes(state.returnView) ? state.returnView : 'day');
  };

  async function updateStructured(id, mutate, successText) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    const current = eventMeta(event);
    const data = mutate({
      ...current,
      eventId: id,
      pmkId: ensurePmkId(current, event),
    });
    const { results } = await saveToAvailableProviders(data, id);
    if (!results.length) return false;
    if (!results.some(item => item.ok)) throw new Error(resultMessage(results).text);
    showToast(successText, 'success');
    await refreshProviders();
    return true;
  }

  updateEventContract = async function updateEventContractAnyCalendarV72(id, contractNumber) {
    const event = getAllEvents().find(item => item.id === id);
    if (event && id.startsWith('local-') && !id.startsWith(YANDEX_PREFIX) && state.localEvents.some(item => item.id === id) && !yandexConfigured()) {
      return previous.updateEventContract(id, contractNumber);
    }
    try {
      const updated = await updateStructured(id, data => ({ ...data, contractNumber: cleanShortField(contractNumber) }), 'Номер договора сохранён.');
      if (updated === false) return previous.updateEventContract(id, contractNumber);
    } catch (error) {
      showToast(error?.message || 'Не удалось изменить договор.', 'error');
    }
  };

  updateEventStatus = async function updateEventStatusAnyCalendarV72(id, nextStatus) {
    const event = getAllEvents().find(item => item.id === id);
    if (event && id.startsWith('local-') && !id.startsWith(YANDEX_PREFIX) && state.localEvents.some(item => item.id === id) && !yandexConfigured()) {
      return previous.updateEventStatus(id, nextStatus);
    }
    try {
      const updated = await updateStructured(id, data => ({ ...data, requestStatus: nextStatus }), `Статус: ${statusInfo(nextStatus, eventMeta(event || {}).visitType).label}`);
      if (updated === false) return previous.updateEventStatus(id, nextStatus);
    } catch (error) {
      showToast(error?.message || 'Не удалось изменить статус.', 'error');
    }
  };

  deleteEvent = async function deleteEventAnyCalendarV72(id) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    if (id.startsWith('local-') && !id.startsWith(YANDEX_PREFIX) && state.localEvents.some(item => item.id === id) && !yandexConfigured()) {
      return previous.deleteEvent(id);
    }

    const data = eventMeta(event);
    const pmkId = ensurePmkId(data, event);
    if (!confirm(`Удалить заявку ${data.customerName || 'клиента'}?`)) return;

    const providers = availableProviders();
    const tasks = [];
    if (providers.google) {
      tasks.push(deleteGoogle(pmkId, id).then(() => ({ provider:'Google', ok:true })).catch(error => {
        queue('google', 'delete', { pmkId });
        return { provider:'Google', ok:false, error };
      }));
    }
    if (providers.yandex) {
      tasks.push(deleteYandex(pmkId).then(() => ({ provider:'Яндекс', ok:true })).catch(error => {
        queue('yandex', 'delete', { pmkId });
        return { provider:'Яндекс', ok:false, error };
      }));
    }
    if (!tasks.length) return previous.deleteEvent(id);

    const results = await Promise.all(tasks);
    if (!results.some(item => item.ok)) {
      showToast(resultMessage(results, 'удалена').text, 'error');
      return;
    }

    state.events = state.events.filter(item => pmkIdOf(item) !== pmkId);
    invalidateEventCaches();
    renderAll();
    resetForm();
    setView(state.returnView || 'day');
    showToast('Заявка удалена из доступных календарей.', 'success');
    await refreshProviders();
  };

  const previousUpdateConnectionUI = updateConnectionUI;
  updateConnectionUI = function updateConnectionUIAnyCalendarV72() {
    previousUpdateConnectionUI();
    const providers = availableProviders();
    const submit = qs('#submitBtn');
    if (submit && (providers.google || providers.yandex)) {
      submit.textContent = qs('#eventId').value ? 'Обновить заявку' : 'Создать заявку';
      submit.disabled = false;
    }
  };

  window.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72_API = {
    saveToAvailableProviders,
    availableProviders,
    yandexConfigured,
  };
})();
//# sourceURL=provider-crud-any-calendar-v72.js

/* ===== yandex-primary-refresh-v72.js ===== */
'use strict';

(() => {
  if (window.PMK_YANDEX_PRIMARY_REFRESH_V72) return;
  window.PMK_YANDEX_PRIMARY_REFRESH_V72 = true;

  const CONFIG_KEY = 'pmk-yandex-calendar-config-v1';
  const CACHE_KEY = 'pmk-yandex-calendar-cache-v1';
  const DEFAULT_API_URL = 'https://lucky-math-8e63pmk-address.standart-media.workers.dev/calendar';
  const YANDEX_PREFIX = 'local-yandex-';
  const previousRefresh = refreshEvents;
  let activeRefresh = null;

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function config() {
    return {
      enabled: true,
      apiUrl: DEFAULT_API_URL,
      syncToken: '',
      ...(readJson(CONFIG_KEY, {}) || {}),
    };
  }

  function configured() {
    const value = config();
    return Boolean(value.enabled && value.apiUrl && value.syncToken);
  }

  async function request(path, options = {}) {
    const value = config();
    const response = await fetch(`${String(value.apiUrl).replace(/\/+$/, '')}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${value.syncToken}`,
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; }
    catch { payload = text ? { error: text } : null; }
    if (!response.ok) throw new Error(payload?.error || `Яндекс.Календарь: ошибка ${response.status}`);
    return payload;
  }

  function normalize(event) {
    const data = event?.pmkData || (() => {
      try { return decodePmkData(event); }
      catch { return null; }
    })();
    if (!data?.pmkId) return null;
    return {
      ...event,
      id: `${YANDEX_PREFIX}${data.pmkId}`,
      _provider: 'yandex',
      _providers: ['yandex'],
      _pmkId: data.pmkId,
      htmlLink: event.htmlLink || 'https://calendar.yandex.ru/',
      extendedProperties: { private: encodePmkData(data) },
    };
  }

  function applyEvents(events, source = 'network') {
    state.events = events;
    window.PMK_FULL_CALENDAR_SYNC_READY = true;
    window.PMK_FULL_CALENDAR_EVENT_COUNT = events.length;
    window.PMK_EVENTS_REVISION = Number(window.PMK_EVENTS_REVISION || 0) + 1;
    invalidateEventCaches();
    renderAll();
    checkUpcomingNotifications();
    updateConnectionUI();
    window.dispatchEvent(new CustomEvent('pmk-yandex-sync-done', { detail: { count: events.length, source } }));
    window.dispatchEvent(new CustomEvent('pmk-calendar-sync-done', { detail: { count: events.length, provider: 'yandex' } }));
    return events;
  }

  async function refreshYandexPrimary() {
    if (activeRefresh) return activeRefresh;
    activeRefresh = (async () => {
      window.dispatchEvent(new CustomEvent('pmk-calendar-sync-start', { detail: { provider: 'yandex' } }));
      try {
        if (typeof window.PMK_YANDEX_CALENDAR?.flushQueue === 'function') {
          await window.PMK_YANDEX_CALENDAR.flushQueue().catch(() => null);
        }
        const payload = await request('/events?from=1970-01-01&to=2100-01-01');
        const events = (Array.isArray(payload?.events) ? payload.events : []).map(normalize).filter(Boolean);
        writeJson(CACHE_KEY, events);
        return applyEvents(events, 'network');
      } catch (error) {
        const cached = (readJson(CACHE_KEY, []) || []).map(normalize).filter(Boolean);
        if (cached.length) applyEvents(cached, 'cache');
        window.dispatchEvent(new CustomEvent('pmk-yandex-sync-error', { detail: { message: error?.message || String(error) } }));
        window.dispatchEvent(new CustomEvent('pmk-calendar-sync-error', { detail: { message: error?.message || String(error), provider: 'yandex' } }));
        if (!cached.length) throw error;
        return cached;
      } finally {
        activeRefresh = null;
      }
    })();
    return activeRefresh;
  }

  async function providerRefreshV72() {
    if (configured() && !state.token) return refreshYandexPrimary();
    return previousRefresh();
  }

  refreshEvents = providerRefreshV72;
  if (window.PMK_FULL_CALENDAR_SYNC) window.PMK_FULL_CALENDAR_SYNC.refresh = providerRefreshV72;
  if (window.PMK_YANDEX_CALENDAR) window.PMK_YANDEX_CALENDAR.refresh = providerRefreshV72;

  window.PMK_YANDEX_PRIMARY_REFRESH_V72_API = {
    refresh: providerRefreshV72,
    refreshYandexPrimary,
    configured,
  };
})();
//# sourceURL=yandex-primary-refresh-v72.js

/* ===== compact-floating-note-v73.js ===== */
'use strict';

(() => {
  if (window.PMK_COMPACT_FLOATING_NOTE_V74) return;
  window.PMK_COMPACT_FLOATING_NOTE_V74 = true;

  const NOTE_KEY = 'pmk-floating-manager-note-v1';
  const OPEN_KEY = 'pmk-floating-manager-note-open-v1';
  const POSITION_KEY = 'pmk-floating-manager-note-position-v73';
  const $ = (selector, root = document) => root.querySelector(selector);
  let saveTimer = 0;
  let drag = null;

  function read(key, fallback = '') {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function readPosition() {
    try {
      const value = JSON.parse(read(POSITION_KEY, 'null'));
      if (Number.isFinite(value?.x) && Number.isFinite(value?.y)) return value;
    } catch {}
    return { x: 10, y: 76 };
  }

  function clampPosition(x, y) {
    const widget = $('#pmkCompactNoteWidget');
    const width = widget?.offsetWidth || 44;
    const height = widget?.offsetHeight || 44;
    return {
      x: Math.max(6, Math.min(window.innerWidth - width - 6, x)),
      y: Math.max(6, Math.min(window.innerHeight - height - 6, y)),
    };
  }

  function applyPosition(x, y, save = false) {
    const widget = $('#pmkCompactNoteWidget');
    if (!widget) return;
    const next = clampPosition(x, y);
    widget.style.left = `${next.x}px`;
    widget.style.top = `${next.y}px`;
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    if (save) write(POSITION_KEY, JSON.stringify(next));
  }

  function autoSize() {
    const textarea = $('#pmkCompactNoteText');
    if (!textarea) return;
    textarea.style.height = '56px';
    textarea.style.height = `${Math.min(Math.max(56, textarea.scrollHeight), Math.max(120, window.innerHeight * 0.48))}px`;
  }

  function saveText() {
    const textarea = $('#pmkCompactNoteText');
    if (!textarea) return;
    write(NOTE_KEY, textarea.value);
    $('#pmkCompactNoteButton')?.classList.toggle('has-note', Boolean(textarea.value.trim()));
  }

  function setOpen(open) {
    const widget = $('#pmkCompactNoteWidget');
    if (!widget) return;
    widget.classList.toggle('is-open', open);
    $('#pmkCompactNotePanel')?.setAttribute('aria-hidden', String(!open));
    $('#pmkCompactNoteButton')?.setAttribute('aria-expanded', String(open));
    write(OPEN_KEY, open ? '1' : '0');
    if (open) {
      autoSize();
      requestAnimationFrame(() => $('#pmkCompactNoteText')?.focus());
    } else saveText();
    const position = clampPosition(parseFloat(widget.style.left) || 10, parseFloat(widget.style.top) || 76);
    applyPosition(position.x, position.y, true);
  }

  function recognize() {
    const text = $('#pmkCompactNoteText')?.value.trim() || '';
    if (!text) return showToast('В заметке нет текста для распознавания.', 'error');
    const smartInput = $('#smartPasteInput');
    const parser = window.PMK_VOICE_PARSER_FAST_V68_API;
    if (!smartInput || typeof parser?.apply !== 'function') return showToast('Движок распознавания ещё не загружен.', 'error');
    smartInput.value = text;
    smartInput.dispatchEvent(new Event('input', { bubbles: true }));
    parser.apply();
    setView('form');
    showToast('Текст заметки распределён по заявке.', 'success');
  }

  function clearNote() {
    const textarea = $('#pmkCompactNoteText');
    if (!textarea?.value && !read(NOTE_KEY, '')) return;
    if (!confirm('Удалить текст заметки?')) return;
    textarea.value = '';
    write(NOTE_KEY, '');
    autoSize();
    $('#pmkCompactNoteButton')?.classList.remove('has-note');
    textarea.focus();
  }

  function startDrag(event, source) {
    if (source === 'panel' && event.target.closest('button,textarea')) return;
    const widget = $('#pmkCompactNoteWidget');
    if (!widget) return;
    const rect = widget.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      source,
      startedAt: Date.now(),
      startX: event.clientX,
      startY: event.clientY,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    widget.classList.add('is-dragging');
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.hypot(deltaX, deltaY) > 7) drag.moved = true;
    applyPosition(event.clientX - drag.dx, event.clientY - drag.dy, false);
    event.preventDefault();
  }

  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const widget = $('#pmkCompactNoteWidget');
    const current = clampPosition(parseFloat(widget?.style.left) || 10, parseFloat(widget?.style.top) || 76);
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const fastSwipe = Date.now() - drag.startedAt < 500 && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 42;
    let next = current;

    if (fastSwipe) {
      const width = widget?.offsetWidth || 44;
      const height = widget?.offsetHeight || 44;
      if (Math.abs(deltaX) >= Math.abs(deltaY)) {
        next = { x: deltaX > 0 ? window.innerWidth - width - 8 : 8, y: current.y };
      } else {
        next = { x: current.x, y: deltaY > 0 ? window.innerHeight - height - 8 : 8 };
      }
    }

    widget?.classList.remove('is-dragging');
    applyPosition(next.x, next.y, true);
    const shouldOpen = drag.source === 'button' && !drag.moved;
    drag = null;
    if (shouldOpen) setOpen(true);
    event.preventDefault();
  }

  function bindDrag(handle, source) {
    handle.addEventListener('pointerdown', event => startDrag(event, source));
    handle.addEventListener('pointermove', moveDrag);
    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);
  }

  function install() {
    document.querySelector('#pmkFloatingNoteWidget')?.remove();
    document.querySelector('#pmkClientInfoMirror')?.remove();
    if ($('#pmkCompactNoteWidget')) return true;

    const widget = document.createElement('aside');
    widget.id = 'pmkCompactNoteWidget';
    widget.className = 'pmk-compact-note-widget';
    widget.innerHTML = `
      <button type="button" id="pmkCompactNoteButton" class="pmk-compact-note-button" aria-label="Открыть или переместить заметку" aria-expanded="false">✎</button>
      <section id="pmkCompactNotePanel" class="pmk-compact-note-panel" aria-hidden="true">
        <header id="pmkCompactNoteDrag"><strong>Заметка менеджера</strong><button type="button" id="pmkCompactNoteClose" aria-label="Закрыть">×</button></header>
        <textarea id="pmkCompactNoteText" rows="2" placeholder="Текст…"></textarea>
        <div class="pmk-compact-note-actions">
          <button type="button" id="pmkCompactNoteRecognize">Распознать</button>
          <button type="button" id="pmkCompactNoteClear">Очистить</button>
        </div>
      </section>`;
    document.body.appendChild(widget);

    const textarea = $('#pmkCompactNoteText');
    textarea.value = read(NOTE_KEY, '');
    textarea.addEventListener('input', () => {
      autoSize();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveText, 180);
    });
    textarea.addEventListener('change', saveText);

    $('#pmkCompactNoteClose').addEventListener('click', () => setOpen(false));
    $('#pmkCompactNoteRecognize').addEventListener('click', recognize);
    $('#pmkCompactNoteClear').addEventListener('click', clearNote);
    bindDrag($('#pmkCompactNoteButton'), 'button');
    bindDrag($('#pmkCompactNoteDrag'), 'panel');

    window.addEventListener('resize', () => {
      const rect = widget.getBoundingClientRect();
      applyPosition(rect.left, rect.top, true);
      autoSize();
    });
    window.addEventListener('pagehide', saveText);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveText(); });

    const position = readPosition();
    applyPosition(position.x, position.y, false);
    $('#pmkCompactNoteButton').classList.toggle('has-note', Boolean(textarea.value.trim()));
    setOpen(read(OPEN_KEY, '0') === '1');
    autoSize();
    return true;
  }

  const start = () => requestAnimationFrame(install);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
//# sourceURL=compact-floating-note-v73.js

/* ===== status-ledger-v80.js ===== */
'use strict';

(() => {
  if (globalThis.PMK_STATUS_LEDGER_V80) return;
  globalThis.PMK_STATUS_LEDGER_V80 = true;

  const STORAGE_KEY = 'pmk-status-ledger-v80';
  const MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;
  const previousEventMeta = typeof globalThis.eventMeta === 'function' ? globalThis.eventMeta : (event => event?.pmkData || {});

  function loadStore() {
    try {
      const value = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch { return {}; }
  }

  let storeCache = loadStore();

  function writeStore(store) {
    storeCache = store;
    try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
  }

  function normalize(value = '') {
    return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim().replace(/\s+/g, ' ');
  }

  function phone(value = '') {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  function eventDate(event = {}, data = {}) {
    if (data.visitDate) return String(data.visitDate);
    const raw = event?.start?.dateTime || event?.start?.date || event?.start || '';
    return String(raw).slice(0, 10);
  }

  function eventTime(event = {}, data = {}) {
    if (data.startTime) return String(data.startTime).slice(0, 5);
    const raw = event?.start?.dateTime || event?.start || '';
    const match = String(raw).match(/T(\d{2}:\d{2})/);
    return match?.[1] || '';
  }

  function logicalKey(event = {}, data = {}) {
    const date = eventDate(event, data);
    const time = eventTime(event, data);
    const type = normalize(data.visitType || (/достав/i.test(event?.summary || '') ? 'delivery' : 'pickup'));
    const tel = phone(data.phone || '');
    if (tel && date) return `phone:${tel}|${date}|${time}|${type}`;
    const name = normalize(data.customerName || event?.summary || '');
    const address = normalize(data.address || event?.location || data.district || '');
    return `legacy:${name}|${date}|${time}|${type}|${address}`;
  }

  function aliases(event = {}, data = {}) {
    const result = new Set();
    const id = String(event?.id || data.eventId || '').trim();
    const pmkId = String(data.pmkId || event?._pmkId || event?.pmkData?.pmkId || '').trim();
    const logical = logicalKey(event, data);
    if (id) result.add(`id:${id}`);
    if (pmkId) result.add(`pmk:${pmkId}`);
    if (logical) result.add(`logical:${logical}`);
    return [...result];
  }

  function hash(value = '') {
    let h = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function stablePmkId(event = {}, data = {}) {
    const existing = String(data.pmkId || event?._pmkId || event?.pmkData?.pmkId || '').trim();
    return existing || `legacy-${hash(logicalKey(event, data))}`;
  }

  function newest(records = []) {
    return records.filter(Boolean).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] || null;
  }

  function resolve(event = {}, data = {}) {
    return newest(aliases(event, data).map(alias => storeCache[alias]));
  }

  function mark(event = {}, data = {}, status, extra = {}) {
    const now = extra.updatedAt || new Date().toISOString();
    const record = {
      status: String(status || data.requestStatus || ''),
      updatedAt: now,
      contractNumber: String(extra.contractNumber ?? data.contractNumber ?? ''),
      workStartedAt: String(extra.workStartedAt ?? data.workStartedAt ?? ''),
      completedAt: String(extra.completedAt ?? data.completedAt ?? (status === 'completed' ? now : '')),
      logicalKey: logicalKey(event, data),
      pmkId: stablePmkId(event, data),
    };
    const store = { ...storeCache };
    aliases(event, { ...data, pmkId: record.pmkId }).forEach(alias => { store[alias] = record; });
    const cutoff = Date.now() - MAX_AGE_MS;
    Object.keys(store).forEach(alias => {
      if (new Date(store[alias]?.updatedAt || 0).getTime() < cutoff) delete store[alias];
    });
    writeStore(store);
    try { globalThis.dispatchEvent?.(new CustomEvent('pmk-status-ledger-updated', { detail:{ status:record.status, logicalKey:record.logicalKey } })); } catch {}
    return record;
  }

  function statusFromDescription(description = '') {
    const match = String(description || '').match(/Статус\s*ПМК\s*:\s*([^\n\r]+)/i);
    if (!match) return '';
    const label = normalize(match[1]);
    if (/выполн|готов/.test(label)) return 'completed';
    if (/забрал|в работ/.test(label)) return 'picked-up';
    if (/ожидает достав|доставк/.test(label)) return 'pending-delivery';
    if (/ожидает забор|забор/.test(label)) return 'pending-pickup';
    return '';
  }

  function contractFromDescription(description = '') {
    return String(description || '').match(/Договор\s*ПМК\s*:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  }

  function apply(event = {}, data = {}) {
    const record = resolve(event, data);
    const descriptionStatus = statusFromDescription(event?.description || '');
    const descriptionContract = contractFromDescription(event?.description || '');
    if (!record && !descriptionStatus && !descriptionContract) return data;
    return {
      ...data,
      pmkId: data.pmkId || record?.pmkId || stablePmkId(event, data),
      requestStatus: record?.status || descriptionStatus || data.requestStatus,
      contractNumber: record?.contractNumber || descriptionContract || data.contractNumber || '',
      workStartedAt: record?.workStartedAt || data.workStartedAt || '',
      completedAt: record?.completedAt || data.completedAt || (descriptionStatus === 'completed' ? (event?.updated || '') : ''),
    };
  }

  function sameLogical(eventA = {}, dataA = {}, eventB = {}, dataB = {}) {
    return logicalKey(eventA, dataA) === logicalKey(eventB, dataB);
  }

  globalThis.addEventListener?.('storage', event => {
    if (event.key === STORAGE_KEY) storeCache = loadStore();
  });

  globalThis.eventMeta = function eventMetaWithLedgerV80(event) {
    return apply(event, previousEventMeta(event));
  };

  globalThis.PMK_STATUS_LEDGER_V80_API = {
    key: logicalKey,
    aliases,
    resolve,
    mark,
    apply,
    sameLogical,
    stablePmkId,
    storageKey: STORAGE_KEY,
  };
})();
//# sourceURL=status-ledger-v80.js

/* ===== in-work-workflow-v73.js ===== */
'use strict';

(() => {
  if (window.PMK_IN_WORK_WORKFLOW_V73) return;
  window.PMK_IN_WORK_WORKFLOW_V73 = true;

  const WORK_STATUSES = new Set(['picked-up', 'in-progress']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const previous = {
    setView,
    renderAll,
    getFormData,
    fillForm,
    resetForm,
    updateEventStatus,
  };

  function isInWork(data = {}) {
    return WORK_STATUSES.has(data.requestStatus);
  }

  function workTimestamp(event, data = eventMeta(event)) {
    return data.workStartedAt || event.updated || event.created || `${eventDateKey(event)}T00:00:00`;
  }

  function workDateKey(event, data = eventMeta(event)) {
    const value = workTimestamp(event, data);
    try {
      const parts = businessDateTimeParts(value);
      return parts.date || eventDateKey(event);
    } catch {
      return eventDateKey(event);
    }
  }

  function workTime(event, data = eventMeta(event)) {
    const value = workTimestamp(event, data);
    try {
      const parts = businessDateTimeParts(value);
      return parts.time || '';
    } catch {
      return '';
    }
  }

  function shortDate(dateKey) {
    return dateKeyForDisplay(dateKey).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC',
    });
  }

  function dateHeading(dateKey) {
    const today = businessTodayKey();
    const label = dateKey === today ? 'Сегодня' : dateKeyForDisplay(dateKey).toLocaleDateString('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    });
    return `${label.replace(/^./, char => char.toUpperCase())} · ${shortDate(dateKey)}`;
  }

  function workEvents() {
    return getAllEvents()
      .filter(event => isInWork(eventMeta(event)))
      .sort((a, b) => new Date(workTimestamp(b)).getTime() - new Date(workTimestamp(a)).getTime());
  }

  function createView() {
    if ($('#view-in-work')) return true;
    const main = $('.main-content');
    const deliveryNav = $('.nav-item[data-view="delivery-waiting"]');
    if (!main || !deliveryNav) return false;

    const nav = document.createElement('button');
    nav.className = 'nav-item nav-in-work';
    nav.dataset.view = 'in-work';
    nav.innerHTML = '<span>В работе</span><b id="inWorkCount">0</b>';
    deliveryNav.insertAdjacentElement('beforebegin', nav);
    nav.addEventListener('click', () => setView('in-work'));

    const section = document.createElement('section');
    section.id = 'view-in-work';
    section.className = 'view';
    section.innerHTML = `
      <div class="page-heading compact">
        <div><p class="eyebrow">Заказы на фабрике</p><h1>В работе</h1><p>Заказы со статусом «Забрали», сгруппированные по дате перевода в работу.</p></div>
      </div>
      <div class="summary-grid in-work-summary">
        <article class="summary-card"><span>Всего в работе</span><strong id="inWorkTotal">0</strong></article>
        <article class="summary-card"><span>Добавлено сегодня</span><strong id="inWorkToday">0</strong></article>
        <article class="summary-card"><span>С прошлых дней</span><strong id="inWorkOlder">0</strong></article>
      </div>
      <div id="inWorkGroups" class="in-work-groups"></div>`;
    main.appendChild(section);
    return true;
  }

  function renderInWork() {
    if (!createView()) return;
    const events = workEvents();
    const today = businessTodayKey();
    $('#inWorkCount').textContent = String(events.length);
    $('#inWorkTotal').textContent = String(events.length);
    $('#inWorkToday').textContent = String(events.filter(event => workDateKey(event) === today).length);
    $('#inWorkOlder').textContent = String(events.filter(event => workDateKey(event) !== today).length);

    const groups = new Map();
    events.forEach(event => {
      const data = eventMeta(event);
      const key = workDateKey(event, data);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ event, data });
    });

    const container = $('#inWorkGroups');
    if (!events.length) {
      container.innerHTML = '<div class="empty-state"><strong>Сейчас заказов в работе нет.</strong><br>После изменения статуса на «Забрали» заказ появится здесь.</div>';
      return;
    }

    container.innerHTML = [...groups.entries()].map(([dateKey, items]) => `
      <section class="in-work-day">
        <header><div><strong>${escapeHtml(dateHeading(dateKey))}</strong><span>В работе: ${items.length}</span></div></header>
        <div class="in-work-day-list">
          ${items.map(({ event, data }) => `
            <div class="in-work-card-wrap">
              <div class="in-work-since">В работе с ${escapeHtml(shortDate(dateKey))}${workTime(event, data) ? ` · ${escapeHtml(workTime(event, data))}` : ''}</div>
              ${renderEventCard(event)}
            </div>`).join('')}
        </div>
      </section>`).join('');
    bindEventActions(container);
  }

  function updateDayWithoutWork() {
    if (state.currentView !== 'day') return;
    const events = getAllEvents().filter(event => eventDateKey(event) === state.selectedDayKey && !isInWork(eventMeta(event)));
    $('#todayCount').textContent = String(events.length);
    $('#summaryTotal').textContent = String(events.length);
    $('#summaryPickup').textContent = String(events.filter(event => eventMeta(event).visitType === 'pickup').length);
    $('#summaryDelivery').textContent = String(events.filter(event => eventMeta(event).visitType === 'delivery').length);
    $('#summaryAttention').textContent = String(events.filter(event => !eventMeta(event).phone || !displayAddress(eventMeta(event), event)).length);
    renderToday(events);
  }

  setView = function setViewWithInWorkV73(view, options = {}) {
    if (view !== 'in-work') return previous.setView(view, options);
    state.currentView = 'in-work';
    $$('.view').forEach(element => element.classList.toggle('active', element.id === 'view-in-work'));
    $$('.nav-item').forEach(element => element.classList.toggle('active', element.dataset.view === 'in-work'));
    $('#sidebar')?.classList.remove('open');
    if (!options.skipHistory) pushAppHistory('in-work');
    renderInWork();
  };

  renderAll = function renderAllWithInWorkV73() {
    previous.renderAll();
    renderInWork();
    updateDayWithoutWork();
  };

  getFormData = function getFormDataWithWorkStartedV73() {
    const data = previous.getFormData();
    const form = $('#requestForm');
    const saved = form?.dataset.workStartedAt || '';
    if (isInWork(data)) {
      data.workStartedAt = saved || new Date().toISOString();
      if (form && !saved) form.dataset.workStartedAt = data.workStartedAt;
    } else if (saved) {
      data.workStartedAt = saved;
    }
    return data;
  };

  fillForm = function fillFormWithWorkStartedV73(data) {
    const result = previous.fillForm(data);
    const form = $('#requestForm');
    if (form) form.dataset.workStartedAt = data?.workStartedAt || '';
    return result;
  };

  resetForm = function resetFormWithWorkStartedV73(...args) {
    const result = previous.resetForm(...args);
    const form = $('#requestForm');
    if (form) form.dataset.workStartedAt = '';
    return result;
  };

  async function saveWorkStatus(id, nextStatus) {
    const event = getAllEvents().find(item => item.id === id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    const current = eventMeta(event);
    const data = {
      ...current,
      eventId: id,
      pmkId: current.pmkId || event._pmkId || makeId(),
      requestStatus: nextStatus,
      workStartedAt: current.workStartedAt || new Date().toISOString(),
    };
    const api = window.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72_API;
    if (typeof api?.saveToAvailableProviders !== 'function') return previous.updateEventStatus(id, nextStatus);
    const { results } = await api.saveToAvailableProviders(data, id);
    if (!results.length) return previous.updateEventStatus(id, nextStatus);
    if (!results.some(item => item.ok)) {
      const message = results.map(item => item.error?.message).filter(Boolean).join(' ') || 'Не удалось перевести заказ в работу.';
      return showToast(message, 'error');
    }
    showToast('Заказ перенесён во вкладку «В работе».', 'success');
    await refreshEvents();
    renderAll();
  }

  updateEventStatus = async function updateEventStatusWithInWorkV73(id, nextStatus) {
    if (!WORK_STATUSES.has(nextStatus)) return previous.updateEventStatus(id, nextStatus);
    try {
      await saveWorkStatus(id, nextStatus);
    } catch (error) {
      showToast(error?.message || 'Не удалось перевести заказ в работу.', 'error');
    }
  };

  function install() {
    if (!createView()) return false;
    const status = $('#requestStatus');
    if (status && !status.dataset.workTimestampBound) {
      status.dataset.workTimestampBound = '1';
      status.addEventListener('change', () => {
        const form = $('#requestForm');
        if (form && WORK_STATUSES.has(status.value) && !form.dataset.workStartedAt) form.dataset.workStartedAt = new Date().toISOString();
      });
    }
    renderInWork();
    updateDayWithoutWork();
    return true;
  }

  window.PMK_IN_WORK_WORKFLOW_V73_API = { render: renderInWork, events: workEvents };
  const start = () => requestAnimationFrame(() => { if (!install()) setTimeout(install, 200); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
//# sourceURL=in-work-workflow-v73.js

/* ===== status-pipeline-v81.js ===== */
'use strict';

(() => {
  if (globalThis.PMK_STATUS_PIPELINE_V81) return;
  globalThis.PMK_STATUS_PIPELINE_V81 = true;

  const WORK_STATUSES = new Set(['picked-up', 'in-progress']);
  const HIDDEN_STATUSES = new Set(['picked-up', 'in-progress', 'completed']);
  const inFlight = new Set();
  const ledger = globalThis.PMK_STATUS_LEDGER_V80_API;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function contractNumber(data = {}) {
    return String(data.contractNumber || '').replace(/^\s*[№#]\s*/, '').trim();
  }

  function statusLabel(status, visitType = 'pickup') {
    try { return statusInfo(status, visitType).label; }
    catch {
      if (status === 'completed') return 'Выполнено';
      if (status === 'picked-up') return 'Забрали';
      if (status === 'pending-delivery') return 'Ожидает доставки';
      return 'Статус изменён';
    }
  }

  function findEvent(id) {
    return getAllEvents().find(item => String(item.id) === String(id)) || null;
  }

  function prepareTransition(event, nextStatus, options = {}) {
    const current = eventMeta(event);
    const now = options.now || new Date().toISOString();
    const resolvedContract = options.contractOverride || contractNumber(current);
    const pmkId = ledger.stablePmkId(event, current);
    return {
      current,
      nextData: {
        ...current,
        eventId: event.id,
        pmkId,
        contractNumber: resolvedContract || current.contractNumber || '',
        requestStatus: nextStatus,
        workStartedAt: WORK_STATUSES.has(nextStatus) ? (current.workStartedAt || now) : (current.workStartedAt || ''),
        completedAt: nextStatus === 'completed' ? (current.completedAt || now) : '',
      },
      resolvedContract,
      now,
    };
  }

  function patchEventObject(event, data) {
    const keep = {
      id: event.id,
      _provider: event._provider,
      _providers: event._providers,
      _pmkId: data.pmkId,
      _yandexMirror: event._yandexMirror,
      htmlLink: event.htmlLink,
    };
    let body = null;
    try { body = toGoogleEvent(data); } catch { body = null; }
    if (body) Object.assign(event, body);
    Object.assign(event, keep);
    event.pmkData = { ...(event.pmkData || {}), ...data };
    event.updated = new Date().toISOString();
    return event;
  }

  function patchMatchingEvents(sourceEvent, sourceData, nextData) {
    let localChanged = false;
    getAllEvents().forEach(event => {
      const data = eventMeta(event);
      if (!ledger.sameLogical(sourceEvent, sourceData, event, data)) return;
      patchEventObject(event, { ...data, ...nextData, eventId:event.id });
      if (String(event.id || '').startsWith('local-') && event._provider !== 'yandex') localChanged = true;
    });
    if (localChanged && typeof persistLocalEvents === 'function') persistLocalEvents();
    if (typeof invalidateEventCaches === 'function') invalidateEventCaches();
  }

  function activeList() {
    const all = getAllEvents();
    if (state.currentView === 'delivery-waiting') return all.filter(event => eventMeta(event).requestStatus === 'pending-delivery');
    return all.filter(event => eventDateKey(event) === state.selectedDayKey && !HIDDEN_STATUSES.has(eventMeta(event).requestStatus));
  }

  function updateVisibleCounters() {
    if (state.currentView !== 'day' && state.currentView !== 'delivery-waiting') return;
    const all = getAllEvents();
    const list = activeList();
    const map = {
      todayCount: state.currentView === 'day' ? list.length : null,
      deliveryWaitingCount: all.filter(event => eventMeta(event).requestStatus === 'pending-delivery').length,
      summaryTotal: list.length,
      summaryPickup: list.filter(event => eventMeta(event).visitType === 'pickup').length,
      summaryDelivery: list.filter(event => eventMeta(event).visitType === 'delivery').length,
      summaryAttention: list.filter(event => !eventMeta(event).phone || !displayAddress(eventMeta(event), event)).length,
    };
    Object.entries(map).forEach(([id, value]) => {
      const node = $(`#${id}`);
      if (node && value != null) node.textContent = String(value);
    });
  }

  function buttonFor(id, status) {
    return $$('[data-status-event][data-status]').find(button => button.dataset.statusEvent === String(id) && button.dataset.status === status) || null;
  }

  function emptyMessageForCurrentView() {
    return state.currentView === 'delivery-waiting'
      ? '<div class="empty-state"><strong>Заявок, ожидающих доставки, нет.</strong></div>'
      : '<div class="empty-state"><strong>Активных заявок на этот день нет.</strong><br>Забранные и выполненные заявки находятся в отдельных разделах.</div>';
  }

  function removeCardNextPaint(card) {
    if (!card) return;
    const container = card.parentElement;
    card.classList.add('pmk-card-action-removing-fast');
    requestAnimationFrame(() => {
      card.remove();
      if (container && !container.querySelector('.event-card,[data-event-card]')) container.innerHTML = emptyMessageForCurrentView();
    });
  }

  function afterVisualAction(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  }

  function immediateFeedback(event, nextStatus, button) {
    const label = statusLabel(nextStatus, eventMeta(event).visitType);
    const target = button || buttonFor(event.id, nextStatus);
    if (target) {
      target.dataset.originalText ||= target.textContent;
      target.disabled = true;
      target.classList.add('pmk-status-accepted');
      target.textContent = '✓ Принято';
    }
    const card = target?.closest('.event-card') || $(`[data-event-card="${CSS.escape(String(event.id))}"]`);
    if (card && HIDDEN_STATUSES.has(nextStatus)) {
      const confirmation = document.createElement('div');
      confirmation.className = 'pmk-card-action-confirmation';
      confirmation.textContent = `✓ ${label}`;
      card.appendChild(confirmation);
      removeCardNextPaint(card);
    }
    showToast(`✓ ${label}. Действие принято.`, 'success');
    return card;
  }

  function contractDialog() {
    let dialog = $('#pmkContractRequiredDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'pmkContractRequiredDialog';
    dialog.className = 'pmk-contract-required-dialog';
    dialog.innerHTML = '<form method="dialog" class="pmk-contract-required-shell"><button type="button" class="pmk-contract-required-close" aria-label="Закрыть">×</button><span class="pmk-contract-required-icon">№</span><h2>Сначала укажите номер договора</h2><p id="pmkContractRequiredText"></p><label>Номер договора<input id="pmkContractRequiredInput" inputmode="numeric" autocomplete="off" placeholder="Например, 453"></label><small>Номер нужен, чтобы курьер и фабрика видели, какой договор принят в работу.</small><div class="pmk-contract-required-actions"><button type="button" class="button button-secondary" data-contract-required-cancel>Отмена</button><button type="submit" class="button button-primary">Сохранить и перенести</button></div></form>';
    document.body.appendChild(dialog);
    $('.pmk-contract-required-close', dialog).addEventListener('click', () => dialog.close());
    $('[data-contract-required-cancel]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('submit', event => {
      event.preventDefault();
      const input = $('#pmkContractRequiredInput');
      const number = contractNumber({ contractNumber:input.value });
      if (!number) {
        input.classList.add('invalid');
        input.focus();
        return showToast('Введите номер договора.', 'error');
      }
      const id = dialog.dataset.eventId;
      const status = dialog.dataset.nextStatus || 'picked-up';
      dialog.close();
      applyStatus(id, status, { contractOverride:number, skipContractCheck:true });
    });
    return dialog;
  }

  function requestContract(event, nextStatus) {
    const data = eventMeta(event);
    const dialog = contractDialog();
    dialog.dataset.eventId = event.id;
    dialog.dataset.nextStatus = nextStatus;
    $('#pmkContractRequiredText').textContent = `${data.customerName || 'У заявки'} не указан номер договора. До его внесения заказ не будет переведён в работу.`;
    const input = $('#pmkContractRequiredInput');
    input.value = contractNumber(data);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    requestAnimationFrame(() => input.focus());
  }

  async function saveInBackground(event, nextData) {
    const api = globalThis.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72_API;
    if (typeof api?.saveToAvailableProviders === 'function') {
      const result = await api.saveToAvailableProviders(nextData, event.id);
      return result.results || [];
    }
    return [];
  }

  function scheduleSecondaryViews() {
    const run = () => {
      globalThis.PMK_COMPLETED_WORKFLOW_V80_API?.render?.();
      globalThis.PMK_IN_WORK_WORKFLOW_V73_API?.render?.();
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout:700 });
    else setTimeout(run, 80);
  }

  function persistTransition(event, nextData, flightKey) {
    setTimeout(async () => {
      try {
        const results = await saveInBackground(event, nextData);
        if (!results.length && String(event.id || '').startsWith('local-') && event._provider !== 'yandex') {
          patchMatchingEvents(event, nextData, nextData);
          if (typeof persistLocalEvents === 'function') persistLocalEvents();
        }
        if (results.length && !results.some(item => item.ok)) {
          const message = results.map(item => item.error?.message).filter(Boolean).join(' ');
          showToast(message || 'Изменение сохранено на устройстве и будет отправлено позже.', 'error');
        }
        try { await refreshEvents(); } catch {}
        scheduleSecondaryViews();
      } catch (error) {
        showToast(error?.message || 'Изменение сохранено на устройстве и будет отправлено позже.', 'error');
        scheduleSecondaryViews();
      } finally {
        inFlight.delete(flightKey);
      }
    }, 40);
  }

  function applyStatus(id, nextStatus, options = {}) {
    const event = findEvent(id);
    if (!event) return showToast('Заявка не найдена.', 'error');
    const current = eventMeta(event);
    const flightKey = ledger.key(event, current);
    if (inFlight.has(flightKey)) return;

    const transition = prepareTransition(event, nextStatus, options);
    if (WORK_STATUSES.has(nextStatus) && !transition.resolvedContract && !options.skipContractCheck) {
      requestContract(event, nextStatus);
      return;
    }

    inFlight.add(flightKey);
    ledger.mark(event, transition.nextData, nextStatus, {
      updatedAt:transition.now,
      contractNumber:transition.nextData.contractNumber,
      workStartedAt:transition.nextData.workStartedAt,
      completedAt:transition.nextData.completedAt,
    });
    immediateFeedback(event, nextStatus, options.sourceButton);
    afterVisualAction(() => {
      patchMatchingEvents(event, transition.current, transition.nextData);
      updateVisibleCounters();
      scheduleSecondaryViews();
      persistTransition(event, transition.nextData, flightKey);
    });
  }

  globalThis.updateEventStatus = applyStatus;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-status-event][data-status]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyStatus(button.dataset.statusEvent, button.dataset.status, { sourceButton:button });
  }, true);

  globalThis.PMK_STATUS_PIPELINE_V81_API = {
    applyStatus,
    prepareTransition,
    patchMatchingEvents,
    removeCardNextPaint,
    afterVisualAction,
    hiddenStatuses:HIDDEN_STATUSES,
  };
})();
//# sourceURL=status-pipeline-v81.js

/* ===== archive-policy-v82.js ===== */
'use strict';

(() => {
  if (globalThis.PMK_ARCHIVE_POLICY_V82) return;
  globalThis.PMK_ARCHIVE_POLICY_V82 = true;

  const ARCHIVE_AFTER_DAYS = 7;
  const ARCHIVE_AFTER_MS = ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;

  function timestamp(value) {
    const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value || ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function ageMs(value, now = Date.now()) {
    const time = timestamp(value);
    return time ? Math.max(0, Number(now) - time) : 0;
  }

  function isArchived(value, now = Date.now()) {
    const time = timestamp(value);
    return Boolean(time && Number(now) - time >= ARCHIVE_AFTER_MS);
  }

  function remainingMs(value, now = Date.now()) {
    const time = timestamp(value);
    if (!time) return ARCHIVE_AFTER_MS;
    return Math.max(0, ARCHIVE_AFTER_MS - (Number(now) - time));
  }

  function split(items = [], getTimestamp = item => item, now = Date.now()) {
    const active = [];
    const archived = [];
    items.forEach(item => (isArchived(getTimestamp(item), now) ? archived : active).push(item));
    return { active, archived };
  }

  globalThis.PMK_ARCHIVE_POLICY_V82_API = {
    archiveAfterDays: ARCHIVE_AFTER_DAYS,
    archiveAfterMs: ARCHIVE_AFTER_MS,
    timestamp,
    ageMs,
    isArchived,
    remainingMs,
    split,
  };
})();
//# sourceURL=archive-policy-v82.js

/* ===== completed-archive-workflow-v82.js ===== */
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
//# sourceURL=completed-archive-workflow-v82.js

/* ===== period-model-v83.js ===== */
'use strict';

(() => {
  if (globalThis.PMK_PERIOD_MODEL_V83) return;
  globalThis.PMK_PERIOD_MODEL_V83 = true;

  function mondayIndex(dateKey) {
    const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return (day + 6) % 7;
  }

  function monthCells(dateKeys = []) {
    const keys = [...dateKeys].filter(Boolean).sort();
    if (!keys.length) return [];
    const cells = Array(mondayIndex(keys[0])).fill(null).concat(keys);
    while (cells.length % 7) cells.push(null);
    return cells;
  }

  function workingDistricts(schedule = {}, dateKey = '') {
    if (!dateKey) return [];
    const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    return [...new Set((schedule[weekday] || []).map(slot => String(slot?.[2] || '').trim()).filter(Boolean))];
  }

  function filterDayEvents(events = [], mode = '', getMeta = event => event, getAddress = data => data.address || '') {
    if (!mode) return events;
    return events.filter(event => {
      const data = getMeta(event) || {};
      if (mode === 'pickup') return data.visitType === 'pickup';
      if (mode === 'delivery') return data.visitType === 'delivery';
      if (mode === 'attention') return !String(data.phone || '').trim() || !String(getAddress(data, event) || '').trim();
      return true;
    });
  }

  globalThis.PMK_PERIOD_MODEL_V83_API = { mondayIndex, monthCells, workingDistricts, filterDayEvents };
})();
//# sourceURL=period-model-v83.js

/* ===== mobile-period-workday-v83.js ===== */
'use strict';

(() => {
  if (globalThis.PMK_MOBILE_PERIOD_WORKDAY_V83) return;
  globalThis.PMK_MOBILE_PERIOD_WORKDAY_V83 = true;

  const model = globalThis.PMK_PERIOD_MODEL_V83_API;
  const HIDDEN_DAY_STATUSES = new Set(['picked-up', 'in-progress', 'completed', 'archived']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const previousEventMeta = eventMeta;
  const previousRenderAll = renderAll;
  const previousRenderPeriod = renderPeriod;
  let activeSummaryFilter = '';
  let activeFilterDay = '';

  function phoneFromText(value = '') {
    const text = String(value || '');
    const labelled = text.match(/(?:телефон|тел\.?|phone)\s*[:：]?\s*(\+?\d[\d\s()\-]{8,}\d)/i)?.[1];
    const loose = text.match(/(?:\+7|8)[\d\s()\-]{9,}\d/)?.[0];
    return String(labelled || loose || '').trim();
  }

  eventMeta = function eventMetaWithPhoneFallbackV83(event) {
    const data = previousEventMeta(event);
    if (String(data.phone || '').trim()) return data;
    const phone = phoneFromText(event?.description || '');
    return phone ? { ...data, phone } : data;
  };

  scheduleBadge = function scheduleBadgeV83(data = {}) {
    if (data.callAhead) return `<span class="quick-badge schedule-badge call-ahead-badge">☎ Позвонить ${escapeHtml(formatCallAhead(getCallAheadMinutes(data)))}</span>`;
    if (isScheduleNote(data)) return '<span class="quick-badge schedule-badge">◷ Ждёт по расписанию</span>';
    return '';
  };

  renderEventCard = function renderEventCardLeftStatusesV83(event) {
    const data = eventMeta(event);
    const start = event.start?.dateTime || event.start;
    const end = event.end?.dateTime || event.end;
    const currentStatus = statusInfo(data.requestStatus, data.visitType);
    const title = data.customerName || event.summary || 'Заявка';
    const dateKey = eventDateKey(event);
    const date = dateKeyForDisplay(dateKey);
    const comment = eventCommentText(data);
    const id = escapeHtml(String(event.id || ''));
    const phone = String(data.phone || '').trim();
    return `<article class="event-card event-card-v83 status-${currentStatus.className}" data-event-card="${id}">
      <div class="event-time">
        <small class="event-date">${formatDateShort(dateKey)}</small>
        <small class="event-weekday">${escapeHtml(date.toLocaleDateString('ru-RU', { weekday:'long', timeZone:'UTC' }))}</small>
        <strong>${formatTime(start)}–${formatTime(end)}</strong>
        <span>${data.visitType === 'delivery' ? 'Доставка' : 'Забор'}</span>
        <div class="event-time-statuses" aria-label="Статус заявки">${statusButtons(event.id, data.requestStatus)}</div>
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
        <div class="event-actions event-actions-v83">
          <div class="action-row manage-row">
            ${phone ? `<a class="mini-button call-button primary-card-action" href="${phoneLink(phone)}">☎ Позвонить</a>` : '<button type="button" class="mini-button primary-card-action phone-missing" disabled>Телефон не указан</button>'}
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
      </div>
    </article>`;
  };

  function activeDayEvents() {
    return getAllEvents().filter(event => {
      if (eventDateKey(event) !== state.selectedDayKey) return false;
      return !HIDDEN_DAY_STATUSES.has(eventMeta(event).requestStatus);
    });
  }

  function setSummaryCards() {
    const map = [
      ['summaryTotal', ''],
      ['summaryPickup', 'pickup'],
      ['summaryDelivery', 'delivery'],
      ['summaryAttention', 'attention'],
    ];
    map.forEach(([id, filter]) => {
      const value = $(`#${id}`);
      const card = value?.closest('.summary-card');
      if (!card) return;
      card.dataset.summaryFilter = filter;
      card.classList.toggle('summary-filterable', Boolean(filter));
      card.classList.toggle('active', activeSummaryFilter === filter && Boolean(filter));
      if (filter) {
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', activeSummaryFilter === filter ? 'true' : 'false');
      } else {
        card.removeAttribute('tabindex');
        card.removeAttribute('role');
        card.removeAttribute('aria-pressed');
      }
    });
  }

  function updateDaySummary() {
    if (state.currentView !== 'day') return;
    const events = activeDayEvents();
    const pickup = events.filter(event => eventMeta(event).visitType === 'pickup');
    const delivery = events.filter(event => eventMeta(event).visitType === 'delivery');
    const attention = events.filter(event => {
      const data = eventMeta(event);
      return !String(data.phone || '').trim() || !String(displayAddress(data, event) || '').trim();
    });
    const values = { summaryTotal:events.length, summaryPickup:pickup.length, summaryDelivery:delivery.length, summaryAttention:attention.length };
    Object.entries(values).forEach(([id, value]) => { const node = $(`#${id}`); if (node) node.textContent = String(value); });
    setSummaryCards();
  }

  function renderFilteredDay() {
    if (state.currentView !== 'day') return;
    const events = model.filterDayEvents(activeDayEvents(), activeSummaryFilter, eventMeta, displayAddress);
    renderToday(events);
    updateDaySummary();
  }

  function workingDistrictText() {
    const districts = model.workingDistricts(PICKUP_SCHEDULE, state.selectedDayKey || businessTodayKey());
    return districts.length ? `Рабочие районы: ${districts.join(', ')}` : 'По графику районных выездов нет.';
  }

  function applyDayHeading() {
    if (state.currentView !== 'day') return;
    const subtitle = $('#todaySubtitle');
    if (subtitle) subtitle.textContent = workingDistrictText();
    if (activeFilterDay !== state.selectedDayKey) {
      activeFilterDay = state.selectedDayKey;
      activeSummaryFilter = '';
    }
    renderFilteredDay();
  }

  function monthEventCount(events, dateKey) {
    return events.filter(event => {
      if (eventDateKey(event) !== dateKey) return false;
      return !new Set(['completed','archived']).has(eventMeta(event).requestStatus);
    }).length;
  }

  function renderMonthTable(events, dateKeys) {
    const board = $('#weekEvents');
    if (!board) return;
    const cells = model.monthCells(dateKeys);
    const today = businessTodayKey();
    const labels = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    board.className = 'pmk-month-table';
    board.innerHTML = `${labels.map(label => `<div class="pmk-month-weekday">${label}</div>`).join('')}${cells.map(dateKey => {
      if (!dateKey) return '<div class="pmk-month-cell pmk-month-empty" aria-hidden="true"></div>';
      const count = monthEventCount(events, dateKey);
      const day = Number(dateKey.slice(-2));
      return `<button type="button" class="pmk-month-cell${dateKey === today ? ' today' : ''}${count ? ' has-events' : ''}" data-open-month-day="${dateKey}"><span>${day}</span><strong>${count}</strong><small>${count === 1 ? 'точка' : count >= 2 && count <= 4 ? 'точки' : 'точек'}</small></button>`;
    }).join('')}`;
    $$('[data-open-month-day]', board).forEach(button => button.addEventListener('click', () => openDay(button.dataset.openMonthDay)));
  }

  function installBoardDrag(board) {
    if (!board || board.dataset.pmkDragV83 === '1') return;
    board.dataset.pmkDragV83 = '1';
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let horizontal = null;
    let dragged = false;
    let suppressClickUntil = 0;

    board.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScroll = board.scrollLeft;
      horizontal = null;
      dragged = false;
    });

    board.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (horizontal == null && Math.max(Math.abs(dx), Math.abs(dy)) > 7) horizontal = Math.abs(dx) > Math.abs(dy);
      if (!horizontal) return;
      dragged = true;
      event.preventDefault();
      try { board.setPointerCapture(pointerId); } catch {}
      board.classList.add('pmk-period-dragging');
      board.scrollLeft = startScroll - dx;
    }, { passive:false });

    const finish = event => {
      if (pointerId !== event.pointerId) return;
      if (dragged) suppressClickUntil = Date.now() + 350;
      try { board.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
      horizontal = null;
      dragged = false;
      board.classList.remove('pmk-period-dragging');
    };
    board.addEventListener('pointerup', finish);
    board.addEventListener('pointercancel', finish);
    board.addEventListener('click', event => {
      if (Date.now() > suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  renderPeriod = function renderPeriodV83(events, dateKeys, period = 'week') {
    if (period === 'month') return renderMonthTable(events, dateKeys);
    previousRenderPeriod(events, dateKeys, period);
    const board = $('#weekEvents');
    if (period === 'week' || period === 'three-days') requestAnimationFrame(() => installBoardDrag(board));
  };

  renderAll = function renderAllV83() {
    previousRenderAll();
    applyDayHeading();
  };

  function activateSummaryFilter(filter) {
    if (!filter || state.currentView !== 'day') return;
    activeSummaryFilter = activeSummaryFilter === filter ? '' : filter;
    renderFilteredDay();
  }

  function animateDay(direction) {
    const view = $('#view-today');
    if (!view) return;
    requestAnimationFrame(() => {
      view.classList.remove('pmk-day-next','pmk-day-prev');
      void view.offsetWidth;
      view.classList.add(direction === 'next' ? 'pmk-day-next' : 'pmk-day-prev');
      setTimeout(() => view.classList.remove('pmk-day-next','pmk-day-prev'), 330);
    });
  }

  document.addEventListener('click', event => {
    const summary = event.target.closest('.summary-card[data-summary-filter]');
    if (summary?.dataset.summaryFilter) {
      event.preventDefault();
      activateSummaryFilter(summary.dataset.summaryFilter);
      return;
    }
    const dayButton = event.target.closest('#prevDayBtn,#nextDayBtn');
    if (dayButton) animateDay(dayButton.id === 'nextDayBtn' ? 'next' : 'prev');
  }, true);

  document.addEventListener('keydown', event => {
    const summary = event.target.closest?.('.summary-card[data-summary-filter]');
    if (!summary?.dataset.summaryFilter || !['Enter',' '].includes(event.key)) return;
    event.preventDefault();
    activateSummaryFilter(summary.dataset.summaryFilter);
  });

  globalThis.addEventListener?.('pmk-status-ledger-updated', () => requestAnimationFrame(() => {
    if (state.currentView === 'day') applyDayHeading();
  }));

  globalThis.PMK_MOBILE_PERIOD_WORKDAY_V83_API = {
    renderMonthTable,
    installBoardDrag,
    activeDayEvents,
    workingDistrictText,
    renderFilteredDay,
  };

  const install = () => {
    setSummaryCards();
    applyDayHeading();
    if (['week','three-days'].includes(state.currentView)) installBoardDrag($('#weekEvents'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once:true });
  else requestAnimationFrame(install);
})();
//# sourceURL=mobile-period-workday-v83.js

/* ===== period-class-fix-v83.js ===== */
'use strict';

(() => {
  if (globalThis.PMK_PERIOD_CLASS_FIX_V83) return;
  globalThis.PMK_PERIOD_CLASS_FIX_V83 = true;

  const previousRenderPeriod = renderPeriod;

  function markPeriod(period) {
    const board = document.querySelector('#weekEvents');
    if (!board) return;
    board.classList.toggle('pmk-three-days-period', period === 'three-days');
    board.classList.toggle('pmk-week-period', period === 'week');
  }

  renderPeriod = function renderPeriodClassSafeV83(events, dateKeys, period = 'week') {
    const result = previousRenderPeriod(events, dateKeys, period);
    markPeriod(period);
    return result;
  };

  requestAnimationFrame(() => markPeriod(state.currentView));
})();
//# sourceURL=period-class-fix-v83.js

/* ===== period-header-provider-v85.js ===== */
'use strict';

(() => {
  if (globalThis.PMK_PERIOD_HEADER_PROVIDER_V85) return;
  globalThis.PMK_PERIOD_HEADER_PROVIDER_V85 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let dragState = null;
  let raf = 0;

  function providerSet(event = {}) {
    const providers = new Set(Array.isArray(event._providers) ? event._providers.map(value => String(value).toLowerCase()) : []);
    if (event._provider) providers.add(String(event._provider).toLowerCase());
    const id = String(event.id || '');
    const link = String(event.htmlLink || '').toLowerCase();
    if (id.startsWith('local-yandex-') || link.includes('yandex')) providers.add('yandex');
    if (event._yandexMirror) providers.add('yandex');
    if (event.kind === 'calendar#event' || link.includes('google') || (!id.startsWith('local-') && id && !providers.has('yandex'))) providers.add('google');
    return providers;
  }

  function providerBadges(event = {}) {
    const providers = providerSet(event);
    const items = [];
    if (providers.has('google')) items.push('<span class="event-provider-mark event-provider-google" title="Синхронизировано с Google Calendar" aria-label="Google Calendar">G</span>');
    if (providers.has('yandex')) items.push('<span class="event-provider-mark event-provider-yandex" title="Синхронизировано с Яндекс Календарём" aria-label="Яндекс Календарь">Я</span>');
    return items.length ? `<span class="event-provider-marks">${items.join('')}</span>` : '';
  }

  function renderCardV85(event) {
    const data = eventMeta(event);
    const start = event.start?.dateTime || event.start;
    const end = event.end?.dateTime || event.end;
    const currentStatus = statusInfo(data.requestStatus, data.visitType);
    const title = data.customerName || event.summary || 'Заявка';
    const dateKey = eventDateKey(event);
    const date = dateKeyForDisplay(dateKey);
    const comment = eventCommentText(data);
    const id = escapeHtml(String(event.id || ''));
    const phone = String(data.phone || '').trim();
    return `<article class="event-card event-card-v85 status-${currentStatus.className}" data-event-card="${id}">
      <div class="event-time">
        <small class="event-date">${formatDateShort(dateKey)}</small>
        <small class="event-weekday">${escapeHtml(date.toLocaleDateString('ru-RU', { weekday:'long', timeZone:'UTC' }))}</small>
        <strong>${formatTime(start)}–${formatTime(end)}</strong>
        <span>${data.visitType === 'delivery' ? 'Доставка' : 'Забор'}</span>
      </div>
      <div class="event-main">
        <div class="event-contract-provider-row">
          ${renderContractControl(event, data)}
          ${providerBadges(event)}
        </div>
        <div class="event-card-header event-card-header-v85">
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
      <div class="event-status-grid-v85" aria-label="Изменить статус заявки">${statusButtons(event.id, data.requestStatus)}</div>
      <div class="event-card-footer-v85">
        ${phone ? `<a class="mini-button call-button call-button-v85" href="${phoneLink(phone)}">☎ Позвонить</a>` : '<button type="button" class="mini-button call-button-v85 phone-missing" disabled>Телефон не указан</button>'}
        <button type="button" class="mini-button open-button secondary-card-action" data-open-event="${id}">Открыть</button>
        <details class="card-menu">
          <summary class="mini-button menu-button" aria-label="Дополнительные действия">⋮</summary>
          <div class="card-menu-popover">
            <button type="button" data-edit-event="${id}">Редактировать заявку</button>
            <button type="button" class="danger-menu-item" data-delete-event="${id}">Удалить заявку</button>
          </div>
        </details>
      </div>
    </article>`;
  }

  renderEventCard = renderCardV85;

  function scrollModel(board) {
    const max = Math.max(0, board.scrollWidth - board.clientWidth);
    return { max, ratio:max ? Math.min(1, Math.max(0, board.scrollLeft / max)) : 0 };
  }

  function updateScrollUi() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const board = $('#weekEvents');
      const bar = $('#pmkVisiblePeriodScroll');
      if (!board || !bar) return;
      const track = $('.pmk-period-scroll-track', bar);
      const thumb = $('.pmk-period-scroll-thumb', bar);
      const prev = $('[data-period-scroll="prev"]', bar);
      const next = $('[data-period-scroll="next"]', bar);
      const { max, ratio } = scrollModel(board);
      const trackWidth = track.clientWidth;
      const visibleRatio = board.scrollWidth ? Math.min(1, board.clientWidth / board.scrollWidth) : 1;
      const thumbWidth = Math.max(42, trackWidth * visibleRatio);
      const travel = Math.max(0, trackWidth - thumbWidth);
      thumb.style.width = `${thumbWidth}px`;
      thumb.style.transform = `translateX(${travel * ratio}px)`;
      bar.classList.toggle('is-hidden', !['three-days','week'].includes(state.currentView) || max <= 1);
      prev.disabled = board.scrollLeft <= 1;
      next.disabled = board.scrollLeft >= max - 1;
      bar.dataset.progress = String(Math.round(ratio * 100));
      track.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
    });
  }

  function stepBoard(direction) {
    const board = $('#weekEvents');
    if (!board) return;
    const distance = Math.max(180, board.clientWidth * .78) * direction;
    board.scrollTo({ left:board.scrollLeft + distance, behavior:'smooth' });
  }

  function createVisibleScroll() {
    const board = $('#weekEvents');
    if (!board) return null;
    let bar = $('#pmkVisiblePeriodScroll');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pmkVisiblePeriodScroll';
      bar.className = 'pmk-visible-period-scroll';
      bar.innerHTML = `
        <button type="button" class="pmk-period-scroll-arrow" data-period-scroll="prev" aria-label="Прокрутить дни влево">‹</button>
        <div class="pmk-period-scroll-track" role="scrollbar" aria-label="Перемещение по дням" aria-orientation="horizontal">
          <div class="pmk-period-scroll-thumb"><span>Перемещайте дни</span></div>
        </div>
        <button type="button" class="pmk-period-scroll-arrow" data-period-scroll="next" aria-label="Прокрутить дни вправо">›</button>`;
      board.insertAdjacentElement('beforebegin', bar);
      $('[data-period-scroll="prev"]', bar).addEventListener('click', () => stepBoard(-1));
      $('[data-period-scroll="next"]', bar).addEventListener('click', () => stepBoard(1));
      const track = $('.pmk-period-scroll-track', bar);
      const thumb = $('.pmk-period-scroll-thumb', bar);
      track.addEventListener('click', event => {
        if (event.target.closest('.pmk-period-scroll-thumb')) return;
        const rect = track.getBoundingClientRect();
        const boardModel = scrollModel(board);
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        board.scrollTo({ left:boardModel.max * ratio, behavior:'smooth' });
      });
      thumb.addEventListener('pointerdown', event => {
        event.preventDefault();
        thumb.setPointerCapture?.(event.pointerId);
        dragState = { pointerId:event.pointerId, startX:event.clientX, startLeft:board.scrollLeft };
        bar.classList.add('is-dragging');
      });
      thumb.addEventListener('pointermove', event => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        event.preventDefault();
        const model = scrollModel(board);
        const thumbWidth = thumb.getBoundingClientRect().width;
        const travel = Math.max(1, track.clientWidth - thumbWidth);
        board.scrollLeft = Math.min(model.max, Math.max(0, dragState.startLeft + (event.clientX - dragState.startX) * (model.max / travel)));
      });
      const finish = event => {
        if (!dragState || (event.pointerId != null && dragState.pointerId !== event.pointerId)) return;
        dragState = null;
        bar.classList.remove('is-dragging');
      };
      thumb.addEventListener('pointerup', finish);
      thumb.addEventListener('pointercancel', finish);
      board.addEventListener('scroll', updateScrollUi, { passive:true });
    }
    updateScrollUi();
    return bar;
  }

  function shortStatus(status) {
    return ({ success:'ОК', warning:'Очередь', syncing:'Синхр.', error:'Ошибка', offline:'Нет', pending:'Проверить' })[status] || 'Проверка';
  }

  function clarifyHeader() {
    const panel = $('#pmkProviderStatusPanel');
    if (!panel) return;
    $$('.pmk-provider-card', panel).forEach(card => {
      let mobile = $('.pmk-provider-mobile-status', card);
      if (!mobile) {
        mobile = document.createElement('span');
        mobile.className = 'pmk-provider-mobile-status';
        card.appendChild(mobile);
      }
      const provider = card.dataset.provider === 'google' ? 'Google' : 'Яндекс';
      const full = $('[data-provider-text]', card)?.textContent || 'Проверяем';
      const compact = shortStatus(card.dataset.status);
      if (mobile.textContent !== compact) mobile.textContent = compact;
      const title = `${provider}: ${full}`;
      if (card.title !== title) card.title = title;
      const aria = `${provider}. Статус: ${full}`;
      if (card.getAttribute('aria-label') !== aria) card.setAttribute('aria-label', aria);
    });
    const sync = $('#pmkProvidersSyncBtn');
    if (sync && sync.dataset.v85 !== '1') {
      sync.dataset.v85 = '1';
      sync.innerHTML = '<span aria-hidden="true">↻</span><small>Синхр.</small>';
      sync.title = 'Синхронизировать Google и Яндекс';
      sync.setAttribute('aria-label', 'Синхронизировать Google и Яндекс');
    }
  }

  const observer = new MutationObserver(() => {
    createVisibleScroll();
    updateScrollUi();
    clarifyHeader();
  });

  function install() {
    createVisibleScroll();
    clarifyHeader();
    const main = $('.main-content');
    const header = $('.app-header');
    if (main) observer.observe(main, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    if (header) observer.observe(header, { childList:true, subtree:true, attributes:true, attributeFilter:['data-status','data-queue','class'] });
    window.addEventListener('resize', updateScrollUi, { passive:true });
  }

  globalThis.PMK_PERIOD_HEADER_PROVIDER_V85_API = { providerSet, providerBadges, createVisibleScroll, updateScrollUi, clarifyHeader, renderCardV85 };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once:true });
  else requestAnimationFrame(install);
})();
//# sourceURL=period-header-provider-v85.js

/* ===== mobile-workflow-fixes-v86.js ===== */
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

//# sourceURL=mobile-workflow-fixes-v86.js

/* ===== workday-period-note-v86.js ===== */
'use strict';

(() => {
  if (globalThis.PMK_WORKDAY_PERIOD_NOTE_V86) return;
  globalThis.PMK_WORKDAY_PERIOD_NOTE_V86 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const previousRenderPeriod = renderPeriod;

  function providerBadges(event) {
    return globalThis.PMK_PERIOD_HEADER_PROVIDER_V85_API?.providerBadges?.(event) || '';
  }

  function renderCardV86(event) {
    const data = eventMeta(event);
    const start = event.start?.dateTime || event.start;
    const end = event.end?.dateTime || event.end;
    const currentStatus = statusInfo(data.requestStatus, data.visitType);
    const title = data.customerName || event.summary || 'Заявка';
    const dateKey = eventDateKey(event);
    const date = dateKeyForDisplay(dateKey);
    const comment = eventCommentText(data);
    const id = escapeHtml(String(event.id || ''));
    const phone = String(data.phone || '').trim();

    return `<article class="event-card event-card-v86 status-${currentStatus.className}" data-event-card="${id}">
      <div class="event-time">
        <small class="event-date">${formatDateShort(dateKey)}</small>
        <small class="event-weekday">${escapeHtml(date.toLocaleDateString('ru-RU', { weekday:'long', timeZone:'UTC' }))}</small>
        <strong>${formatTime(start)}–${formatTime(end)}</strong>
        <span>${data.visitType === 'delivery' ? 'Доставка' : 'Забор'}</span>
        <div class="event-time-status-grid-v86" aria-label="Изменить статус заявки">${statusButtons(event.id, data.requestStatus)}</div>
      </div>
      <div class="event-main">
        <div class="event-contract-provider-row">
          ${renderContractControl(event, data)}
          ${providerBadges(event)}
        </div>
        <div class="event-card-header event-card-header-v86">
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
      <div class="event-card-footer-v86">
        ${phone ? `<a class="mini-button call-button call-button-v86" href="${phoneLink(phone)}">☎ Позвонить</a>` : '<button type="button" class="mini-button call-button-v86 phone-missing" disabled>Телефон не указан</button>'}
        <button type="button" class="mini-button open-button secondary-card-action" data-open-event="${id}">Открыть</button>
        <details class="card-menu">
          <summary class="mini-button menu-button" aria-label="Дополнительные действия">⋮</summary>
          <div class="card-menu-popover">
            <button type="button" data-edit-event="${id}">Редактировать заявку</button>
            <button type="button" class="danger-menu-item" data-delete-event="${id}">Удалить заявку</button>
          </div>
        </details>
      </div>
    </article>`;
  }

  renderEventCard = renderCardV86;

  function fixPeriodBoard(period = state.currentView) {
    const board = $('#weekEvents');
    if (!board) return;
    const scrollable = period === 'three-days' || period === 'week';
    board.classList.toggle('pmk-scrollable-period-v86', scrollable);
    if (scrollable) {
      board.style.width = '100%';
      board.style.maxWidth = '100%';
      board.style.minWidth = '0';
      requestAnimationFrame(() => globalThis.PMK_PERIOD_HEADER_PROVIDER_V85_API?.updateScrollUi?.());
    } else {
      board.classList.remove('pmk-scrollable-period-v86');
    }
  }

  renderPeriod = function renderPeriodScrollableV86(events, dateKeys, period = 'week') {
    const result = previousRenderPeriod(events, dateKeys, period);
    requestAnimationFrame(() => fixPeriodBoard(period));
    return result;
  };

  function enforceTwoLineNote() {
    const textarea = $('#pmkCompactNoteText');
    if (!textarea) return;
    textarea.rows = 2;
    if (!textarea.value) textarea.style.height = '56px';
  }

  const observer = new MutationObserver(() => {
    fixPeriodBoard();
    enforceTwoLineNote();
  });

  function install() {
    fixPeriodBoard();
    enforceTwoLineNote();
    const main = $('.main-content');
    if (main) observer.observe(main, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  }

  globalThis.PMK_WORKDAY_PERIOD_NOTE_V86_API = { renderCardV86, fixPeriodBoard, enforceTwoLineNote };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once:true });
  else requestAnimationFrame(install);
})();
//# sourceURL=workday-period-note-v86.js

/* ===== version-guard-v87.js ===== */
'use strict';

(() => {
  const VERSION = '87';
  globalThis.PMK_APP_VERSION = VERSION;
  document.documentElement.dataset.pmkVersion = VERSION;

  function applyVersion() {
    const heading = document.querySelector('#view-settings > .page-heading');
    if (!heading) return false;
    let panel = document.querySelector('#settingsVersionHeader');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'settingsVersionHeader';
      panel.className = 'settings-version-header';
      panel.innerHTML = '<div class="settings-version-info"><span class="settings-version-label">Версия приложения</span><strong id="settingsVersionValue"></strong><small id="settingsVersionRelease"></small></div><a id="settingsUpdateButton" class="button button-primary settings-update-button">Обновить приложение</a>';
      heading.insertAdjacentElement('afterend', panel);
    }
    panel.querySelector('#settingsVersionValue').textContent = 'v87';
    panel.querySelector('#settingsVersionRelease').textContent = 'Настоящий свайп, статусы 2×2 и заметка в 2 строки · 2026-07-01';
    panel.querySelector('#settingsUpdateButton').href = './reset.html?v=87-settings';
    return true;
  }

  function install() {
    applyVersion();
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-view="settings"], .nav-settings')) return;
      requestAnimationFrame(applyVersion);
    }, true);
    globalThis.dispatchEvent(new CustomEvent('pmk-version-ready', { detail:{ version:VERSION } }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
//# sourceURL=version-guard-v87.js