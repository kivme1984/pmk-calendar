'use strict';

(function attachFormPreview(globalScope) {
  const SERVICE_LABELS = {
    basicWash: 'Обычная стирка',
    stainRemoval: 'Удаление пятен',
    petHairRemoval: 'Вычёсывание шерсти/волос',
    urineOdorRemoval: 'Удаление запаха мочи',
    conditioner: 'Кондиционер',
    pileLifting: 'Поднятие ворса',
    disinfection: 'Антибактериальная обработка',
    ozonation: 'Озонирование',
    express: 'Экспресс',
    doubleSidedWash: 'Стирка с двух сторон',
  };

  function compactAddress(address) {
    if (!address) return '';
    return [
      address.settlement,
      address.street,
      address.house && `д. ${address.house}`,
      address.apartment && `кв. ${address.apartment}`,
      address.entrance && `п. ${address.entrance}`,
      address.floor && `эт. ${address.floor}`,
      address.office && `офис ${address.office}`,
    ].filter(Boolean).join(', ');
  }

  function add(rows, field, label, value, action, reason = '') {
    if (value === undefined || value === null || value === '') return;
    rows.push({ field, label, value, action, reason });
  }

  function build(parsed) {
    const rows = [];
    const primaryContact = parsed.contacts?.[0] || null;
    const extraContacts = parsed.contacts?.slice(1) || [];
    const pickup = parsed.addresses?.primaryAddress || null;
    const returnAddress = parsed.addresses?.returnAddress || null;

    add(rows, 'contractNumber', 'Номер договора', parsed.contractNumber, 'auto');
    add(rows, 'clientName', 'Имя клиента', primaryContact?.name, primaryContact?.name ? 'auto' : 'review', 'Имя должно быть связано с основным телефоном');
    add(rows, 'clientPhone', 'Основной телефон', primaryContact?.phone || parsed.phones?.[0]?.phone, 'auto');
    if (extraContacts.length) {
      add(rows, 'additionalContacts', 'Дополнительные контакты', extraContacts.map(item => `${item.name || 'Без имени'} ${item.phone || ''}${item.role ? ` — ${item.role}` : ''}`.trim()).join('; '), 'review', 'Нужно подтвердить роль каждого контакта');
    }

    add(rows, 'district', 'Район', pickup?.district || parsed.district, 'auto');
    add(rows, 'pickupAddress', 'Адрес забора', compactAddress(pickup), pickup?.street && pickup?.house ? 'auto' : 'review', 'Автозаполнение разрешено только при наличии улицы и дома');
    add(rows, 'accessCode', 'Код/домофон', pickup?.accessCode, 'auto');
    add(rows, 'addressInstructions', 'Инструкции по адресу', pickup?.instructions?.join('; '), 'review', 'Инструкции курьеру всегда показываются перед сохранением');
    add(rows, 'returnAddress', 'Адрес возврата', compactAddress(returnAddress), 'review', 'Отдельный адрес возврата нельзя применять молча');

    add(rows, 'orderSource', 'Источник заявки', parsed.orderSource, 'auto');
    add(rows, 'regularCustomer', 'Постоянный клиент', parsed.regularCustomer ? 'Да' : 'Нет', parsed.regularCustomer ? 'auto' : 'skip', 'Отсутствие признака не означает нового клиента');
    add(rows, 'timeConstraints', 'Ограничения по времени', parsed.time?.constraints?.map(item => item.type === 'range' ? `${item.from}–${item.to}` : item.type === 'before' ? `до ${item.time}` : item.type === 'after' ? `после ${item.time}` : item.value || item.raw).filter(Boolean).join('; '), 'review', 'Парсер не назначает дату и точный слот самостоятельно');
    add(rows, 'callAheadMinutes', 'Позвонить заранее', parsed.time?.callAheadMinutes ? `${parsed.time.callAheadMinutes} мин` : '', 'auto');

    if (parsed.price?.amount) {
      add(rows, 'estimatedPrice', 'Предварительная стоимость', `${parsed.price.amount} ₽`, parsed.price.conditional ? 'review' : 'auto', parsed.price.conditional ? 'Цена зависит от состава, осмотра или условия' : '');
    }

    (parsed.rugs || []).forEach((rug, index) => {
      const prefix = `rugs.${index}`;
      const number = index + 1;
      const dimensions = rug.length && rug.width ? `${rug.length} × ${rug.width} м` : rug.measurementStatus === 'measure-at-workshop' ? 'Требуется замер' : 'Неизвестно';
      const dimensionAction = rug.measurementStatus === 'known' && !rug.approximate ? 'auto' : 'review';
      add(rows, `${prefix}.dimensions`, `Ковёр ${number}: размер`, dimensions, dimensionAction, dimensionAction === 'review' ? 'Размер примерный или требует замера' : '');
      add(rows, `${prefix}.shape`, `Ковёр ${number}: форма`, rug.shape, rug.shape ? 'auto' : 'review');
      add(rows, `${prefix}.material`, `Ковёр ${number}: состав`, rug.material?.value, rug.material?.certainty === 'confirmed' ? 'auto' : 'review', rug.material?.certainty !== 'confirmed' ? 'Состав не подтверждён' : '');
      add(rows, `${prefix}.pile`, `Ковёр ${number}: ворс`, rug.pile, rug.pile ? 'auto' : 'review');

      Object.entries(rug.services || {}).forEach(([service, state]) => {
        const action = state === 'confirmed' ? 'auto' : state === 'denied' ? 'skip' : 'review';
        const value = state === 'confirmed' ? 'Да' : state === 'denied' ? 'Не делать' : 'Проверить';
        add(rows, `${prefix}.services.${service}`, `Ковёр ${number}: ${SERVICE_LABELS[service] || service}`, value, action, state === 'review' ? 'Услуга зависит от осмотра или условия' : '');
      });
    });

    const counts = rows.reduce((acc, row) => {
      acc[row.action] = (acc[row.action] || 0) + 1;
      return acc;
    }, { auto: 0, review: 0, skip: 0 });

    return {
      rows,
      counts,
      canApplyAutomatically: counts.review === 0 && parsed.confidence?.level === 'high',
      policy: 'preview-only',
    };
  }

  const api = { build, compactAddress };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  globalScope.PMK_SMART_PARSER_FORM_PREVIEW = api;
})(typeof window !== 'undefined' ? window : globalThis);
