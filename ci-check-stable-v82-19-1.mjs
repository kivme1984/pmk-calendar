import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

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

try {
  await page.goto('http://127.0.0.1:8000/stable-v82-19-1.html?ci=1', {
    waitUntil: 'domcontentloaded', timeout: 120000,
  });
  await page.waitForFunction(() => Boolean(
    window.PMK_FINAL_UI_V82_10
    && window.PMK_FINAL_LAYOUT_LOCK_V82_12
    && window.PMK_PERIOD_DIRECT_V82_19
    && window.PMK_WEEK_TOUCH_SCROLL_V82_20
  ), null, { timeout: 120000 });
  await page.waitForSelector('#menuToggle', { state: 'visible' });

  const version = await page.evaluate(() => ({
    title: document.title,
    indicator: document.querySelector('#pmkVersionIndicator')?.textContent?.trim() || '',
  }));
  if (!version.title.includes('82.19.1') || !version.indicator.includes('82.19.1')) {
    throw new Error(`Version label failed: ${JSON.stringify(version)}`);
  }

  await openNav('week');
  await page.waitForFunction(() => {
    const board = document.querySelector('#weekEvents');
    return state.currentView === 'week'
      && board?.classList.contains('pmk-week-v82-19')
      && board.querySelectorAll('.day-column').length === 7;
  }, null, { timeout: 30000 });

  const beforeAnchor = await page.evaluate(() => state.periodAnchorKey);
  await page.click('#nextPeriodBtn');
  await page.waitForTimeout(100);
  const afterAnchor = await page.evaluate(() => state.periodAnchorKey);
  if (!beforeAnchor || beforeAnchor === afterAnchor) throw new Error('Next period did not change the week');
  await page.click('#prevPeriodBtn');

  const preservedScroll = await page.evaluate(async () => {
    const board = document.querySelector('#weekEvents');
    board.scrollLeft = 240;
    renderAll();
    await new Promise((resolve) => setTimeout(resolve, 1900));
    return board.scrollLeft;
  });
  if (preservedScroll < 150) throw new Error(`Week scroll position reset: ${preservedScroll}`);

  const gesture = await page.evaluate(async () => {
    document.body.style.minHeight = '2400px';
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
    return { vertical, horizontal: board.scrollLeft };
  });
  if (gesture.vertical < 200 || gesture.horizontal < 120) {
    throw new Error(`Touch navigation failed: ${JSON.stringify(gesture)}`);
  }

  await openNav('month');
  await page.waitForFunction(() => {
    const board = document.querySelector('#weekEvents');
    const columns = board?.querySelectorAll('.day-column').length || 0;
    return state.currentView === 'month'
      && board?.classList.contains('pmk-month-v82-19')
      && columns >= 28
      && board.querySelectorAll('.pmk-month-count-v82-19').length === columns;
  }, null, { timeout: 30000 });

  await openNav('form');
  await page.fill('#customerName', 'Тест Навигации');
  await page.fill('#phone', '+79990000001');
  await page.selectOption('#district', { label: 'Автозаводский' });
  await page.fill('#street', 'Тестовая');
  await page.fill('#houseNumber', '1');
  await page.fill('#visitDate', await page.evaluate(() => businessTodayKey()));
  await page.fill('#startTime', '14:00');
  await page.fill('#endTime', '14:30');
  await page.fill('#estimatedPrice', '2000');
  await page.click('#saveDraftBtn');
  await page.waitForFunction(() => state.localEvents.some((event) => event.summary?.includes('Тест Навигации')), null, { timeout: 30000 });

  const savedId = await page.evaluate(() => state.localEvents.find((event) => event.summary?.includes('Тест Навигации'))?.id || '');
  if (!savedId) throw new Error('Local save failed');
  await page.evaluate((id) => openEvent(id), savedId);
  await page.waitForSelector('#formTitle');
  const formTitle = await page.textContent('#formTitle');
  if (!formTitle.includes('Редактирование')) throw new Error('Saved request did not reopen for editing');

  await page.fill('#customerName', 'Тест Навигации Изменён');
  await page.click('#saveDraftBtn');
  await page.waitForFunction(() => state.localEvents.some((event) => event.summary?.includes('Изменён')), null, { timeout: 30000 });

  await page.evaluate(async (id) => { await updateEventStatus(id, 'completed'); }, savedId);
  await page.waitForFunction(() => Number(document.querySelector('#completedCount')?.textContent || 0) >= 1, null, { timeout: 30000 });

  await openNav('completed');
  await page.waitForFunction(() => document.querySelector('#view-completed')?.classList.contains('active'));

  await openNav('search');
  await page.fill('#globalSearch', 'Изменён');
  await page.waitForFunction(() => document.querySelector('#searchResults')?.textContent?.includes('Изменён'));

  console.log(JSON.stringify({ version, preservedScroll, gesture, savedId }));
} finally {
  await browser.close();
}
