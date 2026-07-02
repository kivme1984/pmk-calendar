'use strict';

(() => {
  const parser = globalThis.PMK_SMART_PARSER_NEXT;
  if (!parser) throw new Error('Умный парсер не загрузился');

  const $ = selector => document.querySelector(selector);
  const sourceText = $('#sourceText');
  const parseBtn = $('#parseBtn');
  const clearBtn = $('#clearBtn');
  const sampleBtn = $('#sampleBtn');
  const emptyState = $('#emptyState');
  const results = $('#results');

  const SAMPLE = 'Советский, ул. Новая 12к2-45, п3э7. Марина +79000000000, если не дозвонитесь — Алексей +79000000001. После 16:00, позвонить за 30 минут. Назад везти на ул. Южная 8-14. Два ковра: 2×3 шерстяной, посмотреть пятна; 1,5×2,3 шегги, запах мочи и шерсть животных. Конд не нужен. Цена примерно 5600 руб. Авито2.';

  const SERVICE_LABELS = {
    basicWash: 'Обычная стирка',
    stainRemoval: 'Пятна',
    petHairRemoval: 'Вычёсывание шерсти/волос',
    urineOdorRemoval: 'Запах мочи',
    conditioner: 'Кондиционер',
    pileLifting: 'Поднятие ворса',
    disinfection: 'Антибактериальная обработка',
    ozonation: 'Озонирование',
    express: 'Экспресс',
    doubleSidedWash: 'Стирка с двух сторон',
  };

  const STATE_LABELS = {
    confirmed: 'подтверждено',
    review: 'проверить',
    denied: 'не делать',
  };

  function valueOrDash(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(', ');
    if (value === true) return 'Да';
    if (value === false) return 'Нет';
    return value === 0 ? '0' : String(value || '');
  }

  function addField(root, label, value, state = '') {
    const row = document.createElement('div');
    row.className = 'field-row';
    const name = document.createElement('span');
    name.className = 'field-label';
    name.textContent = label;
    const output = document.createElement('span');
    output.className = `field-value${state ? ` is-${state}` : ''}`;
    const text = valueOrDash(value);
    output.textContent = text || 'Не распознано';
    if (!text) output.classList.add('is-empty');
    row.append(name, output);
    root.appendChild(row);
  }

  function clearNode(node) {
    node.replaceChildren();
  }

  function renderContacts(parsed) {
    const root = $('#contactFields');
    clearNode(root);
    addField(root, 'Договор', parsed.contractNumber);
    if (parsed.contacts.length) {
      parsed.contacts.forEach((contact, index) => {
        const label = parsed.contacts.length > 1 ? `Контакт ${index + 1}` : 'Клиент';
        const parts = [contact.name, contact.phone, contact.role && contact.role !== 'Клиент' ? `— ${contact.role}` : ''].filter(Boolean);
        addField(root, label, parts.join(' '));
      });
    } else {
      addField(root, 'Клиент', '');
      addField(root, 'Телефон', parsed.phones.map(item => item.phone));
    }
    addField(root, 'Постоянный клиент', parsed.regularCustomer);
  }

  function renderAddress(root, address) {
    clearNode(root);
    addField(root, 'Населённый пункт', address?.settlement);
    addField(root, 'Район', address?.district);
    addField(root, 'Улица', address?.street);
    addField(root, 'Дом', address?.house);
    addField(root, 'Квартира', address?.apartment);
    addField(root, 'Подъезд', address?.entrance);
    addField(root, 'Этаж', address?.floor);
    addField(root, 'Офис', address?.office);
    addField(root, 'Код/домофон', address?.accessCode);
    addField(root, 'Инструкции', address?.instructions);
  }

  function formatTimeConstraint(item) {
    if (item.type === 'range') return `${item.from}–${item.to}`;
    if (item.type === 'before') return `до ${item.time}`;
    if (item.type === 'after') return `после ${item.time}`;
    if (item.type === 'all-day') return 'весь день';
    if (item.type === 'daypart') return item.value;
    return item.raw || '';
  }

  function renderTime(parsed) {
    const root = $('#timeFields');
    clearNode(root);
    addField(root, 'Ограничения', parsed.time.constraints.map(formatTimeConstraint));
    addField(root, 'Позвонить заранее', parsed.time.callAheadMinutes ? `${parsed.time.callAheadMinutes} мин` : '');
    addField(root, 'Комментарии', parsed.notes);
  }

  function renderOrder(parsed) {
    const root = $('#orderFields');
    clearNode(root);
    addField(root, 'Источник', parsed.orderSource);
    addField(root, 'Статус', parsed.status);
    addField(root, 'Район', parsed.district);
    addField(root, 'Стоимость', parsed.price.amount ? `${parsed.price.amount.toLocaleString('ru-RU')} ₽` : '');
    addField(root, 'Цена условная', parsed.price.conditional);
    addField(root, 'Варианты цены', parsed.price.candidates.map(value => `${value.toLocaleString('ru-RU')} ₽`));
  }

  function dimensionText(rug) {
    if (rug.length && rug.width) return `${rug.length} × ${rug.width} м`;
    if (rug.measurementStatus === 'measure-at-workshop') return 'Измерить';
    return 'Размер неизвестен';
  }

  function materialText(material) {
    if (!material?.value) return '';
    return material.certainty === 'uncertain' ? `${material.value} — проверить` : material.value;
  }

  function renderRugs(parsed) {
    const grid = $('#rugGrid');
    clearNode(grid);
    $('#rugCountLabel').textContent = parsed.rugs.length ? `Распознано: ${parsed.rugs.length}` : 'Ковры не распознаны';

    parsed.rugs.forEach((rug, index) => {
      const card = document.createElement('article');
      card.className = 'rug-card';
      const title = document.createElement('h3');
      title.textContent = `Ковёр ${index + 1}`;
      const main = document.createElement('div');
      main.className = 'rug-main';
      [dimensionText(rug), rug.shape, materialText(rug.material), rug.pile]
        .filter(Boolean)
        .forEach(value => {
          const pill = document.createElement('span');
          pill.className = 'rug-pill';
          pill.textContent = value;
          main.appendChild(pill);
        });

      const services = document.createElement('div');
      services.className = 'service-list';
      Object.entries(rug.services || {}).forEach(([key, state]) => {
        const chip = document.createElement('span');
        chip.className = `service-chip${state === 'review' ? ' is-review' : state === 'denied' ? ' is-denied' : ''}`;
        chip.textContent = `${SERVICE_LABELS[key] || key}: ${STATE_LABELS[state] || state}`;
        services.appendChild(chip);
      });

      card.append(title, main);
      if (services.childElementCount) card.appendChild(services);
      if (rug.approximate || rug.measurementStatus !== 'known' || rug.notes?.length) {
        const note = document.createElement('p');
        note.className = 'rug-note';
        const notes = [];
        if (rug.approximate) notes.push('Размер указан примерно');
        if (rug.measurementStatus === 'measure-at-workshop') notes.push('Требуется замер');
        notes.push(...(rug.notes || []));
        note.textContent = notes.join(' · ');
        card.appendChild(note);
      }
      grid.appendChild(card);
    });
  }

  function renderConfidence(parsed) {
    const score = parsed.confidence.score;
    $('#confidenceValue').textContent = `${score}%`;
    $('#confidenceLabel').textContent = parsed.confidence.level === 'high' ? 'Высокая уверенность' : parsed.confidence.level === 'medium' ? 'Нужно проверить часть полей' : 'Требуется ручная проверка';
    const root = $('#warningList');
    clearNode(root);
    if (!parsed.confidence.warnings.length) {
      const chip = document.createElement('span');
      chip.className = 'warning-chip is-ok';
      chip.textContent = 'Явных конфликтов нет';
      root.appendChild(chip);
      return;
    }
    parsed.confidence.warnings.forEach(warning => {
      const chip = document.createElement('span');
      chip.className = 'warning-chip';
      chip.textContent = warning;
      root.appendChild(chip);
    });
  }

  function render(parsed) {
    emptyState.hidden = true;
    results.hidden = false;
    renderConfidence(parsed);
    renderContacts(parsed);
    renderAddress($('#addressFields'), parsed.addresses.primaryAddress);
    const returnCard = $('#returnAddressCard');
    returnCard.hidden = !parsed.addresses.returnAddress;
    if (parsed.addresses.returnAddress) renderAddress($('#returnAddressFields'), parsed.addresses.returnAddress);
    renderTime(parsed);
    renderOrder(parsed);
    renderRugs(parsed);
    $('#rawResult').textContent = JSON.stringify(parsed, null, 2);
  }

  function parseCurrent() {
    const value = sourceText.value.trim();
    if (!value) {
      sourceText.focus();
      return;
    }
    const parsed = parser.parse(value);
    globalThis.PMK_LAST_LAB_PARSE = parsed;
    render(parsed);
  }

  parseBtn.addEventListener('click', parseCurrent);
  clearBtn.addEventListener('click', () => {
    sourceText.value = '';
    results.hidden = true;
    emptyState.hidden = false;
    delete globalThis.PMK_LAST_LAB_PARSE;
    sourceText.focus();
  });
  sampleBtn.addEventListener('click', () => {
    sourceText.value = SAMPLE;
    parseCurrent();
  });
  sourceText.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') parseCurrent();
  });
})();
