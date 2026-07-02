import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.addInitScript(() => {
  if (!sessionStorage.getItem('pmk-ci-started')) {
    localStorage.clear();
    sessionStorage.setItem('pmk-ci-started', '1');
  }
});

const openNav = async view => {
  const open = await page.evaluate(() => document.querySelector('#sidebar')?.classList.contains('open'));
  if (!open) await page.click('#menuToggle');
  await page.evaluate(target => {
    const item = document.querySelector(`.nav-item[data-view="${target}"]`);
    if (!item) throw new Error(`Navigation item not found: ${target}`);
    item.click();
  }, view);
};
const waitView = view => page.waitForFunction(target => {
  const id = ['week', 'month'].includes(target) ? 'view-week' : `view-${target === 'day' ? 'today' : target}`;
  return typeof state !== 'undefined' && state.currentView === target && document.querySelector(`#${id}`)?.classList.contains('active');
}, view, { timeout: 30000 });
const showFullForm = async () => {
  if (await page.locator('#customerName').isVisible()) return;
  await page.click('#v50Summary [data-v50-action="full"]');
  await page.waitForSelector('#customerName', { state: 'visible' });
};
const nextMonday = () => page.evaluate(() => {
  let key = businessTodayKey();
  for (let i = 0; i < 14; i += 1) {
    if (new Date(`${key}T12:00:00Z`).getUTCDay() === 1) return key;
    key = addDaysToKey(key, 1);
  }
  return businessTodayKey();
});

try {
  await page.goto('http://127.0.0.1:8000/test-v82-19.html?ci=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => Boolean(
    window.PMK_FINAL_UI_V82_10 && window.PMK_FINAL_LAYOUT_LOCK_V82_12
    && window.PMK_PERIOD_DIRECT_V82_19 && window.PMK_WEEK_TOUCH_SCROLL_V82_20
    && window.PMK_STABLE_VERSION_LABEL_V82_19 && window.PMK_COMPLETED_ARCHIVE_WORKFLOW_V82
    && window.PMK_SEARCH_NORMALIZATION_V82_19
  ), null, { timeout: 120000 });
  await page.waitForSelector('#menuToggle', { state: 'visible' });

  const identity = await page.evaluate(() => ({
    title: document.title,
    label: document.querySelector('#pmkVersionIndicator')?.textContent?.trim() || '',
    badge: document.querySelector('#pmkStableBuildBadgeV8219')?.textContent?.trim() || '',
    compatibilityCounter: Boolean(document.querySelector('#threeDaysCount')),
  }));
  if (!identity.title.includes('82.19.1') || !identity.label.includes('82.19.1') || !identity.badge || !identity.compatibilityCounter) {
    throw new Error(`Stable identity failed: ${JSON.stringify(identity)}`);
  }

  const initialDay = await page.inputValue('#jumpDate');
  await page.click('#nextDayBtn');
  await page.waitForFunction(key => document.querySelector('#jumpDate')?.value === addDaysToKey(key, 1), initialDay);
  await page.click('#prevDayBtn');
  await page.waitForFunction(key => document.querySelector('#jumpDate')?.value === key, initialDay);

  await openNav('week');
  await waitView('week');
  await page.waitForFunction(() => document.querySelector('#weekEvents.pmk-week-v82-19')?.querySelectorAll('.day-column').length === 7);
  const weekAnchor = await page.evaluate(() => state.periodAnchorKey);
  await page.click('#nextPeriodBtn');
  await page.waitForFunction(key => state.periodAnchorKey === addDaysToKey(key, 7), weekAnchor);
  await page.click('#prevPeriodBtn');
  await page.waitForFunction(key => state.periodAnchorKey === key, weekAnchor);

  const retainedScroll = await page.evaluate(async () => {
    const board = document.querySelector('#weekEvents');
    board.scrollLeft = Math.min(360, Math.max(220, board.scrollWidth - board.clientWidth - 20));
    const before = board.scrollLeft;
    renderAll();
    await new Promise(resolve => setTimeout(resolve, 1900));
    return { before, after: board.scrollLeft };
  });
  if (retainedScroll.before < 150 || retainedScroll.after < retainedScroll.before - 80) {
    throw new Error(`Week scroll position was lost: ${JSON.stringify(retainedScroll)}`);
  }

  const gesture = await page.evaluate(async () => {
    document.body.style.minHeight = '2600px';
    const board = document.querySelector('#weekEvents');
    const fire = (target, type, x, y) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      const point = { clientX: x, clientY: y };
      Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [point] });
      Object.defineProperty(event, 'changedTouches', { value: [point] });
      target.dispatchEvent(event);
    };
    let target = board.querySelector('.day-column');
    window.scrollTo(0, 0);
    fire(target, 'touchstart', 210, 700); fire(target, 'touchmove', 208, 500); fire(target, 'touchmove', 207, 290); fire(target, 'touchend', 207, 290);
    await new Promise(resolve => setTimeout(resolve, 90));
    const vertical = window.scrollY;
    target = board.querySelector('.day-column'); board.scrollLeft = 0;
    fire(target, 'touchstart', 350, 410); fire(target, 'touchmove', 210, 408); fire(target, 'touchmove', 80, 407); fire(target, 'touchend', 80, 407);
    await new Promise(resolve => setTimeout(resolve, 90));
    return { vertical, horizontal: board.scrollLeft };
  });
  if (gesture.vertical < 200 || gesture.horizontal < 120) throw new Error(`Touch navigation failed: ${JSON.stringify(gesture)}`);

  await openNav('month');
  await waitView('month');
  await page.waitForFunction(() => {
    const board = document.querySelector('#weekEvents.pmk-month-v82-19');
    const columns = board?.querySelectorAll('.day-column').length || 0;
    return columns >= 28 && board.querySelectorAll('.pmk-month-count-v82-19').length === columns;
  });

  const monday = await nextMonday();
  await openNav('form');
  await waitView('form');
  await showFullForm();
  await page.fill('#customerName', 'Тест Навигации');
  await page.fill('#phone', '+7 999 111-22-33');
  await page.selectOption('#district', { label: 'Автозаводский' });
  await page.fill('#street', 'Тестовая улица');
  await page.fill('#houseNumber', '19');
  await page.fill('#visitDate', monday);
  await page.fill('#startTime', '14:00');
  await page.dispatchEvent('#startTime', 'change');
  await page.fill('#estimatedPrice', '2200');
  await page.fill('#contractNumber', '82191');
  await page.evaluate(() => document.querySelector('#submitBtn').click());
  await page.waitForFunction(() => state.localEvents.some(event => eventMeta(event).customerName === 'Тест Навигации'), null, { timeout: 30000 });
  const eventId = await page.evaluate(() => state.localEvents.find(event => eventMeta(event).customerName === 'Тест Навигации')?.id || '');
  if (!eventId) throw new Error('Created event id was not found');

  await openNav('search');
  await waitView('search');
  await page.fill('#globalSearch', '9991112233');
  await page.waitForFunction(() => document.querySelectorAll('#searchResults [data-event-card]').length === 1);

  await page.evaluate(id => openEvent(id), eventId);
  await waitView('form');
  await showFullForm();
  await page.fill('#estimatedPrice', '2600');
  await page.fill('#managerComment', 'Проверено автотестом');
  await page.evaluate(() => document.querySelector('#submitBtn').click());
  await page.waitForFunction(id => {
    const event = state.localEvents.find(item => item.id === id);
    const data = event && eventMeta(event);
    return data?.estimatedPrice === 2600 && data?.managerComment === 'Проверено автотестом';
  }, eventId);

  for (const nextStatus of ['picked-up', 'pending-delivery', 'completed']) {
    await page.evaluate(async ({ id, status }) => updateEventStatus(id, status), { id: eventId, status: nextStatus });
    await page.waitForFunction(({ id, status }) => {
      const event = state.localEvents.find(item => item.id === id);
      return event && eventMeta(event).requestStatus === status;
    }, { id: eventId, status: nextStatus });
  }
  await openNav('completed');
  await waitView('completed');
  await page.waitForFunction(id => Boolean(document.querySelector(`[data-history-event="${id}"]`)), eventId);

  await page.evaluate(({ id, completedAt }) => {
    const event = state.localEvents.find(item => item.id === id);
    const data = { ...eventMeta(event), eventId: id, requestStatus: 'completed', completedAt };
    Object.assign(event, toGoogleEvent(data), { updated: completedAt });
    persistLocalEvents(); renderAll();
  }, { id: eventId, completedAt: new Date(Date.now() - 8 * 86400000).toISOString() });
  await openNav('archive');
  await waitView('archive');
  await page.waitForFunction(id => Boolean(document.querySelector(`[data-history-event="${id}"]`)), eventId);

  await openNav('reminder');
  await waitView('reminder');
  await page.fill('#reminderDate', monday);
  await page.fill('#reminderTime', '12:00');
  await page.fill('#reminderText', 'Проверить резервную версию');
  await page.evaluate(() => document.querySelector('#reminderForm button[type="submit"]').click());
  await page.waitForFunction(() => state.localEvents.some(event => String(event.id).startsWith('local-reminder-')));

  await openNav('settings');
  await waitView('settings');
  await page.fill('#minimumOrderSetting', '1950');
  await page.fill('#durationSetting', '45');
  await page.click('#saveSettingsBtn');
  await page.waitForFunction(() => state.settings.minimumOrder === 1950 && state.settings.duration === 45);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(id => Boolean(
    window.PMK_STABLE_VERSION_LABEL_V82_19 && state.settings.minimumOrder === 1950 && state.settings.duration === 45
    && state.localEvents.some(event => event.id === id)
    && state.localEvents.some(event => String(event.id).startsWith('local-reminder-'))
  ), eventId, { timeout: 120000 });

  page.once('dialog', dialog => dialog.accept());
  await page.evaluate(async id => deleteEvent(id), eventId);
  await page.waitForFunction(id => !state.localEvents.some(event => event.id === id), eventId);
  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);

  console.log(JSON.stringify({ identity, retainedScroll, gesture, eventId }));
} finally {
  await browser.close();
}
