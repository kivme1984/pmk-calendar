import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const swCore = readFileSync('sw-core-v82.js', 'utf8');
const resetPage = readFileSync('reset.html', 'utf8');
assert.match(swCore, /const VERSION='82\.19\.1'/);
assert.match(swCore, /smart-parser-feature-gate\.js(?:\?v=1)?/);
assert.match(resetPage, /const VERSION='82\.19\.1'/);
assert.match(resetPage, /params\.get\('smart-parser'\)===['"]1['"]/);
assert.match(resetPage, /smart-parser=1/);
assert.match(resetPage, /smart-parser-feature-gate\.js/);

const browser = await chromium.launch({ headless: true });

async function collectErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

try {
  const plain = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const plainErrors = await collectErrors(plain);
  await plain.goto('http://127.0.0.1:8000/smart-parser-feature-gate-test.html?plain=1', { waitUntil: 'networkidle' });
  await plain.waitForSelector('#requestForm', { timeout: 15000, state: 'attached' });
  await plain.waitForFunction(() => Boolean(globalThis.PMK_SMART_PARSER_FEATURE_GATE));
  const plainState = await plain.evaluate(() => ({
    gate: globalThis.PMK_SMART_PARSER_FEATURE_GATE,
    panel: Boolean(document.querySelector('#smartParserFormPanel')),
    banner: Boolean(document.querySelector('#smartParserModeBanner')),
    parser: Boolean(globalThis.PMK_SMART_PARSER_NEXT),
    mode: document.documentElement.dataset.smartParserMode || '',
  }));
  assert.equal(plainState.gate.enabled, false);
  assert.equal(plainState.gate.state, 'disabled');
  assert.equal(plainState.panel, false);
  assert.equal(plainState.banner, false);
  assert.equal(plainState.parser, false);
  assert.equal(plainState.mode, '');
  assert.deepEqual(plainErrors, []);
  await plain.close();

  const enabled = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const enabledErrors = await collectErrors(enabled);
  await enabled.goto('http://127.0.0.1:8000/smart-parser-feature-gate-test.html?smart-parser=1', { waitUntil: 'networkidle' });
  await enabled.waitForFunction(() => globalThis.PMK_SMART_PARSER_FEATURE_GATE?.state === 'ready', null, { timeout: 20000 });
  await enabled.waitForSelector('#smartParserFormPanel');

  const beforeStorage = await enabled.evaluate(() => JSON.stringify({ ...localStorage }));
  const readyState = await enabled.evaluate(() => ({
    enabled: globalThis.PMK_SMART_PARSER_FEATURE_GATE.enabled,
    state: globalThis.PMK_SMART_PARSER_FEATURE_GATE.state,
    formActive: document.querySelector('#view-form')?.classList.contains('active'),
    banner: document.querySelector('#smartParserModeBanner')?.textContent || '',
    exitHref: document.querySelector('#smartParserModeBanner a')?.href || '',
    mode: document.documentElement.dataset.smartParserMode,
  }));
  assert.equal(readyState.enabled, true);
  assert.equal(readyState.state, 'ready');
  assert.equal(readyState.formActive, true);
  assert.match(readyState.banner, /тестовый режим/i);
  assert.match(readyState.banner, /сохраняется только штатной кнопкой/i);
  assert.equal(new URL(readyState.exitHref).searchParams.has('smart-parser'), false);
  assert.equal(new URL(readyState.exitHref).searchParams.get('v'), '82.19.1');
  assert.equal(readyState.mode, 'ready');

  await enabled.click('#smartFormSampleBtn');
  await enabled.waitForFunction(() => Boolean(globalThis.PMK_LAST_FORM_MAPPING));
  const mapped = await enabled.evaluate(() => globalThis.PMK_LAST_FORM_MAPPING);
  assert.equal(mapped.data.customerName, 'Марина');
  assert.equal(mapped.data.rugs.length, 2);
  assert.ok(mapped.warnings.some(value => value.includes('пят')));

  await enabled.click('#smartFormApplyBtn');
  await enabled.waitForFunction(() => document.querySelectorAll('#rugsContainer .rug-card').length === 2);
  assert.equal(await enabled.inputValue('#customerName'), 'Марина');
  assert.equal(await enabled.inputValue('#phone'), '+79000000000');
  assert.equal(await enabled.inputValue('#orderSource'), 'Avito 2');
  assert.equal(await enabled.locator('#rugsContainer .rug-card').count(), 2);
  assert.equal(await enabled.locator('#rugsContainer .rug-card').nth(0).locator('.rug-issues input[value="Пятна"]').isChecked(), false);
  assert.equal(await enabled.locator('#rugsContainer .rug-card').nth(1).locator('.rug-issues input[value="Шерсть"]').isChecked(), true);

  const afterStorage = await enabled.evaluate(() => JSON.stringify({ ...localStorage }));
  assert.equal(afterStorage, beforeStorage);

  const layout = await enabled.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    panel: document.querySelector('#smartParserFormPanel')?.getBoundingClientRect().width || 0,
    banner: document.querySelector('#smartParserModeBanner')?.getBoundingClientRect().width || 0,
  }));
  assert.ok(layout.scrollWidth <= layout.clientWidth + 2, JSON.stringify(layout));
  assert.ok(layout.panel > 250 && layout.panel <= layout.clientWidth, JSON.stringify(layout));
  assert.ok(layout.banner > 250 && layout.banner <= layout.clientWidth, JSON.stringify(layout));
  assert.deepEqual(enabledErrors, []);

  console.log(JSON.stringify({
    plainModeUnchanged: true,
    featureGateReady: true,
    version: '82.19.1',
    rugs: mapped.data.rugs.length,
    mobileOverflow: layout.scrollWidth - layout.clientWidth,
  }));
} finally {
  await browser.close();
}
