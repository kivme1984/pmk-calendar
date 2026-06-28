'use strict';

(() => {
  const api = window.PMK_SMART_PARSER_V45;
  if (!api?.parseText) return;
  const previous = api.parseText.bind(api);

  const blocked = new Set([
    'адрес', 'телефон', 'номер', 'улица', 'дом', 'квартира', 'подъезд', 'этаж',
    'район', 'ковер', 'ковёр', 'ковра', 'заказ', 'заявка', 'забор', 'доставка',
    'сегодня', 'завтра', 'первый', 'второй', 'два', 'три', 'синтетика', 'шегги',
  ]);

  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const titleCase = value => clean(value).toLowerCase().replace(/(^|[\s-])[а-яё]/g, char => char.toUpperCase());

  function nameCandidate(value = '') {
    const words = clean(value)
      .replace(/^[,:—–-]+|[,:;.!?—–-]+$/g, '')
      .split(/\s+/)
      .map(word => word.toLowerCase().replace(/[^а-яё-]/g, ''))
      .filter(Boolean);

    const result = [];
    for (const word of words) {
      if (blocked.has(word)) break;
      if (/^(это|будет|клиент|клиентка|имя|зовут|у|нас)$/i.test(word)) continue;
      if (word.length < 2) break;
      result.push(word);
      if (result.length === 3) break;
    }
    return result.length ? titleCase(result.join(' ')) : '';
  }

  function extractName(text = '') {
    const patterns = [
      /\bзовут\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /\bимя\s*(?:клиента|клиентки)?\s*[:—–-]?\s*([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /\bклиент(?:ка)?\s*(?:это|будет)?\s*[:—–-]?\s*([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /\b(?:заявка|заказ)\s+(?:на|от)\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
      /\b(?:позвонила|позвонил|обращается)\s+([а-яё-]+(?:\s+[а-яё-]+){0,2})/i,
    ];

    for (const pattern of patterns) {
      const candidate = nameCandidate(text.match(pattern)?.[1] || '');
      if (candidate) return candidate;
    }

    const first = clean(text.split(/[\n,.;]/)[0]);
    if (/^[а-яё-]{2,30}(?:\s+[а-яё-]{2,30}){0,2}$/i.test(first)) {
      const candidate = nameCandidate(first);
      if (candidate) return candidate;
    }

    const leading = text.match(/^\s*([а-яё-]{2,30}(?:\s+[а-яё-]{2,30})?)\s+(?=адрес|телефон|номер|улица|ков[её]р|два\s+ков|три\s+ков)/i);
    return nameCandidate(leading?.[1] || '');
  }

  api.parseText = function parseTextWithNameFix(rawText) {
    const parsed = previous(rawText);
    return {
      ...parsed,
      customerName: parsed.customerName || extractName(String(rawText || '')),
    };
  };

  window.PMK_SMART_NAME_V47 = { extractName };
})();
