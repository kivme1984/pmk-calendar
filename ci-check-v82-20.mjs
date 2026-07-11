import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

await page.addInitScript(() => {
  try { localStorage.clear(); } catch {}
});

const openNav = async (view) => {
  await page.click('#menuToggle');
  await page.evaluate((target) => {
    const item = document.querySelector(`.nav-item[data-view="${target}"]`);
    if (!item) throw new Error(`Navigation item not found: ${target}`);
    item.click();
  }, view);
};

const injectEvents = async () => {
  await page.evaluate(() => {
    const date = businessTodayKey();
    const base = (pmkId, customerName, contractNumber, startTime) => ({
      version: 1,
      pmkId,
      eventId: '',
      visitType: 'pickup',
      customerName,
      phone: '+79990000000',
      orderSource: 'Тест',
      settlement: '',
      street: 'Тестовая',
      houseNumber: '1',
      apartmentNumber: '',
      entrance: '',
      floor: '',
      address: 'Тестовая, 1',
      district: 'Автозаводский',
      visitDate: date,
      startTime,
      endTime: addMinutesToTime(startTime, 30),
      timeNote: '',
      requestStatus: 'pending-pickup',
      rugs: [{ length: 2, width: 3, issues: [], services: [] }],
      issues: [],
      services: [],
      estimatedPrice: 2100,
      discount: 0,
      contractNumber,
      regularCustomer: false,
      callAhead: false,
      callAheadMinutes: 30,
      managerComment: '',
    });
    const event = (id, data, extra = {}) => ({
      id,
      ...toGoogleEvent(data),
      updated: new Date().toISOString(),
      _pmkId: data.pmkId,
      ...extra,
    });

    const localData = base('pmk-local-proof', 'Локальная заявка', '101', '09:00');
    const googleData = base('pmk-google-proof', 'Google заявка', '102', '10:00');
    const bothData = base('pmk-both-proof', 'Два календаря', '103', '11:00');

    state.localEvents = [event('local-proof', localData)];
    state.events = [
      event('google-proof', googleData, { _providers: ['google'] }),
      event('both-proof', bothData, { _providers: ['google', 'yandex'], _yandexMirror: true }),
    ];
    state.selectedDayKey = date;
    state.periodAnchorKey = date;
    state.currentView = 'day';
    invalidateEventCaches();
    renderAll();
    window.PMK_EVENT_PROVIDER_BADGES_V82_20_API?.decorateAll();
  });
};

const badgeState = async (id) => page.evaluate((eventId) => {
  const card = document.querySelector(`[data-event-card="${eventId}"]`);
  if (!card) return null;
  const google = card.querySelector('.pmk-event-provider-google');
  const yandex = card.querySelector('.pmk-event-provider-yandex');
  return {
    google: google?.classList.contains('is-synced') || false,
    yandex: yandex?.classList.contains('is-synced') || false,
    nearContract: Boolean(card.querySelector('.event-card-header .contract-control + [data-pmk-event-providers]')),
  };
}, id);

try {
  await page.goto('http://127.0.0.1:8000/test-v82-20.html?ci=1', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.waitForFunction(() => Boolean(
    window.PMK_FINAL_UI_V82_10
    && window.PMK_FINAL_LAYOUT_LOCK_V82_12
    && window.PMK_PERIOD_DIRECT_V82_19
    && window.PMK_WEEK_TOUCH_SCROLL_V82_20
    && window.PMK_EVENT_PROVIDER_BADGES_V82_20
  ), null, { timeout: 120000 });
  await page.waitForSelector('#menuToggle', { state: 'visible' });

  await injectEvents();
  await page.waitForFunction(() => document.querySelectorAll('[data-event-card] [data-pmk-event-providers]').length === 3, null, { timeout: 30000 });

  const local = await badgeState('local-proof');
  const google = await badgeState('google-proof');
  const both = await badgeState('both-proof');
  if (!local || local.google || local.yandex || !local.nearContract) {
    throw new Error(`Local badge state failed: ${JSON.stringify(local)}`);
  }
  if (!google || !google.google || google.yandex || !google.nearContract) {
    throw new Error(`Google badge state failed: ${JSON.stringify(google)}`);
  }
  if (!both || !both.google || !both.yandex || !both.nearContract) {
    throw new Error(`Dual badge state failed: ${JSON.stringify(both)}`);
  }

  await openNav('week');
  await page.waitForFunction(() => {
    const board = document.querySelector('#weekEvents');
    return document.querySelector('#periodTitle')?.textContent?.trim() === 'Неделя'
      && board?.classList.contains('pmk-week-v82-19')
      && board.querySelectorAll('.day-column').length === 7
      && board.querySelectorAll('.day-event [data-pmk-event-providers]').length === 3;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(1900);

  const gesture = await page.evaluate(async () => {
    document.body.style.minHeight = '2400px';
    const board = document.querySelector('#weekEvents');
    if (!board) throw new Error('Week board not found');

    const fire = (target, type, x, y) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      const point = { clientX: x, clientY: y };
      Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [point] });
      Object.defineProperty(event, 'changedTouches', { value: [point] });
      target.dispatchEvent(event);
    };

    let target = board.querySelector('.day-column');
    if (!target) throw new Error('Week day card not found');
    window.scrollTo(0, 0);
    fire(target, 'touchstart', 210, 700);
    fire(target, 'touchmove', 208, 500);
    fire(target, 'touchmove', 207, 290);
    fire(target, 'touchend', 207, 290);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const vertical = window.scrollY;

    target = board.querySelector('.day-column');
    board.scrollLeft = 0;
    fire(target, 'touchstart', 350, 410);
    fire(target, 'touchmove', 210, 408);
    fire(target, 'touchmove', 80, 407);
    fire(target, 'touchend', 80, 407);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const horizontal = board.scrollLeft;
    return { vertical, horizontal };
  });

  if (gesture.vertical < 200) throw new Error(`Vertical card scroll failed: ${JSON.stringify(gesture)}`);
  if (gesture.horizontal < 120) throw new Error(`Horizontal week scroll failed: ${JSON.stringify(gesture)}`);

  await openNav('month');
  await page.waitForFunction(() => {
    const board = document.querySelector('#weekEvents');
    const columns = board?.querySelectorAll('.day-column').length || 0;
    return document.querySelector('#periodTitle')?.textContent?.trim() === 'Месяц'
      && board?.classList.contains('pmk-month-v82-19')
      && columns >= 28
      && board.querySelectorAll('.pmk-month-count-v82-19').length === columns;
  }, null, { timeout: 30000 });

  await openNav('day');
  await page.waitForFunction(() => document.querySelector('#view-today')?.classList.contains('active'), null, { timeout: 30000 });

  console.log(JSON.stringify({ local, google, both, gesture }));
} finally {
  await browser.close();
}
