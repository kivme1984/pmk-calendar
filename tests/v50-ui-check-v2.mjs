import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
let stage = 'launch';

async function shot(name) {
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
}

try {
  stage = 'open-page';
  await page.goto('http://127.0.0.1:4173/v50-preview.html?ci=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#v50Summary', { timeout: 20000 });
  await page.waitForSelector('.rug-card', { timeout: 20000 });
  await page.waitForFunction(() => document.documentElement.dataset.v50UiVerified === '1', null, { timeout: 12000 });
  await shot('01-summary');

  stage = 'automation-row';
  const automation = page.locator('.v50-final-automation-button');
  assert.equal(await automation.count(), 4);
  assert.equal(await page.locator('[data-v50-action="paste"]').count(), 0);
  assert.deepEqual(await automation.locator('b').allTextContents(), ['Клиент', 'Адрес', 'Окна', 'Стоимость']);
  const automationBoxes = await automation.evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { x: Math.round(box.x), y: Math.round(box.y), right: Math.round(box.right), height: Math.round(box.height) };
  }));
  assert.equal(new Set(automationBoxes.map(box => box.y)).size, 1);
  assert.ok(automationBoxes.every(box => box.x >= 0 && box.right <= 390 && box.height >= 44));

  stage = 'rugs-editor';
  await page.locator('[data-v50-open="rugs"]').first().click();
  await page.waitForSelector('.v50-editor-open .rug-card');
  await shot('02-rugs');

  const services = page.locator('.v50-editor-open .rug-card').first().locator('.v50-final-service');
  assert.equal(await services.count(), 6);
  assert.deepEqual(await services.locator('span').allTextContents(), [
    'Пятна', 'Запах мочи', 'Кондиционер', 'Шерсть / волосы', 'Озон', 'Расчёсывание ворса'
  ]);
  const serviceBoxes = await services.evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { x: Math.round(box.x), y: Math.round(box.y), height: Math.round(box.height) };
  }));
  assert.equal(new Set(serviceBoxes.map(box => box.x)).size, 2);
  assert.equal(new Set(serviceBoxes.map(box => box.y)).size, 3);
  assert.ok(serviceBoxes.every(box => box.height >= 48));

  stage = 'service-toggle';
  await services.first().click();
  assert.equal(await services.first().locator('input').isChecked(), true);
  await services.first().click();
  assert.equal(await services.first().locator('input').isChecked(), false);

  stage = 'all-editors';
  await page.locator('.v50-editor-done').click();
  await page.waitForFunction(() => !document.body.classList.contains('v50-modal-active'));
  for (const type of ['client', 'date', 'cost', 'preview']) {
    await page.locator(`[data-v50-open="${type}"]`).first().click();
    await page.waitForSelector('.v50-editor-open');
    assert.equal(await page.locator('.v50-editor-open').count(), 1);
    await page.locator('.v50-editor-done').click();
    await page.waitForFunction(() => !document.body.classList.contains('v50-modal-active'));
  }

  stage = 'draft';
  await page.evaluate(() => localStorage.setItem('pmk-form-autodraft-v1', JSON.stringify({
    savedAt: Date.now(), data: { customerName: 'Тестовый клиент', phone: '+79000000000', rugs: [] }
  })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#v50DraftNotice', { timeout: 15000 });
  await shot('03-draft');
  assert.equal(await page.locator('#v50DraftNotice [data-v50-draft="view"]').count(), 1);
  assert.equal(await page.locator('#v50DraftNotice [data-v50-draft="delete"]').count(), 1);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#v50DraftNotice [data-v50-draft="delete"]').click();
  await page.waitForFunction(() => !document.querySelector('#v50DraftNotice'));
  assert.equal(await page.evaluate(() => localStorage.getItem('pmk-form-autodraft-v1')), null);

  console.log('V50_UI_CHECK_OK');
} catch (error) {
  console.error(`V50_UI_CHECK_FAILED_STAGE=${stage}`);
  console.error(error?.stack || error);
  try { await shot(`failure-${stage}`); } catch {}
  throw error;
} finally {
  await browser.close();
}
