from pathlib import Path


def replace_between(text, start, end, replacement):
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f'Start marker not found: {start}')
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f'End marker not found: {end}')
    return text[:start_index] + replacement.rstrip() + '\n\n' + text[end_index:]


app_path = Path('app.js')
app = app_path.read_text(encoding='utf-8')

app = app.replace(
    'class="day-event status-${currentStatus.className}" data-edit-event=',
    'class="day-event status-${currentStatus.className}" data-open-event=',
    1,
)

card_code = r'''function eventRugs(data = {}) {
  return Array.isArray(data.rugs) ? data.rugs : [];
}

function formatAreaValue(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '';
  return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function rugSummary(data = {}) {
  const rugs = eventRugs(data);
  if (!rugs.length) return 'Ковры не указаны';
  const known = rugs.filter(rug => Number(rug.length) > 0 && Number(rug.width) > 0);
  const unknownCount = rugs.length - known.length;
  const totalArea = known.reduce((sum, rug) => sum + Number(rug.length) * Number(rug.width), 0);
  const countText = `${rugs.length} ${pluralRugs(rugs.length)}`;
  if (!known.length) return `${countText} • площадь не указана`;
  const areaText = `${formatAreaValue(totalArea)} м²`;
  return unknownCount ? `${countText} • ${areaText} + ${unknownCount} без размера` : `${countText} • ${areaText}`;
}

function sourceBadge(data = {}) {
  const source = cleanShortField(data.orderSource || '');
  if (!source) return '';
  const isMax = /^(макс|max)$/i.test(source);
  return `<span class="quick-badge source-badge${isMax ? ' max-badge' : ''}">${isMax ? 'MAX' : escapeHtml(source)}</span>`;
}

function scheduleBadge(data = {}) {
  if (data.callAhead) return `<span class="quick-badge schedule-badge">◷ Позвонить ${escapeHtml(formatCallAhead(getCallAheadMinutes(data)))}</span>`;
  if (isScheduleNote(data)) return '<span class="quick-badge schedule-badge">◷ Ждёт по расписанию</span>';
  return '';
}

function eventCommentText(data = {}) {
  return [data.timeNote, data.managerComment]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join('\n');
}

function renderContractControl(event, data = {}) {
  const id = escapeHtml(event.id);
  const number = cleanShortField(data.contractNumber || '');
  return `<div class="contract-control">
    <button type="button" class="contract-chip${number ? '' : ' empty'}" data-contract-toggle="${id}" aria-label="${number ? 'Изменить номер договора' : 'Добавить номер договора'}">
      ${number ? `№ ${escapeHtml(number)}` : '№ договора <span aria-hidden="true">✎</span>'}
    </button>
    <div class="contract-editor hidden" data-contract-editor="${id}">
      <input data-contract-input="${id}" value="${escapeHtml(number)}" placeholder="Номер договора" inputmode="numeric" aria-label="Номер договора" />
      <button type="button" class="mini-button contract-save" data-contract-save="${id}">Сохранить</button>
      <button type="button" class="mini-button contract-cancel" data-contract-cancel="${id}" aria-label="Закрыть">×</button>
    </div>
  </div>`;
}

function renderEventCard(event) {
  const data = eventMeta(event);
  const start = event.start?.dateTime || event.start;
  const end = event.end?.dateTime || event.end;
  const currentStatus = statusInfo(data.requestStatus, data.visitType);
  const title = data.customerName || event.summary || 'Заявка';
  const dateKey = eventDateKey(event);
  const date = dateKeyForDisplay(dateKey);
  const comment = eventCommentText(data);
  const id = escapeHtml(event.id);
  return `<article class="event-card status-${currentStatus.className}" data-event-card="${id}">
      <div class="event-time">
        <small class="event-date">${formatDateShort(dateKey)}</small>
        <small class="event-weekday">${WEEKDAY_SHORT[date.getUTCDay()]}, ${escapeHtml(date.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'UTC' }))}</small>
        <strong>${formatTime(start)}–${formatTime(end)}</strong>
        <span>${data.visitType === 'delivery' ? 'Доставка' : 'Забор'}</span>
      </div>
      <div class="event-main">
        <div class="event-card-header">
          ${renderContractControl(event, data)}
          <h3 title="${escapeHtml(title)}">${escapeHtml(title)}</h3>
        </div>
        <div class="event-quick-badges">
          ${sourceBadge(data)}
          <span class="quick-badge rug-badge">▦ ${escapeHtml(rugSummary(data))}</span>
          ${scheduleBadge(data)}
        </div>
        ${addressCapsule(data, event)}
        ${comment ? `<div class="event-comment"><span aria-hidden="true">◯</span><p>${escapeHtml(comment)}</p><button type="button" data-toggle-comment="${id}">Ещё</button></div>` : ''}
      </div>
      <div class="event-actions">
        <div class="action-row status-row">${statusButtons(event.id, data.requestStatus)}</div>
        <div class="action-row manage-row">
          ${data.phone ? `<a class="mini-button call-button primary-card-action" href="${phoneLink(data.phone)}">☎ Позвонить</a>` : '<button type="button" class="mini-button primary-card-action" disabled>Телефон не указан</button>'}
          <button type="button" class="mini-button open-button secondary-card-action" data-open-event="${id}">Открыть</button>
          <details class="card-menu">
            <summary class="mini-button menu-button" aria-label="Дополнительные действия">⋮</summary>
            <div class="card-menu-popover">
              <button type="button" data-edit-event="${id}">Редактировать заявку</button>
              <button type="button" class="danger-menu-item" data-delete-event="${id}">Удалить заявку</button>
            </div>
          </details>
        </div>
      </div>
    </article>`;
}'''

app = replace_between(app, 'function renderEventCard(event) {', 'function displayAddress', card_code)

address_code = r'''function addressCapsule(data, event) {
  const address = displayAddress(data, event);
  if (!address) return '<div class="address-block address-empty">Адрес не указан</div>';
  return `<a class="address-block" target="_blank" rel="noopener" href="${yandexMapLinkForData(data, event)}" title="Открыть в Яндекс Картах">
    <span class="address-icon" aria-hidden="true">⌖</span>
    <span class="address-text">${escapeHtml(address)}</span>
    <span class="address-arrow" aria-hidden="true">›</span>
  </a>`;
}'''
app = replace_between(app, 'function addressCapsule(data, event) {', 'function statusButtons', address_code)

bind_code = r'''function bindEventActions(root) {
  qsa('[data-open-event]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    openEventDetails(button.dataset.openEvent);
  }));
  qsa('[data-edit-event]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    button.closest('details')?.removeAttribute('open');
    openEvent(button.dataset.editEvent);
  }));
  qsa('[data-delete-event]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    button.closest('details')?.removeAttribute('open');
    deleteEvent(button.dataset.deleteEvent);
  }));
  qsa('[data-status-event]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    updateEventStatus(button.dataset.statusEvent, button.dataset.status);
  }));
  qsa('[data-contract-toggle]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const editor = qsa('[data-contract-editor]', root).find(item => item.dataset.contractEditor === button.dataset.contractToggle);
    if (!editor) return;
    editor.classList.toggle('hidden');
    if (!editor.classList.contains('hidden')) {
      const input = qs('[data-contract-input]', editor);
      input?.focus();
      input?.select();
    }
  }));
  qsa('[data-contract-input]', root).forEach(input => {
    input.addEventListener('click', event => event.stopPropagation());
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      updateEventContract(input.dataset.contractInput, input.value || '');
    });
  });
  qsa('[data-contract-save]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const input = qsa('[data-contract-input]', root).find(item => item.dataset.contractInput === button.dataset.contractSave);
    updateEventContract(button.dataset.contractSave, input?.value || '');
  }));
  qsa('[data-contract-cancel]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const editor = qsa('[data-contract-editor]', root).find(item => item.dataset.contractEditor === button.dataset.contractCancel);
    editor?.classList.add('hidden');
  }));
  qsa('[data-toggle-comment]', root).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const block = button.closest('.event-comment');
    const expanded = block?.classList.toggle('expanded');
    button.textContent = expanded ? 'Свернуть' : 'Ещё';
  }));
}

function renderDetailValue(label, value, options = {}) {
  const content = value || '—';
  return `<div class="detail-value${options.wide ? ' wide' : ''}"><span>${escapeHtml(label)}</span><strong>${options.html ? content : escapeHtml(content)}</strong></div>`;
}

function renderRugDetails(data = {}) {
  const rugs = eventRugs(data);
  if (!rugs.length) return '<div class="details-empty">Информация о коврах не указана.</div>';
  return rugs.map((rug, index) => {
    const hasSize = Number(rug.length) > 0 && Number(rug.width) > 0;
    const area = hasSize ? Number(rug.length) * Number(rug.width) : 0;
    const size = hasSize ? `${rug.length} × ${rug.width} м · ${formatAreaValue(area)} м²` : 'Размер не указан';
    const issues = Array.isArray(rug.issues) && rug.issues.length ? rug.issues.join(', ') : 'Не указаны';
    const services = Array.isArray(rug.services) && rug.services.length ? rug.services.join(', ') : 'Не указаны';
    return `<article class="details-rug-card">
      <div class="details-rug-title"><strong>Ковёр ${index + 1}</strong><span>${escapeHtml(size)}</span></div>
      <div class="details-rug-grid">
        ${renderDetailValue('Материал', rug.material || 'Не указан')}
        ${renderDetailValue('Ворс', rug.pile || 'Не указан')}
        ${renderDetailValue('Загрязнения', issues, { wide: true })}
        ${renderDetailValue('Дополнительные услуги', services, { wide: true })}
      </div>
    </article>`;
  }).join('');
}

function renderEventDetailsHtml(event) {
  const data = eventMeta(event);
  const status = statusInfo(data.requestStatus, data.visitType);
  const address = displayAddress(data, event);
  const phoneHtml = data.phone ? `<a href="${phoneLink(data.phone)}">${escapeHtml(data.phone)}</a>` : '—';
  const addressHtml = address ? `<a target="_blank" rel="noopener" href="${yandexMapLinkForData(data, event)}">${escapeHtml(address)} <span aria-hidden="true">›</span></a>` : '—';
  const comment = eventCommentText(data);
  const source = data.orderSource || 'Не указан';
  const contract = data.contractNumber ? `№ ${data.contractNumber}` : 'Не указан';
  const visitDate = eventDateKey(event);
  return `<div class="details-header">
      <div>
        <p class="eyebrow">Просмотр заявки</p>
        <h2>${escapeHtml(data.customerName || event.summary || 'Заявка')}</h2>
        <div class="details-header-badges"><span class="detail-status status-${status.className}">${escapeHtml(status.label)}</span><span>${escapeHtml(rugSummary(data))}</span></div>
      </div>
      <button type="button" class="details-close" data-details-close aria-label="Закрыть">×</button>
    </div>
    <section class="details-section">
      <h3>Клиент</h3>
      <div class="details-grid">
        ${renderDetailValue('Имя', data.customerName || '—')}
        ${renderDetailValue('Телефон', phoneHtml, { html: true })}
        ${renderDetailValue('Договор', contract)}
        ${renderDetailValue('Источник', source)}
        ${renderDetailValue('Клиент', data.regularCustomer ? 'Постоянный' : 'Новый')}
      </div>
    </section>
    <section class="details-section">
      <h3>Визит</h3>
      <div class="details-grid">
        ${renderDetailValue('Тип', data.visitType === 'delivery' ? 'Доставка' : 'Забор')}
        ${renderDetailValue('Дата', formatDateLong(visitDate))}
        ${renderDetailValue('Время', `${formatTime(event.start?.dateTime || event.start)}–${formatTime(event.end?.dateTime || event.end)}`)}
        ${renderDetailValue('Статус', status.label)}
        ${renderDetailValue('Напоминание', data.callAhead ? `Позвонить ${formatCallAhead(getCallAheadMinutes(data))}` : 'Нет')}
      </div>
    </section>
    <section class="details-section">
      <h3>Адрес</h3>
      <div class="details-address">${addressHtml}</div>
      <div class="details-grid compact-details-grid">
        ${renderDetailValue('Населённый пункт', data.settlement || '—')}
        ${renderDetailValue('Район', data.district || '—')}
        ${renderDetailValue('Подъезд', data.entrance || '—')}
        ${renderDetailValue('Этаж', data.floor || '—')}
      </div>
    </section>
    <section class="details-section">
      <div class="details-section-heading"><h3>Ковры</h3><span>${escapeHtml(rugSummary(data))}</span></div>
      <div class="details-rug-list">${renderRugDetails(data)}</div>
    </section>
    <section class="details-section">
      <h3>Стоимость и договорённости</h3>
      <div class="details-grid">
        ${renderDetailValue('Стоимость', data.estimatedPrice ? formatMoney(data.estimatedPrice) : 'Не указана')}
        ${renderDetailValue('Скидка', `${Number(data.discount || 0)}%`)}
      </div>
      ${comment ? `<div class="details-comment"><span>Комментарий</span><p>${escapeHtml(comment)}</p></div>` : ''}
    </section>
    <div class="details-actions">
      ${data.phone ? `<a class="button details-call" href="${phoneLink(data.phone)}">☎ Позвонить</a>` : ''}
      <button type="button" class="button button-primary" data-details-edit="${escapeHtml(event.id)}">Редактировать заявку</button>
    </div>`;
}

function ensureEventDetailsDialog() {
  let dialog = qs('#eventDetailsDialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'eventDetailsDialog';
  dialog.className = 'event-details-dialog';
  dialog.innerHTML = '<div id="eventDetailsContent" class="event-details-content"></div>';
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeEventDetails();
  });
  document.body.appendChild(dialog);
  return dialog;
}

function closeEventDetails() {
  const dialog = qs('#eventDetailsDialog');
  if (!dialog) return;
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else dialog.removeAttribute('open');
}

function openEventDetails(id) {
  const event = getAllEvents().find(item => item.id === id);
  if (!event) return showToast('Заявка не найдена.', 'error');
  const dialog = ensureEventDetailsDialog();
  qs('#eventDetailsContent', dialog).innerHTML = renderEventDetailsHtml(event);
  qs('[data-details-close]', dialog)?.addEventListener('click', closeEventDetails);
  qs('[data-details-edit]', dialog)?.addEventListener('click', buttonEvent => {
    buttonEvent.preventDefault();
    const eventId = buttonEvent.currentTarget.dataset.detailsEdit;
    closeEventDetails();
    openEvent(eventId);
  });
  if (typeof dialog.showModal === 'function') {
    if (dialog.open) dialog.close();
    dialog.showModal();
  } else dialog.setAttribute('open', '');
}'''

app = replace_between(app, 'function bindEventActions(root) {', 'function openEvent(id) {', bind_code)
app = app.replace('function openEvent(id) {\n  const event =', 'function openEvent(id) {\n  closeEventDetails();\n  const event =', 1)
app = app.replace(
    "async function deleteEvent(id) {\n  if (!confirm('Удалить эту заявку?')) return;",
    "async function deleteEvent(id) {\n  const targetEvent = getAllEvents().find(item => item.id === id);\n  const targetName = targetEvent ? (eventMeta(targetEvent).customerName || 'эту заявку') : 'эту заявку';\n  if (!confirm(`Удалить заявку ${targetName}?`)) return;",
    1,
)
app_path.write_text(app, encoding='utf-8')

styles_path = Path('styles.css')
styles = styles_path.read_text(encoding='utf-8')
marker = '/* PMK request card redesign v1 */'
if marker not in styles:
    styles += r'''

/* PMK request card redesign v1 */
.event-list { gap: 16px; }
.event-card {
  grid-template-columns: 118px minmax(0, 1fr);
  grid-template-areas: "time main" "actions actions";
  gap: 0;
  align-items: stretch;
  padding: 0;
  overflow: visible;
  border: 1px solid var(--line);
  border-left-width: 6px;
  border-radius: 22px;
  background: var(--surface) !important;
  box-shadow: 0 10px 28px rgba(20, 30, 45, .11);
}
.event-time {
  grid-area: time;
  padding: 20px 16px;
  border-right: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(34,150,211,.06), rgba(255,255,255,0));
  border-radius: 16px 0 0 16px;
}
.event-time strong { margin-top: 19px; font-size: 19px; line-height: 1.2; }
.event-time .event-date { margin: 0; color: var(--text); font-size: 14px; }
.event-weekday { display: block; margin-top: 4px; color: var(--muted); font-size: 11px; }
.event-main { grid-area: main; min-width: 0; padding: 18px 20px 14px; }
.event-card-header { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.event-card-header h3 {
  min-width: 0;
  margin: 2px 0 0;
  font-size: 20px;
  line-height: 1.18;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.contract-control { position: relative; flex: 0 0 auto; }
.contract-chip {
  border: 0;
  border-radius: 999px;
  padding: 7px 12px;
  color: #171717;
  background: var(--accent);
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.55);
}
.contract-chip.empty { background: #ffd85e; }
.contract-editor {
  position: absolute;
  z-index: 40;
  top: calc(100% + 8px);
  left: 0;
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto auto;
  gap: 6px;
  width: min(370px, calc(100vw - 50px));
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 16px 45px rgba(0,0,0,.18);
}
.contract-editor input { min-width: 0; border: 1px solid var(--line); border-radius: 9px; padding: 9px 10px; color: var(--text); background: var(--surface); }
.contract-save { color: #171717; background: var(--accent); border-color: transparent; }
.event-quick-badges { display: flex; flex-wrap: wrap; gap: 7px; margin: 11px 0 13px; }
.quick-badge { display: inline-flex; align-items: center; min-height: 30px; padding: 6px 9px; border-radius: 10px; color: #3e3e3a; background: #f2f2ee; font-size: 11px; font-weight: 800; }
.max-badge { color: #342365; background: #eee9ff; }
.rug-badge { color: #126b59; background: #e9f8f3; }
.schedule-badge { color: #7b5700; background: #fff4cf; }
.address-block {
  display: grid;
  grid-template-columns: auto minmax(0,1fr) auto;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 14px 15px;
  border: 1px solid #cbdde7;
  border-radius: 22px;
  color: #0b5f86;
  background: #eaf7fd;
  font-weight: 850;
  line-height: 1.38;
  text-decoration: none;
}
.address-block:hover { border-color: #2296d3; background: #dff3fc; }
.address-icon { font-size: 21px; }
.address-arrow { font-size: 28px; font-weight: 400; }
.address-empty { display: block; color: var(--muted); background: #f5f5f2; border-color: var(--line); }
.event-comment {
  display: grid;
  grid-template-columns: auto minmax(0,1fr) auto;
  align-items: start;
  gap: 9px;
  margin-top: 11px;
  padding: 11px 13px;
  border-radius: 14px;
  color: #54544f;
  background: #f3f3ef;
}
.event-comment p { margin: 0; white-space: pre-line; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.event-comment.expanded p { display: block; overflow: visible; }
.event-comment button { align-self: end; border: 0; padding: 0; color: #0b5f86; background: transparent; font-size: 11px; font-weight: 800; }
.event-actions { grid-area: actions; min-width: 0; padding: 0 18px 18px; }
.event-actions .status-row { gap: 8px; }
.event-actions .manage-row { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(100px, .75fr) auto; gap: 9px; margin-top: 2px; }
.primary-card-action, .secondary-card-action, .menu-button { min-height: 44px; display: grid; place-items: center; text-decoration: none; font-size: 13px; }
.primary-card-action:disabled { opacity: .55; }
.secondary-card-action { background: var(--surface); }
.card-menu { position: relative; }
.card-menu summary { list-style: none; }
.card-menu summary::-webkit-details-marker { display: none; }
.menu-button { width: 48px; font-size: 25px; line-height: 1; }
.card-menu-popover {
  position: absolute;
  z-index: 35;
  right: 0;
  bottom: calc(100% + 8px);
  width: 220px;
  padding: 7px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 16px 40px rgba(0,0,0,.18);
}
.card-menu-popover button { width: 100%; border: 0; border-radius: 9px; padding: 11px 12px; color: var(--text); background: transparent; text-align: left; font-weight: 750; }
.card-menu-popover button:hover { background: #f2f2ee; }
.card-menu-popover .danger-menu-item { color: var(--danger); }

.event-details-dialog {
  width: min(760px, calc(100vw - 28px));
  max-height: min(90vh, 900px);
  padding: 0;
  border: 0;
  border-radius: 24px;
  color: var(--text);
  background: var(--surface);
  box-shadow: 0 30px 90px rgba(0,0,0,.30);
}
.event-details-dialog::backdrop { background: rgba(12,12,12,.62); backdrop-filter: blur(4px); }
.event-details-content { padding: 24px; overflow: auto; max-height: min(90vh, 900px); }
.details-header { position: sticky; top: -24px; z-index: 4; display: flex; justify-content: space-between; gap: 18px; margin: -24px -24px 18px; padding: 24px; background: color-mix(in srgb, var(--surface) 94%, transparent); backdrop-filter: blur(14px); border-bottom: 1px solid var(--line); }
.details-header h2 { margin: 4px 0 9px; font-size: clamp(25px, 5vw, 36px); line-height: 1.1; }
.details-header-badges { display: flex; flex-wrap: wrap; gap: 7px; }
.details-header-badges > span { padding: 6px 9px; border-radius: 999px; color: var(--muted); background: #f1f1ed; font-size: 11px; font-weight: 800; }
.details-header-badges .detail-status { color: #171717; background: #fff2bd; }
.details-close { flex: 0 0 42px; width: 42px; height: 42px; border: 1px solid var(--line); border-radius: 50%; color: var(--text); background: var(--surface); font-size: 27px; }
.details-section { margin-top: 15px; padding: 18px; border: 1px solid var(--line); border-radius: 18px; background: #fafaf8; }
.details-section h3 { margin: 0 0 14px; font-size: 18px; }
.details-section-heading { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.details-section-heading > span { color: var(--muted); font-size: 12px; font-weight: 750; }
.details-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 11px; }
.detail-value { min-width: 0; padding: 11px 12px; border-radius: 12px; background: var(--surface); }
.detail-value.wide { grid-column: 1 / -1; }
.detail-value span, .detail-value strong { display: block; }
.detail-value span { color: var(--muted); font-size: 11px; }
.detail-value strong { margin-top: 4px; overflow-wrap: anywhere; }
.detail-value a, .details-address a { color: #0b5f86; text-decoration: none; }
.details-address { margin-bottom: 12px; padding: 14px 15px; border-radius: 15px; color: #0b5f86; background: #eaf7fd; font-weight: 850; line-height: 1.4; }
.details-address a { display: flex; justify-content: space-between; gap: 10px; }
.details-rug-list { display: grid; gap: 11px; }
.details-rug-card { padding: 14px; border: 1px solid var(--line); border-radius: 15px; background: var(--surface); }
.details-rug-title { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 11px; }
.details-rug-title span { color: var(--muted); font-size: 12px; }
.details-rug-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
.details-empty { color: var(--muted); }
.details-comment { margin-top: 12px; padding: 14px; border-radius: 14px; background: #f0f0ec; }
.details-comment span { color: var(--muted); font-size: 11px; font-weight: 750; }
.details-comment p { margin: 6px 0 0; white-space: pre-line; line-height: 1.5; }
.details-actions { position: sticky; bottom: -24px; display: flex; justify-content: flex-end; gap: 10px; margin: 18px -24px -24px; padding: 16px 24px calc(16px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: color-mix(in srgb, var(--surface) 94%, transparent); backdrop-filter: blur(14px); }
.details-call { color: #fff; background: #18a957; text-decoration: none; }

:root[data-theme="dark"] .quick-badge,
:root[data-theme="dark"] .event-comment,
:root[data-theme="dark"] .details-section,
:root[data-theme="dark"] .details-header-badges > span,
:root[data-theme="dark"] .details-comment { background: #171b1f; color: var(--muted); }
:root[data-theme="dark"] .address-block,
:root[data-theme="dark"] .details-address { color: #9bdcff; border-color: rgba(0,163,255,.35); background: rgba(0,107,179,.22); }
:root[data-theme="dark"] .contract-editor,
:root[data-theme="dark"] .card-menu-popover { background: #111417; }
:root[data-theme="dark"] .card-menu-popover button:hover { background: #20252a; }

@media (max-width: 760px) {
  .event-card { grid-template-columns: 86px minmax(0,1fr); border-radius: 20px; }
  .event-time { padding: 17px 11px; }
  .event-time strong { margin-top: 17px; font-size: 17px; }
  .event-time .event-date { font-size: 12px; }
  .event-weekday { font-size: 9px; }
  .event-main { padding: 15px 13px 12px; }
  .event-card-header { flex-wrap: wrap; gap: 8px; }
  .event-card-header h3 { flex: 1 1 130px; font-size: 19px; }
  .contract-chip { padding: 6px 10px; font-size: 12px; }
  .event-quick-badges { margin: 9px 0 11px; gap: 5px; }
  .quick-badge { min-height: 27px; padding: 5px 7px; font-size: 10px; }
  .address-block { padding: 12px; border-radius: 19px; font-size: 13px; }
  .event-comment { grid-template-columns: auto minmax(0,1fr); }
  .event-comment button { grid-column: 2; justify-self: start; }
  .event-actions { padding: 0 12px 14px; }
  .event-actions .status-row { gap: 5px; }
  .status-action { min-height: 46px; padding: 6px 3px; font-size: 9px; }
  .event-actions .manage-row { grid-template-columns: minmax(0,1.2fr) minmax(0,.9fr) 48px; gap: 7px; }
  .primary-card-action, .secondary-card-action { padding: 8px 7px; font-size: 12px; }
  .event-details-dialog { width: 100vw; max-width: none; max-height: 100dvh; height: 100dvh; margin: 0; border-radius: 0; }
  .event-details-content { max-height: 100dvh; padding: 18px 14px; }
  .details-header { top: -18px; margin: -18px -14px 15px; padding: 18px 14px; }
  .details-section { padding: 14px; }
  .details-grid, .details-rug-grid { grid-template-columns: 1fr; }
  .detail-value.wide { grid-column: auto; }
  .compact-details-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .details-actions { bottom: -18px; margin: 16px -14px -18px; padding: 12px 14px calc(12px + env(safe-area-inset-bottom)); }
  .details-actions .button { flex: 1; padding-left: 10px; padding-right: 10px; }
}
'''
styles_path.write_text(styles, encoding='utf-8')

sw_path = Path('sw.js')
sw_path.write_text("""const CACHE = 'pmk-calendar-v23';
const ASSETS = ['./', './index.html', './reset.html', './styles.css', './app.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  const requestUrl = new URL(event.request.url);
  const networkFirst = event.request.mode === 'navigate' || /\\.(?:js|css|html)$/.test(requestUrl.pathname);
  if (networkFirst) {
    event.respondWith(fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, clone));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const clone = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, clone));
    return response;
  })));
});
""", encoding='utf-8')
