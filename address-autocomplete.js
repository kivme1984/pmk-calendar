'use strict';

globalThis.PMK_ADDRESS_FAST_SELECT_V82_22 = true;
globalThis.PMK_ADDRESS_INSTANT_SELECT_V82_23 = true;

const PMK_ADDRESS_API_URL = 'https://lucky-math-8e63pmk-address.standart-media.workers.dev/suggest';
const PMK_DISTRICTS = [
  'Автозаводский', 'Ленинский', 'Канавинский', 'Московский',
  'Сормовский', 'Нижегородский', 'Советский', 'Приокский',
];

let addressAbortController = null;
let addressDebounceTimer = null;
let addressActiveIndex = -1;
let addressSuggestions = [];
let addressApplyRequestId = 0;
let addressPreviewTimer = null;

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

  if (backendMessage.includes('DADATA_API_KEY is not configured')) return 'В Cloudflare не найден секрет DADATA_API_KEY. Проверьте точное имя переменной и выполните Deploy.';
  if (status === 401) return 'DaData отклонила API-ключ: ошибка 401. Проверьте, что в Value вставлен верхний «API-ключ», без слова Token и без пробелов.';
  if (status === 403) return 'DaData запретила доступ: ошибка 403. Проверьте подтверждение почты и активность API-ключа в личном кабинете.';
  if (status === 429) return 'Превышен лимит запросов DaData. Попробуйте позже.';
  if (status >= 500) return `Cloudflare Worker вернул ошибку ${status}${backendMessage ? `: ${backendMessage}` : ''}.`;
  if (details.includes('unauthorized') || details.includes('token')) return 'DaData не приняла API-ключ. Проверьте значение секрета DADATA_API_KEY.';
  if (error.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(backendMessage)) return 'Нет соединения с Cloudflare Worker или запрос заблокирован браузером. Откройте страницу проверки сервиса.';
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

function setAddressValue(selector, value) {
  const element = qs(selector);
  if (!element || value == null || value === '') return false;
  element.value = value;
  return true;
}

function scheduleAddressAfterFill(districtChanged = false) {
  clearTimeout(addressPreviewTimer);
  addressPreviewTimer = setTimeout(() => {
    try { if (districtChanged) qs('#district')?.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
    try { schedulePreviewUpdate(); } catch {}
    try { qs('#requestForm')?.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
  }, 90);
}

function applyAddressFieldsFromSuggestion(selected = {}) {
  const data = selected.data || {};
  const settlement = settlementFromAddressData(data);
  const district = districtFromAddressData(data);
  const house = [data.house, data.block ? `к ${data.block}` : ''].filter(Boolean).join(' ');

  setAddressValue('#settlement', settlement || 'Нижний Новгород');
  setAddressValue('#street', data.street_with_type || data.street || '');
  setAddressValue('#houseNumber', house);
  setAddressValue('#apartmentNumber', data.flat || '');
  const districtChanged = district ? setAddressValue('#district', district) : false;

  scheduleAddressAfterFill(districtChanged);

  return { settlement, district, hasStreet: Boolean(data.street_with_type || data.street), hasHouse: Boolean(house) };
}

function updateAddressStatusFromResult(result = {}) {
  if (result.district && result.district !== 'За городом') addressStatus(`Адрес вставлен. Район: ${result.district}`, 'success');
  else if (result.district === 'За городом') addressStatus('Адрес вставлен. Выезд за город — проверьте стоимость доставки.', 'warning');
  else addressStatus('Адрес вставлен. Если район не определился — выберите его вручную.', 'warning');
}

function applyAddressSuggestion(item) {
  const input = qs('#addressSearch');
  if (!input || !item) return;

  addressApplyRequestId += 1;
  clearTimeout(addressDebounceTimer);
  addressAbortController?.abort();
  addressAbortController = null;

  input.value = item.value || '';
  closeAddressSuggestions();

  const result = applyAddressFieldsFromSuggestion(item);
  updateAddressStatusFromResult(result);
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
    }, 220);
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
    } else if (event.key === 'Escape') closeAddressSuggestions();
  });

  function pick(event) {
    const button = event.target.closest('[data-address-index]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    applyAddressSuggestion(addressSuggestions[Number(button.dataset.addressIndex)]);
  }

  qs('#addressSuggestions').addEventListener('touchstart', pick, { passive: false });
  qs('#addressSuggestions').addEventListener('pointerdown', pick, { passive: false });
  qs('#addressSuggestions').addEventListener('click', pick);

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