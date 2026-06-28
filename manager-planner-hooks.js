'use strict';

const managerOriginalGetFormData = getFormData;
getFormData = function getFormDataWithManagerRoute() {
  const data = managerOriginalGetFormData();
  data.routeException = Boolean(qs('#routeException')?.checked);
  data.routeExceptionReason = qs('#routeExceptionReason')?.value || '';
  data.routeExceptionFee = Number(qs('#routeExceptionFee')?.value || 0);
  data.routeExceptionApprovedBy = cleanShortField(qs('#routeExceptionApprovedBy')?.value || '');
  data.routeExceptionComment = cleanShortField(qs('#routeExceptionComment')?.value || '');
  return data;
};

const managerOriginalFillForm = fillForm;
fillForm = function fillFormWithManagerRoute(data) {
  managerOriginalFillForm(data);
  qs('#routeException').checked = Boolean(data.routeException);
  qs('#routeExceptionReason').value = data.routeExceptionReason || '';
  qs('#routeExceptionFee').value = data.routeExceptionFee || '';
  qs('#routeExceptionApprovedBy').value = data.routeExceptionApprovedBy || '';
  qs('#routeExceptionComment').value = data.routeExceptionComment || '';
  renderManagerSlotPlanner();
  managerSyncException(data);
};

const managerOriginalResetForm = resetForm;
resetForm = function resetFormWithManagerRoute(addDefaultRug = true) {
  managerOriginalResetForm(addDefaultRug);
  managerClearException();
  renderManagerSlotPlanner();
  managerSyncException();
};

const managerOriginalRenderAll = renderAll;
renderAll = function renderAllWithManagerRoute() {
  managerOriginalRenderAll();
  renderManagerSlotPlanner();
};

const managerOriginalCheckRoute = checkRoute;
checkRoute = function checkManagerRoute(data) {
  const box = qs('#routeHint');
  const match = managerRouteMatch(data);
  managerSyncException(data);
  box.className = 'info-box';

  if (match.kind === 'missing') {
    box.textContent = 'Выберите район и дату — появится проверка маршрута.';
    return true;
  }
  if (match.kind === 'unconfigured') {
    box.textContent = 'Для этого района маршрут не задан. День и время можно выбрать вручную.';
    return true;
  }
  if (match.kind === 'matched') {
    box.classList.add('good');
    box.textContent = `Подходит: ${data.district}, окно ${scheduleSlotLabel(match.slot)}.`;
    return true;
  }

  box.classList.add('warning');
  if (match.kind === 'wrong-time') {
    box.textContent = `День подходит, но время вне районного окна. Доступно: ${match.slots.map(scheduleSlotLabel).join(', ') || 'нет окна'}.`;
  } else {
    const allowed = (ROUTES[data.district] || []).map(day => WEEKDAY_ROUTE[day]).join(' или ');
    box.textContent = `Район ${data.district} обычно обслуживается ${allowed}. Выбран ${WEEKDAY_NAMES[dateKeyForDisplay(data.visitDate).getUTCDay()]}.`;
  }
  if (data.routeException) {
    box.textContent += ' Сохранение как исключение подтверждено.';
    return true;
  }
  return false;
};

const managerOriginalValidateForm = validateForm;
validateForm = function validateManagerRoute(data) {
  const valid = managerOriginalValidateForm(data);
  const match = managerRouteMatch(data);
  if (!valid && (match.kind === 'wrong-day' || match.kind === 'wrong-time') && !data.routeException) {
    showToast('Подтвердите сохранение вне маршрута.', 'error');
  }
  if (valid && data.routeException && !data.routeExceptionReason) {
    showToast('Укажите причину исключения.', 'error');
    return false;
  }
  return valid;
};

const managerOriginalEventDescription = eventDescription;
eventDescription = function eventDescriptionWithManagerRoute(data) {
  const base = managerOriginalEventDescription(data);
  if (!data.routeException) return base;
  return [
    base,
    '',
    'ВНЕ МАРШРУТА',
    data.routeExceptionReason ? `Причина: ${data.routeExceptionReason}` : '',
    data.routeExceptionFee ? `Доплата: ${formatMoney(data.routeExceptionFee)}` : '',
    data.routeExceptionApprovedBy ? `Согласовал: ${data.routeExceptionApprovedBy}` : '',
    data.routeExceptionComment ? `Комментарий: ${data.routeExceptionComment}` : '',
  ].filter(Boolean).join('\n');
};

const managerOriginalRenderEventCard = renderEventCard;
renderEventCard = function renderEventCardWithManagerRoute(event) {
  const html = managerOriginalRenderEventCard(event);
  if (!eventMeta(event).routeException) return html;
  return html.replace('<div class="event-quick-badges">', '<div class="event-quick-badges"><span class="quick-badge exception-badge">ВНЕ МАРШРУТА</span>');
};

const managerOriginalRenderEventDetailsHtml = renderEventDetailsHtml;
renderEventDetailsHtml = function renderEventDetailsWithManagerRoute(event) {
  const data = eventMeta(event);
  let html = managerOriginalRenderEventDetailsHtml(event);
  if (!data.routeException) return html;
  html = html.replace('<div class="details-header-badges">', '<div class="details-header-badges"><span class="detail-exception">ВНЕ МАРШРУТА</span>');
  const warning = [
    data.routeExceptionReason ? `Причина: ${escapeHtml(data.routeExceptionReason)}` : '',
    data.routeExceptionApprovedBy ? `Согласовал: ${escapeHtml(data.routeExceptionApprovedBy)}` : '',
    data.routeExceptionFee ? `Доплата: ${escapeHtml(formatMoney(data.routeExceptionFee))}` : '',
  ].filter(Boolean).join(' · ');
  return warning ? html.replace('<section class="details-section">\n      <h3>Адрес</h3>', `<div class="details-route-warning">${warning}</div><section class="details-section">\n      <h3>Адрес</h3>`) : html;
};

document.addEventListener('DOMContentLoaded', () => {
  renderManagerSlotPlanner();
  managerSyncException();

  qs('#recommendedSlots')?.addEventListener('click', event => {
    const button = event.target.closest('[data-manager-slot]');
    if (button) managerApplySlot(button);
  });

  const refreshManagerRoute = () => {
    renderManagerSlotPlanner();
    managerSyncException();
    schedulePreviewUpdate();
  };

  qs('#district')?.addEventListener('change', refreshManagerRoute);
  qs('#visitDate')?.addEventListener('change', refreshManagerRoute);
  qs('#startTime')?.addEventListener('change', refreshManagerRoute);
  qs('#endTime')?.addEventListener('change', refreshManagerRoute);
  qs('#scheduleSlotSelect')?.addEventListener('change', () => setTimeout(refreshManagerRoute, 0));
  qs('#routeException')?.addEventListener('change', schedulePreviewUpdate);
  qsa('#routeExceptionReason, #routeExceptionFee, #routeExceptionApprovedBy, #routeExceptionComment').forEach(element => element.addEventListener('input', schedulePreviewUpdate));
});

const pmkHotfixLoader = document.createElement('script');
pmkHotfixLoader.src = './hotfix-loader.js?v=35';
pmkHotfixLoader.async = false;
document.head.appendChild(pmkHotfixLoader);
