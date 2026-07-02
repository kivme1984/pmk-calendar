import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const createEvent = (data, overrides = {}) => ({
  id: overrides.id || `google-${data.pmkId}`,
  summary: data.customerName,
  location: 'Нижний Новгород, ул. Тестовая, д. 1',
  start: { dateTime: `${data.visitDate}T${data.startTime}:00` },
  end: { dateTime: `${data.visitDate}T${data.endTime}:00` },
  extendedProperties: { private: {} },
  _pmkId: data.pmkId,
  _providers: overrides.providers || [],
  _provider: overrides.provider,
});

try {
  await page.goto('http://127.0.0.1:8000/test-v82-19.html?ci=event-cloud', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });

  await page.waitForFunction(() => Boolean(
    window.PMK_EVENT_CLOUD_INDICATORS_V82_19
    && window.PMK_EVENT_CLOUD_INDICATORS_V82_19_API
    && window.PMK_STATUS_LEDGER_V80
    && typeof renderToday === 'function'
    && typeof encodePmkData === 'function'
  ), null, { timeout: 120000 });

  const synced = await page.evaluate(() => {
    const dateKey = businessTodayKey();
    const data = {
      pmkId: 'ci-cloud-both',
      customerName: 'Проверка облака',
      phone: '+79990000000',
      contractNumber: '8219',
      visitDate: dateKey,
      startTime: '10:00',
      endTime: '10:30',
      district: 'Советский',
      visitType: 'pickup',
      requestStatus: 'pending-pickup',
      rugs: [],
    };
    const event = {
      id: 'google-ci-cloud-both',
      summary: data.customerName,
      location: 'Нижний Новгород, ул. Тестовая, д. 1',
      start: { dateTime: `${dateKey}T10:00:00` },
      end: { dateTime: `${dateKey}T10:30:00` },
      extendedProperties: { private: encodePmkData(data) },
      _pmkId: data.pmkId,
      _providers: ['google', 'yandex'],
    };
    state.events = [event];
    state.localEvents = [];
    localStorage.removeItem('pmk-calendar-provider-queue-v1');
    invalidateEventCaches();
    renderToday([event]);
    PMK_EVENT_CLOUD_INDICATORS_V82_19_API.renderNow();

    const card = document.querySelector('.event-card[data-event-card]');
    const indicator = card.querySelector('.pmk-event-cloud-status-v82-19');
    const google = indicator.querySelector('[data-event-cloud-provider="google"]');
    const yandex = indicator.querySelector('[data-event-cloud-provider="yandex"]');
    const googleStyle = getComputedStyle(google);
    const yandexStyle = getComputedStyle(yandex);
    return {
      previousClass: indicator.previousElementSibling?.className || '',
      contract: card.querySelector('.contract-chip')?.textContent.trim() || '',
      googleState: indicator.dataset.google,
      yandexState: indicator.dataset.yandex,
      googleColor: googleStyle.color,
      yandexColor: yandexStyle.color,
      googleBackground: googleStyle.backgroundColor,
      yandexBackground: yandexStyle.backgroundColor,
      googleBorder: googleStyle.borderTopWidth,
      yandexBorder: yandexStyle.borderTopWidth,
      letters: indicator.textContent.replace(/\s+/g, ''),
    };
  });

  if (!synced.previousClass.includes('contract-control') || !synced.contract.includes('8219')) {
    throw new Error(`Indicators are not next to contract number: ${JSON.stringify(synced)}`);
  }
  if (synced.googleState !== 'synced' || synced.yandexState !== 'synced') {
    throw new Error(`Both providers should be synced: ${JSON.stringify(synced)}`);
  }
  if (synced.googleColor !== 'rgb(26, 115, 232)' || synced.yandexColor !== 'rgb(252, 63, 29)') {
    throw new Error(`Provider colors are incorrect: ${JSON.stringify(synced)}`);
  }
  if (synced.googleBackground !== 'rgba(0, 0, 0, 0)' || synced.yandexBackground !== 'rgba(0, 0, 0, 0)' || synced.googleBorder !== '0px' || synced.yandexBorder !== '0px') {
    throw new Error(`Indicators are not minimal text-only letters: ${JSON.stringify(synced)}`);
  }
  if (synced.letters !== 'GЯ') throw new Error(`Unexpected provider letters: ${JSON.stringify(synced)}`);

  const pending = await page.evaluate(() => {
    localStorage.setItem('pmk-calendar-provider-queue-v1', JSON.stringify([
      { provider: 'yandex', op: 'upsert', pmkId: 'ci-cloud-both', savedAt: new Date().toISOString() },
    ]));
    PMK_EVENT_CLOUD_INDICATORS_V82_19_API.renderNow();
    const indicator = document.querySelector('.event-card .pmk-event-cloud-status-v82-19');
    return {
      google: indicator.dataset.google,
      yandex: indicator.dataset.yandex,
      googleColor: getComputedStyle(indicator.querySelector('[data-event-cloud-provider="google"]')).color,
      yandexColor: getComputedStyle(indicator.querySelector('[data-event-cloud-provider="yandex"]')).color,
      yandexTitle: indicator.querySelector('[data-event-cloud-provider="yandex"]').title,
    };
  });

  if (pending.google !== 'synced' || pending.yandex !== 'pending' || pending.googleColor !== 'rgb(26, 115, 232)' || pending.yandexColor !== 'rgb(154, 154, 154)' || !pending.yandexTitle.includes('ожидают синхронизации')) {
    throw new Error(`Pending Yandex update was not shown as gray: ${JSON.stringify(pending)}`);
  }

  const localOnly = await page.evaluate(() => {
    const dateKey = businessTodayKey();
    const data = {
      pmkId: 'ci-cloud-local', customerName: 'Локальная заявка', phone: '+79990000001', contractNumber: '8220',
      visitDate: dateKey, startTime: '11:00', endTime: '11:30', district: 'Советский', visitType: 'pickup', requestStatus: 'pending-pickup', rugs: [],
    };
    const event = {
      id: 'local-ci-cloud-local', summary: data.customerName,
      start: { dateTime: `${dateKey}T11:00:00` }, end: { dateTime: `${dateKey}T11:30:00` },
      extendedProperties: { private: encodePmkData(data) }, _pmkId: data.pmkId,
    };
    localStorage.removeItem('pmk-calendar-provider-queue-v1');
    state.events = [];
    state.localEvents = [event];
    invalidateEventCaches();
    renderToday([event]);
    PMK_EVENT_CLOUD_INDICATORS_V82_19_API.renderNow();
    const indicator = document.querySelector('.event-card .pmk-event-cloud-status-v82-19');
    return {
      google: indicator.dataset.google,
      yandex: indicator.dataset.yandex,
      googleColor: getComputedStyle(indicator.querySelector('[data-event-cloud-provider="google"]')).color,
      yandexColor: getComputedStyle(indicator.querySelector('[data-event-cloud-provider="yandex"]')).color,
    };
  });

  if (localOnly.google !== 'offline' || localOnly.yandex !== 'offline' || localOnly.googleColor !== 'rgb(165, 165, 165)' || localOnly.yandexColor !== 'rgb(165, 165, 165)') {
    throw new Error(`Local event should show two gray letters: ${JSON.stringify(localOnly)}`);
  }

  const period = await page.evaluate(() => {
    const dateKey = businessTodayKey();
    const data = {
      pmkId: 'ci-cloud-period', customerName: 'Недельная заявка', phone: '+79990000002', contractNumber: '8221',
      visitDate: dateKey, startTime: '12:00', endTime: '12:30', district: 'Советский', visitType: 'pickup', requestStatus: 'pending-pickup', rugs: [],
    };
    const event = {
      id: 'google-ci-cloud-period', summary: data.customerName,
      start: { dateTime: `${dateKey}T12:00:00` }, end: { dateTime: `${dateKey}T12:30:00` },
      extendedProperties: { private: encodePmkData(data) }, _pmkId: data.pmkId, _providers: ['google'],
    };
    state.events = [event];
    state.localEvents = [];
    invalidateEventCaches();
    renderPeriod([event], [dateKey], 'week');
    PMK_EVENT_CLOUD_INDICATORS_V82_19_API.renderNow();
    const indicator = document.querySelector('.day-event .pmk-event-cloud-status-v82-19');
    return {
      exists: Boolean(indicator),
      previous: indicator?.previousElementSibling?.textContent.trim() || '',
      google: indicator?.dataset.google || '',
      yandex: indicator?.dataset.yandex || '',
      letters: indicator?.textContent.replace(/\s+/g, '') || '',
    };
  });

  if (!period.exists || !period.previous.startsWith('Договор №') || period.google !== 'synced' || period.yandex !== 'offline' || period.letters !== 'GЯ') {
    throw new Error(`Period indicator integration failed: ${JSON.stringify(period)}`);
  }

  console.log(JSON.stringify({ synced, pending, localOnly, period }));
} finally {
  await browser.close();
}
