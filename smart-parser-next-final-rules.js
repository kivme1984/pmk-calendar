'use strict';

(function attachSmartParserFinalRules(globalScope) {
  const parser = typeof module !== 'undefined' && module.exports
    ? require('./smart-parser-next-scope-rules.js')
    : globalScope.PMK_SMART_PARSER_NEXT;

  if (!parser || parser.__pmkFinalRulesApplied) return;
  const originalParse = parser.parse;

  function clean(value = '') {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function canonical(value = '') {
    return clean(value).toLowerCase().replace(/ё/g, 'е');
  }

  function titleCase(value = '') {
    return clean(value).toLowerCase().replace(/(^|[\s-])[а-яёa-z]/g, letter => letter.toUpperCase());
  }

  function recoverContactNames(parsed) {
    const source = clean(parsed.text);
    const phones = parsed.phones || [];
    const blocked = /^(?:Авито|Сайт|Фск|Нфс|Забор|Доставка|Район|Ковер|Ковры|Цена|Дом|Улица|Подъезд|Этаж|После|Если)$/i;

    parsed.contacts = (parsed.contacts || []).map((contact, index) => {
      if (contact.name) return contact;
      const phone = phones[index];
      if (!phone) return contact;
      const previousEnd = index ? phones[index - 1].index + phones[index - 1].raw.length : 0;
      const start = Math.max(previousEnd, source.lastIndexOf('.', phone.index - 1) + 1, source.lastIndexOf('\n', phone.index - 1) + 1, source.lastIndexOf(';', phone.index - 1) + 1);
      const before = source.slice(start, phone.index);
      const candidates = [...before.matchAll(/(?:^|[\s,.;—-])([А-ЯЁ][а-яё]{2,24})(?:\s+([А-ЯЁ][а-яё]{2,24}))?(?=[\s,.;—-]|$)/g)]
        .map(match => clean([match[1], match[2]].filter(Boolean).join(' ')))
        .filter(name => !blocked.test(name));
      return { ...contact, name: titleCase(candidates.at(-1) || '') };
    });
  }

  function applyGlobalNegations(parsed) {
    const source = canonical(parsed.text);
    const stainDenied = /(?:удал(?:ять|ение)?\s+пятн[а-я]*\s+не\s+(?:нужно|надо)|пятн[а-я]*[^.\n]{0,42}не\s+(?:выводить|выводим|убирать))/.test(source);
    if (!stainDenied) return;
    (parsed.rugs || []).forEach(rug => {
      rug.services ||= {};
      rug.services.stainRemoval = 'denied';
    });
  }

  function recoverBareWoolMaterial(parsed) {
    const source = canonical(parsed.text);
    (parsed.rugs || []).forEach(rug => {
      if (rug.material?.value || !rug.raw) return;
      const raw = canonical(rug.raw);
      const index = source.indexOf(raw);
      if (index < 0) return;
      const endCandidates = [source.indexOf(';', index + raw.length), source.indexOf('.', index + raw.length), source.indexOf('\n', index + raw.length)]
        .filter(value => value >= 0);
      const end = endCandidates.length ? Math.min(...endCandidates) : Math.min(source.length, index + raw.length + 90);
      const segment = source.slice(Math.max(0, index - 25), end);
      if (/(?:^|[^а-яё])шерсть(?:$|[^а-яё])(?!\s*(?:животн|кош|собак))/.test(segment) && !/шерсть\s+(?:животн|кош|собак)/.test(segment)) {
        rug.material = { value: 'Шерсть', certainty: /возможно|если|не\s+зна/.test(segment) ? 'uncertain' : 'confirmed' };
      }
    });
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
      warnings: [...new Set(warnings)],
      score: Math.max(0, 100 - [...new Set(warnings)].length * 12),
      level: 'low',
    };
    parsed.confidence.level = parsed.confidence.score >= 85 ? 'high' : parsed.confidence.score >= 60 ? 'medium' : 'low';
  }

  function parse(rawText = '') {
    const parsed = originalParse(rawText);
    recoverContactNames(parsed);
    applyGlobalNegations(parsed);
    recoverBareWoolMaterial(parsed);
    recomputeConfidence(parsed);
    return parsed;
  }

  parser.parse = parse;
  parser.__pmkFinalRulesApplied = true;
  if (typeof module !== 'undefined' && module.exports) module.exports = parser;
  globalScope.PMK_SMART_PARSER_NEXT = parser;
})(typeof window !== 'undefined' ? window : globalThis);
