'use strict';

// После создания Cloudflare Worker сюда будет записан его публичный адрес.
const PMK_ADDRESS_API_URL = '';
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
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Ошибка адресного сервиса: ${response.status}`);
  }
  const payload = await response.json();
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
        addressStatus('Сервис адресов временно недоступен. Заполните поля вручную.', 'error');
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
