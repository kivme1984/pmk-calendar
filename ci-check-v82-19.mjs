import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

const snapshot = async (label) => page.evaluate((name) => ({
  label: name,
  title: document.querySelector('#periodTitle')?.textContent?.trim() || '',
  activeView: [...document.querySelectorAll('.view.active')].map((node) => node.id),
  stateView: typeof state === 'undefined' ? null : state.currentView,
  boardClass: document.querySelector('#weekEvents')?.className || '',
  dayColumns: document.querySelectorAll('#weekEvents .day-column').length,
  monthCounters: document.querySelectorAll('#weekEvents .pmk-month-count-v82-19').length,
  currentUi: Boolean(window.PMK_FINAL_UI_V82_10),
  cardLock: Boolean(window.PMK_FINAL_LAYOUT_LOCK_V82_12),
  periodDirect: Boolean(window.PMK_PERIOD_DIRECT_V82_19),
  actions: [...document.querySelectorAll('#pmkManagerLaunchpad [data-workspace-action]')].map((node) => node.dataset.workspaceAction),
  hasDraft: Boolean(document.querySelector('[data-workspace-action="drafts"]')),
  hasThreeDays: Boolean(document.querySelector('.nav-item[data-view="three-days"]')),
}), label);

const openNav = async (view) => {
  await page.click('#menuToggle');
  await page.evaluate((target) => {
    const item = document.querySelector(`.nav-item[data-view="${target}"]`);
    if (!item) throw new Error(`Navigation item not found: ${target}`);
    item.click();
  }, view);
};

try {
  await page.goto('http://127.0.0.1:8000/test-v82-19.html?ci=1', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.waitForFunction(
    () => Boolean(window.PMK_FINAL_UI_V82_10 && window.PMK_FINAL_LAYOUT_LOCK_V82_12 && window.PMK_PERIOD_DIRECT_V82_19),
    null,
    { timeout: 120000 },
  );
  await page.waitForSelector('#menuToggle', { state: 'visible' });

  const day = await snapshot('day');
  const requiredActions = ['paste', 'client', 'slots', 'calculate'];
  if (day.hasDraft || day.hasThreeDays || !requiredActions.every((action) => day.actions.includes(action))) {
    throw new Error(`Old interface detected: ${JSON.stringify(day)}`);
  }

  await openNav('week');
  await page.waitForFunction(() => {
    const board = document.querySelector('#weekEvents');
    return document.querySelector('#periodTitle')?.textContent?.trim() === 'Неделя'
      && document.querySelector('#view-week')?.classList.contains('active')
      && board?.classList.contains('pmk-week-v82-19')
      && board.querySelectorAll('.day-column').length === 7;
  }, null, { timeout: 30000 });

  const week = await snapshot('week');
  console.log(`WEEK ${JSON.stringify(week)}`);
  if (week.stateView !== 'week') throw new Error(`Week state mismatch: ${JSON.stringify(week)}`);

  await openNav('month');
  await page.waitForFunction(() => {
    const board = document.querySelector('#weekEvents');
    const columns = board?.querySelectorAll('.day-column').length || 0;
    return document.querySelector('#periodTitle')?.textContent?.trim() === 'Месяц'
      && board?.classList.contains('pmk-month-v82-19')
      && columns >= 28
      && board.querySelectorAll('.pmk-month-count-v82-19').length === columns;
  }, null, { timeout: 30000 });

  const month = await snapshot('month');
  console.log(`MONTH ${JSON.stringify(month)}`);
  if (month.stateView !== 'month') throw new Error(`Month state mismatch: ${JSON.stringify(month)}`);

  await openNav('day');
  await page.waitForFunction(() => document.querySelector('#view-today')?.classList.contains('active'), null, { timeout: 30000 });

  console.log(`DAY ${JSON.stringify(day)}`);
} finally {
  await browser.close();
}
