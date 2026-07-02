import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

try {
  await page.goto('http://127.0.0.1:8000/smart-parser-form-test.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#smartParserFormPanel', { timeout: 15000 });
  await page.waitForSelector('#requestForm');

  assert.equal(await page.locator('#view-form').evaluate(node => node.classList.contains('active')), true);
  assert.equal(await page.locator('#smartFormApplyBtn').isDisabled(), true);

  const beforeStorage = await page.evaluate(() => localStorage.getItem('pmk-local-events'));
  await page.click('#smartFormSampleBtn');
  await page.waitForFunction(() => Boolean(globalThis.PMK_LAST_FORM_MAPPING));

  const diagnostic = await page.evaluate(() => ({
    parsed: globalThis.PMK_LAST_FORM_PARSE,
    mapping: globalThis.PMK_LAST_FORM_MAPPING,
  }));
  const mapping = diagnostic.mapping;
  console.log('PARSE_DIAGNOSTIC', JSON.stringify(diagnostic, null, 2));

  assert.equal(mapping.data.customerName, 'Марина');
  assert.equal(mapping.data.phone, '+79000000000');
  assert.equal(mapping.data.orderSource, 'Avito 2');
  assert.equal(mapping.data.district, 'Советский');
  assert.equal(mapping.data.houseNumber.toLowerCase(), '12к2');
  assert.equal(mapping.data.apartmentNumber, '45');
  assert.equal(mapping.data.callAhead, true);
  assert.equal(mapping.data.callAheadMinutes, 30);
  assert.equal(mapping.data.rugs.length, 2);
  assert.ok(mapping.warnings.some(value => value.includes('пят')));

  await page.click('#smartFormApplyBtn');
  await page.waitForFunction(() => document.querySelectorAll('#rugsContainer .rug-card').length === 2);

  const formDiagnostic = await page.evaluate(() => [...document.querySelectorAll('#rugsContainer .rug-card')].map(card => ({
    length: card.querySelector('.rug-length')?.value,
    width: card.querySelector('.rug-width')?.value,
    material: card.querySelector('.rug-material')?.value,
    pile: card.querySelector('.rug-pile')?.value,
    issues: [...card.querySelectorAll('.rug-issues input:checked')].map(input => input.value),
    services: [...card.querySelectorAll('.rug-services input:checked')].map(input => input.value),
  })));
  console.log('FORM_DIAGNOSTIC', JSON.stringify(formDiagnostic, null, 2));

  assert.equal(await page.inputValue('#customerName'), 'Марина');
  assert.equal(await page.inputValue('#phone'), '+79000000000');
  assert.equal(await page.inputValue('#orderSource'), 'Avito 2');
  assert.equal(await page.inputValue('#district'), 'Советский');
  assert.match(await page.inputValue('#street'), /Новая/i);
  assert.match((await page.inputValue('#houseNumber')).toLowerCase(), /12к2/);
  assert.equal(await page.inputValue('#apartmentNumber'), '45');
  assert.equal(await page.inputValue('#entrance'), '3');
  assert.equal(await page.inputValue('#floor'), '7');
  assert.equal(await page.inputValue('#estimatedPrice'), '5600');
  assert.equal(await page.inputValue('#contractNumber'), 'Д-120');
  assert.equal(await page.isChecked('#callAhead'), true);
  assert.equal(await page.inputValue('#callAheadMinutes'), '30');

  const rugs = page.locator('#rugsContainer .rug-card');
  assert.equal(await rugs.count(), 2);
  assert.equal(Number(await rugs.nth(0).locator('.rug-length').inputValue()), 3);
  assert.equal(Number(await rugs.nth(0).locator('.rug-width').inputValue()), 2);
  assert.equal(await rugs.nth(0).locator('.rug-material').inputValue(), 'Шерсть');
  assert.equal(await rugs.nth(0).locator('.rug-issues input[value="Пятна"]').isChecked(), false);
  assert.equal(await rugs.nth(1).locator('.rug-pile').inputValue(), 'Более 1 см');
  assert.equal(await rugs.nth(1).locator('.rug-issues input[value="Шерсть"]').isChecked(), true);
  assert.equal(await rugs.nth(1).locator('.rug-issues input[value="Запах мочи"]').isChecked(), true);
  assert.equal(await rugs.nth(1).locator('.rug-services input[value="Удаление запаха мочи"]').isChecked(), true);
  assert.equal(await rugs.nth(1).locator('.rug-services input[value="Кондиционер"]').isChecked(), false);

  const comment = await page.inputValue('#managerComment');
  assert.match(comment, /Дополнительный контакт/i);
  assert.match(comment, /Адрес возврата/i);
  assert.match(comment, /проверить.*пят/i);
  assert.match(comment, /не делать.*кондиционер/i);
  assert.match(comment, /Исходный текст менеджера/i);

  const afterStorage = await page.evaluate(() => localStorage.getItem('pmk-local-events'));
  assert.equal(afterStorage, beforeStorage);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(overflow.scrollWidth <= overflow.clientWidth + 2, JSON.stringify(overflow));

  console.log(JSON.stringify({
    formAdapter: true,
    rugs: await rugs.count(),
    warnings: mapping.warnings.length,
    mobileOverflow: overflow.scrollWidth - overflow.clientWidth,
  }));
} finally {
  await browser.close();
}
