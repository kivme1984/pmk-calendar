import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

const snapshot = async (label) => {
  const data = await page.evaluate((name) => ({
    label: name,
    title: document.querySelector('#periodTitle')?.textContent?.trim() || '',
    activeView: [...document.querySelectorAll('.view.active')].map((node) => node.id),
    stateView: typeof state === 'undefined' ? null : state.currentView,
    boardClass: document.querySelector('#weekEvents')?.className || '',
    dayColumns: document.querySelectorAll('#weekEvents .day-column').length,
    monthCounters: document.querySelectorAll('#weekEvents .pmk-month-count-v82-18').length,
    periodCore: Boolean(window.PMK_PERIOD_CORE_V82_18),
    currentUi: Boolean(window.PMK_FINAL_UI_V82_10),
    cardLock: Boolean(window.PMK_FINAL_LAYOUT_LOCK_V82_12),
    actions: [...document.querySelectorAll('#pmkManagerLaunchpad [data-workspace-action]')].map((node) => node.dataset.workspaceAction),
    hasDraft: Boolean(document.querySelector('[data-workspace-action="drafts"]')),
    hasThreeDays: Boolean(document.querySelector('.nav-item[data-view="three-days"]')),
  }), label);
  console.log(`SNAPSHOT ${label}: ${JSON.stringify(data)}`);
  return data;
};

try {
  await page.goto('http://127.0.0.1:8000/test-v82-18.html?ci=1', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.waitForFunction(
    () => Boolean(window.PMK_PERIOD_CORE_V82_18 && window.PMK_FINAL_UI_V82_10 && window.PMK_FINAL_LAYOUT_LOCK_V82_12),
    null,
    { timeout: 120000 },
  );
  await page.waitForSelector('#menuToggle', { state: 'visible' });

  const day = await snapshot('day');
  const required = ['paste', 'client', 'slots', 'calculate'];
  if (day.hasDraft || day.hasThreeDays || !required.every((action) => day.actions.includes(action))) {
    throw new Error(`The old interface is active: ${JSON.stringify(day)}`);
  }

  await page.click('#menuToggle');
  await page.click('.nav-item[data-view="week"]');
  await page.waitForTimeout(1200);
  const week = await snapshot('week');
  if (!(week.title === 'Неделя' && week.activeView.includes('view-week') && week.boardClass.includes('pmk-week-v82-18') && week.dayColumns === 7)) {
    throw new Error(`Week failed: ${JSON.stringify(week)}`);
  }

  await page.click('#menuToggle');
  await page.click('.nav-item[data-view="month"]');
  await page.waitForTimeout(1200);
  const month = await snapshot('month');
  if (!(month.title === 'Месяц' && month.boardClass.includes('pmk-month-v82-18') && month.dayColumns >= 28 && month.monthCounters === month.dayColumns)) {
    throw new Error(`Month failed: ${JSON.stringify(month)}`);
  }
} finally {
  await browser.close();
}
