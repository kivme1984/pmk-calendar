import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

await page.addInitScript(() => {
  try { localStorage.clear(); } catch {}
});

const openNav = async (view) => {
  await page.click('#menuToggle', { timeout: 10000 });
  await page.evaluate((target) => {
    const item = document.querySelector(`.nav-item[data-view="${target}"]`);
    if (!item) throw new Error(`Navigation item not found: ${target}`);
    item.click();
  }, view);
};

const swipe = async ({ x1, y1, x2, y2, steps = 12 }) => {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: x1, y: y1, radiusX: 2, radiusY: 2, force: 1 }],
  });
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{
        x: x1 + (x2 - x1) * progress,
        y: y1 + (y2 - y1) * progress,
        radiusX: 2,
        radiusY: 2,
        force: 1,
      }],
    });
    await page.waitForTimeout(18);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};

try {
  await page.goto('http://127.0.0.1:8000/test-v82-19.html?ci=vertical', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.waitForFunction(() => Boolean(
    window.PMK_FINAL_UI_V82_10
    && window.PMK_FINAL_LAYOUT_LOCK_V82_12
    && window.PMK_PERIOD_DIRECT_V82_19
    && window.PMK_WEEK_TOUCH_SCROLL_V82_19_STABLE
  ), null, { timeout: 120000 });
  await page.waitForSelector('#menuToggle', { state: 'visible', timeout: 30000 });

  // Catch the real-world case where the page becomes unresponsive shortly after loading.
  await page.waitForTimeout(10000);
  await openNav('week');
  await page.waitForFunction(() => (
    state.currentView === 'week'
    && document.querySelector('#weekEvents')?.classList.contains('pmk-week-v82-19')
    && document.querySelectorAll('#weekEvents .day-column').length === 7
  ), null, { timeout: 30000 });

  const touchAction = await page.evaluate(() => ({
    board: getComputedStyle(document.querySelector('#weekEvents')).touchAction,
    card: getComputedStyle(document.querySelector('#weekEvents .day-column')).touchAction,
  }));
  if (touchAction.board.includes('none') || touchAction.card.includes('none') || !touchAction.board.includes('pan-y')) {
    throw new Error(`Vertical native scroll is blocked: ${JSON.stringify(touchAction)}`);
  }

  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.id = 'ciVerticalSpacer';
    spacer.style.height = '1800px';
    spacer.style.pointerEvents = 'none';
    document.body.appendChild(spacer);
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(200);

  let card = await page.locator('#weekEvents .day-column').first().boundingBox();
  if (!card) throw new Error('Week day card not found');
  const verticalX = Math.max(40, Math.min(350, card.x + Math.min(card.width / 2, 120)));
  const verticalStartY = Math.max(420, Math.min(760, card.y + Math.min(card.height - 24, 430)));
  const verticalEndY = Math.max(100, verticalStartY - 360);

  await swipe({ x1: verticalX, y1: verticalStartY, x2: verticalX - 3, y2: verticalEndY });
  await page.waitForTimeout(700);
  const verticalScroll = await page.evaluate(() => window.scrollY || document.scrollingElement?.scrollTop || 0);
  if (verticalScroll < 120) throw new Error(`Vertical swipe from card did not scroll page: ${verticalScroll}`);

  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector('#weekEvents').scrollLeft = 0;
  });
  await page.waitForTimeout(250);
  card = await page.locator('#weekEvents .day-column').first().boundingBox();
  if (!card) throw new Error('Week day card disappeared');
  const horizontalY = Math.max(220, Math.min(720, card.y + Math.min(card.height / 2, 260)));

  await swipe({ x1: 350, y1: horizontalY, x2: 70, y2: horizontalY - 3 });
  await page.waitForTimeout(700);
  const horizontalScroll = await page.evaluate(() => document.querySelector('#weekEvents')?.scrollLeft || 0);
  if (horizontalScroll < 120) throw new Error(`Horizontal week swipe stopped working: ${horizontalScroll}`);

  await openNav('day');
  await page.waitForFunction(() => document.querySelector('#view-today')?.classList.contains('active'), null, { timeout: 15000 });

  console.log(JSON.stringify({ touchAction, verticalScroll, horizontalScroll }));
} finally {
  await browser.close();
}
