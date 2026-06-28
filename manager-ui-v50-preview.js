'use strict';

(() => {
  if (window.PMK_MANAGER_UI_V50) return;
  window.PMK_MANAGER_UI_V50 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const value = selector => $(selector)?.value?.trim() || '';
  const checked = selector => Boolean($(selector)?.checked);
  const money = amount => new Intl.NumberFormat('ru-RU').format(Number(amount || 0)) + ' ₽';
  const safe = text => String(text || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  let summary;
  let clientSection;
  let dateSection;
  let rugsSection;
  let costSection;
  let previewSection;
  let updateTimer;

  function sectionFor(selector) {
    return $(selector)?.closest('.form-card, .preview-card') || null;
  }

  function formatDate(dateKey) {
    if (!dateKey) return 'Дата не указана';
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;
    const today = typeof businessTodayKey === 'function' ? businessTodayKey() : '';
    const tomorrow = today && typeof addDaysToKey === 'function' ? addDaysToKey(today, 1) : '';
    const label = dateKey === today ? 'Сегодня' : dateKey === tomorrow ? 'Завтра' : '';
    const formatted = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
    return label ? `${label}, ${formatted}` : formatted;
  }

  function addressText() {
    const street = value('#street');
    const house = value('#houseNumber');
    const apartment = value('#apartmentNumber');
    const entrance = value('#entrance');
    const floor = value('#floor');
    const first = [street && `ул. ${street.replace(/^ул(?:ица)?\.?\s*/i, '')}`, house && `д. ${house}`, apartment && `кв. ${apartment}`].filter(Boolean).join(', ');
    const second = [entrance && `подъезд ${entrance}`, floor && `этаж ${floor}`].filter(Boolean).join(', ');
    return [first, second, value('#district') && `${value('#district')} район`].filter(Boolean);
  }

  function rugData() {
    return $$('.rug-card', $('#rugsContainer') || document).map((card, index) => {
      const length = $('.rug-length', card)?.value || '';
      const width = $('.rug-width', card)?.value || '';
      const material = $('.rug-material', card)?.value || '';
      const pile = $('.rug-pile', card)?.value || '';
      const services = $$('input:checked', card)
        .map(input => input.value)
        .filter(item => item && !['Пятна','Шерсть','Волосы','Запах мочи','Дезинфекция','Слайм / пластилин'].includes(item));
      const issues = $$('.rug-issues input:checked', card).map(input => input.value);
      return { index: index + 1, length, width, material, pile, details: [...issues, ...services] };
    });
  }

  function missingCount() {
    let count = 0;
    ['#customerName','#phone','#district','#street','#houseNumber','#visitDate','#startTime','#endTime'].forEach(selector => { if (!value(selector)) count += 1; });
    rugData().forEach(rug => {
      if (!rug.length || !rug.width) count += 1;
      if (!rug.material) count += 1;
    });
    return count;
  }

  function summaryMarkup() {
    const client = value('#customerName') || 'Имя не указано';
    const phone = value('#phone') || 'Телефон не указан';
    const address = addressText();
    const date = formatDate(value('#visitDate'));
    const start = value('#startTime') || '—';
    const end = value('#endTime') || '—';
    const callAhead = checked('#callAhead') ? `Позвонить за ${value('#callAheadMinutes') || 30} минут` : 'Звонок перед приездом не включён';
    const rugs = rugData();
    const price = Number(value('#estimatedPrice') || 0);
    const discount = Number(value('#discount') || 0);
    const warning = missingCount();

    const rugsHtml = rugs.length ? rugs.map(rug => {
      const size = rug.length && rug.width ? `${rug.length}×${rug.width} м` : 'Размер не указан';
      const line = [size, rug.material, rug.pile].filter(Boolean).join(' · ');
      const details = rug.details.length ? rug.details.join(', ') : 'Услуги не выбраны';
      return `<button type="button" class="v50-rug-row" data-v50-open="rugs"><span class="v50-rug-number">${rug.index}</span><span><strong>Ковёр ${rug.index}</strong><b>${safe(line)}</b><small>${safe(details)}</small></span><i>›</i></button>`;
    }).join('') : '<p class="v50-empty">Ковры пока не добавлены</p>';

    return `
      <div class="v50-status ${warning ? 'v50-status-warning' : ''}">
        <span>${warning ? '!' : '✓'}</span>
        <div><strong>${warning ? `Нужно проверить: ${warning}` : 'Заявка готова к созданию'}</strong><small>${warning ? 'Незаполненные поля выделены в редакторах' : 'Все основные данные заполнены'}</small></div>
      </div>

      <div class="v50-automation-grid" aria-label="Автоматизации">
        <button type="button" data-v50-action="paste"><span>✨</span><b>Вставка<br>из текста</b></button>
        <button type="button" data-v50-action="client"><span>👤</span><b>Постоянный<br>клиент</b></button>
        <button type="button" data-v50-action="address"><span>📍</span><b>Адрес<br>DaData</b></button>
        <button type="button" data-v50-action="slots"><span>🕒</span><b>Окна<br>маршрута</b></button>
        <button type="button" data-v50-action="price"><span>₽</span><b>Авто<br>стоимость</b></button>
      </div>

      <button type="button" class="v50-summary-card" data-v50-open="client">
        <span class="v50-card-icon">👤</span><span class="v50-card-body"><em>Клиент и адрес</em><strong>${safe(client)}</strong><b>${safe(phone)}</b>${address.map(line => `<small>${safe(line)}</small>`).join('')}</span><span class="v50-edit">Изменить</span>
      </button>

      <button type="button" class="v50-summary-card" data-v50-open="date">
        <span class="v50-card-icon">📅</span><span class="v50-card-body"><em>Дата и время</em><strong>${safe(date)}</strong><b>${safe(start)}–${safe(end)}</b><small>${safe(callAhead)}</small></span><span class="v50-edit">Изменить</span>
      </button>

      <section class="v50-summary-card v50-rugs-summary">
        <div class="v50-card-head"><span class="v50-card-icon">▣</span><strong>Ковры — ${rugs.length}</strong><button type="button" data-v50-open="rugs">Изменить</button></div>
        <div>${rugsHtml}</div>
      </section>

      <button type="button" class="v50-summary-card v50-price-card" data-v50-open="cost">
        <span class="v50-card-icon">₽</span><span class="v50-card-body"><em>Стоимость и договорённости</em><strong>${price ? money(price) : 'Не рассчитана'}</strong><b>Скидка: ${discount}%</b><small>${value('#managerComment') || 'Комментарий не добавлен'}</small></span><span class="v50-edit">Изменить</span>
      </button>

      <button type="button" class="v50-preview-button" data-v50-open="preview">Проверить событие перед созданием <span>›</span></button>
      <button type="button" class="v50-full-button" data-v50-action="full">Открыть полную форму</button>
    `;
  }

  function updateSummary() {
    if (!summary) return;
    summary.innerHTML = summaryMarkup();
  }

  function scheduleUpdate() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(updateSummary, 80);
  }

  function editorTitle(type) {
    return ({ client: 'Клиент и адрес', date: 'Дата и время', rugs: 'Ковры и услуги', cost: 'Стоимость и договорённости', preview: 'Предпросмотр события' })[type] || 'Редактирование';
  }

  function openEditor(type, focusSelector = '') {
    const section = ({ client: clientSection, date: dateSection, rugs: rugsSection, cost: costSection, preview: previewSection })[type];
    if (!section) return;
    closeEditor(false);
    section.classList.add('v50-editor-open');
    section.dataset.v50Editor = type;
    document.body.classList.add('v50-modal-active');

    if (!$('.v50-editor-bar', section)) {
      const top = document.createElement('div');
      top.className = 'v50-editor-bar';
      top.innerHTML = `<button type="button" class="v50-editor-back" aria-label="Назад">←</button><strong>${editorTitle(type)}</strong><button type="button" class="v50-editor-done">Готово</button>`;
      section.prepend(top);
      const bottom = document.createElement('button');
      bottom.type = 'button';
      bottom.className = 'button button-primary v50-editor-save';
      bottom.textContent = type === 'rugs' ? 'Сохранить ковры' : type === 'preview' ? 'Вернуться к заявке' : 'Сохранить изменения';
      section.append(bottom);
    }

    requestAnimationFrame(() => {
      section.scrollTop = 0;
      if (focusSelector) $(focusSelector, section)?.focus();
    });
  }

  function closeEditor(refresh = true) {
    $$('.v50-editor-open').forEach(section => section.classList.remove('v50-editor-open'));
    document.body.classList.remove('v50-modal-active');
    if (refresh) scheduleUpdate();
  }

  function automationAction(action) {
    if (action === 'paste') {
      const input = $('#smartPasteInput');
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus();
      }
      return;
    }
    if (action === 'client') {
      openEditor('client');
      setTimeout(() => ($('#returningClientSearch, .returning-client-search input, input[placeholder*="постоян"]') || $('#customerName'))?.focus(), 120);
      return;
    }
    if (action === 'address') {
      openEditor('client', '#street');
      return;
    }
    if (action === 'slots') {
      openEditor('date');
      setTimeout(() => $('#managerSlotPlanner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      return;
    }
    if (action === 'price') {
      openEditor('cost');
      setTimeout(() => {
        const toggle = $('#autoPrice');
        if (toggle && !toggle.checked) toggle.click();
        toggle?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
      return;
    }
    if (action === 'full') {
      document.body.classList.toggle('v50-full-form');
      const button = $('[data-v50-action="full"]', summary);
      if (button) button.textContent = document.body.classList.contains('v50-full-form') ? 'Вернуться к краткой сводке' : 'Открыть полную форму';
      $('.form-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function addStickyActions(form) {
    if ($('#v50StickyActions')) return;
    const bar = document.createElement('div');
    bar.id = 'v50StickyActions';
    bar.className = 'v50-sticky-actions';
    bar.innerHTML = '<button type="button" class="v50-draft">Черновик</button><button type="button" class="v50-submit">Создать в календаре</button>';
    form.append(bar);
    $('.v50-draft', bar).addEventListener('click', () => $('#saveDraftBtn')?.click());
    $('.v50-submit', bar).addEventListener('click', () => $('#submitBtn')?.click());
  }

  function install() {
    const form = $('#requestForm');
    const layout = $('.form-layout', form || document);
    if (!form || !layout || !$('#customerName') || !$('#rugsContainer')) return false;

    document.body.classList.add('v50-manager-preview');
    clientSection = sectionFor('#customerName');
    dateSection = sectionFor('#visitDate');
    rugsSection = sectionFor('#rugsContainer');
    costSection = sectionFor('#estimatedPrice');
    previewSection = $('.preview-card', form);

    [clientSection, dateSection, rugsSection, costSection, previewSection].filter(Boolean).forEach(section => section.classList.add('v50-source-section'));

    summary = document.createElement('div');
    summary.id = 'v50Summary';
    summary.className = 'v50-summary';
    layout.before(summary);

    summary.addEventListener('click', event => {
      const open = event.target.closest('[data-v50-open]');
      if (open) openEditor(open.dataset.v50Open);
      const action = event.target.closest('[data-v50-action]');
      if (action) automationAction(action.dataset.v50Action);
    });

    form.addEventListener('click', event => {
      if (event.target.closest('.v50-editor-back, .v50-editor-done, .v50-editor-save')) closeEditor();
    });
    form.addEventListener('input', scheduleUpdate);
    form.addEventListener('change', scheduleUpdate);

    new MutationObserver(scheduleUpdate).observe($('#rugsContainer'), { childList: true, subtree: true, attributes: true });
    addStickyActions(form);
    updateSummary();
    return true;
  }

  function boot() {
    if (install()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 80) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
