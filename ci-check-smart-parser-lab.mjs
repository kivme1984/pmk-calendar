import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

try {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('http://127.0.0.1:8000/smart-parser-lab.html?ci=1', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  await page.waitForFunction(() => Boolean(window.PMK_SMART_PARSER_NEXT?.parse), null, { timeout: 10000 });
  await page.click('#sampleBtn');
  await page.waitForFunction(() => Boolean(window.PMK_LAST_LAB_PARSE), null, { timeout: 10000 });

  const result = await page.evaluate(() => ({
    title: document.querySelector('h1')?.textContent.trim(),
    resultsVisible: !document.querySelector('#results')?.hidden,
    confidence: document.querySelector('#confidenceValue')?.textContent.trim(),
    contacts: document.querySelectorAll('#contactFields .field-row').length,
    returnVisible: !document.querySelector('#returnAddressCard')?.hidden,
    rugs: document.querySelectorAll('#rugGrid .rug-card').length,
    serviceChips: [...document.querySelectorAll('#rugGrid .service-chip')].map(node => node.textContent.trim()),
    raw: document.querySelector('#rawResult')?.textContent || '',
    parsed: window.PMK_LAST_LAB_PARSE,
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
  if (!result.raw.includes('returnAddress') || !result.raw.includes('confidence')) throw new Error('Technical output is incomplete');
  if (result.bodyWidth > result.viewportWidth + 2) throw new Error(`Horizontal overflow: ${JSON.stringify({ bodyWidth: result.bodyWidth, viewportWidth: result.viewportWidth })}`);

  await page.fill('#sourceText', 'Улица Новая 5-10, Ольга 9535514477. Ковер 230/160, пятна не выводить. За 15 мин ждёт.');
  await page.click('#parseBtn');
  await page.waitForFunction(() => window.PMK_LAST_LAB_PARSE?.phones?.[0]?.phone === '+79535514477');
  const custom = await page.evaluate(() => window.PMK_LAST_LAB_PARSE);
  if (custom.rugs[0]?.length !== 2.3 || custom.rugs[0]?.width !== 1.6) throw new Error(`Slash dimension failed in lab: ${JSON.stringify(custom)}`);
  if (custom.rugs[0]?.services?.stainRemoval !== 'denied') throw new Error(`Negation failed in lab: ${JSON.stringify(custom)}`);
  if (custom.time?.callAheadMinutes !== 15) throw new Error(`Call-ahead failed in lab: ${JSON.stringify(custom)}`);

  console.log(JSON.stringify({ confidence: result.confidence, rugs: result.rugs, customPhone: custom.phones[0].phone }));
} finally {
  await browser.close();
}
