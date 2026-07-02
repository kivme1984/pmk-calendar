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
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
};

try {
  await page.goto('http://127.0.0.1:8000/test-v82-19.html?ci=icons-edge', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });

  await page.waitForFunction(() => Boolean(
    window.PMK_QUICK_ACTIONS_ICONS_V82_19
    && window.PMK_EDGE_MENU_SWIPE_V82_19
    && window.PMK_MENU_PERFORMANCE_V82_19
    && document.querySelector('#pmkManagerLaunchpad.pmk-icon-actions-v82-19')
  ), null, { timeout: 120000 });

  const actions = await page.evaluate(() => [...document.querySelectorAll('#pmkManagerLaunchpad [data-workspace-action]')].map(button => {
    const box = button.getBoundingClientRect();
    return {
      action: button.dataset.workspaceAction,
      text: button.textContent.trim(),
      label: button.getAttribute('aria-label'),
      title: button.getAttribute('title'),
      svg: Boolean(button.querySelector('svg')),
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };
  }));

  const expected = ['paste', 'client', 'slots', 'calculate'];
  if (actions.length !== 4 || expected.some(action => !actions.find(item => item.action === action))) {
    throw new Error(`Unexpected quick actions: ${JSON.stringify(actions)}`);
  }
  if (actions.some(item => item.text || !item.label || !item.title || !item.svg)) {
    throw new Error(`Quick actions are not icon-only and accessible: ${JSON.stringify(actions)}`);
  }
  if (Math.max(...actions.map(item => item.y)) - Math.min(...actions.map(item => item.y)) > 3) {
    throw new Error(`Quick actions are not on one row: ${JSON.stringify(actions)}`);
  }
  if (actions.some(item => item.width < 55 || item.height < 46)) {
    throw new Error(`Quick action touch targets are too small: ${JSON.stringify(actions)}`);
  }

  await page.click('#pmkManagerLaunchpad [data-workspace-action="calculate"]');
  await page.waitForSelector('#pmkQuickCalculator[open]', { state: 'visible', timeout: 10000 });
  await page.click('#pmkQuickCalculator [data-dialog-close]');
  await page.waitForSelector('#pmkQuickCalculator', { state: 'hidden', timeout: 10000 });

  const dateBefore = await page.evaluate(() => ({
    selected: state.selectedDayKey,
    jump: document.querySelector('#jumpDate')?.value || '',
  }));

  await swipe({ x1: 4, y1: 230, x2: 8, y2: 600 });
  await page.waitForTimeout(300);
  const afterVertical = await page.evaluate(() => ({
    open: document.querySelector('#sidebar').classList.contains('open'),
    selected: state.selectedDayKey,
    jump: document.querySelector('#jumpDate')?.value || '',
  }));
  if (afterVertical.open || afterVertical.selected !== dateBefore.selected || afterVertical.jump !== dateBefore.jump) {
    throw new Error(`Vertical edge gesture caused navigation: ${JSON.stringify({ dateBefore, afterVertical })}`);
  }

  await swipe({ x1: 4, y1: 420, x2: 165, y2: 425 });
  await page.waitForTimeout(300);
  const afterHorizontal = await page.evaluate(() => ({
    open: document.querySelector('#sidebar').classList.contains('open'),
    bodyOpen: document.body.classList.contains('pmk-sidebar-open'),
    htmlOpen: document.documentElement.classList.contains('pmk-menu-active-v82-19'),
    expanded: document.querySelector('#menuToggle')?.getAttribute('aria-expanded'),
    selected: state.selectedDayKey,
    jump: document.querySelector('#jumpDate')?.value || '',
  }));
  if (!afterHorizontal.open || !afterHorizontal.bodyOpen || !afterHorizontal.htmlOpen || afterHorizontal.expanded !== 'true') {
    throw new Error(`Left-edge swipe did not open menu correctly: ${JSON.stringify(afterHorizontal)}`);
  }
  if (afterHorizontal.selected !== dateBefore.selected || afterHorizontal.jump !== dateBefore.jump) {
    throw new Error(`Edge swipe also changed day: ${JSON.stringify({ dateBefore, afterHorizontal })}`);
  }

  await page.click('#menuToggle');
  await page.waitForFunction(() => !document.querySelector('#sidebar').classList.contains('open'));

  await swipe({ x1: 70, y1: 420, x2: 210, y2: 424 });
  await page.waitForTimeout(250);
  const nonEdgeOpen = await page.evaluate(() => document.querySelector('#sidebar').classList.contains('open'));
  if (nonEdgeOpen) throw new Error('Swipe away from the left edge opened the menu');

  console.log(JSON.stringify({ actions, dateBefore, afterVertical, afterHorizontal }));
} finally {
  await browser.close();
}
