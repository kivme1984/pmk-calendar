'use strict';

(function attachIdenticalRugRules(globalScope) {
  const parser = typeof module !== 'undefined' && module.exports
    ? require('./smart-parser-next-final-rules.js')
    : globalScope.PMK_SMART_PARSER_NEXT;

  if (!parser || parser.__pmkIdenticalRugRulesApplied) return;
  const originalParse = parser.parse;

  function canonical(value = '') {
    return String(value || '').toLowerCase().replace(/ё/g, 'е');
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
    const uniqueWarnings = [...new Set(warnings)];
    const score = Math.max(0, 100 - uniqueWarnings.length * 12);
    parsed.confidence = {
      warnings: uniqueWarnings,
      score,
      level: score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low',
    };
  }

  function parse(rawText = '') {
    const parsed = originalParse(rawText);
    const rugs = parsed.rugs || [];
    if (rugs.length > 1 && /одинаков/.test(canonical(parsed.text))) {
      const template = rugs.find(rug => rug.length && rug.width) || rugs[0];
      rugs.forEach(rug => {
        if (!rug.length || !rug.width) {
          rug.length = template.length;
          rug.width = template.width;
          rug.raw = template.raw;
          rug.approximate = template.approximate;
          rug.measurementStatus = template.measurementStatus;
        }
        if (!rug.material?.value && template.material?.value) rug.material = { ...template.material };
        if (!rug.pile && template.pile) rug.pile = template.pile;
        if ((!rug.shape || rug.shape === 'Прямоугольный') && template.shape) rug.shape = template.shape;
        rug.services = { ...(template.services || {}), ...(rug.services || {}) };
        rug.notes = [...new Set([...(template.notes || []), ...(rug.notes || [])])];
      });
      recomputeConfidence(parsed);
    }
    return parsed;
  }

  parser.parse = parse;
  parser.__pmkIdenticalRugRulesApplied = true;
  if (typeof module !== 'undefined' && module.exports) module.exports = parser;
  globalScope.PMK_SMART_PARSER_NEXT = parser;
})(typeof window !== 'undefined' ? window : globalThis);
