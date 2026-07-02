'use strict';

(() => {
  if (globalThis.PMK_FINAL_HOTFIX_V82_11) return;
  globalThis.PMK_FINAL_HOTFIX_V82_11 = true;
  document.documentElement.dataset.pmkCandidate = '82.11';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const CURRENT_VERSION = '82.11';
  let scheduled = false;

  function compareVersions(a, b) {
    const left = String(a || '').split('.').map(Number);
    const right = String(b || '').split('.').map(Number);
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      const diff = (left[index] || 0) - (right[index] || 0);
      if (diff) return diff;
    }
    return 0;
  }

  async function renderVersionState() {
    const indicator = $('#pmkVersionIndicator');
    if (!indicator) return;
    try {
      const response = await fetch(`./pmk-release.json?hotfix=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('release');
      const release = await response.json();
      const hasUpdate = compareVersions(release.version, CURRENT_VERSION) > 0;
      indicator.className = `pmk-version-indicator-v82-10 ${hasUpdate ? 'has-update' : 'is-current'}`;
      indicator.innerHTML = `<i></i><span>${hasUpdate ? `Обновление v${release.version}` : `Актуальная v${CURRENT_VERSION}`}</span>`;
      indicator.href = hasUpdate ? (release.testUrl || release.updateUrl || '#') : '#';
      indicator.title = hasUpdate ? `Доступна версия ${release.version}` : `Установлена актуальная версия ${CURRENT_VERSION}`;
    } catch {
      indicator.className = 'pmk-version-indicator-v82-10 is-unknown';
      indicator.innerHTML = '<i></i><span>Версия не проверена</span>';
    }
  }

  function forcePeriodView(view) {
    if (!['day', 'week', 'month'].includes(view)) return;
    try {
      if (typeof setView === 'function') setView(view);
      else if (typeof state !== 'undefined') {
        state.currentView = view;
        if (typeof renderAll === 'function') renderAll();
      }
    } catch {}

    requestAnimationFrame(() => {
      try {
        if (typeof state !== 'undefined' && state.currentView !== view) state.currentView = view;
        document.querySelectorAll('.view').forEach(section => {
          const target = view === 'day' ? 'view-today' : 'view-week';
          section.classList.toggle('active', section.id === target);
        });
        document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
        $('#sidebar')?.classList.remove('open');
        if (typeof renderAll === 'function') renderAll();
      } catch {}
      scheduleApply();
    });
  }

  function bindPeriodNavigation() {
    if (document.documentElement.dataset.pmkPeriodNavV8211 === '1') return;
    document.documentElement.dataset.pmkPeriodNavV8211 = '1';
    document.addEventListener('click', event => {
      const item = event.target.closest('.nav-item[data-view="day"],.nav-item[data-view="week"],.nav-item[data-view="month"]');
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      forcePeriodView(item.dataset.view);
    }, true);
  }

  function normalizePhone(value = '') {
    let digits = String(value).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    if (digits.length === 10) digits = `7${digits}`;
    return digits.length === 11 && digits.startsWith('7') ? `+${digits}` : '';
  }

  function phoneFromEvent(event) {
    if (!event) return '';
    let data = {};
    try { data = typeof eventMeta === 'function' ? eventMeta(event) : {}; } catch {}
    const direct = normalizePhone(data.phone || '');
    if (direct) return direct;
    const text = [event.description, event.summary, event.location, data.managerComment, data.timeNote].filter(Boolean).join(' ');
    const matches = text.match(/(?:\+?7|8)[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/g) || [];
    return normalizePhone(matches[0] || '');
  }

  function eventForCard(card) {
    const id = String(card?.dataset?.eventCard || '');
    if (!id || typeof getAllEvents !== 'function') return null;
    return getAllEvents().find(event => String(event.id) === id) || null;
  }

  function repairCardFooter() {
    $$('.event-card').forEach(card => {
      const actions = $('.event-actions', card);
      const row = $('.manage-row', card);
      if (!actions || !row) return;
      card.classList.add('pmk-card-layout-v82-10', 'pmk-card-footer-fixed-v82-11');
      actions.classList.add('pmk-card-footer-v82-10');
      row.classList.add('pmk-card-footer-row-v82-10');

      let primary = $('.primary-card-action', row);
      if (!primary) return;
      if (primary.matches('a[href^="tel:"]')) {
        primary.classList.add('call-button');
        primary.innerHTML = '<span aria-hidden="true">☎</span><span>Позвонить</span>';
        return;
      }

      const phone = phoneFromEvent(eventForCard(card));
      if (phone) {
        const link = document.createElement('a');
        link.className = 'mini-button call-button primary-card-action';
        link.href = `tel:${phone}`;
        link.innerHTML = '<span aria-hidden="true">☎</span><span>Позвонить</span>';
        primary.replaceWith(link);
        primary = link;
      } else {
        primary.disabled = true;
        primary.classList.add('pmk-phone-missing-v82-11');
        primary.textContent = 'Телефон не указан';
      }
    });
  }

  function repairQuickActions() {
    const panel = $('#pmkManagerLaunchpad');
    if (!panel) return;
    $('[data-workspace-action="drafts"]', panel)?.remove();
    const allowed = ['paste', 'client', 'slots', 'calculate'];
    $$('[data-workspace-action]', panel).forEach(button => {
      if (!allowed.includes(button.dataset.workspaceAction)) button.remove();
      else {
        button.hidden = false;
        button.removeAttribute('data-pmk-hidden-quick');
        button.style.removeProperty('grid-column');
      }
    });
    panel.hidden = !['day', 'week', 'month'].includes(typeof state !== 'undefined' ? state.currentView : 'day');
  }

  function applyAll() {
    scheduled = false;
    repairQuickActions();
    repairCardFooter();
    renderVersionState();
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyAll);
  }

  function boot() {
    bindPeriodNavigation();
    applyAll();
    document.addEventListener('click', event => {
      if (event.target.closest('[data-status-event],[data-open-day],[data-add-day],#prevPeriodBtn,#nextPeriodBtn')) setTimeout(scheduleApply, 0);
    }, true);
    ['pmk-calendar-sync-done', 'pmk-yandex-sync-done', 'pmk-status-ledger-updated', 'resize', 'popstate']
      .forEach(name => globalThis.addEventListener(name, scheduleApply));
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      applyAll();
      if (($('#pmkManagerLaunchpad') && $('#pmkVersionIndicator') && $('.event-card')) || attempts >= 30) clearInterval(timer);
    }, 100);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
