'use strict';

const pmkSyncRouteOriginal = managerSyncException;
managerSyncException = (data = managerCurrentRouteData()) => {
  if (!state.settings.strictRoute) return qs('#routeExceptionPanel')?.classList.add('hidden');
  return pmkSyncRouteOriginal(data);
};
const pmkCheckRouteOriginal = checkRoute;
checkRoute = data => {
  if (state.settings.strictRoute) return pmkCheckRouteOriginal(data);
  const box = qs('#routeHint');
  const match = managerRouteMatch(data);
  managerSyncException(data);
  box.className = 'info-box';
  if (match.kind === 'missing') box.textContent = 'Выберите район и дату — появится проверка маршрута.';
  else if (match.kind === 'unconfigured') box.textContent = 'Для этого района маршрут не задан. Время можно выбрать вручную.';
  else if (match.kind === 'matched') {
    box.classList.add('good');
    box.textContent = `Подходит: ${data.district}, окно ${scheduleSlotLabel(match.slot)}.`;
  } else {
    box.classList.add('warning');
    box.textContent = match.kind === 'wrong-time'
      ? 'Время вне обычного районного окна. Заявку всё равно можно сохранить.'
      : 'День вне обычного маршрута. Заявку всё равно можно сохранить.';
  }
  return true;
};

let pmkConflictSource = null;
let pmkEventsByDate = new Map();
function pmkDayEvents(dateKey) {
  const all = getAllEvents();
  if (all !== pmkConflictSource) {
    pmkConflictSource = all;
    pmkEventsByDate = new Map();
    all.forEach(event => {
      const key = eventDateKey(event);
      if (!pmkEventsByDate.has(key)) pmkEventsByDate.set(key, []);
      pmkEventsByDate.get(key).push(event);
    });
  }
  return pmkEventsByDate.get(dateKey) || [];
}
checkConflicts = data => {
  const box = qs('#conflictHint');
  box.className = 'info-box hidden';
  if (!data.visitDate || !data.startTime || !data.endTime) return true;
  const from = `${data.visitDate}T${data.startTime}`;
  const to = `${data.visitDate}T${data.endTime}`;
  let sameWindow = 0;
  const conflict = pmkDayEvents(data.visitDate).find(event => {
    if (event.id === data.eventId) return false;
    const range = comparableEventRange(event);
    if (isSameRouteWindow(data, event, range)) { sameWindow += 1; return false; }
    return from < range.end && to > range.start;
  });
  if (!conflict && sameWindow) {
    box.className = 'info-box good';
    box.textContent = `В это окно уже есть ${sameWindow} ${pluralPoints(sameWindow)} по району. Можно добавить ещё заявку.`;
  }
  if (!conflict) return true;
  box.className = 'info-box danger';
  box.textContent = `Есть пересечение: ${conflict.summary || 'другая заявка'} (${formatTime(conflict.start?.dateTime || conflict.start)}–${formatTime(conflict.end?.dateTime || conflict.end)}).`;
  return false;
};
