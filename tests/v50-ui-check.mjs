import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto('http://127.0.0.1:4173/v50-preview.html?ci=' + Date.now(), { waitUntil: 'networkidle' });
await page.waitForSelector('#v50Summary', { timeout: 15000 });
await page.waitForSelector('.rug-card', { timeout: 15000 });
await page.waitForFunction(() => document.documentElement.dataset.v50UiVerified === '1', null, { timeout: 10000 });

const automation = await page.locator('.v50-final-automation-button').all();
assert.equal(automation.length, 4, 'Должно быть ровно четыре быстрые кнопки');
assert.equal(await page.locator('[data-v50-action="paste"]').count(), 0, 'Кнопка вставки из текста не должна дублироваться');

const automationBoxes = await Promise.all(automation.map(button => button.boundingBox()));
assert.ok(automationBoxes.every(Boolean), 'Все быстрые кнопки должны быть видимы');
const yValues = automationBoxes.map(box => Math.round(box.y));
assert.ok(Math.max(...yValues) - Math.min(...yValues) <= 2, 'Быстрые кнопки должны находиться в одной строке');
assert.ok(automationBoxes.every(box => box.x >= 0 && box.x + box.width <= 390), 'Быстрые кнопки не должны выходить за экран');

const quickLabels = await page.locator('.v50-final-automation-button b').allTextContents();
assert.deepEqual(quickLabels, ['Клиент', 'Адрес', 'Окна', 'Стоимость']);

await page.locator('[data-v50-open="rugs"]').first().click();
await page.waitForSelector('.v50-editor-open .rug-card');
const firstRug = page.locator('.v50-editor-open .rug-card').first();
const serviceButtons = firstRug.locator('.v50-final-service');
assert.equal(await serviceButtons.count(), 6, 'У ковра должно быть шесть услуг');
assert.deepEqual(await serviceButtons.locator('span').allTextContents(), [
  'Пятна', 'Запах мочи', 'Кондиционер', 'Шерсть / волосы', 'Озон', 'Расчёсывание ворса'
]);

const serviceBoxes = await serviceButtons.evaluateAll(elements => elements.map(element => {
  const box = element.getBoundingClientRect();
  return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
}));
assert.equal(new Set(serviceBoxes.map(box => box.x)).size, 2, 'Услуги должны быть в двух колонках');
assert.equal(new Set(serviceBoxes.map(box => box.y)).size, 3, 'Услуги должны быть в трёх строках');
assert.ok(serviceBoxes.every(box => box.height >= 48), 'Кнопки услуг должны быть удобны для нажатия');

await serviceButtons.first().click();
assert.equal(await serviceButtons.first().locator('input').isChecked(), true, 'Услуга должна включаться нажатием');
await serviceButtons.first().click();
assert.equal(await serviceButtons.first().locator('input').isChecked(), false, 'Услуга должна выключаться повторным нажатием');

await page.locator('.v50-editor-done').click();
await page.waitForFunction(() => !document.body.classList.contains('v50-modal-active'));

for (const type of ['client', 'date', 'cost', 'preview']) {
  await page.locator(`[data-v50-open="${type}"]`).first().click();
  await page.waitForSelector('.v50-editor-open');
  assert.equal(await page.locator('.v50-editor-open').count(), 1, `Должна открываться вкладка ${type}`);
  await page.locator('.v50-editor-done').click();
  await page.waitForFunction(() => !document.body.classList.contains('v50-modal-active'));
}

await page.evaluate(() => {
  localStorage.setItem('pmk-form-autodraft-v1', JSON.stringify({
    savedAt: Date.now(),
    data: { customerName: 'Тестовый клиент', phone: '+79000000000', rugs: [] }
  }));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#v50DraftNotice', { timeout: 10000 });
assert.equal(await page.locator('#v50DraftNotice [data-v50-draft="view"]').count(), 1);
assert.equal(await page.locator('#v50DraftNotice [data-v50-draft="delete"]').count(), 1);
page.once('dialog', dialog => dialog.accept());
await page.locator('#v50DraftNotice [data-v50-draft="delete"]').click();
await page.waitForFunction(() => !document.querySelector('#v50DraftNotice'));
assert.equal(await page.evaluate(() => localStorage.getItem('pmk-form-autodraft-v1')), null, 'Черновик должен удаляться');

assert.equal(errors.length, 0, 'В консоли не должно быть ошибок: ' + errors.join('\n'));
await page.screenshot({ path: 'artifacts/v50-mobile.png', fullPage: true });
await browser.close();
console.log('V50_UI_CHECK_OK');
