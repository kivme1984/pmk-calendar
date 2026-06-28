import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
let stage = 'open';

try {
  await page.goto('http://127.0.0.1:4173/v50-preview.html?smoke=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#v50Summary', { timeout: 20000 });
  await page.waitForFunction(() => document.documentElement.dataset.v50UiVerified === '1', null, { timeout: 12000 });

  stage = 'automations';
  const quick = page.locator('.v50-final-automation-button');
  assert.equal(await quick.count(), 4);
  assert.equal(await page.locator('[data-v50-action="paste"]').count(), 0);
  assert.deepEqual(await quick.locator('b').allTextContents(), ['Клиент', 'Адрес', 'Окна', 'Стоимость']);
  const quickY = await quick.evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().y)));
  assert.equal(new Set(quickY).size, 1);

  stage = 'services';
  await page.locator('[data-v50-open="rugs"]').first().click();
  await page.waitForSelector('.v50-editor-open .rug-card');
  const services = page.locator('.v50-editor-open .rug-card').first().locator('.v50-final-service');
  assert.equal(await services.count(), 6);
  assert.deepEqual(await services.locator('span').allTextContents(), ['Пятна', 'Запах мочи', 'Кондиционер', 'Шерсть / волосы', 'Озон', 'Расчёсывание ворса']);
  const boxes = await services.evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return [Math.round(box.x), Math.round(box.y), Math.round(box.height)];
  }));
  assert.equal(new Set(boxes.map(box => box[0])).size, 2);
  assert.equal(new Set(boxes.map(box => box[1])).size, 3);
  assert.ok(boxes.every(box => box[2] >= 48));
  await services.first().click();
  assert.equal(await services.first().locator('input').isChecked(), true);
  await services.first().click();
  assert.equal(await services.first().locator('input').isChecked(), false);

  stage = 'editors';
  await page.locator('.v50-editor-done').click();
  for (const type of ['client', 'date', 'cost', 'preview']) {
    await page.locator(`[data-v50-open="${type}"]`).first().click();
    await page.waitForSelector('.v50-editor-open');
    assert.equal(await page.locator('.v50-editor-open').count(), 1);
    await page.locator('.v50-editor-done').click();
  }

  stage = 'draft';
  await page.evaluate(() => localStorage.setItem('pmk-form-autodraft-v1', JSON.stringify({
    savedAt: Date.now(), data: { customerName: 'Тест', phone: '+79000000000' }
  })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#v50DraftNotice', { timeout: 15000 });
  assert.equal(await page.locator('#v50DraftNotice button').count(), 2);

  await page.screenshot({ path: 'artifacts/v50-smoke.png', fullPage: true });
  console.log('V50_SMOKE_OK');
} catch (error) {
  console.error('V50_SMOKE_FAILED_STAGE=' + stage);
  console.error(error.stack || error);
  try { await page.screenshot({ path: `artifacts/v50-failure-${stage}.png`, fullPage: true }); } catch {}
  throw error;
} finally {
  await browser.close();
}
