'use strict';

// В событии показываем только фактически выбранное время заявки.
// Полный список рабочих окон района нужен для выбора слота, но не для описания события.
eventDescription = function eventDescription(data) {
  const rugs = normalizeRugs(data).map((rug, index) => {
    const size = rug.length && rug.width
      ? `${rug.length} × ${rug.width} м (${(rug.length * rug.width).toFixed(2).replace('.00', '')} м²)`
      : 'размер не указан';
    const issues = rug.issues?.length ? `\n   Загрязнения: ${rug.issues.join(', ')}` : '';
    const services = rug.services?.length ? `\n   Доп. услуги: ${rug.services.join(', ')}` : '';
    return `${index + 1}. ${size}${rug.material ? `, ${rug.material}` : ''}${rug.pile ? `, ${rug.pile}` : ''}${issues}${services}`;
  }).join('\n');

  return [
    `Клиент: ${data.customerName || '—'}`,
    `Телефон: ${data.phone || '—'}`,
    `Источник: ${data.orderSource || 'не указан'}`,
    '',
    `Адрес: ${data.address || '—'}`,
    data.contractNumber ? `Договор: ${data.contractNumber}` : '',
    `Район: ${data.district || '—'}`,
    data.accessInfo ? `Доступ: ${data.accessInfo}` : '',
    `Тип визита: ${data.visitType === 'delivery' ? 'доставка' : 'забор'}`,
    `Статус: ${statusInfo(data.requestStatus, data.visitType).label}`,
    `Время: ${data.startTime || '—'}–${data.endTime || '—'}`,
    data.timeNote ? `Пометка по времени: ${data.timeNote}` : '',
    '',
    'Ковры:',
    rugs || '—',
    '',
    `Предварительная стоимость: ${data.estimatedPrice ? formatMoney(data.estimatedPrice) : 'не указана'}`,
    `Скидка: ${data.discount || 0}%`,
    `Постоянный клиент: ${data.regularCustomer ? 'да' : 'нет'}`,
    data.callAhead ? `Позвонить ${formatCallAhead(getCallAheadMinutes(data))}: да` : 'Позвонить перед визитом: нет',
    data.managerComment ? `\nКомментарий:\n${data.managerComment}` : '',
  ].filter(line => line !== '').join('\n');
};