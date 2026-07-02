'use strict';

(function attachSmartParserScopeRules(globalScope) {
  const parser = typeof module !== 'undefined' && module.exports
    ? require('./smart-parser-next-real-rules.js')
    : globalScope.PMK_SMART_PARSER_NEXT;

  if (!parser || parser.__pmkScopeRulesApplied) return;
  const originalParse = parser.parse;

  const SERVICE_PATTERNS = {
    stainRemoval: /пятн|кров|кофе|вино|краск|пластилин|слайм|жидкост[ьи]\s+для\s+розжига|рвот|фикали/i,
    petHairRemoval: /шерст(?:ь|и)\s+(?:животн|кош|собак)|удален(?:ие|ия)\s+шерст|выч[её]с|чесать|волос/i,
    urineOdorRemoval: /запах\s+мочи|моч[аи]|описал|описала|метк[аи]/i,
    conditioner: /конд(?:иционер|ей)?(?![а-яё])/i,
    pileLifting: /поднят(?:ие|ь)\s+ворс|подъ[её]м\s+ворс|расч[её]с|причес/i,
    disinfection: /дезинф|антибактери|обеззараж/i,
    ozonation: /озон/i,
    express: /экспресс|срочн/i,
    doubleSidedWash: /с\s+обоих\s+сторон/i,
  };

  function clean(value = '') {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function canonical(value = '') {
    return clean(value).toLowerCase().replace(/ё/g, 'е');
  }

  function unique(values = []) {
    return [...new Set(values.filter(Boolean))];
  }

  function titleCase(value = '') {
    return clean(value).toLowerCase().replace(/(^|[\s-])[а-яёa-z]/g, letter => letter.toUpperCase());
  }

  function sentenceStart(source, index) {
    return Math.max(source.lastIndexOf('.', index - 1), source.lastIndexOf('\n', index - 1)) + 1;
  }

  function sentenceEnd(source, index) {
    const candidates = [source.indexOf('.', index), source.indexOf('\n', index)].filter(value => value >= 0);
    return candidates.length ? Math.min(...candidates) + 1 : source.length;
  }

  function rugLocations(source, rugs = []) {
    let cursor = 0;
    return rugs.map(rug => {
      const raw = canonical(rug.raw || '');
      if (!raw) return { index: -1, end: -1, raw: '' };
      const index = source.indexOf(raw, cursor);
      if (index < 0) return { index: -1, end: -1, raw };
      cursor = index + raw.length;
      return { index, end: cursor, raw };
    });
  }

  function markerStartBetween(source, from, to) {
    const between = source.slice(Math.max(0, from), Math.max(from, to));
    let offset = 0;
    const punctuation = Math.max(between.lastIndexOf(';'), between.lastIndexOf('.'), between.lastIndexOf('\n'));
    if (punctuation >= 0) offset = punctuation + 1;

    const markerPattern = /(?:^|[\s,])(?:плюс|далее|затем|втор(?:ой|ая)|трет(?:ий|ья)|четверт(?:ый|ая)|пят(?:ый|ая)|\d+\s*к(?:овер|ов[её]р)?\.?)\s*/gi;
    let marker;
    while ((marker = markerPattern.exec(between))) offset = Math.max(offset, marker.index + marker[0].length);

    if (!offset) {
      const conjunction = between.lastIndexOf(' и ');
      if (conjunction >= 0) offset = conjunction + 3;
    }
    return from + offset;
  }

  function buildRugSegments(source, rugs = []) {
    const locations = rugLocations(source, rugs);
    const valid = locations.filter(location => location.index >= 0);
    if (!valid.length) return { segments: [], preamble: '', locations };

    const starts = locations.map((location, index) => {
      if (location.index < 0) return -1;
      if (index === 0) return sentenceStart(source, location.index);
      const previous = locations.slice(0, index).reverse().find(item => item.end >= 0);
      return markerStartBetween(source, previous?.end ?? sentenceStart(source, location.index), location.index);
    });

    const segments = locations.map((location, index) => {
      if (location.index < 0) return '';
      const nextStart = starts.slice(index + 1).find(value => value >= 0);
      const end = nextStart ?? sentenceEnd(source, location.end);
      return source.slice(starts[index], end).trim();
    });

    const firstLocation = valid[0];
    const preamble = source.slice(sentenceStart(source, firstLocation.index), firstLocation.index).trim();
    return { segments, preamble, locations };
  }

  function classifyMaterial(segment = '') {
    const value = canonical(segment);
    const uncertain = /возможно|если|либо|состав\s+неизвест|не\s+зна/.test(value);
    if (/вискоз/.test(value)) return { value: 'Вискоза', certainty: uncertain ? 'uncertain' : 'confirmed' };
    if (/хлопок/.test(value)) return { value: 'Хлопок', certainty: uncertain ? 'uncertain' : 'confirmed' };
    if (/шелк/.test(value)) return { value: 'Шёлк', certainty: uncertain ? 'uncertain' : 'confirmed' };
    if (/шерстян|100\s*%\s*шерст|(?:состав|материал)[^.;\n]{0,24}шерст|\bшерсть\b(?!\s+(?:животн|кош|собак))/.test(value)) {
      return { value: 'Шерсть', certainty: uncertain ? 'uncertain' : 'confirmed' };
    }
    if (/синтет|полипропилен|полиэстер|акрил|нейлон/.test(value)) return { value: 'Синтетика', certainty: uncertain ? 'uncertain' : 'confirmed' };
    if (/циновк|безворс|килим|рогожк/.test(value)) return { value: 'Безворсный', certainty: uncertain ? 'uncertain' : 'confirmed' };
    return { value: '', certainty: 'unknown' };
  }

  function classifyPile(segment = '') {
    const value = canonical(segment);
    if (/высок[а-я]*\s+ворс|длинн[а-я]*\s+ворс|шегги|шагги|мехов[а-я]*|травк[а-я]*/.test(value)) return 'Более 1 см';
    if (/коротк[а-я]*\s+ворс|низк[а-я]*\s+ворс|небольш[а-я]*\s+ворс|ворс\s*(?:до|около)?\s*1\s*см/.test(value)) return 'До 1 см';
    if (/безворс|циновк|килим|рогожк/.test(value)) return 'Без ворса';
    return '';
  }

  function classifyShape(segment = '') {
    const value = canonical(segment);
    if (/дорожк/.test(value)) return 'Дорожка';
    if (/овал/.test(value)) return 'Овальный';
    if (/кругл/.test(value)) return 'Круглый';
    return '';
  }

  function serviceState(segment = '', key = '', pattern) {
    const value = canonical(segment);
    const match = pattern.exec(value);
    pattern.lastIndex = 0;
    if (!match) return 'absent';
    const local = value.slice(Math.max(0, match.index - 42), Math.min(value.length, match.index + match[0].length + 62));

    const denied = key === 'conditioner'
      ? /(?:конд(?:иционер|ей)?[^.;\n]{0,24}не\s+(?:нужен|надо|нужно|хочет)|без\s+конд)/.test(local)
      : key === 'petHairRemoval'
        ? /(?:шерст|волос|выч[её]с|чесать)[^.;\n]{0,38}(?:не\s+чесать|не\s+выч[её]сывать|выч[её]сывать\s+не\s+(?:надо|нужно))/.test(local)
        : key === 'stainRemoval'
          ? /(?:пятн|кров|краск|пластилин|слайм)[^.;\n]{0,38}(?:не\s+выводить|не\s+убирать|выводить\s+не\s+(?:надо|нужно)|не\s+выводим)/.test(local)
          : new RegExp(`(?:не\\s+(?:надо|нужно|делать)|без)\\s*.{0,18}(?:${pattern.source})|(?:${pattern.source}).{0,18}не\\s+(?:надо|нужно|делать)`, 'i').test(local);
    if (denied) return 'denied';

    let review = false;
    if (key === 'stainRemoval') review = /посмотр(?:еть|ите)\s+(?:на\s+)?пятн|если\s+(?:будут\s+)?пятн|пятн[^.;\n]{0,24}(?:под\s+вопросом|не\s+понятно|возможно)/.test(local);
    else if (key === 'petHairRemoval') review = /посмотр(?:еть|ите)[^.;\n]{0,18}(?:шерст|волос)|(?:шерст|волос)[^.;\n]{0,20}(?:если|возможно|под\s+вопросом)/.test(local);
    else if (key === 'urineOdorRemoval') review = /посмотр(?:еть|ите)[^.;\n]{0,18}(?:моч|запах)|(?:моч|запах)[^.;\n]{0,20}(?:если|возможно|под\s+вопросом)/.test(local);
    else review = /посмотр(?:еть|ите)|проверить|под\s+вопросом/.test(local);
    return review ? 'review' : 'confirmed';
  }

  function localServiceStates(segment = '') {
    const states = {};
    Object.entries(SERVICE_PATTERNS).forEach(([key, pattern]) => {
      const state = serviceState(segment, key, pattern);
      if (state !== 'absent') states[key] = state;
    });
    if (/просто\s+(?:стирка|помыть)|стандартн[а-я]*\s+стирк/.test(canonical(segment))) states.basicWash = 'confirmed';
    return states;
  }

  function globalServiceStates(source, segments = []) {
    const value = canonical(source);
    const states = {};
    const outsideSegments = (pattern) => {
      const match = pattern.exec(value);
      pattern.lastIndex = 0;
      if (!match) return false;
      return !segments.some(segment => segment && canonical(segment).includes(match[0]));
    };

    if (/конд(?:иционер|ей)?[^.;\n]{0,24}не\s+(?:нужен|надо|нужно|хочет)|без\s+конд/.test(value)) states.conditioner = 'denied';
    if (/(?:шерст|волос)[^.;\n]{0,38}(?:не\s+чесать|не\s+выч[её]сывать|выч[её]сывать\s+не\s+(?:надо|нужно))/.test(value)) states.petHairRemoval = 'denied';
    if (/(?:пятн|кров|краск)[^.;\n]{0,38}(?:не\s+выводить|не\s+убирать|не\s+выводим)/.test(value)) states.stainRemoval = 'denied';

    if (/(?:шерст|волос)[^.;\n]{0,24}(?:со\s+всех|на\s+всех|для\s+всех)/.test(value)) states.petHairRemoval = 'confirmed';
    if (/конд(?:иционер)?[^.;\n]{0,24}(?:на\s+все|для\s+всех|на\s+каждый)/.test(value)) states.conditioner = 'confirmed';
    if (/пятн[^.;\n]{0,24}(?:со\s+всех|с\s+двух|с\s+тр[её]х|на\s+всех)/.test(value)) states.stainRemoval = 'confirmed';
    if (/(?:все\s+ковр|ковры\s+все)[^.;\n]{0,28}(?:просто\s+стирк|без\s+услуг)/.test(value)) states.basicWash = 'confirmed';

    const globalStainReview = /посмотр(?:еть|ите)\s+(?:на\s+)?пятн|если\s+(?:будут\s+)?пятн/.test(value);
    if (globalStainReview && outsideSegments(/посмотр(?:еть|ите)\s+(?:на\s+)?пятн|если\s+(?:будут\s+)?пятн/)) states.stainRemoval = 'review';
    return states;
  }

  function mergeStates(local = {}, global = {}) {
    const merged = { ...local };
    Object.entries(global).forEach(([key, state]) => {
      if (state === 'denied') merged[key] = 'denied';
      else if (!merged[key]) merged[key] = state;
    });
    return merged;
  }

  function immediateApproximation(source, location) {
    if (!location || location.index < 0) return false;
    const before = source.slice(Math.max(0, location.index - 34), location.index);
    return /пример|ориентир|около|\+\-|точно\s+не\s+зна/.test(before);
  }

  function rescopeRugs(parsed) {
    const source = canonical(parsed.text);
    const { segments, preamble, locations } = buildRugSegments(source, parsed.rugs);
    if (!segments.some(Boolean)) return;

    const sharedMaterial = classifyMaterial(preamble);
    const sharedPile = classifyPile(preamble);
    const sharedShape = classifyShape(preamble);
    const globalStates = globalServiceStates(source, segments);

    parsed.rugs.forEach((rug, index) => {
      const segment = segments[index] || '';
      const localMaterial = classifyMaterial(segment);
      const localPile = classifyPile(segment);
      const localShape = classifyShape(segment);
      const localStates = localServiceStates(segment);

      rug.material = localMaterial.value ? localMaterial : (sharedMaterial.value ? { ...sharedMaterial } : { value: '', certainty: 'unknown' });
      rug.pile = localPile || sharedPile || '';
      rug.shape = localShape || sharedShape || rug.shape || 'Прямоугольный';
      rug.services = mergeStates(localStates, globalStates);

      if (locations[index]?.index >= 0) {
        rug.approximate = immediateApproximation(source, locations[index]);
        rug.measurementStatus = rug.approximate ? 'approximate' : 'known';
      }
    });

    const known = parsed.rugs.find(rug => rug.length && rug.width);
    if (/одинаков/.test(source) && known) {
      parsed.rugs.forEach(rug => {
        if (!rug.length || !rug.width) {
          rug.length = known.length;
          rug.width = known.width;
          rug.raw = known.raw;
          rug.approximate = known.approximate;
          rug.measurementStatus = known.measurementStatus;
          if (!rug.material?.value && known.material?.value) rug.material = { ...known.material };
          if (!rug.pile && known.pile) rug.pile = known.pile;
        }
      });
    }
  }

  function roleFromBefore(segment = '') {
    const value = canonical(segment);
    if (/заказчик[^.;\n]*$/.test(value)) return 'Заказчик';
    if (/(?:встретит|будет\s+отдавать)[^.;\n]*$/.test(value)) return 'Встречает курьера';
    if (/(?:если\s+не\s+дозвонитесь|запасн|второй\s+номер)[^.;\n]*$/.test(value)) return 'Дополнительный номер';
    if (/(?:для\s+доставк|возврат)[^.;\n]*$/.test(value)) return 'Контакт для возврата';
    if (/(?:супруг|муж)[^.;\n]*$/.test(value)) return 'Супруг';
    if (/(?:супруга|жена)[^.;\n]*$/.test(value)) return 'Супруга';
    return 'Клиент';
  }

  function candidateNames(segment = '') {
    const blocked = /^(?:Авито|Сайт|Фск|Нфс|Забор|Доставка|Район|Ковер|Ковры|Цена|Дом|Улица|Подъезд|Этаж|После|Если|Алексей)$/i;
    return [...clean(segment).matchAll(/(?:^|[\s,.;—-])([А-ЯЁ][а-яё]{2,24})(?:\s+([А-ЯЁ][а-яё]{2,24}))?(?=[\s,.;—-]|$)/g)]
      .map(match => clean([match[1], match[2]].filter(Boolean).join(' ')))
      .filter(name => !blocked.test(name));
  }

  function bindContactsLocally(parsed) {
    const source = clean(parsed.text);
    const phones = parsed.phones || [];
    const contacts = phones.map((phone, index) => {
      const previousEnd = index ? phones[index - 1].index + phones[index - 1].raw.length : 0;
      const boundary = Math.max(previousEnd, source.lastIndexOf('.', phone.index - 1) + 1, source.lastIndexOf('\n', phone.index - 1) + 1, source.lastIndexOf(';', phone.index - 1) + 1);
      const before = source.slice(boundary, phone.index);
      const nextPhoneIndex = phones[index + 1]?.index ?? source.length;
      const afterRaw = source.slice(phone.index + phone.raw.length, Math.min(nextPhoneIndex, phone.index + phone.raw.length + 70));
      const after = afterRaw.split(/[.;\n]/)[0];
      const role = roleFromBefore(before);
      const beforeNames = candidateNames(before);
      const afterNames = candidateNames(after);
      const name = beforeNames.at(-1) || afterNames[0] || '';
      return { name: titleCase(name), phone: phone.phone, role };
    });
    parsed.contacts = contacts;
    parsed.phones = phones.map((phone, index) => ({ ...phone, role: contacts[index]?.role || 'Клиент' }));
  }

  function recomputeConfidence(parsed) {
    const warnings = [];
    if (!parsed.phones?.length) warnings.push('Телефон не распознан');
    if (!parsed.addresses?.primaryAddress?.street || !parsed.addresses?.primaryAddress?.house) warnings.push('Адрес требует проверки');
    if (!parsed.contacts?.some(contact => contact.name)) warnings.push('Имя клиента не распознано');
    if (!parsed.rugs?.length) warnings.push('Ковры не распознаны');

    (parsed.rugs || []).forEach((rug, index) => {
      if (rug.measurementStatus !== 'known') warnings.push(`Ковёр ${index + 1}: размер требует проверки`);
      if (rug.material?.certainty === 'uncertain') warnings.push(`Ковёр ${index + 1}: состав неоднозначен`);
      Object.entries(rug.services || {}).forEach(([service, state]) => {
        if (state === 'review') warnings.push(`Ковёр ${index + 1}: услуга ${service} требует осмотра`);
      });
    });

    parsed.confidence = {
      warnings: unique(warnings),
      score: Math.max(0, 100 - unique(warnings).length * 12),
      level: 'low',
    };
    parsed.confidence.level = parsed.confidence.score >= 85 ? 'high' : parsed.confidence.score >= 60 ? 'medium' : 'low';
  }

  function parse(rawText = '') {
    const parsed = originalParse(rawText);
    rescopeRugs(parsed);
    bindContactsLocally(parsed);
    recomputeConfidence(parsed);
    return parsed;
  }

  parser.parse = parse;
  parser.__pmkScopeRulesApplied = true;
  parser.rescopeRugs = rescopeRugs;
  if (typeof module !== 'undefined' && module.exports) module.exports = parser;
  globalScope.PMK_SMART_PARSER_NEXT = parser;
})(typeof window !== 'undefined' ? window : globalThis);
