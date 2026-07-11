'use strict';

(function attachSmartParserFormAdapter(globalScope) {
  const SERVICE_LABELS = {
    basicWash: 'обычная стирка',
    stainRemoval: 'удаление пятен',
    petHairRemoval: 'вычёсывание шерсти/волос',
    urineOdorRemoval: 'удаление запаха мочи',
    conditioner: 'кондиционер',
    pileLifting: 'поднятие ворса',
    disinfection: 'антибактериальная обработка',
    ozonation: 'озонирование',
    express: 'экспресс-стирка',
    doubleSidedWash: 'стирка с двух сторон',
  };

  const SOURCE_MAP = {
    MAX: 'Макс',
  };

  const STATUS_MAP = {
    completed: 'completed',
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function unique(values = []) {
    return [...new Set(values.filter(Boolean))];
  }

  function clean(value = '') {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function formatAddress(address = {}) {
    if (!address) return '';
    return [
      address.settlement,
      address.district,
      address.street,
      address.house ? `д. ${address.house}` : '',
      address.apartment ? `кв. ${address.apartment}` : '',
      address.entrance ? `подъезд ${address.entrance}` : '',
      address.floor ? `этаж ${address.floor}` : '',
      address.office ? `офис ${address.office}` : '',
    ].filter(Boolean).join(', ');
  }

  function formatConstraint(item = {}) {
    if (item.type === 'range') return `${item.from}–${item.to}`;
    if (item.type === 'after') return `после ${item.time}`;
    if (item.type === 'before') return `до ${item.time}`;
    if (item.type === 'all-day') return 'весь день';
    if (item.type === 'daypart') return item.value || item.raw || '';
    return item.raw || '';
  }

  function serviceMapsForRug(rug = {}, sourceText = '') {
    const issues = [];
    const services = [];
    const review = [];
    const denied = [];
    const unsupported = [];
    const source = String(sourceText || '').toLowerCase();

    Object.entries(rug.services || {}).forEach(([key, state]) => {
      const label = SERVICE_LABELS[key] || key;
      if (state === 'review') {
        review.push(label);
        return;
      }
      if (state === 'denied') {
        denied.push(label);
        return;
      }
      if (state !== 'confirmed') return;

      if (key === 'stainRemoval') {
        issues.push('Пятна');
        if (/слайм|пластилин/.test(source)) issues.push('Слайм / пластилин');
      } else if (key === 'petHairRemoval') {
        if (/волос/.test(source)) issues.push('Волосы');
        if (/шерст/.test(source) || !/волос/.test(source)) issues.push('Шерсть');
      } else if (key === 'urineOdorRemoval') {
        issues.push('Запах мочи');
        services.push('Удаление запаха мочи');
      } else if (key === 'disinfection') {
        issues.push('Дезинфекция');
      } else if (key === 'conditioner') {
        services.push('Кондиционер');
      } else if (key === 'pileLifting') {
        services.push('Подъём ворса');
      } else if (key === 'ozonation') {
        services.push('Озонация');
      } else if (key === 'express') {
        services.push('Экспресс-стирка');
      } else if (!['basicWash'].includes(key)) {
        unsupported.push(label);
      }
    });

    return {
      issues: unique(issues),
      services: unique(services),
      review: unique(review),
      denied: unique(denied),
      unsupported: unique(unsupported),
    };
  }

  function rugToForm(rug = {}, index = 0, parsed = {}) {
    const mapped = serviceMapsForRug(rug, parsed.text);
    const notes = [];
    if (rug.measurementStatus === 'measure-at-workshop') notes.push(`Ковёр ${index + 1}: требуется замер`);
    else if (!rug.length || !rug.width) notes.push(`Ковёр ${index + 1}: размер не распознан`);
    else if (rug.approximate) notes.push(`Ковёр ${index + 1}: размер указан примерно`);
    if (rug.material?.certainty === 'uncertain') notes.push(`Ковёр ${index + 1}: состав «${rug.material.value}» нужно проверить`);
    if (rug.shape && rug.shape !== 'Прямоугольный') notes.push(`Ковёр ${index + 1}: форма — ${rug.shape}`);
    if (mapped.review.length) notes.push(`Ковёр ${index + 1}, проверить: ${mapped.review.join(', ')}`);
    if (mapped.denied.length) notes.push(`Ковёр ${index + 1}, не делать: ${mapped.denied.join(', ')}`);
    if (mapped.unsupported.length) notes.push(`Ковёр ${index + 1}, отдельно учесть: ${mapped.unsupported.join(', ')}`);
    if (rug.notes?.length) notes.push(`Ковёр ${index + 1}: ${rug.notes.join(', ')}`);

    return {
      form: {
        length: Number(rug.length || 0),
        width: Number(rug.width || 0),
        material: rug.material?.certainty === 'confirmed' ? rug.material.value : '',
        pile: rug.pile || '',
        issues: mapped.issues,
        services: mapped.services,
      },
      notes,
      exactDimensions: {
        length: Number(rug.length || 0),
        width: Number(rug.width || 0),
      },
    };
  }

  function contactNotes(parsed = {}) {
    const contacts = parsed.contacts || [];
    return contacts.slice(1).map((contact, index) => {
      const parts = [contact.name, contact.phone, contact.role && contact.role !== 'Клиент' ? contact.role : ''].filter(Boolean);
      return `Дополнительный контакт ${index + 2}: ${parts.join(' · ')}`;
    });
  }

  function addressNotes(parsed = {}) {
    const notes = [];
    const primary = parsed.addresses?.primaryAddress;
    const returned = parsed.addresses?.returnAddress;
    if (primary?.office) notes.push(`Офис: ${primary.office}`);
    if (primary?.accessCode) notes.push(`Код/домофон: ${primary.accessCode}`);
    if (primary?.instructions?.length) notes.push(`Доступ: ${primary.instructions.join('; ')}`);
    if (returned) notes.push(`Адрес возврата: ${formatAddress(returned)}`);
    return notes;
  }

  function priceNotes(parsed = {}) {
    const notes = [];
    if (parsed.price?.conditional) notes.push('Стоимость условная — подтвердить после проверки параметров');
    if ((parsed.price?.candidates || []).length > 1) notes.push(`Варианты стоимости: ${parsed.price.candidates.join(' / ')} ₽`);
    return notes;
  }

  function statusNotes(parsed = {}) {
    if (!parsed.status || STATUS_MAP[parsed.status]) return [];
    return [`Статус из исходного текста: ${parsed.status}`];
  }

  function timeModel(parsed = {}) {
    const constraints = parsed.time?.constraints || [];
    const exactRange = constraints.find(item => item.type === 'range');
    const after = constraints.find(item => item.type === 'after');
    const note = constraints.map(formatConstraint).filter(Boolean).join(', ');
    let startTime = '';
    let endTime = '';
    if (exactRange) {
      startTime = exactRange.from;
      endTime = exactRange.to;
    } else if (after?.time) {
      startTime = after.time;
      const [hours, minutes] = after.time.split(':').map(Number);
      const total = Math.min(23 * 60 + 59, (hours || 0) * 60 + (minutes || 0) + 30);
      endTime = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }
    return { startTime, endTime, note };
  }

  function toFormData(parsed = {}) {
    const primaryContact = (parsed.contacts || []).find(contact => contact.name || contact.phone) || {};
    const primaryAddress = parsed.addresses?.primaryAddress || {};
    const rugs = (parsed.rugs || []).map((rug, index) => rugToForm(rug, index, parsed));
    const time = timeModel(parsed);
    const comments = [
      ...contactNotes(parsed),
      ...addressNotes(parsed),
      ...rugs.flatMap(item => item.notes),
      ...priceNotes(parsed),
      ...statusNotes(parsed),
      ...(parsed.notes || []).map(note => `Важно: ${note}`),
      parsed.text ? `Исходный текст менеджера:\n${parsed.text}` : '',
    ].filter(Boolean);

    const warnings = unique([
      ...(parsed.confidence?.warnings || []),
      ...rugs.flatMap(item => item.notes.filter(note => /провер|не распознан|требуется замер|условн/.test(note))),
    ]);

    return {
      data: {
        visitType: 'pickup',
        customerName: primaryContact.name || '',
        phone: primaryContact.phone || parsed.phones?.[0]?.phone || '',
        orderSource: SOURCE_MAP[parsed.orderSource] || parsed.orderSource || '',
        settlement: primaryAddress.settlement || '',
        district: primaryAddress.district || parsed.district || '',
        street: primaryAddress.street || '',
        houseNumber: primaryAddress.house || '',
        apartmentNumber: primaryAddress.apartment || '',
        entrance: primaryAddress.entrance || '',
        floor: primaryAddress.floor || '',
        startTime: time.startTime || '10:00',
        endTime: time.endTime || '10:30',
        timeNote: time.note,
        requestStatus: STATUS_MAP[parsed.status] || 'pending-pickup',
        rugs: rugs.length ? rugs.map(item => item.form) : [{}],
        estimatedPrice: Number(parsed.price?.amount || 0),
        discount: 0,
        contractNumber: parsed.contractNumber || '',
        regularCustomer: Boolean(parsed.regularCustomer),
        callAhead: Number(parsed.time?.callAheadMinutes || 0) > 0,
        callAheadMinutes: Number(parsed.time?.callAheadMinutes || 30),
        managerComment: comments.join('\n'),
      },
      warnings,
      exactDimensions: rugs.map(item => item.exactDimensions),
      confidence: parsed.confidence || { score: 0, level: 'low', warnings: [] },
    };
  }

  function dispatchFieldEvents(root = document) {
    $$('input, select, textarea', root).forEach(element => {
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function restoreExactDimensions(dimensions = []) {
    $$('.rug-card', $('#rugsContainer')).forEach((card, index) => {
      const dimension = dimensions[index] || {};
      const length = $('.rug-length', card);
      const width = $('.rug-width', card);
      length.value = dimension.length > 0 ? String(dimension.length) : '';
      width.value = dimension.width > 0 ? String(dimension.width) : '';
      length.dispatchEvent(new Event('input', { bubbles: true }));
      width.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function applyMapped(mapped) {
    if (typeof globalScope.fillForm !== 'function') throw new Error('Форма ПМК ещё не готова');
    globalScope.fillForm(mapped.data);
    restoreExactDimensions(mapped.exactDimensions);
    dispatchFieldEvents($('#requestForm'));
    if (typeof globalScope.schedulePreviewUpdate === 'function') globalScope.schedulePreviewUpdate();
    return mapped.data;
  }

  function summaryRows(mapped = {}) {
    const data = mapped.data || {};
    return [
      ['Клиент', [data.customerName, data.phone].filter(Boolean).join(' · ')],
      ['Адрес', [data.district, data.street, data.houseNumber, data.apartmentNumber && `кв. ${data.apartmentNumber}`].filter(Boolean).join(', ')],
      ['Время', [data.startTime && data.endTime ? `${data.startTime}–${data.endTime}` : '', data.timeNote].filter(Boolean).join(' · ')],
      ['Ковры', String(data.rugs?.length || 0)],
      ['Стоимость', data.estimatedPrice ? `${data.estimatedPrice} ₽` : 'не распознана'],
    ];
  }

  function injectPanel() {
    if ($('#smartParserFormPanel')) return;
    const formView = $('#view-form');
    const requestForm = $('#requestForm');
    if (!formView || !requestForm) return;

    const panel = document.createElement('section');
    panel.id = 'smartParserFormPanel';
    panel.className = 'smart-form-panel';
    panel.innerHTML = `
      <div class="smart-form-head">
        <div><p class="eyebrow">Экспериментальный режим</p><h2>Умный ввод заявки</h2><p>Вставьте текст менеджера. Система сначала покажет результат и только после подтверждения заполнит форму.</p></div>
        <span class="smart-form-badge">Не сохраняет автоматически</span>
      </div>
      <textarea id="smartFormText" rows="7" spellcheck="false" placeholder="Советский, ул. Новая 12к2-45, п3э7. Марина +79000000000. После 16:00. Два ковра..."></textarea>
      <div class="smart-form-actions">
        <button type="button" class="button button-primary" id="smartFormParseBtn">Разобрать текст</button>
        <button type="button" class="button button-secondary" id="smartFormApplyBtn" disabled>Заполнить форму</button>
        <button type="button" class="button button-ghost" id="smartFormSampleBtn">Пример</button>
      </div>
      <div id="smartFormResult" class="smart-form-result" hidden>
        <div class="smart-form-score"><strong id="smartFormScore">0%</strong><span id="smartFormLevel">Требуется проверка</span></div>
        <div id="smartFormSummary" class="smart-form-summary"></div>
        <div id="smartFormWarnings" class="smart-form-warnings"></div>
      </div>`;

    formView.insertBefore(panel, requestForm);
    const text = $('#smartFormText');
    const parseButton = $('#smartFormParseBtn');
    const applyButton = $('#smartFormApplyBtn');
    const result = $('#smartFormResult');
    let lastMapped = null;

    const sample = 'Д-120 Советский, ул. Новая 12к2-45, п3э7. Марина +79000000000, если не дозвонитесь — Алексей +79000000001. После 16:00, позвонить за 30 минут. Назад везти на ул. Южная 8-14. Два ковра: 2×3 шерстяной, посмотреть пятна; 1,5×2,3 шегги, запах мочи и шерсть животных. Конд не нужен. Цена примерно 5600 руб. Авито2.';

    function renderMapped(mapped) {
      $('#smartFormScore').textContent = `${mapped.confidence.score || 0}%`;
      $('#smartFormLevel').textContent = mapped.confidence.level === 'high' ? 'Высокая уверенность' : mapped.confidence.level === 'medium' ? 'Часть полей нужно проверить' : 'Нужна ручная проверка';
      $('#smartFormSummary').innerHTML = summaryRows(mapped).map(([label, value]) => `<div><span>${label}</span><strong>${clean(value) || '—'}</strong></div>`).join('');
      const warnings = mapped.warnings || [];
      $('#smartFormWarnings').innerHTML = warnings.length
        ? warnings.map(warning => `<span>${clean(warning)}</span>`).join('')
        : '<span class="is-ok">Явных конфликтов нет</span>';
      result.hidden = false;
      applyButton.disabled = false;
    }

    function parseCurrent() {
      const parser = globalScope.PMK_SMART_PARSER_NEXT;
      const value = text.value.trim();
      if (!parser || !value) {
        text.focus();
        return;
      }
      const parsed = parser.parse(value);
      lastMapped = toFormData(parsed);
      globalScope.PMK_LAST_FORM_PARSE = parsed;
      globalScope.PMK_LAST_FORM_MAPPING = lastMapped;
      renderMapped(lastMapped);
    }

    parseButton.addEventListener('click', parseCurrent);
    applyButton.addEventListener('click', () => {
      if (!lastMapped) return;
      applyMapped(lastMapped);
      panel.classList.add('is-applied');
      applyButton.textContent = 'Форма заполнена';
      if (typeof globalScope.showToast === 'function') globalScope.showToast('Поля заполнены. Проверьте предупреждения перед сохранением.', 'success');
      $('#customerName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('#smartFormSampleBtn').addEventListener('click', () => {
      text.value = sample;
      parseCurrent();
    });
    text.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') parseCurrent();
    });

    if (typeof globalScope.setView === 'function') globalScope.setView('form', { skipHistory: true });
  }

  function boot() {
    const started = Date.now();
    const timer = setInterval(() => {
      if ($('#requestForm') && globalScope.PMK_SMART_PARSER_NEXT && typeof globalScope.fillForm === 'function') {
        clearInterval(timer);
        injectPanel();
      } else if (Date.now() - started > 15000) {
        clearInterval(timer);
      }
    }, 100);
  }

  const api = { toFormData, applyMapped, injectPanel, serviceMapsForRug };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  globalScope.PMK_SMART_PARSER_FORM_ADAPTER = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
