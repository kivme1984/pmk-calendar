'use strict';

(() => {
  if (globalThis.PMK_FINAL_UI_V82_9) return;
  globalThis.PMK_FINAL_UI_V82_9 = true;
  document.documentElement.dataset.pmkCandidate = '82.9';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const SCHEDULE_KEY = 'pmk-working-schedule-v82-9';
  const currentVersion = String(globalThis.PMK_APP_VERSION || '82.8');
  let observer = null;
  let scheduled = false;
  let activeSummaryFilter = 'all';

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function selectedDayKey() {
    if (typeof state !== 'undefined' && state.selectedDayKey) return state.selectedDayKey;
    if (typeof businessTodayKey === 'function') return businessTodayKey();
    return new Date().toISOString().slice(0, 10);
  }

  function districtList(dateKey) {
    const date = typeof dateKeyForDisplay === 'function'
      ? dateKeyForDisplay(dateKey)
      : new Date(`${dateKey}T12:00:00Z`);
    const day = date.getUTCDay();
    return ({
      1: ['Автозаводский', 'Ленинский', 'Канавинский'],
      2: ['Московский', 'Сормовский'],
      3: ['Нижегородский', 'Советский', 'Приокский'],
      4: ['Автозаводский', 'Ленинский', 'Канавинский'],
      5: ['Московский', 'Сормовский'],
      6: ['Нижегородский', 'Советский', 'Приокский'],
    })[day] || [];
  }

  function eventForCard(card) {
    const id = String(card?.dataset?.eventCard || '');
    if (!id || typeof getAllEvents !== 'function') return null;
    return getAllEvents().find(event => String(event.id) === id) || null;
  }

  function removeThreeDays() {
    $('.nav-item[data-view="three-days"]')?.remove();
    if (typeof state !== 'undefined' && state.currentView === 'three-days' && typeof setView === 'function') {
      setView('week');
    }
  }

  function simplifyQuickStart() {
    const candidates = $$('h1,h2,h3,h4,p,span,strong').filter(node => /быстрый старт/i.test(node.textContent || ''));
    candidates.forEach(heading => {
      const section = heading.closest('section,article,.manager-workspace,.workspace-panel,.workspace-section') || heading.parentElement;
      if (!section || !/черновики/i.test(section.textContent || '')) return;
      section.classList.add('pmk-drafts-only-v82-9');
      $$('button,a,[role="button"]', section).forEach(item => {
        if (!/черновики/i.test(item.textContent || '')) item.setAttribute('data-pmk-hidden-quick', '1');
      });
    });

    const settings = $('#view-settings');
    if (settings) {
      $$('h2,h3,h4,label,p,span,strong', settings).forEach(node => {
        if (!/быстрый старт/i.test(node.textContent || '')) return;
        const block = node.closest('section,article,label,.settings-card,.setting-card,.settings-row,.setting-row') || node.parentElement;
        block?.setAttribute('data-pmk-hidden-setting', '1');
      });
    }
  }

  function monthEventCount(dateKey) {
    if (typeof getAllEvents !== 'function' || typeof eventDateKey !== 'function') return 0;
    return getAllEvents().filter(event => eventDateKey(event) === dateKey).length;
  }

  function monthFirstColumn(dateKey) {
    const date = new Date(`${dateKey}T12:00:00Z`);
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
  }

  function renderMonthCounters() {
    const board = $('#weekEvents');
    const isMonth = Boolean(typeof state !== 'undefined' && state.currentView === 'month');
    if (!board) return;

    $('#pmkMonthWeekdays')?.remove();
    board.classList.remove('pmk-month-table-v82-7');
    board.classList.toggle('pmk-month-counter-grid-v82-9', isMonth);
    $('#view-week')?.classList.toggle('pmk-month-counter-view-v82-9', isMonth);

    if (!isMonth) {
      $$('.pmk-month-count-v82-9', board).forEach(node => node.remove());
      $$('.day-column', board).forEach(column => column.style.removeProperty('grid-column-start'));
      return;
    }

    const columns = $$('.day-column', board);
    columns.forEach((column, index) => {
      const open = $('[data-open-day]', column);
      const dateKey = open?.dataset.openDay || '';
      if (!dateKey) return;
      if (index === 0) column.style.gridColumnStart = String(monthFirstColumn(dateKey));
      else column.style.removeProperty('grid-column-start');

      let count = $('.pmk-month-count-v82-9', column);
      if (!count) {
        count = document.createElement('button');
        count.type = 'button';
        count.className = 'pmk-month-count-v82-9';
        count.addEventListener('click', () => {
          if (typeof setView === 'function') setView('day', dateKey);
        });
        column.appendChild(count);
      }
      const schedule = readJson(SCHEDULE_KEY, {});
      const dayConfig = schedule[dateKey] || {};
      count.innerHTML = dayConfig.dayOff
        ? '<strong>Выходной</strong><small>заявки не ставить</small>'
        : `<strong>${monthEventCount(dateKey)}</strong><small>точек</small>`;
    });
  }

  function scheduleFor(dateKey) {
    return readJson(SCHEDULE_KEY, {})[dateKey] || { dayOff: false, start: '', end: '', note: '' };
  }

  function setScheduleFor(dateKey, value) {
    const all = readJson(SCHEDULE_KEY, {});
    if (!value.dayOff && !value.start && !value.end && !value.note) delete all[dateKey];
    else all[dateKey] = value;
    writeJson(SCHEDULE_KEY, all);
  }

  function ensureDayModeModal() {
    if ($('#pmkDayModeModal')) return;
    const modal = document.createElement('div');
    modal.id = 'pmkDayModeModal';
    modal.className = 'pmk-day-mode-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="pmk-day-mode-dialog" role="dialog" aria-modal="true" aria-labelledby="pmkDayModeTitle">
        <button type="button" class="pmk-day-mode-close" aria-label="Закрыть">×</button>
        <h3 id="pmkDayModeTitle">Режим рабочего дня</h3>
        <p id="pmkDayModeDate"></p>
        <label class="pmk-day-mode-check"><input type="checkbox" id="pmkDayOff"> <span>Выходной весь день</span></label>
        <div class="pmk-day-mode-period">
          <label>Нерабочее время с <input type="time" id="pmkDayBlockStart"></label>
          <label>до <input type="time" id="pmkDayBlockEnd"></label>
        </div>
        <label>Комментарий <input type="text" id="pmkDayBlockNote" placeholder="Например: ремонт оборудования"></label>
        <div class="pmk-day-mode-actions">
          <button type="button" id="pmkDayModeClear">Очистить</button>
          <button type="button" id="pmkDayModeSave">Сохранить</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const close = () => { modal.hidden = true; };
    $('.pmk-day-mode-close', modal).addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    $('#pmkDayModeSave', modal).addEventListener('click', () => {
      const dateKey = modal.dataset.dateKey;
      const value = {
        dayOff: $('#pmkDayOff', modal).checked,
        start: $('#pmkDayBlockStart', modal).value,
        end: $('#pmkDayBlockEnd', modal).value,
        note: $('#pmkDayBlockNote', modal).value.trim(),
      };
      setScheduleFor(dateKey, value);
      close();
      applyAll();
      if (typeof showToast === 'function') showToast('Режим рабочего дня сохранён.', 'success');
    });
    $('#pmkDayModeClear', modal).addEventListener('click', () => {
      setScheduleFor(modal.dataset.dateKey, { dayOff: false, start: '', end: '', note: '' });
      close();
      applyAll();
      if (typeof showToast === 'function') showToast('Ограничения рабочего дня сняты.', 'success');
    });
  }

  function openDayMode(dateKey) {
    ensureDayModeModal();
    const modal = $('#pmkDayModeModal');
    const value = scheduleFor(dateKey);
    modal.dataset.dateKey = dateKey;
    $('#pmkDayModeDate', modal).textContent = typeof formatLongDate === 'function' ? formatLongDate(dateKey) : dateKey;
    $('#pmkDayOff', modal).checked = Boolean(value.dayOff);
    $('#pmkDayBlockStart', modal).value = value.start || '';
    $('#pmkDayBlockEnd', modal).value = value.end || '';
    $('#pmkDayBlockNote', modal).value = value.note || '';
    modal.hidden = false;
  }

  function renderDayMode() {
    if (typeof state === 'undefined' || state.currentView !== 'day') return;
    const controls = $('.day-controls') || $('#view-today .page-heading');
    if (!controls) return;
    let button = $('#pmkDayModeButton');
    if (!button) {
      button = document.createElement('button');
      button.id = 'pmkDayModeButton';
      button.type = 'button';
      button.className = 'pmk-day-mode-button';
      button.addEventListener('click', () => openDayMode(selectedDayKey()));
      controls.appendChild(button);
    }

    const dateKey = selectedDayKey();
    const config = scheduleFor(dateKey);
    button.textContent = config.dayOff ? 'Выходной' : (config.start && config.end ? `${config.start}–${config.end} не работаем` : 'Режим дня');
    button.classList.toggle('is-active', Boolean(config.dayOff || (config.start && config.end)));

    let note = $('#pmkDayModeNotice');
    if (!note) {
      note = document.createElement('div');
      note.id = 'pmkDayModeNotice';
      note.className = 'pmk-day-mode-notice';
      const heading = $('#view-today .page-heading');
      heading?.insertAdjacentElement('afterend', note);
    }
    if (config.dayOff) {
      note.hidden = false;
      note.textContent = config.note ? `Выходной · ${config.note}` : 'Выходной день. Заявки не ставить.';
    } else if (config.start && config.end) {
      note.hidden = false;
      note.textContent = `Нерабочее время ${config.start}–${config.end}${config.note ? ` · ${config.note}` : ''}`;
    } else {
      note.hidden = true;
    }

    const addButton = $('#addTodayBtn');
    if (addButton) {
      addButton.disabled = Boolean(config.dayOff);
      addButton.title = config.dayOff ? 'На этот день установлен выходной' : '';
    }
  }

  function renderDistricts() {
    const current = typeof state !== 'undefined' ? state.currentView : '';
    if (current === 'day') {
      const subtitle = $('#todaySubtitle');
      const districts = districtList(selectedDayKey());
      if (subtitle) subtitle.textContent = districts.length
        ? `Районы по графику: ${districts.join(', ')}.`
        : 'Выходной: маршрутов нет.';
    }

    $$('.day-column').forEach(column => {
      const dateKey = $('[data-open-day]', column)?.dataset.openDay;
      const heading = $('.day-heading', column);
      if (!dateKey || !heading) return;
      let line = $('.pmk-day-districts-v82-9', heading);
      if (!line) {
        line = document.createElement('small');
        line.className = 'pmk-day-districts-v82-9';
        heading.appendChild(line);
      }
      const districts = districtList(dateKey);
      line.textContent = districts.length ? districts.join(' · ') : 'Выходной';
    });
  }

  function applySummaryFilter() {
    const cards = $$('#todayEvents .event-card[data-event-card]');
    cards.forEach(card => {
      const event = eventForCard(card);
      if (!event || typeof eventMeta !== 'function') {
        card.hidden = false;
        return;
      }
      const data = eventMeta(event);
      const attention = !data.phone || !(typeof displayAddress === 'function' ? displayAddress(data, event) : data.address);
      const visible = activeSummaryFilter === 'all'
        || (activeSummaryFilter === 'pickup' && data.visitType === 'pickup')
        || (activeSummaryFilter === 'delivery' && data.visitType === 'delivery')
        || (activeSummaryFilter === 'attention' && attention);
      card.hidden = !visible;
    });
  }

  function makeCountersClickable() {
    const mapping = [
      ['#summaryTotal', 'all'],
      ['#summaryPickup', 'pickup'],
      ['#summaryDelivery', 'delivery'],
      ['#summaryAttention', 'attention'],
    ];
    mapping.forEach(([selector, filter]) => {
      const value = $(selector);
      const card = value?.closest('.summary-card');
      if (!card) return;
      card.dataset.summaryFilter = filter;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.classList.toggle('is-active', activeSummaryFilter === filter);
      if (card.dataset.pmkSummaryBound === '1') return;
      card.dataset.pmkSummaryBound = '1';
      const activate = () => {
        activeSummaryFilter = filter;
        makeCountersClickable();
        applySummaryFilter();
      };
      card.addEventListener('click', activate);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
    });
  }

  function restoreCardFooter() {
    $$('.event-card').forEach(card => {
      const actions = $('.event-actions', card);
      const row = $('.manage-row', card);
      if (!actions || !row) return;
      card.classList.add('pmk-footer-card-v82-9');
      actions.classList.add('pmk-footer-actions-v82-9');
      row.classList.add('pmk-footer-row-v82-9');
      const call = $('.call-button', row);
      if (call && !call.disabled && !/позвонить/i.test(call.textContent || '')) {
        call.innerHTML = '<span aria-hidden="true">☎</span><span>Позвонить</span>';
      }
    });
  }

  async function checkForUpdate() {
    const panel = $('#pmkMinimalSyncPanel');
    if (!panel || panel.dataset.updateChecked === '1') return;
    panel.dataset.updateChecked = '1';
    try {
      const response = await fetch(`./pmk-release.json?check=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const info = await response.json();
      if (!info.version || String(info.version) === currentVersion) return;
      let badge = $('#pmkUpdateIndicator');
      if (!badge) {
        badge = document.createElement('a');
        badge.id = 'pmkUpdateIndicator';
        badge.className = 'pmk-update-indicator-v82-9';
        badge.textContent = '↑';
        badge.title = `Есть новая версия ${info.version}`;
        badge.setAttribute('aria-label', `Есть новая версия ${info.version}`);
        badge.href = info.testUrl || info.updateUrl || '#';
        panel.appendChild(badge);
      }
    } catch {}
  }

  function removePlanningAddButton() {
    const current = typeof state !== 'undefined' ? state.currentView : '';
    const planning = ['week', 'month'].includes(current);
    $('#view-week')?.classList.toggle('pmk-hide-planning-add-v82-9', planning);
  }

  function applyAll() {
    scheduled = false;
    removeThreeDays();
    simplifyQuickStart();
    renderMonthCounters();
    renderDayMode();
    renderDistricts();
    makeCountersClickable();
    applySummaryFilter();
    restoreCardFooter();
    removePlanningAddButton();
    checkForUpdate();
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyAll);
  }

  function installWrappers() {
    if (typeof renderAll === 'function' && !renderAll.__pmkFinalV829) {
      const previous = renderAll;
      globalThis.renderAll = function renderAllV829(...args) {
        const result = previous(...args);
        scheduleApply();
        return result;
      };
      globalThis.renderAll.__pmkFinalV829 = true;
    }
    if (typeof setView === 'function' && !setView.__pmkFinalV829) {
      const previous = setView;
      globalThis.setView = function setViewV829(...args) {
        const result = previous(...args);
        scheduleApply();
        return result;
      };
      globalThis.setView.__pmkFinalV829 = true;
    }
  }

  function boot() {
    ensureDayModeModal();
    installWrappers();
    applyAll();
    const root = $('.main-content') || document.body;
    observer = new MutationObserver(scheduleApply);
    observer.observe(root, { childList: true, subtree: true });
    ['resize', 'popstate', 'storage', 'pmk-calendar-sync-done', 'pmk-yandex-sync-done', 'pmk-status-ledger-updated']
      .forEach(name => globalThis.addEventListener(name, scheduleApply));
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installWrappers();
      applyAll();
      if (($('#pmkMinimalSyncPanel') && $('.nav-item[data-view="month"]')) || attempts >= 30) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
