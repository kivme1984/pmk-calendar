'use strict';

(() => {
  if (globalThis.PMK_ARCHIVE_POLICY_V82) return;
  globalThis.PMK_ARCHIVE_POLICY_V82 = true;

  const ARCHIVE_AFTER_DAYS = 7;
  const ARCHIVE_AFTER_MS = ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;

  function timestamp(value) {
    const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value || ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function ageMs(value, now = Date.now()) {
    const time = timestamp(value);
    return time ? Math.max(0, Number(now) - time) : 0;
  }

  function isArchived(value, now = Date.now()) {
    const time = timestamp(value);
    return Boolean(time && Number(now) - time >= ARCHIVE_AFTER_MS);
  }

  function remainingMs(value, now = Date.now()) {
    const time = timestamp(value);
    if (!time) return ARCHIVE_AFTER_MS;
    return Math.max(0, ARCHIVE_AFTER_MS - (Number(now) - time));
  }

  function split(items = [], getTimestamp = item => item, now = Date.now()) {
    const active = [];
    const archived = [];
    items.forEach(item => (isArchived(getTimestamp(item), now) ? archived : active).push(item));
    return { active, archived };
  }

  globalThis.PMK_ARCHIVE_POLICY_V82_API = {
    archiveAfterDays: ARCHIVE_AFTER_DAYS,
    archiveAfterMs: ARCHIVE_AFTER_MS,
    timestamp,
    ageMs,
    isArchived,
    remainingMs,
    split,
  };
})();