'use strict';

(() => {
  const STORAGE_KEY = 'pmk-smart-paste-draft-v1';
  const replacements = [
    [/\bдвух\b/gi, 'два'],
    [/\bтр[её]х\b/gi, 'три'],
    [/\bчетыр[её]х\b/gi, 'четыре'],
    [/\bпяти\b/gi, 'пять'],
    [/\bшести\b/gi, 'шесть'],
    [/\bсеми\b/gi, 'семь'],
    [/\bвосьми\b/gi, 'восемь'],
    [/\bдевяти\b/gi, 'девять'],
    [/\bдесяти\b/gi, 'десять'],
    [/\bодиннадцати\b/gi, 'одиннадцать'],
    [/\bдвенадцати\b/gi, 'двенадцать'],
    [/\bтринадцати\b/gi, 'тринадцать'],
    [/\bчетырнадцати\b/gi, 'четырнадцать'],
    [/\bпятнадцати\b/gi, 'пятнадцать'],
    [/\bшестнадцати\b/gi, 'шестнадцать'],
    [/\bсемнадцати\b/gi, 'семнадцать'],
    [/\bвосемнадцати\b/gi, 'восемнадцать'],
    [/\bдевятнадцати\b/gi, 'девятнадцать'],
    [/\bдвадцати\b/gi, 'двадцать'],
    [/\bтридцати\b/gi, 'тридцать'],
    [/\bсорока\b/gi, 'сорок'],
    [/\bпятидесяти\b/gi, 'пятьдесят'],
    [/\bшестидесяти\b/gi, 'шестьдесят'],
    [/\bсемидесяти\b/gi, 'семьдесят'],
    [/\bвосьмидесяти\b/gi, 'восемьдесят'],
    [/\bдевяноста\b/gi, 'девяносто'],
  ];

  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const titleCase = value => clean(value).toLowerCase().replace(/(^|[\s-])[а-яё]/g, char => char.toUpperCase());

  function normalizeInflectedNumbers(text = '') {
    return replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), String(text));
  }

  function enrichParsed(parsed, originalText) {
    const next = { ...parsed };
    if (!next.customerName) {
      const match = originalText.match(/(?:имя(?:\s+клиента)?|клиент(?:а)?|заказчик|зовут)\s*[:\-]?\s*([а-яё-]{2,30}(?:\s+[а-яё-]{2,30})?)/i);
      if (match) next.customerName = titleCase(match[1]);
    }
    return next;
  }

  function recognizedLabels(parsed) {
    const values = [];
    if (parsed.customerName) values.push(`Имя: ${parsed.customerName}`);
    if (parsed.phone) values.push(`Телефон: ${parsed.phone}`);
    const address = [
      parsed.settlement,
      parsed.street,
      parsed.houseNumber && `д. ${parsed.houseNumber}`,
      parsed.apartmentNumber && `кв. ${parsed.apartmentNumber}`,
      parsed.entrance && `подъезд ${parsed.entrance}`,
      parsed.floor && `этаж ${parsed.floor}`,
    ].filter(Boolean).join(', ');
    if (address) values.push(`Адрес: ${address}`);
    if (parsed.district) values.push(`Район: ${parsed.district}`);
    if (parsed.visitDate) values.push(`Дата: ${formatDateShort(parsed.visitDate)}`);
    if (parsed.startTime) values.push(`Время: ${parsed.startTime}${parsed.endTime ? `–${parsed.endTime}` : ''}`);
    (parsed.rugs || []).forEach((rug, index) => {
      const details = [`${rug.length}×${rug.width} м`, rug.material, rug.pile, ...(rug.services || [])].filter(Boolean).join(', ');
      values.push(`Ковёр ${index + 1}: ${details}`);
    });
    if (parsed.estimatedPrice) values.push(`Стоимость: ${formatMoney(parsed.estimatedPrice)}`);
    if (parsed.regularCustomer) values.push('Постоянный клиент: скидка 10%');
    if (parsed.orderSource) values.push(`Источник: ${parsed.orderSource}`);
    return values;
  }

  function parseVoiceText(raw) {
    const parser = window.PMK_SMART_PARSER_V45;
    if (!parser?.parseText) throw new Error('Расширенный парсер не загружен.');
    const normalized = normalizeInflectedNumbers(raw);
    return enrichParsed(parser.parseText(normalized), raw);
  }

  function applyParsedText() {
    const textarea = qs('#smartPasteInput');
    const raw = textarea?.value.trim() || '';
    if (!raw) {
      textarea?.focus();
      showToast('Сначала вставьте или продиктуйте текст заявки.', 'error');
      return;
    }

    let parsed;
    try {
      parsed = parseVoiceText(raw);
    } catch (error) {
      showToast(error.message || 'Не удалось разобрать текст.', 'error');
      return;
    }

    const current = getFormData();
    const wasEditing = Boolean(current.eventId);
    const currentComment = clean(current.managerComment);
    const rawComment = `Исходный текст клиента:\n${raw}`;
    const next = {
      ...current,
      customerName: parsed.customerName || current.customerName,
      phone: parsed.phone || current.phone,
      orderSource: parsed.orderSource || current.orderSource,
      settlement: parsed.settlement || current.settlement || 'Нижний Новгород',
      district: parsed.district || current.district,
      street: parsed.street || current.street,
      houseNumber: parsed.houseNumber || current.houseNumber,
      apartmentNumber: parsed.apartmentNumber || current.apartmentNumber,
      entrance: parsed.entrance || current.entrance,
      floor: parsed.floor || current.floor,
      visitType: parsed.visitType || current.visitType,
      visitDate: parsed.visitDate || current.visitDate,
      startTime: parsed.startTime || current.startTime,
      endTime: parsed.endTime || current.endTime,
      timeNote: parsed.timeNote || current.timeNote,
      rugs: parsed.rugs?.length ? parsed.rugs : current.rugs,
      estimatedPrice: parsed.estimatedPrice || current.estimatedPrice,
      discount: parsed.discount || current.discount,
      regularCustomer: parsed.regularCustomer || current.regularCustomer,
      callAhead: parsed.callAhead ?? current.callAhead,
      callAheadMinutes: parsed.callAheadMinutes || current.callAheadMinutes,
      managerComment: currentComment.includes(raw) ? currentComment : [currentComment, rawComment].filter(Boolean).join('\n\n'),
      eventId: current.eventId,
      pmkId: current.pmkId,
    };

    fillForm(next);
    textarea.value = raw;
    try { localStorage.setItem(STORAGE_KEY, raw); } catch {}
    if (!wasEditing) {
      qs('#eventId').value = '';
      qs('#eventId').dataset.pmkId = current.pmkId || makeId();
      qs('#deleteEventBtn').classList.add('hidden');
      qs('#formTitle').textContent = 'Новая заявка — данные распределены';
    }

    const labels = recognizedLabels(parsed);
    const result = qs('#smartPasteResult');
    result.className = `smart-paste-result ${labels.length ? 'success' : 'warning'}`;
    result.innerHTML = labels.length
      ? `<strong>Распознано расширенным парсером:</strong><div>${labels.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div><small>Проверьте адрес и параметры ковров перед сохранением.</small>`
      : '<strong>Точные поля не распознаны.</strong><small>Исходный текст сохранён в комментарии.</small>';
    schedulePreviewUpdate();
    showToast(labels.length ? 'Данные подробно распределены по форме.' : 'Текст сохранён в комментарии.', labels.length ? 'success' : 'error');
  }

  function install() {
    const textarea = qs('#smartPasteInput');
    const oldButton = qs('#smartPasteParseBtn');
    if (!textarea || !oldButton || oldButton.dataset.runtimeFix === '45') return;

    const button = oldButton.cloneNode(true);
    button.dataset.runtimeFix = '45';
    button.textContent = 'Распознать и распределить';
    oldButton.replaceWith(button);
    button.addEventListener('click', applyParsedText);

    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        applyParsedText();
      }
    }, true);
  }

  window.PMK_SMART_PARSER_RUNTIME_V45 = { normalizeInflectedNumbers, parseVoiceText };
  const start = () => setTimeout(install, 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
