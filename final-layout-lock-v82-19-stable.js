'use strict';

(() => {
  if (globalThis.PMK_FINAL_LAYOUT_LOCK_V82_12) return;
  globalThis.PMK_FINAL_LAYOUT_LOCK_V82_12 = true;
  globalThis.PMK_FINAL_LAYOUT_LOCK_V82_19_STABLE = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const CURRENT_VERSION = '82.12';
  let frame = 0;
  let observer = null;
  let versionCheckedAt = 0;

  function normalizePhone(value = '') {
    let digits = String(value).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    if (digits.length === 10) digits = `7${digits}`;
    return digits.length === 11 && digits.startsWith('7') ? `+${digits}` : '';
  }

  function compareVersions(a, b) {
    const left = String(a || '').split('.').map(Number);
    const right = String(b || '').split('.').map(Number);
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      const diff = (left[index] || 0) - (right[index] || 0);
      if (diff) return diff;
    }
    return 0;
  }

  async function lockVersionState(force = false) {
    if (globalThis.PMK_STABLE_BACKUP) return;
    const indicator = $('#pmkVersionIndicator');
    if (!indicator) return;
    if (!force && Date.now() - versionCheckedAt < 60000) return;
    versionCheckedAt = Date.now();
    try {
      const response = await fetch(`./pmk-release.json?v82-19=${Date.now()}`, { cache: 'no-store' });
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

  function eventForCard(card) {
    const id = String(card?.dataset?.eventCard || '');
    if (!id || typeof getAllEvents !== 'function') return null;
    try { return getAllEvents().find(event => String(event.id) === id) || null; }
    catch { return null; }
  }

  function phoneForCard(card) {
    const event = eventForCard(card);
    if (event) {
      try {
        const data = typeof eventMeta === 'function' ? eventMeta(event) : {};
        const direct = normalizePhone(data.phone || '');
        if (direct) return direct;
        const text = [event.description, event.summary, event.location, data.managerComment, data.timeNote].filter(Boolean).join(' ');
        const match = text.match(/(?:\+?7|8)[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/);
        const parsed = normalizePhone(match?.[0] || '');
        if (parsed) return parsed;
      } catch {}
    }
    const visible = String(card?.textContent || '');
    const match = visible.match(/(?:\+?7|8)[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/);
    return normalizePhone(match?.[0] || '');
  }

  function lockStatusColumn(card) {
    if (!card || card.closest('#weekEvents')) return;
    const time = $('.event-time', card);
    const actions = $('.event-actions', card);
    const status = $('.status-row', card);
    if (!time || !actions || !status) return;
    card.classList.add('pmk-status-left-card-v82-2', 'pmk-card-locked-v82-12');
    time.classList.add('pmk-status-left-time-v82-2');
    actions.classList.add('pmk-status-left-actions-v82-2', 'pmk-card-footer-locked-v82-12');
    status.classList.add('pmk-status-left-stack-v82-2', 'pmk-status-stack-locked-v82-12');
    if (status.parentElement !== time) time.appendChild(status);
  }

  function lockFooter(card) {
    if (!card || card.closest('#weekEvents')) return;
    const actions = $('.event-actions', card);
    const row = $('.manage-row', card);
    if (!actions || !row) return;
    card.classList.add('pmk-card-layout-v82-10', 'pmk-card-footer-fixed-v82-11', 'pmk-card-locked-v82-12');
    actions.classList.add('pmk-card-footer-v82-10', 'pmk-card-footer-locked-v82-12');
    row.classList.add('pmk-card-footer-row-v82-10', 'pmk-card-footer-row-locked-v82-12');

    let primary = $('.primary-card-action', row);
    const phone = phoneForCard(card);
    if (phone) {
      if (!primary || !primary.matches('a[href^="tel:"]')) {
        const link = document.createElement('a');
        link.className = 'mini-button call-button primary-card-action';
        link.href = `tel:${phone}`;
        if (primary) primary.replaceWith(link); else row.prepend(link);
        primary = link;
      }
      primary.className = 'mini-button call-button primary-card-action';
      primary.href = `tel:${phone}`;
      primary.removeAttribute('disabled');
      primary.innerHTML = '<span aria-hidden="true">☎</span><span>Позвонить</span>';
    } else {
      if (!primary || primary.tagName === 'A') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mini-button primary-card-action pmk-phone-missing-v82-12';
        button.disabled = true;
        if (primary) primary.replaceWith(button); else row.prepend(button);
        primary = button;
      }
      primary.disabled = true;
      primary.classList.add('pmk-phone-missing-v82-12');
      primary.textContent = 'Телефон не указан';
    }

    const open = $('.secondary-card-action', row);
    if (open) {
      open.classList.add('pmk-open-locked-v82-12');
      open.textContent = 'Открыть';
    }
    $('.menu-button', row)?.classList.add('pmk-menu-locked-v82-12');
  }

  function lockCard(card) {
    lockStatusColumn(card);
    lockFooter(card);
  }

  function lockAllCards() {
    frame = 0;
    $$('.event-card').forEach(lockCard);
    lockVersionState();
  }

  function scheduleLock() {
    if (frame) return;
    frame = requestAnimationFrame(lockAllCards);
  }

  function installRenderHooks() {
    if (typeof renderToday === 'function' && !renderToday.__pmkLayoutLockV8212) {
      const previous = renderToday;
      globalThis.renderToday = function (...args) { const result = previous(...args); scheduleLock(); return result; };
      globalThis.renderToday.__pmkLayoutLockV8212 = true;
    }
    if (typeof renderSearch === 'function' && !renderSearch.__pmkLayoutLockV8212) {
      const previous = renderSearch;
      globalThis.renderSearch = function (...args) { const result = previous(...args); scheduleLock(); return result; };
      globalThis.renderSearch.__pmkLayoutLockV8212 = true;
    }
    if (typeof renderAll === 'function' && !renderAll.__pmkLayoutLockV8212) {
      const previous = renderAll;
      globalThis.renderAll = function (...args) { const result = previous(...args); scheduleLock(); return result; };
      globalThis.renderAll.__pmkLayoutLockV8212 = true;
    }
  }

  function watchCards() {
    if (observer) return;
    const root = $('.main-content') || document.body;
    observer = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => mutation.type === 'childList' && [...mutation.addedNodes].some(node => node.nodeType === 1 && (
        node.matches?.('.event-card,.event-actions,.status-row,.manage-row') ||
        node.querySelector?.('.event-card,.event-actions,.status-row,.manage-row')
      )));
      if (relevant) scheduleLock();
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  function boot() {
    installRenderHooks();
    watchCards();
    lockAllCards();
    lockVersionState(true);

    document.addEventListener('click', event => {
      if (event.target.closest('[data-status-event],.nav-item,[data-open-day],[data-open-event],#prevDayBtn,#nextDayBtn')) {
        setTimeout(scheduleLock, 0);
        setTimeout(scheduleLock, 180);
      }
    }, true);

    ['pmk-calendar-sync-start','pmk-calendar-sync-done','pmk-calendar-sync-error','pmk-yandex-sync-done','pmk-yandex-sync-error','pmk-status-ledger-updated','popstate','storage']
      .forEach(name => globalThis.addEventListener(name, scheduleLock));

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      installRenderHooks();
      scheduleLock();
      if (attempts >= 8 || (typeof renderAll === 'function' && $('.main-content'))) clearInterval(timer);
    }, 250);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
