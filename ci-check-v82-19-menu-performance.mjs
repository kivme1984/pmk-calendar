import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

try {
  await page.goto('http://127.0.0.1:8000/test-v82-19.html?ci=menu-performance', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });

  await page.waitForFunction(() => Boolean(
    window.PMK_FINAL_LAYOUT_LOCK_V82_12
    && window.PMK_FINAL_LAYOUT_LOCK_V82_19_STABLE
    && window.PMK_MENU_PERFORMANCE_V82_19
    && window.PMK_MENU_PERFORMANCE_V82_19_STATE?.installed
    && window.PMK_STABLE_VERSION_LABEL_V82_19
  ), null, { timeout: 120000 });
  await page.waitForSelector('#menuToggle', { state: 'visible', timeout: 30000 });
  await page.waitForTimeout(2500);

  const css = await page.evaluate(() => {
    document.querySelector('#menuToggle').click();
    const overlay = getComputedStyle(document.body, '::before');
    const sidebar = getComputedStyle(document.querySelector('#sidebar'));
    return {
      backdrop: overlay.backdropFilter || overlay.webkitBackdropFilter || '',
      transition: sidebar.transitionDuration,
      open: document.querySelector('#sidebar').classList.contains('open'),
    };
  });
  if (!css.open || (css.backdrop && css.backdrop !== 'none')) {
    throw new Error(`Heavy menu effect still active: ${JSON.stringify(css)}`);
  }

  const deferred = await page.evaluate(async () => {
    const stateBefore = { ...window.PMK_MENU_PERFORMANCE_V82_19_STATE };
    for (let index = 0; index < 80; index += 1) renderAll();
    await new Promise(resolve => requestAnimationFrame(resolve));
    const stateDuring = { ...window.PMK_MENU_PERFORMANCE_V82_19_STATE };
    document.querySelector('#menuToggle').click();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const stateAfter = { ...window.PMK_MENU_PERFORMANCE_V82_19_STATE };
    return {
      deferred: stateDuring.deferredRenders - stateBefore.deferredRenders,
      flushed: stateAfter.flushedRenders - stateBefore.flushedRenders,
      closed: !document.querySelector('#sidebar').classList.contains('open'),
      menuClassCleared: !document.documentElement.classList.contains('pmk-menu-active-v82-19'),
    };
  });
  if (deferred.deferred < 80 || deferred.flushed < 1 || !deferred.closed || !deferred.menuClassCleared) {
    throw new Error(`Render deferral failed: ${JSON.stringify(deferred)}`);
  }

  const timings = [];
  for (let index = 0; index < 24; index += 1) {
    const started = Date.now();
    await page.click('#menuToggle', { timeout: 3000 });
    await page.waitForFunction(expected => document.querySelector('#sidebar').classList.contains('open') === expected, index % 2 === 0, { timeout: 3000 });
    timings.push(Date.now() - started);
  }

  const max = Math.max(...timings);
  const average = timings.reduce((sum, value) => sum + value, 0) / timings.length;
  if (max > 1200 || average > 450) throw new Error(`Menu response is too slow: ${JSON.stringify({ max, average, timings })}`);

  await page.click('#menuToggle');
  await page.waitForFunction(() => document.querySelector('#sidebar').classList.contains('open'));
  await page.click('.nav-item[data-view="week"]');
  await page.waitForFunction(() => state.currentView === 'week' && !document.querySelector('#sidebar').classList.contains('open'), null, { timeout: 10000 });

  console.log(JSON.stringify({ css, deferred, max, average }));
} finally {
  await browser.close();
}
