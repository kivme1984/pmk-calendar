import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const openNav = async (view) => {
  await page.click('#menuToggle', { timeout: 10000 });
  await page.evaluate((target) => {
    const item = document.querySelector(`.nav-item[data-view="${target}"]`);
    if (!item) throw new Error(`Navigation item not found: ${target}`);
    item.click();
  }, view);
};

try {
  await page.goto('http://127.0.0.1:8000/test-v82-20-1.html?ci=1', {
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
  await page.waitForSelector('#menuToggle', { state: 'visible', timeout: 30000 });

  await page.waitForTimeout(10000);
  await openNav('week');
  await page.waitForFunction(() => state.currentView === 'week' && document.querySelectorAll('#weekEvents .day-column').length === 7, null, { timeout: 15000 });

  await page.click('#nextPeriodBtn', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.click('#prevPeriodBtn', { timeout: 10000 });

  await openNav('month');
  await page.waitForFunction(() => state.currentView === 'month' && document.querySelectorAll('#weekEvents .day-column').length >= 28, null, { timeout: 15000 });

  await openNav('day');
  await page.waitForFunction(() => document.querySelector('#view-today')?.classList.contains('active'), null, { timeout: 15000 });

  const result = await page.evaluate(() => ({
    title: document.title,
    view: state.currentView,
    menuVisible: Boolean(document.querySelector('#menuToggle')),
  }));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
