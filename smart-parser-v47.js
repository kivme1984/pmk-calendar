'use strict';

(() => {
  const api = window.PMK_SMART_PARSER_V45;
  if (!api?.parseText) return;

  const previousParseText = api.parseText.bind(api);
  const NUMBER_WORDS = {
    ноль: 0, один: 1, одна: 1, первое: 1, два: 2, две: 2, три: 3,
    четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9,
  };
  const NAME_STOP_WORDS = new Set([
    'телефон', 'номер', 'адрес', 'улица', 'дом', 'квартира', 'подъезд', 'этаж',
    'район', 'город', 'поселок', 'посёлок', 'ковер', 'ковёр', 'ковра', 'ковров',
    'два', 'три', 'четыре', 'пять', 'забор', 'доставка', 'размер', 'размеры',
    'синтетика', 'шерсть', 'шегги', 'пятна', 'запах', 'сегодня', 'завтра',
    'постоянный', 'клиент', 'клиентка', 'заказ', 'заявка', 'нужно', 'надо',
  ]);

  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const unique = values => [...new Set((values || []).filter(Boolean))];
  const titleCase = value => clean(value).toLowerCase().replace(/(^|[\s-])[а-яё]/g, char => char.toUpperCase());

  function numberValue(value = '') {
    const raw = clean(value).toLowerCase().replace(/ё/g, 'е');
    if (/^\d+$/.test(raw)) return Number(raw);
    if (NUMBER_WORDS[raw] !== undefined) return NUMBER_WORDS[raw];
    const parsed = api.parseNumberPhrase?.(raw);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }

  function cleanNameCandidate(value = '') {
    const tokens = clean(value)
      .replace(/^[—–:,-]+|[—–:,.!?-]+$/g, '')
      .split(/\s+/)
      .filter(Boolean);
    const accepted = [];

    for (const token of tokens) {
      const normalized = token.toLowerCase().replace(/[^а-яё-]/g, '');
      if (!normalized || NAME_STOP_WORDS.has(normalized)) break;
      if (/^(это|будет|его|ее|её)$/i.test(normalized)) continue;
      accepted.push(normalized);
      if (accepted.length === 3) break;
    }

    return accepted.length ? titleCase(accepted.join(' ')) : '';
  }

  function extractBetterName(text = '', fallback = '') {
    const patterns = [
      /(?:имя(?:\s+клиента|\s+клиентки)?|клиент(?:ка)?|заказчик(?:ца)?|получатель)\s*(?:это|будет|зовут)?\s*[:—–-]?\s*([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /(?:клиента|клиентку|заказчика|заказчицу|его|ее|её)\s+зовут\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /(?:^|[\s,.;:—–-])зовут\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /(?:запишите|оформите|заявка|заказ)\s+(?:на|от)\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /(?:обращается|позвонила|позвонил)\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
    ];

    for (const pattern of patterns) {
      const candidate = cleanNameCandidate(text.match(pattern)?.[1] || '');
      if (candidate) return candidate;
    }

    const firstSegment = clean(text.split(/[\n,.;]/)[0]);
    if (/^[а-яё-]{2,30}(?:\s+[а-яё-]{2,30}){0,2}$/i.test(firstSegment)) {
      const candidate = cleanNameCandidate(firstSegment);
      if (candidate) return candidate;
    }

    const leading = text.match(/^\s*([а-яё-]{2,30}(?:\s+[а-яё-]{2,30})?)\s+(?=телефон|номер|адрес|улица|два\s+ков|три\s+ков|ков[её]р)/i);
    return cleanNameCandidate(leading?.[1] || '') || fallback || '';
  }

  function explicitRugCount(text = '') {
    const match = text.match(/(?:количество\s+ковр[а-яё]*\s*[:—–-]?\s*)?(\d+|один|два|две|три|четыре|пять)\s*(?:штук[аи]?\s*)?ковр[а-яё]*/i);
    return match ? Math.max(0, Math.min(10, numberValue(match[1]))) : 0;
  }

  function normalizeRugMarkers(text = '') {
    let value = String(text);
    value = value.replace(/((?:два|две|три|четыре|пять|[2-5])\s+ковр[а-яё]*\s*[:—–,-]?\s*)(?:один|1)(?=\s|$|[,.;])/gi, '$1 первый ковёр ');
    value = value.replace(/ков[её]р\s*(?:номер\s*)?(?:один|1)(?=\s|$|[,.;])/gi, 'первый ковёр');
    value = value.replace(/ков[её]р\s*(?:номер\s*)?(?:два|2)(?=\s|$|[,.;])/gi, 'второй ковёр');
    value = value.replace(/ков[её]р\s*(?:номер\s*)?(?:три|3)(?=\s|$|[,.;])/gi, 'третий ковёр');
    value = value.replace(/ков[её]р\s*(?:номер\s*)?(?:четыре|4)(?=\s|$|[,.;])/gi, 'четвёртый ковёр');
    value = value.replace(/ков[её]р\s*(?:номер\s*)?(?:пять|5)(?=\s|$|[,.;])/gi, 'пятый ковёр');
    return value;
  }

  function markerIndex(value = '') {
    const word = value.toLowerCase().replace(/ё/g, 'е');
    if (/^(?:1|перв)/.test(word)) return 0;
    if (/^(?:2|втор)/.test(word)) return 1;
    if (/^(?:3|трет)/.test(word)) return 2;
    if (/^(?:4|четверт)/.test(word)) return 3;
    if (/^(?:5|пят)/.test(word)) return 4;
    return -1;
  }

  function findRugMarkers(text = '') {
    const normalized = normalizeRugMarkers(text);
    const pattern = /(^|[\s,.;:—–-])(?:на|у|для)?\s*(?:ков[её]р[а-яё]*\s*(?:номер\s*)?)?(перв(?:ый|ого|ом|ому)|втор(?:ой|ого|ом|ому)|трет(?:ий|ьего|ьем|ьему)|четв[её]рт(?:ый|ого|ом|ому)|пят(?:ый|ого|ом|ому)|[1-5](?:-?й)?)(?:\s+ков[её]р[а-яё]*)?(?=$|[\s,.;:—–-])/gim;
    const markers = [];
    let match;

    while ((match = pattern.exec(normalized))) {
      const full = clean(match[0]);
      if (/^[1-5]\s+ковр[а-яё]*$/i.test(full)) continue;
      const after = normalized.slice(pattern.lastIndex).match(/^\s*(\S+)/)?.[1]?.toLowerCase() || '';
      if (/^(подъезд|этаж|дом|квартира|корпус|строение)/i.test(after)) continue;
      const index = markerIndex(match[2]);
      if (index < 0) continue;
      const prefixLength = match[1]?.length || 0;
      markers.push({ index, start: match.index + prefixLength, end: pattern.lastIndex });
    }

    return { normalized, markers };
  }

  function materialFromContext(text = '') {
    if (/ш[еёа]гги|шагги|shaggy|травк/i.test(text)) return 'Синтетика';
    if (/синтет|искусствен|полипропилен|полиэстер|акрил|нейлон|хит[-\s]*сет|heat\s*set|bcf|фризе/i.test(text)) return 'Синтетика';
    if (/шерстян|100\s*%\s*шерст|натуральн[а-яё]*\s+шерст/i.test(text)) return 'Шерсть';
    if (/вискоз/i.test(text)) return 'Вискоза';
    if (/ш[её]лк/i.test(text)) return 'Шёлк';
    if (/хлопок|хлопков/i.test(text)) return 'Хлопок';
    if (/безворс|без\s+ворс|циновк|килим|палас/i.test(text)) return 'Безворсный';
    return '';
  }

  function pileFromContext(text = '') {
    if (/ш[еёа]гги|шагги|shaggy|травк|высок[а-яё]*\s+ворс|длинн[а-яё]*\s+ворс/i.test(text)) return 'Более 1 см';
    if (/безворс|без\s+ворс|циновк|килим|палас/i.test(text)) return 'Без ворса';
    if (/средн[а-яё]*\s+ворс|коротк[а-яё]*\s+ворс|низк[а-яё]*\s+ворс|обычн[а-яё]*\s+ворс/i.test(text)) return 'До 1 см';
    return '';
  }

  function servicesFromContext(text = '') {
    return unique([
      /пятн|запачкан|вино|кофе|кровь|краск|жир/i.test(text) ? 'Удаление пятен' : '',
      /шерст|волос|выч[её]с|вычес/i.test(text) && !/шерстян[а-яё]*\s+ков/i.test(text) ? 'Вычёсывание шерсти и волос' : '',
      /запах\s*мочи|моч[аи]|описал|описала|метк[аи]/i.test(text) ? 'Удаление запаха мочи' : '',
      /дезинф|обеззараж/i.test(text) ? 'Дезинфекция' : '',
      /слайм|пластилин/i.test(text) ? 'Удаление слайма / пластилина' : '',
      /расч[её]с|расчес|поднят(?:ие|ь|ься)\s*ворс|подъ[её]м\s*ворс|приподнят[а-яё]*\s+ворс/i.test(text) ? 'Подъём ворса' : '',
      /озон/i.test(text) ? 'Озонация' : '',
      /кондиционер/i.test(text) ? 'Кондиционер' : '',
      /экспресс|срочн|ускоренн/i.test(text) ? 'Экспресс-стирка' : '',
    ]);
  }

  function blankRug() {
    return { length: 0, width: 0, material: '', pile: '', issues: [], services: [] };
  }

  function rugFromContext(context = '', fallback = {}) {
    const dimensionRug = api.extractRugs?.(context)?.[0] || {};
    return {
      ...blankRug(),
      length: Number(dimensionRug.length || fallback.length || 0),
      width: Number(dimensionRug.width || fallback.width || 0),
      material: materialFromContext(context),
      pile: pileFromContext(context),
      issues: [],
      services: servicesFromContext(context),
    };
  }

  function structuredRugs(text = '', baseRugs = []) {
    const count = explicitRugCount(text);
    const { normalized, markers } = findRugMarkers(text);
    const maxMarker = markers.reduce((max, marker) => Math.max(max, marker.index + 1), 0);
    const total = Math.max(count, maxMarker, baseRugs.length);
    if (!total) return baseRugs;

    const contexts = Array.from({ length: total }, () => []);
    markers.forEach((marker, position) => {
      const next = markers[position + 1];
      const segment = clean(normalized.slice(marker.end, next?.start ?? normalized.length));
      if (segment) contexts[marker.index]?.push(segment);
    });

    if (!contexts.some(parts => parts.length)) return baseRugs.length ? baseRugs : Array.from({ length: total }, blankRug);

    return Array.from({ length: total }, (_, index) => {
      const context = contexts[index].join('. ');
      return context ? rugFromContext(context, baseRugs[index] || {}) : { ...blankRug(), length: Number(baseRugs[index]?.length || 0), width: Number(baseRugs[index]?.width || 0) };
    });
  }

  function clearFalseDetections(parsed, sourceText) {
    const result = { ...parsed };
    if (/^(?:на|для|у)\s+(?:перв|втор|трет|четв[её]рт|пят)/i.test(clean(result.timeNote || ''))) {
      result.startTime = '';
      result.endTime = '';
      result.timeNote = '';
    }

    if (/ков[её]р|размер|ворс|синтет|шегги/i.test(String(result.street || '')) && !/(?:адрес|улица|ул\.|проспект|проезд|переулок|шоссе|набережная|бульвар|площадь|микрорайон)/i.test(sourceText)) {
      result.street = '';
      result.houseNumber = '';
      result.apartmentNumber = '';
      result.entrance = '';
      result.floor = '';
    }
    return result;
  }

  api.parseText = function parseTextV47(rawText) {
    const initial = previousParseText(rawText);
    const text = String(initial.text || rawText || '');
    const base = clearFalseDetections(initial, text);
    return {
      ...base,
      customerName: extractBetterName(text, base.customerName),
      rugs: structuredRugs(text, Array.isArray(base.rugs) ? base.rugs : []),
    };
  };

  window.PMK_SMART_PARSER_V47 = {
    parseText: api.parseText,
    extractBetterName,
    structuredRugs,
  };
})();
