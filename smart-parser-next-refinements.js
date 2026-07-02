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

  function normalizeDimension(value) {
    const number = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(number) || number <= 0) return 0;
    return number > 20 ? Math.round((number / 100) * 100) / 100 : number;
  }

  function slashDimensions(source) {
    const values = [];
    const regex = /(\d{2,3}(?:[.,]\d+)?)\s*\/\s*(\d{2,3}(?:[.,]\d+)?)/g;
    let match;
    while ((match = regex.exec(source))) {
      const first = normalizeDimension(match[1]);
      const second = normalizeDimension(match[2]);
      if (!first || !second || first > 20 || second > 20) continue;
      values.push({ length: Math.max(first, second), width: Math.min(first, second), raw: match[0] });
    }
    return values;
  }

  function removeWarning(parsed, fragment) {
    parsed.confidence.warnings = parsed.confidence.warnings.filter(warning => !warning.includes(fragment));
  }

  function recomputeConfidence(parsed) {
    parsed.confidence.warnings = [...new Set(parsed.confidence.warnings)];
    parsed.confidence.score = Math.max(0, 100 - parsed.confidence.warnings.length * 12);
    parsed.confidence.level = parsed.confidence.score >= 85 ? 'high' : parsed.confidence.score >= 60 ? 'medium' : 'low';
  }

  function applyDimensionRefinements(parsed, source) {
    const slash = slashDimensions(source);
    slash.forEach((dimension, index) => {
      const rug = parsed.rugs[index];
      if (!rug) return;
      rug.length = dimension.length;
      rug.width = dimension.width;
      rug.raw = dimension.raw;
      rug.approximate = false;
      rug.measurementStatus = 'known';
      removeWarning(parsed, `Ковёр ${index + 1}: размер требует проверки`);
    });

    if (/замер\s+(?:на|по)\s+месте|размер(?:ы)?\s+замерить\s+на\s+месте/.test(source)) {
      parsed.rugs.forEach((rug, index) => {
        if (!rug.length || !rug.width) {
          rug.measurementStatus = 'measure-at-workshop';
          if (!parsed.confidence.warnings.some(warning => warning.includes(`Ковёр ${index + 1}: размер`))) {
            parsed.confidence.warnings.push(`Ковёр ${index + 1}: размер требует проверки`);
          }
        }
      });
    }

    if (/одинаков/.test(source) && parsed.rugs.length > 1) {
      const known = parsed.rugs.find(rug => rug.length && rug.width);
      if (known) {
        parsed.rugs.forEach((rug, index) => {
          if (!rug.length || !rug.width) {
            rug.length = known.length;
            rug.width = known.width;
            rug.raw = known.raw;
            rug.approximate = known.approximate;
            rug.measurementStatus = known.measurementStatus;
            removeWarning(parsed, `Ковёр ${index + 1}: размер требует проверки`);
          }
        });
      }
    }
  }

  function applyServiceRefinements(parsed, source) {
    const stainsDenied = /удал(?:ять|ение)?\s+пятн\w*\s+не\s+(?:нужно|надо)|пятн\w*[^.\n]{0,35}(?:если\s+есть\s+)?не\s+(?:выводим|выводить)/.test(source);
    const conditionerDenied = /конд(?:иционер)?\s+не\s+(?:нужен|нужен\w*|надо|нужно|хочет)/.test(source);

    parsed.rugs.forEach((rug, index) => {
      if (stainsDenied) {
        rug.services.stainRemoval = 'denied';
        removeWarning(parsed, `Ковёр ${index + 1}: услуга stainRemoval`);
      }
      if (conditionerDenied) rug.services.conditioner = 'denied';

      if (rug.services.urineOdorRemoval === 'review') {
        const match = /запах\s+мочи|моч[аи]|описал|описала|метк[аи]/.exec(source);
        if (match && !uncertaintyInSameClause(source, match.index)) {
          rug.services.urineOdorRemoval = 'confirmed';
          removeWarning(parsed, `Ковёр ${index + 1}: услуга urineOdorRemoval`);
        }
      }
    });
  }

  function applyTimeRefinements(parsed, source) {
    const underscore = source.match(/(?:с\s*)?(\d{1,2})(?::(\d{2}))?\s*_\s*(\d{1,2})(?::(\d{2}))?\s*ч?/);
    if (underscore && !parsed.time.constraints.some(item => item.type === 'range')) {
      parsed.time.constraints.push({
        type: 'range',
        from: `${underscore[1].padStart(2, '0')}:${underscore[2] || '00'}`,
        to: `${underscore[3].padStart(2, '0')}:${underscore[4] || '00'}`,
        raw: underscore[0],
      });
    }
    if (!parsed.time.callAheadMinutes) {
      const implicit = source.match(/за\s*(\d{1,3})\s*мин[^.\n]{0,30}(?:жд[её]т|до\s+приезда|заранее)/);
      if (implicit) parsed.time.callAheadMinutes = Number(implicit[1]);
    }
  }

  function applyAccessRefinements(parsed, source) {
    const address = parsed.addresses.primaryAddress;
    if (!address) return;
    address.instructions ||= [];
    if (/шла[гк]баум/.test(source) && !address.instructions.includes('Шлагбаум')) address.instructions.push('Шлагбаум');
    if (/домофон(?:а)?\s+(?:нет|не\s+работает)|вход\s+свободн/.test(source) && !address.instructions.some(note => /Домофон/i.test(note))) {
      address.instructions.push('Домофон не работает или отсутствует');
    }
  }

  function parse(rawText = '') {
    const parsed = originalParse(rawText);
    const source = canonical(parsed.text);

    applyDimensionRefinements(parsed, source);
    applyServiceRefinements(parsed, source);
    applyTimeRefinements(parsed, source);
    applyAccessRefinements(parsed, source);
    recomputeConfidence(parsed);
    return parsed;
  }

  parser.parse = parse;
  parser.__pmkRefinementsApplied = true;
  if (typeof module !== 'undefined' && module.exports) module.exports = parser;
  globalScope.PMK_SMART_PARSER_NEXT = parser;
})(typeof window !== 'undefined' ? window : globalThis);
