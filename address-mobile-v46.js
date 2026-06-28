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
