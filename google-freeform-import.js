'use strict';

const PMK_DISTRICT_NAMES = ['Автозаводский','Ленинский','Канавинский','Московский','Сормовский','Нижегородский','Советский','Приокский'];

function pmkTextNumber(value = '') {
  return Number(String(value).replace(/\s/g, '').replace(',', '.')) || 0;
}

function pmkExternalText(event = {}) {
  return [event.summary, event.description, event.location].filter(Boolean).join('\n').replace(/\u00a0/g, ' ').trim();
}

function pmkFindDistrict(text = '') {
  return PMK_DISTRICT_NAMES.find(name => new RegExp(name, 'i').test(text)) || '';
}

function pmkFindSource(text = '') {
  const match = text.match(/\b(авито\s*\d*|яндекс|вк|макс|max|сайт|квиз|рекомендац\w*)\b/i);
  if (!match) return '';
  const raw = match[1].replace(/\s+/g, ' ').trim();
  if (/авито/i.test(raw)) return raw.replace(/^./, char => char.toUpperCase());
  if (/макс|max/i.test(raw)) return 'Макс';
  if (/вк/i.test(raw)) return 'ВК';
  return raw.replace(/^./, char => char.toUpperCase());
}

function pmkFindName(text = '') {
  const direct = text.match(/(?:клиент|имя)\s*[:\-]?\s*([А-ЯЁ][а-яё]{1,24})/);
  if (direct) return direct[1];
  const contextual = text.match(/(?:^|[.\n])\s*([А-ЯЁ][а-яё]{1,24})\s*[.,]?\s*(?:дома|будет|жд[её]т|после|до|с\s*\d)/i);
  if (contextual) return contextual[1];
  return '';
}

function pmkFindAddressParts(text = '', event = {}) {
  const source = event.location || text;
  const streetMatch = source.match(/(?:ул(?:ица)?\.?\s*)([А-ЯЁа-яёA-Za-z0-9\- ]+?)\s+(\d+[А-Яа-яA-Za-z]?)(?=\s|,|\.|$)/i);
  if (streetMatch) {
    return {
      street: cleanShortField(streetMatch[1]),
      houseNumber: cleanShortField(streetMatch[2]),
      address: cleanShortField(event.location || streetMatch[0]),
    };
  }
  return { address: cleanShortField(event.location || '') };
}

function pmkFindRug(text = '') {
  const size = text.match(/(\d+(?:[.,]\d+)?)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)/i);
  const issues = [];
  const services = [];
  if (/пятн/i.test(text)) issues.push('Пятна');
  if (/шерст/i.test(text)) issues.push('Шерсть');
  if (/волос/i.test(text)) issues.push('Волосы');
  if (/запах\s*мочи|моч[аи]/i.test(text)) issues.push('Запах мочи');
  if (/дезинф/i.test(text)) issues.push('Дезинфекция');
  if (/слайм|пластилин/i.test(text)) issues.push('Слайм / пластилин');
  if (/поднят(?:ие|ь)\s*ворс|подъ[её]м\s*ворс/i.test(text)) services.push('Подъём ворса');
  if (/удален\w*\s*запах|удалить\s*запах/i.test(text)) services.push('Удаление запаха мочи');
  if (/озон/i.test(text)) services.push('Озонация');
  if (/кондиционер/i.test(text)) services.push('Кондиционер');
  if (/экспресс/i.test(text)) services.push('Экспресс-стирка');
  return [{
    length: size ? pmkTextNumber(size[1]) : 0,
    width: size ? pmkTextNumber(size[2]) : 0,
    material: '',
    pile: /шегги|длинн\w*\s*ворс|высок\w*\s*ворс/i.test(text) ? 'Более 1 см' : '',
    issues,
    services,
  }];
}

function pmkParseExternalEvent(event = {}) {
  const text = pmkExternalText(event);
  const phone = text.match(/(?:\+7|8)[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/)?.[0] || '';
  const priceMatch = text.match(/(?:цена|стоимость|итого)\s*[:\-]?\s*(\d[\d\s]{2,})\s*(?:р|₽|руб)?/i);
  const address = pmkFindAddressParts(text, event);
  const startValue = event.start?.dateTime || event.start;
  const endValue = event.end?.dateTime || event.end;
  const rugs = pmkFindRug(text);
  return {
    version: 1,
    pmkId: makeId(),
    eventId: event.id || '',
    externalEvent: true,
    visitType: /доставк/i.test(text) ? 'delivery' : 'pickup',
    customerName: pmkFindName(text),
    phone: cleanShortField(phone),
    orderSource: pmkFindSource(text),
    settlement: 'Нижний Новгород',
    district: pmkFindDistrict(text),
    street: address.street || '',
    houseNumber: address.houseNumber || '',
    apartmentNumber: '',
    entrance: '',
    floor: '',
    address: address.address || event.location || '',
    visitDate: eventDateKey(event),
    startTime: formatTime(startValue),
    endTime: formatTime(endValue),
    timeNote: '',
    requestStatus: defaultStatusForVisit(/доставк/i.test(text) ? 'delivery' : 'pickup'),
    rugs,
    issues: rugs[0].issues,
    services: rugs[0].services,
    estimatedPrice: priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : 0,
    discount: 0,
    contractNumber: '',
    regularCustomer: false,
    callAhead: false,
    callAheadMinutes: 30,
    managerComment: text,
  };
}

const pmkExternalMetaOriginal = eventMeta;
eventMeta = event => {
  const decoded = decodePmkData(event);
  if (decoded) return pmkExternalMetaOriginal(event);
  return pmkParseExternalEvent(event);
};

const pmkExternalCardOriginal = renderEventCard;
renderEventCard = event => {
  const html = pmkExternalCardOriginal(event);
  if (isPmkEvent(event)) return html;
  return html.replace('<div class="event-quick-badges">', '<div class="event-quick-badges"><span class="quick-badge exception-badge">ИЗ GOOGLE — ПРОВЕРИТЬ</span>');
};

const pmkExternalDetailsOriginal = renderEventDetailsHtml;
renderEventDetailsHtml = event => {
  let html = pmkExternalDetailsOriginal(event);
  if (isPmkEvent(event)) return html;
  const note = '<div class="details-route-warning"><strong>Событие создано вручную в Google Calendar.</strong><br>ПМК распознал данные автоматически. Нажмите «Редактировать заявку», проверьте поля и сохраните — событие будет преобразовано в формат ПМК.</div>';
  return html.replace('<section class="details-section">', `${note}<section class="details-section">`);
};
