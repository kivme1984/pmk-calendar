import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto('http://127.0.0.1:8000/test-v82-20.html?diagnose=1', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.waitForTimeout(15000);
  const result = await page.evaluate(() => ({
    title: document.title,
    status: document.querySelector('#status')?.textContent || '',
    body: document.body?.innerText?.slice(0, 800) || '',
    finalUi: Boolean(window.PMK_FINAL_UI_V82_10),
    layoutLock: Boolean(window.PMK_FINAL_LAYOUT_LOCK_V82_12),
    periodDirect: Boolean(window.PMK_PERIOD_DIRECT_V82_19),
    touchScroll: Boolean(window.PMK_WEEK_TOUCH_SCROLL_V82_20),
    providerBadges: Boolean(window.PMK_EVENT_PROVIDER_BADGES_V82_20),
    versionLabel: Boolean(window.PMK_TEST_VERSION_LABEL_V82_20),
  }));
  console.log(JSON.stringify({ result, errors }, null, 2));
  if (!(result.finalUi && result.layoutLock && result.periodDirect && result.touchScroll && result.providerBadges && result.versionLabel)) {
    throw new Error('Startup diagnostics failed');
  }
} finally {
  await browser.close();
}
