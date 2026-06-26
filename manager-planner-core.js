'use strict';

function managerRouteMatch(data = {}) {
  const district = String(data.district || '').trim();
  const dateKey = data.visitDate || '';
  if (!district || !dateKey) return { kind: 'missing', slots: [] };
  if (!ROUTES[district]) return { kind: 'unconfigured', slots: [] };
  const slots = scheduleSlotsForDistrict(district, dateKey);
  const exact = slots.find(slot => slot[0] === data.startTime && slot[1] === data.endTime);
  if (exact) return { kind: 'matched', slots, slot: exact };
  const weekday = dateKeyForDisplay(dateKey).getUTCDay();
  return { kind: ROUTES[district].includes(weekday) ? 'wrong-time' : 'wrong-day', slots };
}

function managerRouteLoad(district, dateKey, startTime, endTime, excludeEventId = '') {
  return getAllEvents().filter(event => {
    if (event.id === excludeEventId) return false;
    const data = eventMeta(event);
    const range = comparableEventRange(event);
    return eventDateKey(event) === dateKey &&
      String(data.district || '').trim().toLowerCase() === String(district || '').trim().toLowerCase() &&
      range.start === `${dateKey}T${startTime}` && range.end === `${dateKey}T${endTime}`;
  }).length;
}

function managerSlotCandidates(district, limit = 8) {
  if (!ROUTES[district]) return [];
  const today = businessTodayKey();
  const nowTime = businessDateTimeParts(new Date().toISOString()).time;
  const result = [];
  for (let offset = 0; offset < 35 && result.length < limit; offset += 1) {
    const dateKey = addDaysToKey(today, offset);
    scheduleSlotsForDistrict(district, dateKey).forEach(slot => {
      if (result.length >= limit) return;
      if (dateKey === today && slot[1] <= nowTime) return;
      result.push({
        dateKey,
        startTime: slot[0],
        endTime: slot[1],
        note: slot[3] || '',
        load: managerRouteLoad(district, dateKey, slot[0], slot[1], qs('#eventId')?.value || ''),
      });
    });
  }
  return result;
}

function managerDateLabel(dateKey) {
  const today = businessTodayKey();
  if (dateKey === today) return 'Сегодня';
  if (dateKey === addDaysToKey(today, 1)) return 'Завтра';
  const date = dateKeyForDisplay(dateKey);
  return `${WEEKDAY_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${date.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' })}`;
}

function managerClearException() {
  if (qs('#routeException')) qs('#routeException').checked = false;
  if (qs('#routeExceptionReason')) qs('#routeExceptionReason').value = '';
  if (qs('#routeExceptionFee')) qs('#routeExceptionFee').value = '';
  if (qs('#routeExceptionApprovedBy')) qs('#routeExceptionApprovedBy').value = '';
  if (qs('#routeExceptionComment')) qs('#routeExceptionComment').value = '';
}

function managerCurrentRouteData() {
  return {
    district: qs('#district')?.value || '',
    visitDate: qs('#visitDate')?.value || '',
    startTime: qs('#startTime')?.value || '',
    endTime: qs('#endTime')?.value || '',
  };
}

function managerSyncException(data = managerCurrentRouteData()) {
  const panel = qs('#routeExceptionPanel');
  if (!panel) return;
  const match = managerRouteMatch(data);
  const outside = match.kind === 'wrong-day' || match.kind === 'wrong-time';
  panel.classList.toggle('hidden', !outside);
  if (!outside && qs('#routeException')?.checked) managerClearException();
}

function renderManagerSlotPlanner() {
  const container = qs('#recommendedSlots');
  const hint = qs('#managerSlotHint');
  if (!container || !hint) return;
  const district = qs('#district')?.value || '';
  if (!district) {
    hint.textContent = 'Сначала выберите район клиента.';
    container.innerHTML = '';
    return;
  }
  if (!ROUTES[district]) {
    hint.textContent = 'Для этого направления график не задан. Выберите время вручную.';
    container.innerHTML = '<div class="manager-slot-empty">Автоматических окон нет.</div>';
    return;
  }
  const candidates = managerSlotCandidates(district);
  if (!candidates.length) {
    hint.textContent = 'Ближайшие окна не найдены.';
    container.innerHTML = '<div class="manager-slot-empty">Укажите дату и время вручную.</div>';
    return;
  }
  const recommended = candidates[0];
  hint.textContent = `Ближайшие окна для района ${district}.`;
  const selectedDate = qs('#visitDate')?.value || '';
  const selectedStart = qs('#startTime')?.value || '';
  const selectedEnd = qs('#endTime')?.value || '';
  container.innerHTML = candidates.map(item => {
    const selected = item.dateKey === selectedDate && item.startTime === selectedStart && item.endTime === selectedEnd;
    const loadText = item.load ? `${item.load} ${pluralPoints(item.load)} уже в окне` : 'Окно свободно';
    return `<button type="button" class="manager-slot-card${item === recommended ? ' recommended' : ''}${selected ? ' selected' : ''}" data-manager-slot data-date="${escapeHtml(item.dateKey)}" data-start="${escapeHtml(item.startTime)}" data-end="${escapeHtml(item.endTime)}" data-note="${escapeHtml(item.note)}">
      ${item === recommended ? '<span class="slot-recommend-label">Ближайшее</span>' : ''}
      <strong>${escapeHtml(managerDateLabel(item.dateKey))}</strong>
      <b>${escapeHtml(item.startTime)}–${escapeHtml(item.endTime)}</b>
      ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}
      <span>${escapeHtml(loadText)}</span>
    </button>`;
  }).join('');
}

function managerApplySlot(button) {
  qs('#visitDate').value = button.dataset.date;
  qs('#startTime').value = button.dataset.start;
  qs('#endTime').value = button.dataset.end;
  qs('#timeNote').value = `Ждёт по расписанию: ${button.dataset.start}-${button.dataset.end}${button.dataset.note ? ` (${button.dataset.note})` : ''}`;
  managerClearException();
  updateScheduleSlotOptions(false);
  managerSyncException();
  renderManagerSlotPlanner();
  schedulePreviewUpdate();
}
