'use strict';

(function attachSmartParserRefinements(globalScope) {
  const parser = typeof module !== 'undefined' && module.exports
    ? require('./smart-parser-next.js')
    : globalScope.PMK_SMART_PARSER_NEXT;

  if (!parser || parser.__pmkRefinementsApplied) return;
  const originalParse = parser.parse;

  function canonical(value = '') {
    return String(value || '').toLowerCase().replace(/ё/g, 'е');
  }

  function uncertaintyInSameClause(source, matchIndex) {
    const punctuation = Math.max(
      source.lastIndexOf(',', matchIndex - 1),
      source.lastIndexOf('.', matchIndex - 1),
      source.lastIndexOf(';', matchIndex - 1),
      source.lastIndexOf(':', matchIndex - 1),
      source.lastIndexOf('\n', matchIndex - 1),
    );
    const clause = source.slice(punctuation + 1, matchIndex);
    return /возможно|вроде|под\s+вопросом|не\s+понятно|ориентировочно/.test(clause);
  }

  function removeWarning(parsed, fragment) {
    parsed.confidence.warnings = parsed.confidence.warnings.filter(warning => !warning.includes(fragment));
  }

  function recomputeConfidence(parsed) {
    parsed.confidence.warnings = [...new Set(parsed.confidence.warnings)];
    parsed.confidence.score = Math.max(0, 100 - parsed.confidence.warnings.length * 12);
    parsed.confidence.level = parsed.confidence.score >= 85 ? 'high' : parsed.confidence.score >= 60 ? 'medium' : 'low';
  }

  function parse(rawText = '') {
    const parsed = originalParse(rawText);
    const source = canonical(parsed.text);

    parsed.rugs.forEach((rug, index) => {
      if (rug.services.urineOdorRemoval === 'review') {
        const match = /запах\s+мочи|моч[аи]|описал|описала|метк[аи]/.exec(source);
        if (match && !uncertaintyInSameClause(source, match.index)) {
          rug.services.urineOdorRemoval = 'confirmed';
          removeWarning(parsed, `Ковёр ${index + 1}: услуга urineOdorRemoval`);
        }
      }
    });

    recomputeConfidence(parsed);
    return parsed;
  }

  parser.parse = parse;
  parser.__pmkRefinementsApplied = true;
  if (typeof module !== 'undefined' && module.exports) module.exports = parser;
  globalScope.PMK_SMART_PARSER_NEXT = parser;
})(typeof window !== 'undefined' ? window : globalThis);
