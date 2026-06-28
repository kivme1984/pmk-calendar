'use strict';

(() => {
  const api = window.PMK_SMART_PARSER_V45;
  if (!api?.parseText || window.PMK_REAL_CASE_PARSER_V49) return;

  const previous = api.parseText.bind(api);
  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const suspiciousNames = new Set([
    'автозаводский', 'ленинский', 'канавинский', 'московский', 'сормовский',
    'нижегородский', 'советский', 'приокский', 'район', 'улица', 'адрес', 'телефон',
  ]);
  const stopName = /^(?:один|два|две|три|четыре|пять|ков[её]р|ковра|ковров|первый|второй|третий|синтетика|шерсть|шегги|размер|ворс|дома|ожидает|завтра|сегодня|улица|дом|квартира|район)$/i;

  function nameCandidate(value = '') {
    const result = [];
    for (const token of clean(value).split(/\s+/)) {
      const word = token.toLowerCase().replace(/[^а-яё-]/g, '');
      if (!word || stopName.test(word) || suspiciousNames.has(word) || /^\d/.test(token)) break;
      result.push(word);
      if (result.length === 3) break;
    }
    return result.length ? result.map(word => word[0].toUpperCase() + word.slice(1)).join(' ') : '';
  }

  function extractName(text, fallback = '') {
    const patterns = [
      /(?:^|[\s,.;:—–-])зовут\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /(?:^|[\s,.;:—–-])имя\s*(?:клиента|клиентки)?\s*[:—–-]?\s*([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /(?:^|[\s,.;:—–-])клиент(?:ка)?(?![а-яё])\s*(?:это|будет)?\s*[:—–-]?\s*([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /(?:^|[\s,.;:—–-])(?:позвонила|позвонил|обращается)\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
    ];
    for (const pattern of patterns) {
      const value = nameCandidate(text.match(pattern)?.[1] || '');
      if (value) return value;
    }

    const afterPhone = text.match(/(?:телефон(?:\s+клиента)?\s*[:—–-]?\s*)?(?:\+?7|8)?[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})(?=\s+(?:(?:один|два|две|три|четыре|пять|\d+)\s+ковр|перв(?:ый|ого)|ков[её]р))/i);
    const phoneName = nameCandidate(afterPhone?.[1] || '');
    if (phoneName) return phoneName;

    const beforeRugs = text.match(/(?:^|[\s,.;:—–-])([а-яё-]{2,30})(?=\s+(?:один|два|две|три|четыре|пять|\d+)\s+ковр)/i);
    const rugName = nameCandidate(beforeRugs?.[1] || '');
    if (rugName) return rugName;

    return suspiciousNames.has(clean(fallback).split(/\s+/)[0]?.toLowerCase()) ? '' : clean(fallback);
  }

  function extractStreet(text, fallback = '') {
    const match = text.match(/(?:^|[\s,.;:—–-])(улица|ул\.?|проспект|пр-т|проезд|переулок|пер\.?|шоссе|набережная|наб\.?|бульвар|площадь|микрорайон)\s+([а-яёa-z0-9'’-]+(?:\s+[а-яёa-z0-9'’-]+){0,4}?)(?=\s+(?:дом|д\.?|квартира|кв\.?|подъезд|этаж|корпус|строение|телефон|$))/i);
    return match ? clean(`${match[1].replace(/\.$/, '')} ${match[2]}`) : fallback || '';
  }

  const numberMap = { один: 1, одна: 1, полтора: 1.5, полторы: 1.5, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10 };
  const token = '(?:\\d+(?:[.,]\\d+)?|полтор[аы]|один|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)';
  const numberValue = value => /^\d/.test(value) ? Number(value.replace(',', '.')) : numberMap[value.toLowerCase().replace(/ё/g, 'е')] || 0;

  function strictDimension(text = '') {
    const fixed = String(text).replace(/\bшесть\s+(?=услуг|услуги|выч[её]с|шерст|запах)/gi, 'есть ');
    const match = fixed.match(new RegExp(`(${token})\\s*(?:м(?:етра|етров)?\\s*)?(?:x|х|×|\\*|на)\\s*(${token})`, 'i'));
    if (!match) return null;
    const length = numberValue(match[1]);
    const width = numberValue(match[2]);
    return length > 0 && width > 0 && length <= 20 && width <= 20 ? { length, width } : null;
  }

  function repairRugs(text, rugs = []) {
    const countMatch = text.match(/(?:^|[^а-яё0-9])(один|два|две|три|четыре|пять|[1-5])\s+ковр[а-яё]*/i);
    const counts = { один: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5 };
    const count = countMatch ? Number(countMatch[1]) || counts[countMatch[1].toLowerCase()] || 0 : 0;
    const result = (Array.isArray(rugs) ? rugs : []).map(rug => ({ ...rug, services: [...new Set(rug.services || [])] }));
    while (result.length < count) result.push({ length: 0, width: 0, material: '', pile: '', issues: [], services: [] });
    if (count) result.length = count;

    const markers = [];
    const pattern = /(?:^|[\s,.;:—–-])(перв(?:ый|ого|ом|ому)|втор(?:ой|ого|ом|ому)|трет(?:ий|ьего|ьем|ьему)|четв[её]рт(?:ый|ого|ом|ому)|пят(?:ый|ого|ом|ому))(?:\s+ков[её]р[а-яё]*)?/gim;
    let match;
    while ((match = pattern.exec(text))) {
      const word = match[1].toLowerCase().replace(/ё/g, 'е');
      const index = /^перв/.test(word) ? 0 : /^втор/.test(word) ? 1 : /^трет/.test(word) ? 2 : /^четверт/.test(word) ? 3 : 4;
      markers.push({ index, start: match.index, end: pattern.lastIndex });
    }
    markers.forEach((marker, position) => {
      if (!result[marker.index]) return;
      const segment = text.slice(marker.end, markers[position + 1]?.start ?? text.length);
      const dimension = strictDimension(segment);
      if (dimension) Object.assign(result[marker.index], dimension);
    });
    return result;
  }

  function extractTime(text, parsed) {
    const match = text.match(/(?:^|[^0-9])с\s*(\d{1,2})(?::(\d{2}))?\s*до\s*(\d{1,2})(?::(\d{2}))?/i);
    if (!match) return { startTime: parsed.startTime || '', endTime: parsed.endTime || '', timeNote: parsed.timeNote || '' };
    const values = [Number(match[1]), Number(match[2] || 0), Number(match[3]), Number(match[4] || 0)];
    if (values[0] > 23 || values[2] > 23 || values[1] > 59 || values[3] > 59) return { startTime: '', endTime: '', timeNote: '' };
    return {
      startTime: `${String(values[0]).padStart(2, '0')}:${String(values[1]).padStart(2, '0')}`,
      endTime: `${String(values[2]).padStart(2, '0')}:${String(values[3]).padStart(2, '0')}`,
      timeNote: clean(match[0]),
    };
  }

  function extractDate(text, fallback = '') {
    try {
      if (/послезавтра/i.test(text)) return addDaysToKey(businessTodayKey(), 2);
      if (/завтра/i.test(text)) return addDaysToKey(businessTodayKey(), 1);
      if (/сегодня/i.test(text)) return businessTodayKey();
    } catch {}
    return fallback || '';
  }

  api.parseText = function parseRealCaseV49(rawText) {
    const parsed = previous(rawText);
    const text = String(parsed.text || rawText || '');
    return {
      ...parsed,
      customerName: extractName(text, parsed.customerName),
      street: extractStreet(text, parsed.street),
      visitDate: extractDate(text, parsed.visitDate),
      ...extractTime(text, parsed),
      rugs: repairRugs(text, parsed.rugs),
    };
  };

  window.PMK_REAL_CASE_PARSER_V49 = { extractName, extractStreet, strictDimension, repairRugs, extractTime, extractDate };
})();
