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

  function removeWarning(parsed, fragment) {
    parsed.confidence.warnings = parsed.confidence.warnings.filter(warning => !warning.includes(fragment));
  }

  function addWarning(parsed, warning) {
    if (!parsed.confidence.warnings.includes(warning)) parsed.confidence.warnings.push(warning);
  }

  function parse(rawText = '') {
    const parsed = originalParse(rawText);
    const source = canonical(parsed.text);

    const stainsDenied = /удал(?:ять|ение)?\s+пятн[а-я]*\s+не\s+(?:нужно|надо)|пятн[а-я]*[^.\n]{0,40}(?:если\s+есть\s+)?не\s+(?:выводим|выводить)/.test(source);
    const stainsConditional = /(?:если|при\s+наличии)\s+(?:будут\s+)?пятн[а-я]*|пятн[а-я]*\s+если\s+есть/.test(source);
    const highPile = /длинн[а-я]*\s+ворс|высок[а-я]*\s+ворс|шегги|шагги|мехов[а-я]*|травк[а-я]*/.test(source);
    const lowPile = /коротк[а-я]*\s+ворс|низк[а-я]*\s+ворс|небольш[а-я]*\s+ворс|ворс\s*(?:до|около)?\s*1\s*см/.test(source);
    const noPile = /безворс[а-я]*|циновк[а-я]*|килим/.test(source);
    const oval = /овал[а-я]*/.test(source);
    const round = /кругл[а-я]*/.test(source);
    const runner = /дорожк[а-я]*/.test(source);

    parsed.rugs.forEach((rug, index) => {
      if (stainsDenied) {
        rug.services.stainRemoval = 'denied';
        removeWarning(parsed, `Ковёр ${index + 1}: услуга stainRemoval`);
      } else if (stainsConditional) {
        rug.services.stainRemoval = 'review';
        addWarning(parsed, `Ковёр ${index + 1}: услуга stainRemoval требует осмотра`);
      }

      if (!rug.pile) {
        if (highPile) rug.pile = 'Более 1 см';
        else if (lowPile) rug.pile = 'До 1 см';
        else if (noPile) rug.pile = 'Без ворса';
      }
      if (!rug.shape || rug.shape === 'Прямоугольный') {
        if (runner) rug.shape = 'Дорожка';
        else if (oval) rug.shape = 'Овальный';
        else if (round) rug.shape = 'Круглый';
      }
    });

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
