'use strict';

(() => {
  if (window.PMK_WORKSHOP_MEASUREMENT_V58) return;
  window.PMK_WORKSHOP_MEASUREMENT_V58 = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clampCount = value => Math.max(1, Math.min(30, Math.round(Number(value) || 1)));

  function isEnabled() {
    return Boolean($('#workshopMeasurement')?.checked);
  }

  function rugCount() {
    return clampCount($('#workshopRugCount')?.value || 1);
  }

  function syncSummary() {
    if (!isEnabled()) return;
    const count = rugCount();
    const summary = $('#v50Summary');
    if (!summary) return;

    const card = $('.v50-rugs-summary', summary);
    const heading = $('.v50-card-head strong', card || summary);
    const headingText = `Ковры — ${count}`;
    if (heading && heading.textContent !== headingText) heading.textContent = headingText;

    if (card && card.dataset.workshopSummaryCount !== String(count)) {
      const body = [...card.children].find(child => !child.classList.contains('v50-card-head'));
      if (body) {
        body.innerHTML = `
          <button type="button" class="v50-rug-row" data-v50-open="rugs">
            <span class="v50-rug-number">✓</span>
            <span><strong>Замер в цеху</strong><b>${count} ${typeof pluralRugs === 'function' ? pluralRugs(count) : 'ковров'}</b><small>Размеры будут внесены после забора</small></span>
            <i>›</i>
          </button>`;
      }
      card.dataset.workshopSummaryCount = String(count);
    }

    const missing = ['#customerName','#phone','#district','#street','#houseNumber','#visitDate','#startTime','#endTime']
      .reduce((total, selector) => total + ($(selector)?.value?.trim() ? 0 : 1), 0);
    const status = $('.v50-status', summary);
    if (status && status.dataset.workshopMissing !== String(missing)) {
      status.classList.toggle('v50-status-warning', missing > 0);
      status.innerHTML = missing
        ? `<span>!</span><div><strong>Нужно проверить: ${missing}</strong><small>Незаполненные обязательные поля выделены в редакторах</small></div>`
        : '<span>✓</span><div><strong>Заявка готова к созданию</strong><small>Количество ковров указано, размеры определим в цеху</small></div>';
      status.dataset.workshopMissing = String(missing);
    }
  }

  function applyMode() {
    const enabled = isEnabled();
    const countRow = $('#workshopRugCountRow');
    const list = $('#rugsContainer');
    const addButton = $('#addRugBtn');
    const note = $('#workshopMeasurementNote');

    countRow?.classList.toggle('hidden', !enabled);
    list?.classList.toggle('workshop-rugs-hidden', enabled);
    addButton?.classList.toggle('hidden', enabled);
    note?.classList.toggle('hidden', !enabled);

    if (enabled) {
      const input = $('#workshopRugCount');
      if (input && !input.value) input.value = String(Math.max(1, $$('.rug-card', list || document).length));
    }

    if (typeof schedulePreviewUpdate === 'function') schedulePreviewUpdate();
    setTimeout(syncSummary, 100);
  }

  function installUi() {
    const rugs = $('#rugsContainer');
    const section = rugs?.closest('.form-card');
    if (!rugs || !section || $('#workshopMeasurementPanel')) return Boolean(rugs && section);

    const panel = document.createElement('div');
    panel.id = 'workshopMeasurementPanel';
    panel.className = 'workshop-measurement-panel';
    panel.innerHTML = `
      <label class="workshop-measurement-toggle">
        <input type="checkbox" id="workshopMeasurement">
        <span><strong>Замер в цеху</strong><small>Размеры ковров определим после забора</small></span>
      </label>
      <label id="workshopRugCountRow" class="field workshop-rug-count hidden">
        Количество ковров
        <input type="number" id="workshopRugCount" min="1" max="30" step="1" value="1" inputmode="numeric">
      </label>
      <div id="workshopMeasurementNote" class="workshop-measurement-note hidden">Карточки размеров сохранены, но в заявку сейчас попадёт только количество ковров и отметка о замере в цеху.</div>`;
    section.insertBefore(panel, rugs);

    $('#workshopMeasurement').addEventListener('change', applyMode);
    $('#workshopRugCount').addEventListener('input', event => {
      event.target.value = String(clampCount(event.target.value));
      if (typeof schedulePreviewUpdate === 'function') schedulePreviewUpdate();
      setTimeout(syncSummary, 100);
    });

    const summary = $('#v50Summary');
    if (summary) {
      let pending = false;
      new MutationObserver(() => {
        if (!isEnabled() || pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          syncSummary();
        });
      }).observe(summary, { childList: true, subtree: true });
    }

    return true;
  }

  const originalGetFormData = getFormData;
  getFormData = function getFormDataWithWorkshopMeasurement() {
    const data = originalGetFormData();
    if (!isEnabled()) {
      data.measurementAtWorkshop = false;
      data.workshopRugCount = 0;
      return data;
    }

    const firstRug = data.rugs?.[0] || {};
    data.measurementAtWorkshop = true;
    data.workshopRugCount = rugCount();
    data.rugs = [{
      ...firstRug,
      length: 0,
      width: 0,
      measurementAtWorkshop: true,
    }];
    data.issues = [...new Set(data.rugs.flatMap(rug => rug.issues || []))];
    data.services = [...new Set(data.rugs.flatMap(rug => rug.services || []))];
    return data;
  };

  const originalFillForm = fillForm;
  fillForm = function fillFormWithWorkshopMeasurement(data = {}) {
    originalFillForm(data);
    const enabled = Boolean(data.measurementAtWorkshop);
    const toggle = $('#workshopMeasurement');
    const input = $('#workshopRugCount');
    if (toggle) toggle.checked = enabled;
    if (input) input.value = String(clampCount(data.workshopRugCount || data.rugCount || 1));
    applyMode();
  };

  const originalResetForm = resetForm;
  resetForm = function resetFormWithWorkshopMeasurement(addDefaultRug = true) {
    originalResetForm(addDefaultRug);
    const toggle = $('#workshopMeasurement');
    const input = $('#workshopRugCount');
    if (toggle) toggle.checked = false;
    if (input) input.value = '1';
    applyMode();
  };

  const originalEventTitle = eventTitle;
  eventTitle = function eventTitleWithWorkshopMeasurement(data = {}) {
    if (!data.measurementAtWorkshop) return originalEventTitle(data);
    const count = clampCount(data.workshopRugCount || 1);
    return originalEventTitle({ ...data, rugs: Array.from({ length: count }, () => ({})) });
  };

  const originalEventDescription = eventDescription;
  eventDescription = function eventDescriptionWithWorkshopMeasurement(data = {}) {
    const text = originalEventDescription(data);
    if (!data.measurementAtWorkshop) return text;

    const count = clampCount(data.workshopRugCount || 1);
    const start = text.indexOf('Ковры:\n');
    const end = start >= 0 ? text.indexOf('\n\nПредварительная стоимость:', start) : -1;
    const block = `Ковры:\nЗамер в цеху: да\nКоличество ковров: ${count}\nРазмеры: определить после забора`;
    if (start >= 0 && end > start) return `${text.slice(0, start)}${block}${text.slice(end)}`;
    return `${text}\n\n${block}`;
  };

  function boot() {
    if (installUi()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installUi() || attempts > 200) clearInterval(timer);
    }, 50);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();