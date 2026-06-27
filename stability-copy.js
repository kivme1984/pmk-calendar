'use strict';

function pmkCopyRequest(id) {
  const event = getAllEvents().find(item => item.id === id);
  if (!event) return showToast('Заявка не найдена.', 'error');
  const data = JSON.parse(JSON.stringify(eventMeta(event)));
  const date = state.selectedDayKey || businessTodayKey();
  const slot = scheduleSlotsForDistrict(data.district || '', date)[0];
  const pmkId = makeId();
  fillForm({
    ...data,
    eventId: '', pmkId, visitDate: date,
    startTime: slot?.[0] || '10:00',
    endTime: slot?.[1] || addMinutesToTime('10:00', REQUEST_DURATION_MINUTES),
    timeNote: slot ? `Ждёт по расписанию: ${scheduleSlotLabel(slot)}` : '',
    requestStatus: defaultStatusForVisit(data.visitType || 'pickup'),
    contractNumber: '', regularCustomer: true,
    orderSource: 'Постоянный клиент', discount: Number(data.discount || 10),
    managerComment: '', routeException: false, routeExceptionReason: '',
    routeExceptionFee: 0, routeExceptionApprovedBy: '', routeExceptionComment: '',
  });
  qs('#eventId').value = '';
  qs('#eventId').dataset.pmkId = pmkId;
  qs('#deleteEventBtn').classList.add('hidden');
  qs('#formTitle').textContent = 'Новая заявка — копия';
  setView('form');
  showToast('Копия создана. Проверьте дату, время и состав заказа.', 'success');
}
const pmkCardOriginal = renderEventCard;
renderEventCard = event => {
  const html = pmkCardOriginal(event);
  const edit = `<button type="button" data-edit-event="${escapeHtml(event.id)}">Редактировать заявку</button>`;
  return html.replace(edit, `<button type="button" data-copy-event="${escapeHtml(event.id)}">Создать копию заявки</button>${edit}`);
};
const pmkBindOriginal = bindEventActions;
bindEventActions = root => {
  pmkBindOriginal(root);
  qsa('[data-copy-event]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    button.closest('details')?.removeAttribute('open');
    pmkCopyRequest(button.dataset.copyEvent);
  }));
};
const pmkDetailsOriginal = renderEventDetailsHtml;
renderEventDetailsHtml = event => {
  const html = pmkDetailsOriginal(event);
  const edit = `<button type="button" class="button button-primary" data-details-edit="${escapeHtml(event.id)}">Редактировать заявку</button>`;
  return html.replace(edit, `<button type="button" class="button button-secondary" data-details-copy="${escapeHtml(event.id)}">Создать копию</button>${edit}`);
};
const pmkOpenDetailsOriginal = openEventDetails;
openEventDetails = id => {
  pmkOpenDetailsOriginal(id);
  qs('[data-details-copy]', qs('#eventDetailsDialog'))?.addEventListener('click', event => {
    closeEventDetails();
    pmkCopyRequest(event.currentTarget.dataset.detailsCopy);
  });
};
