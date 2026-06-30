'use strict';

(() => {
  if (window.PMK_INTUITIVE_PARSER_V66) return;
  window.PMK_INTUITIVE_PARSER_V66 = true;

  const STORAGE_KEY = 'pmk-smart-paste-draft-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const title = value => clean(value).toLowerCase().replace(/(^|[\s-])[а-яё]/g, letter => letter.toUpperCase());
  const unique = values => [...new Set((values || []).filter(Boolean))];
  const api = window.PMK_SMART_PARSER_V45;
  if (!api?.parseText) return;
  const previous = api.parseText.bind(api);

  const DISTRICTS = [
    ['Автозаводский', /автозаводск|автозавод|автоз/i],
    ['Ленинский', /ленинск/i], ['Канавинский', /канавин/i],
    ['Московский', /московск(?:ий|ого)?\s*(?:район|р-н)?/i],
    ['Сормовский', /сормов/i],
    ['Нижегородский', /нижегородск(?:ий|ого)?\s*(?:район|р-н)?/i],
    ['Советский', /советск(?:ий|ого)?\s*(?:район|р-н)?/i],
    ['Приокский', /приок/i],
  ];
  const SETTLEMENTS = [
    ['Нижний Новгород', /нижн(?:ий|его)?\s+новгород|\bнн\b/i], ['Бор', /(?:г\.?|город\s+)?бор\b/i],
    ['Дзержинск', /дзержинск/i], ['Кстово', /кстов/i], ['Богородск', /богородск/i],
    ['Балахна', /балахн/i], ['Городец', /городец/i], ['Павлово', /павлов/i], ['Арзамас', /арзамас/i],
  ];
  const MONTHS = { января:1, февраля:2, марта:3, апреля:4, мая:5, июня:6, июля:7, августа:8, сентября:9, октября:10, ноября:11, декабря:12 };
  const WEEKDAYS = { воскресенье:0, понедельник:1, вторник:2, среда:3, четверг:4, пятница:5, суббота:6 };

  function normalizedText(value = '') {
    return String(value)
      .replace(/\r/g, '\n')
      .replace(/[«»„“”]/g, '"')
      .replace(/\bикс\b/gi, ' на ')
      .replace(/\bумножить\s+на\b/gi, ' на ')
      .replace(/\s*([,;])\s*/g, '$1 ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function labeled(text, labels, max = 80) {
    const pattern = labels.join('|');
    const match = text.match(new RegExp(`(?:^|\\n|[.;])\\s*(?:${pattern})\\s*[:—–-]?\\s*([^\\n.;]{1,${max}})`, 'i'));
    return clean(match?.[1] || '');
  }

  function extractName(text, fallback = '') {
    const explicit = labeled(text, ['имя(?:\\s+клиента)?', 'клиент(?:ка)?', 'заказчик', 'зовут'], 70)
      .replace(/\b(?:телефон|номер|адрес|улица|ков[её]р).*$/i, '');
    const phrase = text.match(/(?:меня|е[её]|его)\s+зовут\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})/i)?.[1]
      || text.match(/(?:^|[,.\n])\s*([А-ЯЁ][а-яё-]{1,25})(?:\s+[А-ЯЁ][а-яё-]{1,25}){0,2}\s*(?=,?\s*(?:телефон|номер|адрес|ул\.|улица|ков[её]р))/)?.[1];
    const candidate = clean(explicit || phrase || fallback);
    if (!candidate || /район|улица|ков[её]р|забор|доставка|синтет|шерст|телефон|адрес/i.test(candidate)) return '';
    return title(candidate.split(/\s+/).slice(0, 3).join(' '));
  }

  function extractPhone(text, fallback = '') {
    const match = text.match(/(?:\+?7|8)?[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/);
    if (!match) return fallback || '';
    let digits = match[0].replace(/\D/g, '');
    if (digits.length === 10) digits = `7${digits}`;
    if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    return digits.length === 11 ? `+${digits}` : fallback || '';
  }

  function extractAddress(text, fallback = {}) {
    const result = { ...fallback };
    for (const [name, pattern] of SETTLEMENTS) if (pattern.test(text)) { result.settlement = name; break; }
    for (const [name, pattern] of DISTRICTS) if (pattern.test(text)) { result.district = name; break; }

    const street = text.match(/(?:^|[\s,.;\n])(улица|ул\.?|проспект|пр-т|проезд|переулок|пер\.?|шоссе|набережная|наб\.?|бульвар|площадь|микрорайон|мкр\.?)\s+([а-яёa-z0-9'’\-]+(?:\s+[а-яёa-z0-9'’\-]+){0,5}?)(?=\s*(?:,|дом|д\.?|квартира|кв\.?|подъезд|этаж|корпус|стр\.?|$))/i);
    if (street) result.street = clean(`${street[1].replace(/\.$/, '')} ${street[2]}`);
    const addressLabel = labeled(text, ['адрес'], 150);
    if (!result.street && addressLabel) {
      const generic = addressLabel.match(/^(.*?)(?=\s+(?:дом|д\.?)\s*\d|,\s*\d)/i)?.[1];
      if (generic) result.street = clean(generic.replace(/^(?:г\.?\s*[^,]+,?\s*)/i, ''));
    }

    const house = text.match(/(?:дом|д\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?(?:[\/-]\d+[а-яa-z]?)?)/i);
    const flat = text.match(/(?:квартира|кв\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?)/i);
    const entrance = text.match(/(?:подъезд|под\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?)/i);
    const floor = text.match(/(?:этаж|эт\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?)/i);
    if (house) result.houseNumber = house[1];
    if (flat) result.apartmentNumber = flat[1];
    if (entrance) result.entrance = entrance[1];
    if (floor) result.floor = floor[1];
    result.settlement ||= 'Нижний Новгород';
    return result;
  }

  function extractContract(text, fallback = '') {
    const match = text.match(/(?:договор(?:\s+пмк)?|номер\s+договора|№\s*договора|\bд)\s*[:№#-]?\s*([дd]?\s*\d{3,4})\b/i);
    return clean(match?.[1] || fallback).replace(/\s+/g, '');
  }

  function extractDate(text, fallback = '') {
    if (/послезавтра/i.test(text)) return addDaysToKey(businessTodayKey(), 2);
    if (/завтра/i.test(text)) return addDaysToKey(businessTodayKey(), 1);
    if (/сегодня/i.test(text)) return businessTodayKey();
    const numeric = text.match(/(?:^|\D)(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?(?=\D|$)/);
    if (numeric) {
      let year = numeric[3] ? Number(numeric[3]) : Number(businessTodayKey().slice(0, 4));
      if (year < 100) year += 2000;
      return `${year}-${String(Number(numeric[2])).padStart(2, '0')}-${String(Number(numeric[1])).padStart(2, '0')}`;
    }
    for (const [monthName, month] of Object.entries(MONTHS)) {
      const match = text.match(new RegExp(`(?:^|\\D)(\\d{1,2})\\s+${monthName}(?:\\s+(\\d{4}))?`, 'i'));
      if (!match) continue;
      const year = Number(match[2] || businessTodayKey().slice(0, 4));
      return `${year}-${String(month).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`;
    }
    const lower = text.toLowerCase().replace(/ё/g, 'е');
    for (const [word, day] of Object.entries(WEEKDAYS)) {
      if (!new RegExp(`\\b${word.slice(0, -1)}`, 'i').test(lower)) continue;
      const today = dateKeyForDisplay(businessTodayKey()).getUTCDay();
      let delta = (day - today + 7) % 7;
      if (!delta || /следующ/i.test(lower)) delta += 7;
      return addDaysToKey(businessTodayKey(), delta);
    }
    return fallback || '';
  }

  function timeString(hour, minute = 0, context = '') {
    let h = Number(hour);
    if (/вечер|дня/i.test(context) && h < 12) h += 12;
    if (/ноч/i.test(context) && h === 12) h = 0;
    if (!(h >= 0 && h <= 23)) return '';
    return `${String(h).padStart(2, '0')}:${String(Number(minute || 0)).padStart(2, '0')}`;
  }

  function extractTime(text, fallback = {}) {
    const range = text.match(/(?:с\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:до|[-–—])\s*(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи)?/i);
    if (range) return {
      startTime: timeString(range[1], range[2], range[5]),
      endTime: timeString(range[3], range[4], range[5]),
      timeNote: clean(range[0]),
    };
    const after = text.match(/(?:после|к|в)\s*(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи)?/i);
    if (after) {
      const startTime = timeString(after[1], after[2], after[3]);
      return { startTime, endTime: addMinutesToTime(startTime, REQUEST_DURATION_MINUTES), timeNote: clean(after[0]) };
    }
    return { startTime: fallback.startTime || '', endTime: fallback.endTime || '', timeNote: fallback.timeNote || '' };
  }

  function material(text = '') {
    if (/вискоз/i.test(text)) return 'Вискоза';
    if (/ш[её]лк/i.test(text)) return 'Шёлк';
    if (/хлопок/i.test(text)) return 'Хлопок';
    if (/безворс|палас|циновк|килим/i.test(text)) return 'Безворсный';
    if (/шерстян|100\s*%\s*шерст/i.test(text)) return 'Шерсть';
    if (/синтет|полипропилен|полиэстер|акрил|нейлон|ш[еёа]гги|shaggy/i.test(text)) return 'Синтетика';
    return '';
  }

  function pile(text = '') {
    if (/безворс|палас|циновк|килим/i.test(text)) return 'Без ворса';
    if (/высок\w*\s+ворс|длинн\w*\s+ворс|ш[еёа]гги|shaggy|ворс\s*(?:более|свыше)\s*1/i.test(text)) return 'Более 1 см';
    if (/средн\w*\s+ворс|коротк\w*\s+ворс|низк\w*\s+ворс|ворс\s*до\s*1/i.test(text)) return 'До 1 см';
    return '';
  }

  function serviceData(text = '') {
    const issues = unique([
      /пятн|вино|кофе|кровь|краск|жир|маркер/i.test(text) ? 'Пятна' : '',
      /шерст(?:ь|и)?\s*(?:кош|собак|животн)?/i.test(text) && !/шерстян\w*\s+ков/i.test(text) ? 'Шерсть' : '',
      /волос/i.test(text) ? 'Волосы' : '',
      /запах\s*мочи|моч[аи]|описал|описала|метк[аи]/i.test(text) ? 'Запах мочи' : '',
      /дезинф|потоп|обеззараж/i.test(text) ? 'Дезинфекция' : '',
      /слайм|пластилин/i.test(text) ? 'Слайм / пластилин' : '',
    ]);
    const services = unique([
      /пятн|слайм|пластилин|маркер|вино|кофе|кровь|краск|жир/i.test(text) ? 'Удаление пятен' : '',
      /шерст|волос|выч[её]с|вычес/i.test(text) && !/шерстян\w*\s+ков/i.test(text) ? 'Вычёсывание шерсти и волос' : '',
      /запах\s*мочи|моч[аи]|описал|описала|метк[аи]/i.test(text) ? 'Удаление запаха мочи' : '',
      /дезинф|потоп|обеззараж/i.test(text) ? 'Дезинфекция' : '',
      /подъ[её]м\s*ворс|расч[её]с|расчес|причес/i.test(text) ? 'Подъём ворса' : '',
      /озон/i.test(text) ? 'Озонация' : '', /кондиционер/i.test(text) ? 'Кондиционер' : '',
      /экспресс|срочн|ускоренн/i.test(text) ? 'Экспресс-стирка' : '',
    ]);
    return { issues, services };
  }

  function normalizedDimension(a, b, unit = '') {
    let length = Number(String(a).replace(',', '.'));
    let width = Number(String(b).replace(',', '.'));
    if (/см/i.test(unit) || length > 20 || width > 20) { length /= 100; width /= 100; }
    if (!(length > 0 && width > 0 && length <= 20 && width <= 20)) return null;
    return { length: Number(length.toFixed(2)), width: Number(width.toFixed(2)) };
  }

  function dimensions(text = '') {
    const result = [];
    const pattern = /(\d+(?:[.,]\d+)?)\s*(см|м|метр\w*)?\s*(?:x|х|×|\*|на)\s*(\d+(?:[.,]\d+)?)\s*(см|м|метр\w*)?/ig;
    let match;
    while ((match = pattern.exec(text))) {
      const value = normalizedDimension(match[1], match[3], `${match[2] || ''} ${match[4] || ''}`);
      if (value) result.push({ ...value, index: match.index, end: pattern.lastIndex });
    }
    const explicit = text.match(/длин[аы]?\s*[:=-]?\s*(\d+(?:[.,]\d+)?).{0,60}?ширин[аы]?\s*[:=-]?\s*(\d+(?:[.,]\d+)?)/i)
      || text.match(/ширин[аы]?\s*[:=-]?\s*(\d+(?:[.,]\d+)?).{0,60}?длин[аы]?\s*[:=-]?\s*(\d+(?:[.,]\d+)?)/i);
    if (explicit && !result.length) {
      const reversed = /^ширин/i.test(explicit[0]);
      const value = normalizedDimension(reversed ? explicit[2] : explicit[1], reversed ? explicit[1] : explicit[2]);
      if (value) result.push({ ...value, index: explicit.index || 0, end: (explicit.index || 0) + explicit[0].length });
    }
    return result;
  }

  function rugCount(text = '') {
    const match = text.match(/\b(\d{1,2})\s+ковр/i);
    if (match) return Math.min(30, Number(match[1]));
    const words = { один:1, два:2, две:2, три:3, четыре:4, пять:5, шесть:6, семь:7, восемь:8, девять:9, десять:10 };
    const word = text.match(/\b(один|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)\s+ковр/i)?.[1];
    return words[word] || 0;
  }

  function extractRugs(text, fallback = []) {
    const found = dimensions(text);
    let rugs = found.map((item, index) => {
      const start = index ? found[index - 1].end : Math.max(0, item.index - 130);
      const end = found[index + 1]?.index ?? Math.min(text.length, item.end + 220);
      const context = text.slice(start, end);
      return { ...item, material: material(context), pile: pile(context), ...serviceData(context) };
    }).map(({ index, end, ...rug }) => rug);

    if (!rugs.length && Array.isArray(fallback)) rugs = fallback.map(rug => ({ ...rug }));
    const count = rugCount(text);
    while (count && rugs.length < count) rugs.push({ length:0, width:0, material:'', pile:'', issues:[], services:[] });
    if (rugs.length === 1) {
      rugs[0].material ||= material(text);
      rugs[0].pile ||= pile(text);
      const all = serviceData(text);
      rugs[0].issues = unique([...(rugs[0].issues || []), ...all.issues]);
      rugs[0].services = unique([...(rugs[0].services || []), ...all.services]);
    }
    return rugs;
  }

  function parse(raw) {
    const text = normalizedText(raw);
    const base = previous(text) || {};
    const address = extractAddress(text, base);
    const times = extractTime(text, base);
    const contractNumber = extractContract(text, base.contractNumber);
    const priceMatch = text.match(/(?:итого|цена|стоимость|сумма)\s*[:=-]?\s*(\d[\d\s]{2,})\s*(?:₽|р\.?|руб)/i);
    const discountMatch = text.match(/скидк[аи]?\s*[:=-]?\s*(\d{1,2})\s*%/i);
    return {
      ...base,
      text,
      customerName: extractName(text, base.customerName),
      phone: extractPhone(text, base.phone),
      ...address,
      contractNumber,
      visitDate: extractDate(text, base.visitDate),
      ...times,
      rugs: extractRugs(text, base.rugs),
      estimatedPrice: priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : Number(base.estimatedPrice || 0),
      discount: discountMatch ? Number(discountMatch[1]) : Number(base.discount || 0),
      regularCustomer: /постоянн\w*\s+клиент|повторн\w*\s+заказ|уже\s+обращал/i.test(text) || Boolean(base.regularCustomer),
    };
  }

  function labels(parsed) {
    const values = [];
    if (parsed.customerName) values.push(`Имя: ${parsed.customerName}`);
    if (parsed.phone) values.push(`Телефон: ${parsed.phone}`);
    const address = [parsed.settlement, parsed.street, parsed.houseNumber && `д. ${parsed.houseNumber}`, parsed.apartmentNumber && `кв. ${parsed.apartmentNumber}`, parsed.entrance && `подъезд ${parsed.entrance}`, parsed.floor && `этаж ${parsed.floor}`].filter(Boolean).join(', ');
    if (address) values.push(`Адрес: ${address}`);
    if (parsed.district) values.push(`Район: ${parsed.district}`);
    if (parsed.contractNumber) values.push(`Договор: ${parsed.contractNumber}`);
    if (parsed.visitDate) values.push(`Дата: ${formatDateShort(parsed.visitDate)}`);
    if (parsed.startTime) values.push(`Время: ${parsed.startTime}${parsed.endTime ? `–${parsed.endTime}` : ''}`);
    (parsed.rugs || []).forEach((rug, index) => values.push(`Ковёр ${index + 1}: ${rug.length || '?'}×${rug.width || '?'} м${rug.material ? `, ${rug.material}` : ''}${rug.services?.length ? `, ${rug.services.join(', ')}` : ''}`));
    if (parsed.estimatedPrice) values.push(`Стоимость: ${formatMoney(parsed.estimatedPrice)}`);
    return values;
  }

  function missing(parsed) {
    const result = [];
    if (!parsed.customerName) result.push('имя');
    if (!parsed.phone) result.push('телефон');
    if (!parsed.street || !parsed.houseNumber) result.push('адрес');
    if (!parsed.district) result.push('район');
    if (!parsed.visitDate) result.push('дату');
    if (!parsed.startTime) result.push('время');
    if (!(parsed.rugs || []).length) result.push('размеры ковров');
    else if (parsed.rugs.some(rug => !rug.length || !rug.width || !rug.material)) result.push('параметры ковров');
    return result;
  }

  function apply() {
    const textarea = $('#smartPasteInput');
    const raw = textarea?.value.trim() || '';
    if (!raw) return showToast('Вставьте или продиктуйте информацию клиента.', 'error');
    const parsed = parse(raw);
    const current = getFormData();
    const sourceComment = `Исходный текст клиента:\n${raw}`;
    const next = {
      ...current,
      customerName: parsed.customerName || current.customerName,
      phone: parsed.phone || current.phone,
      orderSource: parsed.orderSource || current.orderSource,
      settlement: parsed.settlement || current.settlement || 'Нижний Новгород',
      district: parsed.district || current.district,
      street: parsed.street || current.street,
      houseNumber: parsed.houseNumber || current.houseNumber,
      apartmentNumber: parsed.apartmentNumber || current.apartmentNumber,
      entrance: parsed.entrance || current.entrance,
      floor: parsed.floor || current.floor,
      contractNumber: parsed.contractNumber || current.contractNumber,
      visitType: parsed.visitType || current.visitType || 'pickup',
      visitDate: parsed.visitDate || current.visitDate,
      startTime: parsed.startTime || current.startTime,
      endTime: parsed.endTime || current.endTime,
      timeNote: parsed.timeNote || current.timeNote,
      rugs: parsed.rugs?.length ? parsed.rugs : current.rugs,
      estimatedPrice: parsed.estimatedPrice || current.estimatedPrice,
      discount: parsed.discount || current.discount,
      regularCustomer: parsed.regularCustomer || current.regularCustomer,
      callAhead: parsed.callAhead ?? current.callAhead,
      callAheadMinutes: parsed.callAheadMinutes || current.callAheadMinutes,
      managerComment: clean(current.managerComment).includes(raw) ? current.managerComment : [clean(current.managerComment), sourceComment].filter(Boolean).join('\n\n'),
      eventId: current.eventId,
      pmkId: current.pmkId,
    };
    fillForm(next);
    textarea.value = raw;
    try { localStorage.setItem(STORAGE_KEY, raw); } catch {}
    if (!current.eventId) {
      $('#eventId').value = '';
      $('#eventId').dataset.pmkId = current.pmkId || makeId();
      $('#deleteEventBtn')?.classList.add('hidden');
      $('#formTitle').textContent = 'Новая заявка — информация распределена';
    }

    const recognized = labels(parsed);
    const absent = missing(parsed);
    const result = $('#smartPasteResult');
    if (result) {
      result.className = `smart-paste-result ${recognized.length ? 'success' : 'warning'}`;
      result.innerHTML = `<strong>${recognized.length ? 'Распознано и распределено:' : 'Точные поля не найдены'}</strong>${recognized.length ? `<div>${recognized.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div>` : ''}${absent.length ? `<small>Нужно уточнить: ${escapeHtml(absent.join(', '))}.</small>` : '<small>Основные данные заполнены. Проверьте результат.</small>'}`;
    }

    const completeRugs = next.rugs?.length && next.rugs.every(rug => Number(rug.length) > 0 && Number(rug.width) > 0 && rug.material);
    if (completeRugs) {
      const toggle = $('#autoPrice');
      if (toggle) toggle.checked = true;
      window.PMK_PRICING_V48?.calculatePrice?.();
    }
    schedulePreviewUpdate();
    showToast(absent.length ? `Данные распределены. Уточните: ${absent.join(', ')}.` : 'Все распознанные данные распределены.', absent.length ? '' : 'success');
  }

  function install() {
    const oldButton = $('#smartPasteParseBtn');
    const textarea = $('#smartPasteInput');
    if (!oldButton || !textarea) return false;
    if (oldButton.dataset.intuitiveParser === '66') return true;
    const button = oldButton.cloneNode(true);
    button.dataset.intuitiveParser = '66';
    button.textContent = 'Разобрать и заполнить заявку';
    oldButton.replaceWith(button);
    button.addEventListener('click', apply);
    textarea.placeholder = 'Например: Ольга, +7 920 000-00-00, Сормовский район, ул. Коминтерна, д. 115, кв. 45. Два ковра: 2×3 синтетика, пятна и шерсть; 1,5×2 шерсть. Забор 15 июля с 17:00 до 19:00, договор Д453.';
    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        apply();
      }
    }, true);
    api.parseText = parse;
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 180) clearInterval(timer);
    }, 50);
  }

  window.PMK_INTUITIVE_PARSER_V66_API = { parse, apply, extractAddress, extractRugs, serviceData };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();