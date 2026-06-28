'use strict';

(() => {
  const SERVICE_VALUES = [
    'Удаление пятен',
    'Вычёсывание шерсти и волос',
    'Удаление запаха мочи',
    'Дезинфекция',
    'Подъём ворса',
    'Озонация',
    'Кондиционер',
    'Экспресс-стирка',
  ];

  const ISSUE_TO_SERVICE = {
    'Пятна': 'Удаление пятен',
    'Обычные пятна': 'Удаление пятен',
    'Слайм': 'Удаление пятен',
    'Пластилин': 'Удаление пятен',
    'Слайм / пластилин': 'Удаление пятен',
    'Удаление слайма / пластилина': 'Удаление пятен',
    'Маркеры': 'Удаление пятен',
    'Шерсть': 'Вычёсывание шерсти и волос',
    'Волосы': 'Вычёсывание шерсти и волос',
    'Запах мочи': 'Удаление запаха мочи',
    'Дезинфекция': 'Дезинфекция',
  };

  const SERVICE_ALIASES = {
    'Пятна': 'Удаление пятен',
    'Обычные пятна': 'Удаление пятен',
    'Удаление пятен': 'Удаление пятен',
    'Слайм': 'Удаление пятен',
    'Пластилин': 'Удаление пятен',
    'Слайм / пластилин': 'Удаление пятен',
    'Удаление слайма / пластилина': 'Удаление пятен',
    'Маркеры': 'Удаление пятен',
    'Шерсть': 'Вычёсывание шерсти и волос',
    'Волосы': 'Вычёсывание шерсти и волос',
    'Шерсть и волосы': 'Вычёсывание шерсти и волос',
    'Вычёсывание шерсти': 'Вычёсывание шерсти и волос',
    'Вычёсывание шерсти и волос': 'Вычёсывание шерсти и волос',
    'Запах мочи': 'Удаление запаха мочи',
    'Удаление запаха': 'Удаление запаха мочи',
    'Удаление запаха мочи': 'Удаление запаха мочи',
    'Дезинфекция': 'Дезинфекция',
    'Ковёр после потопа': 'Дезинфекция',
    'Мокрый ковёр': 'Дезинфекция',
    'Расчёсывание ворса': 'Подъём ворса',
    'Расчесывание ворса': 'Подъём ворса',
    'Расчёсывание': 'Подъём ворса',
    'Расчесывание': 'Подъём ворса',
    'Поднятие ворса': 'Подъём ворса',
    'Подъём ворса': 'Подъём ворса',
    'Озонация': 'Озонация',
    'Кондиционер': 'Кондиционер',
    'Экспресс': 'Экспресс-стирка',
    'Экспресс-стирка': 'Экспресс-стирка',
  };

  function unique(values = []) {
    return [...new Set(values.filter(Boolean))];
  }

  function canonicalService(value = '') {
    const clean = String(value || '').trim();
    return SERVICE_ALIASES[clean] || (SERVICE_VALUES.includes(clean) ? clean : '');
  }

  function migrateRug(rug = {}) {
    const fromIssues = (Array.isArray(rug.issues) ? rug.issues : []).map(value => ISSUE_TO_SERVICE[value] || canonicalService(value));
    const fromServices = (Array.isArray(rug.services) ? rug.services : []).map(canonicalService);
    return {
      ...rug,
      issues: [],
      services: unique([...fromIssues, ...fromServices]),
    };
  }

  function migrateData(data = {}) {
    const rugs = Array.isArray(data.rugs) ? data.rugs.map(migrateRug) : [];
    const legacyIssues = (Array.isArray(data.issues) ? data.issues : []).map(value => ISSUE_TO_SERVICE[value] || canonicalService(value));
    const legacyServices = (Array.isArray(data.services) ? data.services : []).map(canonicalService);

    if (rugs.length && (legacyIssues.length || legacyServices.length)) rugs[0].services = unique([...rugs[0].services, ...legacyIssues, ...legacyServices]);

    return {
      ...data,
      rugs,
      issues: [],
      services: unique(rugs.flatMap(rug => rug.services || [])),
    };
  }

  function servicesFromCard(card) {
    if (!card) return [];
    return unique(qsa('input[type="checkbox"]:checked', card).map(input => canonicalService(input.value)));
  }

  function replaceRugTemplate() {
    const template = qs('#rugTemplate');
    const details = template?.content?.querySelector('.rug-details-grid');
    if (!details) return;

    details.className = 'rug-details-grid rug-services-only';
    details.innerHTML = `
      <div class="rug-service-section">
        <p class="field-label">Услуги для этого ковра</p>
        <div class="chip-grid rug-services">
          <label><input type="checkbox" value="Удаление пятен" /><span>Пятна / слайм / пластилин / маркеры · 500 ₽/ковёр</span></label>
          <label><input type="checkbox" value="Вычёсывание шерсти и волос" /><span>Вычёсывание шерсти и волос · 150 ₽/м²</span></label>
          <label><input type="checkbox" value="Удаление запаха мочи" /><span>Удаление запаха мочи · 700 ₽ до 6 м² / 1000 ₽ свыше 6 м²</span></label>
          <label><input type="checkbox" value="Дезинфекция" /><span>Дезинфекция / ковёр после потопа · 700 ₽/ковёр</span></label>
          <label><input type="checkbox" value="Подъём ворса" /><span>Расчёсывание / подъём ворса · 150 ₽/м²</span></label>
          <label><input type="checkbox" value="Озонация" /><span>Озонация · 300 ₽/ковёр</span></label>
          <label><input type="checkbox" value="Кондиционер" /><span>Кондиционер · 300 ₽/ковёр</span></label>
          <label><input type="checkbox" value="Экспресс-стирка" /><span>Экспресс-стирка · 1000 ₽/заказ</span></label>
        </div>
      </div>`;
  }

  replaceRugTemplate();

  const originalCollectRugs = collectRugs;
  collectRugs = function collectRugsWithUnifiedServices() {
    const rugs = originalCollectRugs();
    const cards = qsa('.rug-card');
    return rugs.map((rug, index) => migrateRug({ ...rug, services: servicesFromCard(cards[index]) }));
  };

  const originalEventMeta = eventMeta;
  eventMeta = event => migrateData(originalEventMeta(event));

  const originalGetFormData = getFormData;
  getFormData = function getFormDataWithUnifiedServices() {
    return migrateData(originalGetFormData());
  };

  const originalFillForm = fillForm;
  fillForm = function fillFormWithUnifiedServices(data) {
    originalFillForm(migrateData(data));
  };

  const originalEventDescription = eventDescription;
  eventDescription = function eventDescriptionWithUnifiedServices(data) {
    return originalEventDescription(migrateData(data)).replace(/Доп\. услуги:/g, 'Услуги:');
  };

  renderRugDetails = function renderRugDetailsWithUnifiedServices(data = {}) {
    const rugs = eventRugs(migrateData(data));
    if (!rugs.length) return '<div class="details-empty">Информация о коврах не указана.</div>';

    return rugs.map((rug, index) => {
      const hasSize = Number(rug.length) > 0 && Number(rug.width) > 0;
      const area = hasSize ? Number(rug.length) * Number(rug.width) : 0;
      const size = hasSize ? `${rug.length} × ${rug.width} м · ${formatAreaValue(area)} м²` : 'Размер не указан';
      const services = Array.isArray(rug.services) && rug.services.length ? rug.services.join(', ') : 'Не выбраны';
      return `<article class="details-rug-card">
        <div class="details-rug-title"><strong>Ковёр ${index + 1}</strong><span>${escapeHtml(size)}</span></div>
        <div class="details-rug-grid">
          ${renderDetailValue('Материал', rug.material || 'Не указан')}
          ${renderDetailValue('Ворс', rug.pile || 'Не указан')}
          ${renderDetailValue('Услуги', services, { wide: true })}
        </div>
      </article>`;
    }).join('');
  };
})();