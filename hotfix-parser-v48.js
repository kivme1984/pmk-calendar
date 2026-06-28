'use strict';

(() => {
  const api = window.PMK_SMART_PARSER_V45;
  if (!api?.parseText || window.PMK_SMART_PARSER_V48) return;

  const previous = api.parseText.bind(api);
  const STOP_WORDS = new Set([
    'дома', 'будет', 'будетдома', 'ждет', 'ждёт', 'ожидает', 'можно', 'нужно', 'надо',
    'с', 'до', 'после', 'к', 'около', 'примерно', 'утром', 'днем', 'днём', 'вечером',
    'сегодня', 'завтра', 'телефон', 'номер', 'адрес', 'улица', 'дом', 'квартира',
    'подъезд', 'этаж', 'район', 'город', 'ковер', 'ковёр', 'ковра', 'ковров',
    'первый', 'второй', 'размер', 'ворс', 'синтетика', 'шерсть', 'шегги', 'пятна',
  ]);

  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const unique = values => [...new Set((values || []).filter(Boolean))];
  const titleCase = value => clean(value).toLowerCase().replace(/(^|[\s-])[а-яё]/g, char => char.toUpperCase());

  function nameCandidate(value = '') {
    const result = [];
    for (const token of clean(value).split(/\s+/)) {
      const word = token.toLowerCase().replace(/[^а-яё-]/g, '');
      if (!word || STOP_WORDS.has(word) || /^\d/.test(token) || /\d{1,2}[:.]\d{2}/.test(token)) break;
      if (/^(это|клиент|клиентка|имя|зовут|заказ|заявка|на|от)$/i.test(word)) continue;
      result.push(word);
      if (result.length === 3) break;
    }
    return result.length ? titleCase(result.join(' ')) : '';
  }

  function extractStrictName(text = '') {
    const patterns = [
      /(?:^|[\s,.;:—–-])зовут\s+([а-яё-]+(?:\s+[а-яё-]+){0,4})/i,
      /(?:^|[\s,.;:—–-])имя\s*(?:клиента|клиентки)?\s*[:—–-]?\s*([а-яё-]+(?:\s+[а-яё-]+){0,4})/i,
      /(?:^|[\s,.;:—–-])клиент(?:ка)?\s*(?:это|будет)?\s*[:—–-]?\s*([а-яё-]+(?:\s+[а-яё-]+){0,4})/i,
      /(?:^|[\s,.;:—–-])(?:заказ|заявка)\s+(?:на|от)\s+([а-яё-]+(?:\s+[а-яё-]+){0,4})/i,
      /(?:^|[\s,.;:—–-])(?:позвонила|позвонил|обращается)\s+([а-яё-]+(?:\s+[а-яё-]+){0,4})/i,
    ];

    for (const pattern of patterns) {
      const candidate = nameCandidate(text.match(pattern)?.[1] || '');
      if (candidate) return candidate;
    }

    const firstLine = clean(String(text).split(/[\n,.;]/)[0]);
    const leading = firstLine.match(/^([а-яё-]+(?:\s+[а-яё-]+){0,2})(?=\s+(?:дома|будет|жд[её]т|ожидает|можно|после|до|с\s*\d|к\s*\d|телефон|номер|адрес|улица|район|ков[её]р))/i);
    if (leading) return nameCandidate(leading[1]);

    if (/^[а-яё-]{2,30}(?:\s+[а-яё-]{2,30}){0,2}$/i.test(firstLine)) return nameCandidate(firstLine);
    return '';
  }

  function material(text = '') {
    if (/ш[еёа]гги|шагги|shaggy|травк|синтет|искусствен|полипропилен|полиэстер|акрил|нейлон/i.test(text)) return 'Синтетика';
    if (/шерстян|100\s*%\s*шерст/i.test(text)) return 'Шерсть';
    if (/вискоз/i.test(text)) return 'Вискоза';
    if (/ш[её]лк/i.test(text)) return 'Шёлк';
    if (/хлопок|хлопков/i.test(text)) return 'Хлопок';
    if (/безворс|без\s+ворс|циновк|килим|палас/i.test(text)) return 'Безворсный';
    return '';
  }

  function pile(text = '') {
    if (/ш[еёа]гги|шагги|shaggy|травк|высок[а-яё]*\s+ворс|длинн[а-яё]*\s+ворс|более\s+1\s*см/i.test(text)) return 'Более 1 см';
    if (/безворс|без\s+ворс|циновк|килим|палас/i.test(text)) return 'Без ворса';
    if (/средн[а-яё]*\s+ворс|коротк[а-яё]*\s+ворс|низк[а-яё]*\s+ворс|до\s+1\s*см/i.test(text)) return 'До 1 см';
    return '';
  }

  function services(text = '') {
    return unique([
      /пят(?:н[а-яё]*|ен)|запачкан|вино|кофе|кровь|краск|жир/i.test(text) ? 'Удаление пятен' : '',
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

  function mergeRug(base = {}, context = '') {
    const dimension = api.extractRugs?.(context)?.[0] || {};
    return {
      ...blankRug(),
      ...base,
      length: Number(dimension.length || base.length || 0),
      width: Number(dimension.width || base.width || 0),
      material: material(context) || base.material || '',
      pile: pile(context) || base.pile || '',
      issues: unique(base.issues || []),
      services: unique([...(base.services || []), ...services(context)]),
    };
  }

  function explicitCount(text = '') {
    const match = text.match(/(?:количество\s+ковр[а-яё]*\s*[:—–-]?\s*)?(\d+|один|два|две|три|четыре|пять)\s*(?:штук[аи]?\s*)?ковр[а-яё]*/i);
    if (!match) return 0;
    const values = { один: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5 };
    return Number(match[1]) || values[match[1].toLowerCase()] || 0;
  }

  function normalizeMarkers(text = '') {
    return String(text)
      .replace(/((?:два|две|2)\s+ковр[а-яё]*\s*[:—–,-]?\s*)(?:один|1)(?=\s|$|[,.;])/gi, '$1 первый ковёр ')
      .replace(/ков[её]р\s*(?:номер\s*)?(?:один|1)(?=\s|$|[,.;])/gi, 'первый ковёр')
      .replace(/ков[её]р\s*(?:номер\s*)?(?:два|2)(?=\s|$|[,.;])/gi, 'второй ковёр');
  }

  function markerPositions(text = '') {
    const normalized = normalizeMarkers(text);
    const pattern = /(^|[\s,.;:—–-])(?:(?:на|для|у)\s+)?(?:(?:ков[её]р[а-яё]*\s*(?:номер\s*)?)?)(перв(?:ый|ого|ом|ому)|втор(?:ой|ого|ом|ому)|трет(?:ий|ьего|ьем|ьему)|[123]-?й)(?:\s+ков[её]р[а-яё]*)?(?=$|[\s,.;:—–-])/gim;
    const result = [];
    let match;
    while ((match = pattern.exec(normalized))) {
      const token = match[2].toLowerCase().replace(/ё/g, 'е');
      const index = /^(?:1|перв)/.test(token) ? 0 : /^(?:2|втор)/.test(token) ? 1 : /^(?:3|трет)/.test(token) ? 2 : -1;
      if (index >= 0) result.push({ index, start: match.index + (match[1]?.length || 0), end: pattern.lastIndex });
    }
    return { normalized, result };
  }

  function repairRugs(text = '', rugs = []) {
    const base = (Array.isArray(rugs) ? rugs : []).map(rug => ({ ...blankRug(), ...rug, services: unique(rug.services || []) }));
    const count = Math.max(explicitCount(text), base.length);
    while (base.length < count) base.push(blankRug());

    const { normalized, result: markers } = markerPositions(text);
    markers.forEach((marker, position) => {
      const next = markers[position + 1];
      const context = clean(normalized.slice(marker.end, next?.start ?? normalized.length));
      while (base.length <= marker.index) base.push(blankRug());
      if (context) base[marker.index] = mergeRug(base[marker.index], context);
    });

    if (count >= 2 && base.length < 2) base.push(blankRug());
    return base;
  }

  api.parseText = function parseTextV48(rawText) {
    const parsed = previous(rawText);
    const source = String(parsed.text || rawText || '');
    const strictName = extractStrictName(source);
    return {
      ...parsed,
      customerName: strictName || parsed.customerName || '',
      rugs: repairRugs(source, parsed.rugs),
    };
  };

  window.PMK_SMART_PARSER_V48 = { parseText: api.parseText, extractStrictName, repairRugs };
})();
