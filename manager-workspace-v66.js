'use strict';

(() => {
  if (window.PMK_MANAGER_WORKSPACE_V66) return;
  window.PMK_MANAGER_WORKSPACE_V66 = true;

  const DRAFTS_KEY = 'pmk-manual-drafts-v66';
  const AUTO_DRAFT_KEY = 'pmk-form-autodraft-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clean = value => String(value || '').trim();
  const money = value => new Intl.NumberFormat('ru-RU').format(Math.round(Number(value || 0))) + ' ₽';

  function readDrafts() {
    try {
      const value = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function writeDrafts(items) {
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(items.slice(0, 100))); } catch {}
    renderDrafts();
  }

  function autoDraft() {
    try {
      const value = JSON.parse(localStorage.getItem(AUTO_DRAFT_KEY) || 'null');
      return value?.data ? { id: 'auto', savedAt: Number(value.savedAt || 0), data: value.data, automatic: true } : null;
    } catch { return null; }
  }

  function draftTitle(item) {
    const data = item.data || {};
    const name = data.customerName || 'Клиент не указан';
    const address = [data.street, data.houseNumber && `д. ${data.houseNumber}`].filter(Boolean).join(', ');
    return { name, address: address || data.district || 'Адрес не указан' };
  }

  function formatSavedAt(value) {
    if (!value) return 'Время не указано';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value)).replace(',', ' ·');
  }

  function saveManualDraft() {
    const data = getFormData();
    const form = $('#requestForm');
    const activeId = form?.dataset.activeDraftId || data.pmkId || makeId();
    const item = { id: activeId, savedAt: Date.now(), data: { ...data, eventId: '', pmkId: data.pmkId || makeId() } };
    const items = readDrafts().filter(entry => entry.id !== activeId);
    items.unshift(item);
    writeDrafts(items);
    if (form) form.dataset.activeDraftId = activeId;
    try { localStorage.removeItem(AUTO_DRAFT_KEY); } catch {}
    showToast('Черновик сохранён в разделе «Черновики».', 'success');
    updateDraftCount();
  }

  function restoreDraft(item) {
    if (!item?.data) return;
    fillForm({ ...item.data, eventId: '', pmkId: item.data.pmkId || makeId() });
    $('#eventId').value = '';
    $('#deleteEventBtn')?.classList.add('hidden');
    $('#formTitle').textContent = item.automatic ? 'Новая заявка — автосохранение' : 'Новая заявка — черновик';
    $('#requestForm').dataset.activeDraftId = item.automatic ? '' : item.id;
    setView('form');
    showToast('Черновик открыт. Можно продолжить заполнение.', 'success');
  }

  function deleteDraft(id) {
    if (!confirm('Удалить этот черновик?')) return;
    if (id === 'auto') {
      try { localStorage.removeItem(AUTO_DRAFT_KEY); } catch {}
    } else writeDrafts(readDrafts().filter(item => item.id !== id));
    renderDrafts();
    updateDraftCount();
  }

  function allDrafts() {
    const items = readDrafts();
    const automatic = autoDraft();
    if (automatic) items.push(automatic);
    return items.sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
  }

  function renderDrafts() {
    const container = $('#pmkDraftList');
    if (!container) return;
    const items = allDrafts();
    container.innerHTML = items.length ? items.map(item => {
      const info = draftTitle(item);
      const data = item.data || {};
      return `<article class="pmk-draft-card">
        <div class="pmk-draft-main">
          <div class="pmk-draft-label">${item.automatic ? 'Автосохранение' : 'Черновик'}</div>
          <strong>${escapeHtml(info.name)}</strong>
          <span>${escapeHtml(info.address)}</span>
          <small>${escapeHtml(formatSavedAt(item.savedAt))}${data.estimatedPrice ? ` · ${escapeHtml(money(data.estimatedPrice))}` : ''}</small>
        </div>
        <div class="pmk-draft-actions">
          <button type="button" class="button button-primary" data-draft-open="${escapeHtml(item.id)}">Открыть</button>
          <button type="button" class="button button-danger" data-draft-delete="${escapeHtml(item.id)}">Удалить</button>
        </div>
      </article>`;
    }).join('') : '<div class="empty-state"><strong>Черновиков нет.</strong><br>Нажмите «Черновик» в новой заявке, чтобы сохранить её здесь.</div>';

    $$('[data-draft-open]', container).forEach(button => button.addEventListener('click', () => restoreDraft(items.find(item => item.id === button.dataset.draftOpen))));
    $$('[data-draft-delete]', container).forEach(button => button.addEventListener('click', () => deleteDraft(button.dataset.draftDelete)));
  }

  function updateDraftCount() {
    const count = allDrafts().length;
    const badge = $('#draftsCount');
    if (badge) badge.textContent = String(count);
  }

  function createDraftView() {
    if ($('#view-drafts')) return;
    const main = $('.main-content');
    if (!main) return;
    const section = document.createElement('section');
    section.id = 'view-drafts';
    section.className = 'view';
    section.innerHTML = `
      <div class="page-heading compact">
        <div><p class="eyebrow">Незавершённые заявки</p><h1>Черновики</h1><p>Сохранённые заявки можно открыть, продолжить или удалить.</p></div>
        <button type="button" class="button button-primary" data-workspace-action="new">＋ Новая заявка</button>
      </div>
      <div id="pmkDraftList" class="pmk-draft-list"></div>`;
    main.appendChild(section);

    const reminder = $('.nav-item.nav-reminder');
    const button = document.createElement('button');
    button.className = 'nav-item nav-drafts';
    button.dataset.view = 'drafts';
    button.innerHTML = '<span>Черновики</span><b id="draftsCount">0</b>';
    reminder?.insertAdjacentElement('afterend', button);
    button.addEventListener('click', () => { setView('drafts'); renderDrafts(); });
  }

  function clearNewRequest() {
    if ($('#eventId')?.value) return showToast('Это сохранённая заявка. Используйте кнопку удаления события.', 'error');
    if (!confirm('Удалить незавершённую заявку и очистить все поля?')) return;
    const activeId = $('#requestForm')?.dataset.activeDraftId;
    if (activeId) writeDrafts(readDrafts().filter(item => item.id !== activeId));
    try { localStorage.removeItem(AUTO_DRAFT_KEY); } catch {}
    $('#requestForm').dataset.activeDraftId = '';
    resetForm();
    showToast('Незавершённая заявка удалена.', 'success');
    updateDraftCount();
  }

  function wireDraftButtons() {
    const original = $('#saveDraftBtn');
    if (original && original.dataset.manualDraftV66 !== '1') {
      const button = original.cloneNode(true);
      button.dataset.manualDraftV66 = '1';
      button.textContent = 'Черновик';
      original.replaceWith(button);
      button.addEventListener('click', saveManualDraft);
    }

    const sticky = $('#v50StickyActions');
    if (sticky) {
      const oldDraft = $('.v50-draft', sticky);
      if (oldDraft && oldDraft.dataset.manualDraftV66 !== '1') {
        const next = oldDraft.cloneNode(true);
        next.dataset.manualDraftV66 = '1';
        next.textContent = 'Черновик';
        oldDraft.replaceWith(next);
        next.addEventListener('click', saveManualDraft);
      }
      if (!$('.pmk-clear-request', sticky)) {
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'pmk-clear-request';
        clear.textContent = 'Удалить';
        clear.addEventListener('click', clearNewRequest);
        sticky.insertBefore(clear, $('.v50-submit', sticky) || null);
      }
    }

    const actions = $('.form-actions');
    if (actions && !$('.pmk-clear-request-inline', actions)) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'button button-danger pmk-clear-request-inline';
      clear.textContent = 'Удалить незавершённую';
      clear.addEventListener('click', clearNewRequest);
      actions.insertBefore(clear, $('#saveDraftBtn'));
    }
  }

  function ensureForm(reset = false) {
    if (state.currentView !== 'form') {
      if (reset) resetForm();
      setView('form');
    }
    return $('#requestForm');
  }

  function openEditor(type) {
    const target = $(`#v50Summary [data-v50-open="${type}"]`);
    target?.click();
  }

  function showNextStep(message, actions = []) {
    const panel = $('#pmkLaunchpadNext');
    if (!panel) return;
    panel.innerHTML = `<strong>${escapeHtml(message)}</strong><div>${actions.map(action => `<button type="button" data-workspace-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>`).join('')}</div>`;
    panel.classList.remove('hidden');
  }

  function runWorkspaceAction(action) {
    if (action === 'new') {
      resetForm();
      setView('form');
      $('#customerName')?.focus();
      return;
    }
    if (action === 'paste') {
      ensureForm(state.currentView !== 'form');
      requestAnimationFrame(() => {
        $('#smartPasteInput')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('#smartPasteInput')?.focus();
      });
      return;
    }
    if (action === 'client') {
      ensureForm(state.currentView !== 'form');
      requestAnimationFrame(() => {
        openEditor('client');
        setTimeout(() => $('#clientQuickSearch')?.focus(), 120);
      });
      return;
    }
    if (action === 'slots') return openSlotExplorer();
    if (action === 'calculate') return openCalculator();
    if (action === 'drafts') { setView('drafts'); renderDrafts(); return; }
  }

  function createLaunchpad() {
    if ($('#pmkManagerLaunchpad')) return;
    const main = $('.main-content');
    if (!main) return;
    const panel = document.createElement('section');
    panel.id = 'pmkManagerLaunchpad';
    panel.className = 'pmk-manager-launchpad';
    panel.innerHTML = `
      <div class="pmk-launchpad-title"><div><span>Быстрый старт</span><strong>Что нужно сделать сейчас?</strong></div></div>
      <nav class="pmk-launchpad-actions" aria-label="Быстрые действия менеджера">
        <button type="button" data-workspace-action="paste"><b>Вставить</b><small>Разобрать текст клиента</small></button>
        <button type="button" data-workspace-action="client"><b>Найти клиента</b><small>История и прошлые заказы</small></button>
        <button type="button" data-workspace-action="slots"><b>Выбрать окно</b><small>Районы, время и загрузка</small></button>
        <button type="button" data-workspace-action="calculate"><b>Рассчитать</b><small>Калькулятор без заявки</small></button>
        <button type="button" data-workspace-action="drafts"><b>Черновики</b><small>Продолжить заполнение</small></button>
      </nav>
      <div id="pmkLaunchpadNext" class="pmk-launchpad-next hidden"></div>`;
    main.insertBefore(panel, main.querySelector('.view'));
  }

  function slotEvents(dateKey, start, end, district) {
    return getAllEvents().filter(event => {
      const data = eventMeta(event);
      const range = comparableEventRange(event);
      return eventDateKey(event) === dateKey
        && clean(data.district).toLowerCase() === clean(district).toLowerCase()
        && range.start === `${dateKey}T${start}`
        && range.end === `${dateKey}T${end}`;
    });
  }

  function allSlots(days = 21) {
    const result = [];
    const today = businessTodayKey();
    for (let offset = 0; offset < days; offset += 1) {
      const dateKey = addDaysToKey(today, offset);
      const weekday = dateKeyForDisplay(dateKey).getUTCDay();
      (PICKUP_SCHEDULE[weekday] || []).forEach(slot => {
        const [start, end, district, note] = slot;
        const events = slotEvents(dateKey, start, end, district);
        result.push({ dateKey, start, end, district, note: note || '', events });
      });
    }
    return result;
  }

  function dateLabel(dateKey) {
    return dateKeyForDisplay(dateKey).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  }

  function createSlotDialog() {
    let dialog = $('#pmkSlotExplorer');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'pmkSlotExplorer';
    dialog.className = 'pmk-workspace-dialog pmk-slot-dialog';
    dialog.innerHTML = `
      <div class="pmk-dialog-shell">
        <header><div><span>Планирование маршрута</span><h2>Выберите окно для клиента</h2><p>Показаны районы, время и уже поставленные заявки.</p></div><button type="button" data-dialog-close aria-label="Закрыть">×</button></header>
        <div class="pmk-slot-filters"><select id="pmkSlotDistrict"><option value="">Все районы</option></select><label><input type="checkbox" id="pmkOnlyFreeSlots"> Только свободные</label><button type="button" id="pmkRefreshSlots">Обновить загрузку</button></div>
        <div id="pmkSlotResults" class="pmk-slot-results"></div>
      </div>`;
    document.body.appendChild(dialog);
    $('[data-dialog-close]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    $('#pmkSlotDistrict', dialog).addEventListener('change', renderSlotExplorer);
    $('#pmkOnlyFreeSlots', dialog).addEventListener('change', renderSlotExplorer);
    $('#pmkRefreshSlots', dialog).addEventListener('click', renderSlotExplorer);
    return dialog;
  }

  function renderSlotExplorer() {
    const dialog = createSlotDialog();
    const select = $('#pmkSlotDistrict', dialog);
    if (!select.dataset.ready) {
      const districts = [...new Set(Object.values(PICKUP_SCHEDULE).flat().map(slot => slot[2]))];
      select.insertAdjacentHTML('beforeend', districts.map(value => `<option>${escapeHtml(value)}</option>`).join(''));
      select.dataset.ready = '1';
    }
    const district = select.value;
    const onlyFree = $('#pmkOnlyFreeSlots', dialog).checked;
    const items = allSlots().filter(item => (!district || item.district === district) && (!onlyFree || !item.events.length));
    const container = $('#pmkSlotResults', dialog);
    container.innerHTML = items.length ? items.map((item, index) => {
      const clients = item.events.map(event => eventMeta(event).customerName || event.summary || 'Клиент').slice(0, 4);
      return `<article class="pmk-slot-option ${item.events.length ? 'loaded' : 'free'}">
        <div><time>${escapeHtml(dateLabel(item.dateKey))}</time><strong>${escapeHtml(item.district)}</strong><b>${escapeHtml(item.start)}–${escapeHtml(item.end)}</b>${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}</div>
        <div class="pmk-slot-load"><span>${item.events.length ? `${item.events.length} ${pluralPoints(item.events.length)} в окне` : 'Окно свободно'}</span>${clients.length ? `<small>${clients.map(escapeHtml).join(', ')}</small>` : '<small>Можно поставить первого клиента</small>'}</div>
        <button type="button" data-slot-index="${index}">Выбрать</button>
      </article>`;
    }).join('') : '<div class="empty-state"><strong>Подходящих окон нет.</strong><br>Измените фильтр или выберите другой район.</div>';
    $$('[data-slot-index]', container).forEach(button => button.addEventListener('click', () => applySelectedSlot(items[Number(button.dataset.slotIndex)])));
  }

  function applySelectedSlot(item) {
    if (!item) return;
    ensureForm(state.currentView !== 'form');
    $('#district').value = item.district;
    $('#visitDate').value = item.dateKey;
    updateScheduleSlotOptions(false);
    $('#startTime').value = item.start;
    $('#endTime').value = item.end;
    $('#timeNote').value = `Ждёт по расписанию: ${item.start}-${item.end}${item.note ? ` (${item.note})` : ''}`;
    managerClearException?.();
    renderManagerSlotPlanner?.();
    schedulePreviewUpdate();
    $('#pmkSlotExplorer')?.close();
    showNextStep(`Выбрано: ${dateLabel(item.dateKey)}, ${item.district}, ${item.start}–${item.end}`, [
      { id: 'paste', label: 'Вставить данные клиента' }, { id: 'client', label: 'Найти клиента' }, { id: 'calculate', label: 'Рассчитать стоимость' },
    ]);
    showToast('Окно перенесено в заявку.', 'success');
  }

  function openSlotExplorer() {
    const dialog = createSlotDialog();
    renderSlotExplorer();
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }

  function calculatorRow(data = {}) {
    const services = new Set(data.services || []);
    return `<article class="pmk-calc-rug">
      <div class="pmk-calc-rug-head"><strong>Ковёр</strong><button type="button" data-calc-remove>Удалить</button></div>
      <div class="pmk-calc-grid">
        <label>Длина, м<input type="number" min="0" max="20" step="0.1" class="calc-length" value="${Number(data.length || 0) || ''}"></label>
        <label>Ширина, м<input type="number" min="0" max="20" step="0.1" class="calc-width" value="${Number(data.width || 0) || ''}"></label>
        <label>Материал<select class="calc-material"><option value="">Выберите</option>${['Синтетика','Шерсть','Вискоза','Шёлк','Хлопок','Безворсный'].map(value => `<option ${data.material === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label>Ворс<select class="calc-pile"><option value="">Выберите</option>${['Без ворса','До 1 см','Более 1 см'].map(value => `<option ${data.pile === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      </div>
      <div class="pmk-calc-services">${['Удаление пятен','Вычёсывание шерсти и волос','Удаление запаха мочи','Дезинфекция','Подъём ворса','Озонация','Кондиционер','Экспресс-стирка'].map(value => `<label><input type="checkbox" value="${value}" ${services.has(value) ? 'checked' : ''}><span>${value}</span></label>`).join('')}</div>
    </article>`;
  }

  function createCalculator() {
    let dialog = $('#pmkQuickCalculator');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'pmkQuickCalculator';
    dialog.className = 'pmk-workspace-dialog pmk-calculator-dialog';
    dialog.innerHTML = `
      <div class="pmk-dialog-shell">
        <header><div><span>Быстрый расчёт</span><h2>Калькулятор стоимости</h2><p>Можно просто посчитать или перенести результат в заявку.</p></div><button type="button" data-dialog-close aria-label="Закрыть">×</button></header>
        <div id="pmkCalcRugs" class="pmk-calc-rugs"></div>
        <div class="pmk-calc-controls"><button type="button" id="pmkCalcAdd">＋ Добавить ковёр</button><label>Скидка, %<input id="pmkCalcDiscount" type="number" min="0" max="100" value="0"></label></div>
        <div id="pmkCalcResult" class="pmk-calc-result"><strong>Заполните параметры ковра</strong></div>
        <div class="pmk-calc-actions"><button type="button" id="pmkCalcRun" class="button button-secondary">Рассчитать</button><button type="button" id="pmkCalcApply" class="button button-primary">Перенести в заявку</button></div>
      </div>`;
    document.body.appendChild(dialog);
    $('[data-dialog-close]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    $('#pmkCalcAdd', dialog).addEventListener('click', () => { $('#pmkCalcRugs', dialog).insertAdjacentHTML('beforeend', calculatorRow()); bindCalculatorRows(); });
    $('#pmkCalcRun', dialog).addEventListener('click', calculateQuick);
    $('#pmkCalcApply', dialog).addEventListener('click', applyQuickCalculation);
    dialog.addEventListener('input', () => calculateQuick(false));
    dialog.addEventListener('change', () => calculateQuick(false));
    return dialog;
  }

  function bindCalculatorRows() {
    const dialog = createCalculator();
    $$('[data-calc-remove]', dialog).forEach(button => {
      if (button.dataset.bound) return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        const rows = $$('.pmk-calc-rug', dialog);
        if (rows.length <= 1) return showToast('Оставьте хотя бы один ковёр.', 'error');
        button.closest('.pmk-calc-rug').remove();
        calculateQuick(false);
      });
    });
  }

  function calculatorData() {
    const dialog = createCalculator();
    return $$('.pmk-calc-rug', dialog).map(row => ({
      length: Number($('.calc-length', row).value || 0), width: Number($('.calc-width', row).value || 0),
      material: $('.calc-material', row).value, pile: $('.calc-pile', row).value,
      issues: [], services: $$('input[type="checkbox"]:checked', row).map(input => input.value),
    }));
  }

  function baseRate(rug, price) {
    if (['Вискоза','Шёлк','Хлопок'].includes(rug.material)) return price.delicate;
    if (rug.material === 'Безворсный' || rug.pile === 'Без ворса') return price.noPile;
    if (rug.pile === 'Более 1 см') return price.highPile;
    if (rug.material === 'Шерсть') return price.wool;
    if (rug.material === 'Синтетика' && rug.pile === 'До 1 см') return rug.width > price.wideThreshold ? price.syntheticWide : price.synthetic;
    return 0;
  }

  function quickTotal() {
    const price = window.PMK_PRICING_V48?.priceTable?.();
    const rugs = calculatorData();
    const errors = [];
    const lines = [];
    let subtotal = 0;
    let express = false;
    rugs.forEach((rug, index) => {
      const area = rug.length * rug.width;
      const rate = price ? baseRate(rug, price) : 0;
      if (!(rug.length > 0 && rug.width > 0)) errors.push(`Ковёр ${index + 1}: укажите размеры`);
      if (!rug.material || !rate) errors.push(`Ковёр ${index + 1}: выберите материал и ворс`);
      if (!(area > 0 && rate)) return;
      const base = Math.round(area * rate);
      subtotal += base;
      lines.push(`Ковёр ${index + 1}: ${area.toFixed(2).replace('.00','')} м² × ${rate} ₽ = ${money(base)}`);
      const addFixed = (name, amount) => { if (rug.services.includes(name)) { subtotal += amount; lines.push(`${name}: ${money(amount)}`); } };
      const addArea = (name, amount) => { if (rug.services.includes(name)) { const value = Math.round(area * amount); subtotal += value; lines.push(`${name}: ${money(value)}`); } };
      addFixed('Удаление пятен', price.stain); addArea('Вычёсывание шерсти и волос', price.hair);
      if (rug.services.includes('Удаление запаха мочи')) addFixed('Удаление запаха мочи', area <= price.odorAreaThreshold ? price.odorSmall : price.odorLarge);
      addFixed('Дезинфекция', price.disinfection); addArea('Подъём ворса', price.pileLift); addFixed('Озонация', price.ozonation); addFixed('Кондиционер', price.conditioner);
      if (rug.services.includes('Экспресс-стирка') && !express) { express = true; subtotal += price.express; lines.push(`Экспресс-стирка: ${money(price.express)}`); }
    });
    if (!price) errors.push('Прайс не загружен');
    const discount = Math.max(0, Math.min(100, Number($('#pmkCalcDiscount').value || 0)));
    const discounted = Math.round(subtotal * (100 - discount) / 100);
    const total = errors.length ? 0 : Math.max(discounted, price.minimum);
    if (discount && subtotal) lines.push(`Скидка ${discount}%: −${money(subtotal - discounted)}`);
    if (total > discounted) lines.push(`Минимальный заказ: ${money(price.minimum)}`);
    if (total) lines.push(`Итого: ${money(total)}`);
    return { rugs, errors: unique(errors), lines, total, discount };
  }

  function calculateQuick(notify = true) {
    const data = quickTotal();
    const result = $('#pmkCalcResult');
    result.className = `pmk-calc-result ${data.errors.length ? 'warning' : 'success'}`;
    result.innerHTML = data.errors.length
      ? `<strong>Нужно заполнить данные</strong><span>${data.errors.map(escapeHtml).join('<br>')}</span>`
      : `<strong>${money(data.total)}</strong><span>${data.lines.map(escapeHtml).join('<br>')}</span>`;
    if (notify) showNextStep(data.errors.length ? 'Дополните параметры ковров для расчёта.' : `Стоимость рассчитана: ${money(data.total)}`, [
      { id: 'calculate', label: 'Продолжить расчёт' }, { id: 'paste', label: 'Заполнить заявку текстом' }, { id: 'slots', label: 'Выбрать окно' },
    ]);
    return data;
  }

  function applyQuickCalculation() {
    const calculated = calculateQuick(false);
    if (calculated.errors.length) return showToast('Сначала заполните недостающие параметры.', 'error');
    ensureForm(state.currentView !== 'form');
    const current = getFormData();
    fillForm({ ...current, rugs: calculated.rugs, estimatedPrice: calculated.total, discount: calculated.discount, autoPrice: true, eventId: current.eventId, pmkId: current.pmkId });
    const toggle = $('#autoPrice');
    if (toggle) toggle.checked = true;
    window.PMK_PRICING_V48?.calculatePrice?.();
    $('#pmkQuickCalculator')?.close();
    showNextStep(`Расчёт ${money(calculated.total)} перенесён в заявку.`, [
      { id: 'paste', label: 'Добавить данные клиента' }, { id: 'client', label: 'Найти клиента' }, { id: 'slots', label: 'Выбрать окно' },
    ]);
    showToast('Расчёт перенесён в заявку.', 'success');
  }

  function openCalculator() {
    const dialog = createCalculator();
    const container = $('#pmkCalcRugs', dialog);
    const current = state.currentView === 'form' ? getFormData() : null;
    const rugs = current?.rugs?.length ? current.rugs : [{}];
    container.innerHTML = rugs.map(calculatorRow).join('');
    $('#pmkCalcDiscount').value = Number(current?.discount || 0);
    bindCalculatorRows();
    calculateQuick(false);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }

  function interceptOldQuickActions() {
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-v51-action], [data-workspace-action]');
      if (!target) return;
      const action = target.dataset.workspaceAction || target.dataset.v51Action;
      if (!['paste','client','slots','calculate','drafts','new'].includes(action)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      runWorkspaceAction(action);
    }, true);
  }

  function install() {
    createDraftView();
    createLaunchpad();
    wireDraftButtons();
    updateDraftCount();
    renderDrafts();
    return Boolean($('#pmkManagerLaunchpad') && $('#view-drafts'));
  }

  function boot() {
    interceptOldQuickActions();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      install();
      if (attempts > 200) clearInterval(timer);
    }, 100);
  }

  window.PMK_MANAGER_WORKSPACE_V66_API = { openSlotExplorer, openCalculator, renderDrafts, saveManualDraft };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();