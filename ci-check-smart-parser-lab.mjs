import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

try {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('http://127.0.0.1:8000/smart-parser-lab.html?ci=2', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  await page.waitForFunction(() => Boolean(window.PMK_SMART_PARSER_NEXT?.parse && window.PMK_SMART_PARSER_FORM_PREVIEW?.build), null, { timeout: 10000 });
  await page.click('#sampleBtn');
  await page.waitForFunction(() => Boolean(window.PMK_LAST_LAB_PARSE && window.PMK_LAST_FORM_PREVIEW), null, { timeout: 10000 });

  const result = await page.evaluate(() => ({
    title: document.querySelector('h1')?.textContent.trim(),
    resultsVisible: !document.querySelector('#results')?.hidden,
    confidence: document.querySelector('#confidenceValue')?.textContent.trim(),
    contacts: document.querySelectorAll('#contactFields .field-row').length,
    returnVisible: !document.querySelector('#returnAddressCard')?.hidden,
    rugs: document.querySelectorAll('#rugGrid .rug-card').length,
    serviceChips: [...document.querySelectorAll('#rugGrid .service-chip')].map(node => node.textContent.trim()),
    previewRows: document.querySelectorAll('#formPreview .preview-row').length,
    previewReviewRows: document.querySelectorAll('#formPreview .preview-row.is-review').length,
    previewSkipRows: document.querySelectorAll('#formPreview .preview-row.is-skip').length,
    previewText: document.querySelector('#formPreview')?.textContent || '',
    previewNotice: document.querySelector('#previewNotice')?.textContent || '',
    raw: document.querySelector('#rawResult')?.textContent || '',
    parsed: window.PMK_LAST_LAB_PARSE,
    preview: window.PMK_LAST_FORM_PREVIEW,
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  if (result.title !== 'Умный разбор заявки' || !result.resultsVisible) throw new Error(`Lab did not render: ${JSON.stringify(result)}`);
  if (!result.confidence.endsWith('%')) throw new Error(`Confidence missing: ${JSON.stringify(result)}`);
  if (result.contacts < 4) throw new Error(`Contact fields missing: ${JSON.stringify(result)}`);
  if (!result.returnVisible) throw new Error(`Return address missing: ${JSON.stringify(result)}`);
  if (result.rugs !== 2) throw new Error(`Expected two rugs: ${JSON.stringify(result)}`);
  if (!result.serviceChips.some(text => text.includes('Пятна: проверить'))) throw new Error(`Stain review state missing: ${JSON.stringify(result)}`);
  if (!result.serviceChips.some(text => text.includes('Кондиционер: не делать'))) throw new Error(`Conditioner denial missing: ${JSON.stringify(result)}`);
  if (result.previewRows < 12 || result.previewReviewRows < 1 || result.previewSkipRows < 1) throw new Error(`Form preview decisions missing: ${JSON.stringify(result)}`);
  if (!result.previewText.includes('Адрес возврата') || !result.previewText.includes('Подтвердить') || !result.previewText.includes('Не применять')) throw new Error(`Form preview content incomplete: ${JSON.stringify(result)}`);
  if (!result.previewNotice.includes('ничего не записывает')) throw new Error(`Safety notice missing: ${JSON.stringify(result)}`);
  if (result.preview.policy !== 'preview-only' || result.preview.canApplyAutomatically !== false) throw new Error(`Unsafe preview policy: ${JSON.stringify(result.preview)}`);
  if (!result.raw.includes('returnAddress') || !result.raw.includes('confidence')) throw new Error('Technical output is incomplete');
  if (result.bodyWidth > result.viewportWidth + 2) throw new Error(`Horizontal overflow: ${JSON.stringify({ bodyWidth: result.bodyWidth, viewportWidth: result.viewportWidth })}`);

  await page.fill('#sourceText', 'Улица Новая 5-10, Ольга 9535514477. Ковер 230/160, пятна не выводить. За 15 мин ждёт.');
  await page.click('#parseBtn');
  await page.waitForFunction(() => window.PMK_LAST_LAB_PARSE?.phones?.[0]?.phone === '+79535514477');
  const custom = await page.evaluate(() => ({ parsed: window.PMK_LAST_LAB_PARSE, preview: window.PMK_LAST_FORM_PREVIEW }));
  if (custom.parsed.rugs[0]?.length !== 2.3 || custom.parsed.rugs[0]?.width !== 1.6) throw new Error(`Slash dimension failed in lab: ${JSON.stringify(custom)}`);
  if (custom.parsed.rugs[0]?.services?.stainRemoval !== 'denied') throw new Error(`Negation failed in lab: ${JSON.stringify(custom)}`);
  if (custom.parsed.time?.callAheadMinutes !== 15) throw new Error(`Call-ahead failed in lab: ${JSON.stringify(custom)}`);
  if (!custom.preview.rows.some(row => row.field === 'rugs.0.services.stainRemoval' && row.action === 'skip')) throw new Error(`Denied service must not be applied: ${JSON.stringify(custom.preview)}`);

  console.log(JSON.stringify({ confidence: result.confidence, rugs: result.rugs, previewRows: result.previewRows, customPhone: custom.parsed.phones[0].phone }));
} finally {
  await browser.close();
}
