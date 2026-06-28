'use strict';

(() => {
  const api = window.PMK_SMART_PARSER_V45;
  if (!api?.parseText) return;
  const previous = api.parseText.bind(api);

  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const unique = values => [...new Set((values || []).filter(Boolean))];

  function ordinalIndex(value = '') {
    const word = String(value).toLowerCase().replace(/ё/g, 'е');
    if (/^перв/.test(word)) return 0;
    if (/^втор/.test(word)) return 1;
    if (/^трет/.test(word)) return 2;
    if (/^четверт/.test(word)) return 3;
    if (/^пят/.test(word)) return 4;
    return -1;
  }

  function services(text = '') {
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
    if (/ш[еёа]гги|шагги|shaggy|травк|высок[а-яё]*\s+ворс|длинн[а-яё]*\s+ворс/i.test(text)) return 'Более 1 см';
    if (/безворс|без\s+ворс|циновк|килим|палас/i.test(text)) return 'Без ворса';
    if (/средн[а-яё]*\s+ворс|коротк[а-яё]*\s+ворс|низк[а-яё]*\s+ворс/i.test(text)) return 'До 1 см';
    return '';
  }

  function assignmentMarkers(text = '') {
    const pattern = /(^|[\s,.;:—–-])(?:на|для|у)\s+(перв(?:ом|ого|ому|ый)|втор(?:ом|ого|ому|ой)|трет(?:ьем|ьего|ьему|ий)|четв[её]рт(?:ом|ого|ому|ый)|пят(?:ом|ого|ому|ый))(?=$|[\s,.;:—–-])/gim;
    const result = [];
    let match;
    while ((match = pattern.exec(text))) {
      const index = ordinalIndex(match[2]);
      if (index >= 0) result.push({ index, start: match.index + (match[1]?.length || 0), end: pattern.lastIndex });
    }
    return result;
  }

  function applyAssignments(text, rugs = []) {
    const markers = assignmentMarkers(text);
    if (!markers.length) return rugs;
    const result = rugs.map(rug => ({ ...rug, services: unique(rug.services || []) }));

    markers.forEach((marker, position) => {
      while (result.length <= marker.index) {
        result.push({ length: 0, width: 0, material: '', pile: '', issues: [], services: [] });
      }
      const next = markers[position + 1];
      const segment = clean(text.slice(marker.end, next?.start ?? text.length));
      if (!segment) return;
      const rug = result[marker.index];
      rug.material = material(segment) || rug.material || '';
      rug.pile = pile(segment) || rug.pile || '';
      rug.services = unique([...(rug.services || []), ...services(segment)]);
    });

    return result;
  }

  function clearDimensionTime(parsed, text) {
    const note = clean(parsed.timeNote || '').toLowerCase();
    const looksLikeDimension = /^(?:на\s+)?(?:\d+(?:[.,]\d+)?|один|два|три|четыре|пять|полтора)$/i.test(note)
      || /^на\s+(?:\d+(?:[.,]\d+)?|один|два|три|четыре|пять|полтора)$/i.test(note);
    const hasDimensionContext = /(?:размер|ков[её]р)[^.!?\n]{0,80}(?:\d+(?:[.,]\d+)?|один|два|три|четыре|пять|полтора)\s+на\s+(?:\d+(?:[.,]\d+)?|один|два|три|четыре|пять|полтора)/i.test(text);
    if (looksLikeDimension && hasDimensionContext) {
      parsed.startTime = '';
      parsed.endTime = '';
      parsed.timeNote = '';
    }
    return parsed;
  }

  api.parseText = function parseTextWithAssignments(rawText) {
    const parsed = previous(rawText);
    const text = String(parsed.text || rawText || '');
    const result = clearDimensionTime({ ...parsed }, text);
    result.rugs = applyAssignments(text, Array.isArray(result.rugs) ? result.rugs : []);
    return result;
  };

  window.PMK_SMART_ASSIGNMENTS_V47 = { applyAssignments, clearDimensionTime };
})();
