'use strict';

(() => {
  if (globalThis.PMK_WEEKLY_MINIMAL_CARDS_V82_26) return;
  globalThis.PMK_WEEKLY_MINIMAL_CARDS_V82_26 = true;

  const originalRenderPeriod = globalThis.renderPeriod;

  function ensureWeeklyStyles() {
    if (document.getElementById('pmkWeeklyMinimalCardsV8226Styles')) return;
    const style = document.createElement('style');
    style.id = 'pmkWeeklyMinimalCardsV8226Styles';
    style.textContent = `
      .week-board.week-board .pmk-week-minimal-event-v82-26{gap:5px!important;padding:10px!important}
      .week-board.week-board .pmk-week-minimal-event-v82-26 b{font-size:14px!important;line-height:1.15!important}
      .week-board.week-board .pmk-week-minimal-event-v82-26 span{font-size:12px!important;line-height:1.2!important}
      .week-board.week-board .pmk-week-minimal-event-v82-26 .pmk-week-address-v82-26{font-weight:700!important;color:var(--text-muted,#6b7280)!important}
      .week-board.week-board .pmk-week-minimal-event-v82-26 .pmk-week-meta-v82-26{display:flex!important;gap:6px!important;flex-wrap:wrap!important}
      .week-board.week-board .pmk-week-minimal-event-v82-26 .pmk-week-meta-v82-26 span{padding:3px 6px!important;border-radius:999px!important;background:rgba(0,0,0,.06)!important}
    `;
    document.head.appendChild(style);
  }

  function rugWord(count) {
    const value = Math.abs(Number(count || 0));
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return 'ковёр';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'ковра';
    return 'ковров';
  }

  function money(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number) || number <= 0) return '—';
    try {
      if (typeof formatMoney === 'function') return formatMoney(number);
    } catch {}
    return new Intl.NumberFormat('ru-RU').format(number) + ' ₽';
  }

  function weeklyEventCard(event) {
    const data = eventMeta(event);
    const currentStatus = statusInfo(data.requestStatus, data.visitType);
    const title = data.customerName || event.summary || 'Заявка';
    const address = displayAddress(data, event) || 'Адрес не указан';
    const rugs = Array.isArray(data.rugs) ? data.rugs.length : 0;
    const price = money(data.estimatedPrice);
    return `<button class="day-event status-${currentStatus.className} pmk-week-minimal-event-v82-26" data-open-event="${escapeHtml(event.id)}">
      <b>${escapeHtml(title)}</b>
      <span class="pmk-week-address-v82-26">${escapeHtml(address)}</span>
      <span class="pmk-week-meta-v82-26"><span>Ковры: ${rugs} ${rugWord(rugs)}</span><span>Стоимость: ${escapeHtml(price)}</span></span>
    </button>`;
  }

  function renderWeekMinimal(events, dateKeys) {
    const board = qs('#weekEvents');
    if (!board) return;
    ensureWeeklyStyles();
    board.className = 'week-board week-board pmk-week-minimal-board-v82-26';
    const todayKey = businessTodayKey();
    board.innerHTML = dateKeys.map(dateKey => {
      const date = dateKeyForDisplay(dateKey);
      const dayEvents = events.filter(event => eventDateKey(event) === dateKey);
      return `<section class="day-column ${dateKey === todayKey ? 'today' : ''}">
        <button class="day-heading day-open" data-open-day="${dateKey}"><strong>${WEEKDAY_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${date.toLocaleDateString('ru-RU',{month:'short', timeZone:'UTC'})}</strong><span>${dayEvents.length} ${pluralPoints(dayEvents.length)}</span></button>
        <button class="mini-button day-add" data-add-day="${dateKey}">＋ Заявка</button>
        ${dayEvents.map(weeklyEventCard).join('') || '<div class="empty-state">Свободно</div>'}
      </section>`;
    }).join('');
    bindEventActions(board);
    qsa('[data-open-day]', board).forEach(button => button.addEventListener('click', () => openDay(button.dataset.openDay)));
    qsa('[data-add-day]', board).forEach(button => button.addEventListener('click', () => createEventForDay(button.dataset.addDay)));
  }

  if (typeof originalRenderPeriod === 'function') {
    globalThis.renderPeriod = function renderPeriodWeeklyMinimal(events, dateKeys, period = 'week') {
      if (period === 'week') return renderWeekMinimal(events, dateKeys);
      return originalRenderPeriod(events, dateKeys, period);
    };
  }
})();