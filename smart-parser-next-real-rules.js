'use strict';

(function attachRealCorpusRules(globalScope) {
  const parser = typeof module !== 'undefined' && module.exports
    ? require('./smart-parser-next-refinements.js')
    : globalScope.PMK_SMART_PARSER_NEXT;

  if (!parser || parser.__pmkRealRulesApplied) return;
  const originalParse = parser.parse;

  function canonical(value = '') {
    return String(value || '').toLowerCase().replace(/ё/g, 'е');
  }

  function parse(rawText = '') {
    const parsed = originalParse(rawText);
    const source = canonical(parsed.text);

    const stainsDenied = /удал(?:ять|ение)?\s+пятн[а-я]*\s+не\s+(?:нужно|надо)|пятн[а-я]*[^.\n]{0,40}(?:если\s+есть\s+)?не\s+(?:выводим|выводить)/.test(source);
    if (stainsDenied) {
      parsed.rugs.forEach((rug, index) => {
        rug.services.stainRemoval = 'denied';
        parsed.confidence.warnings = parsed.confidence.warnings.filter(warning => !warning.includes(`Ковёр ${index + 1}: услуга stainRemoval`));
      });
    }

    parsed.confidence.warnings = [...new Set(parsed.confidence.warnings)];
    parsed.confidence.score = Math.max(0, 100 - parsed.confidence.warnings.length * 12);
    parsed.confidence.level = parsed.confidence.score >= 85 ? 'high' : parsed.confidence.score >= 60 ? 'medium' : 'low';
    return parsed;
  }

  parser.parse = parse;
  parser.__pmkRealRulesApplied = true;
  if (typeof module !== 'undefined' && module.exports) module.exports = parser;
  globalScope.PMK_SMART_PARSER_NEXT = parser;
})(typeof window !== 'undefined' ? window : globalThis);
