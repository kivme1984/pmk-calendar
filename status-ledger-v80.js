'use strict';

(() => {
  if (globalThis.PMK_STATUS_LEDGER_V80) return;
  globalThis.PMK_STATUS_LEDGER_V80 = true;

  const STORAGE_KEY = 'pmk-status-ledger-v80';
  const MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;
  const previousEventMeta = typeof globalThis.eventMeta === 'function' ? globalThis.eventMeta : (event => event?.pmkData || {});

  function readStore() {
    try {
      const value = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch { return {}; }
  }

  function writeStore(store) {
    try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
  }

  function normalize(value = '') {
    return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim().replace(/\s+/g, ' ');
  }

  function phone(value = '') {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  function eventDate(event = {}, data = {}) {
    if (data.visitDate) return String(data.visitDate);
    const raw = event?.start?.dateTime || event?.start?.date || event?.start || '';
    return String(raw).slice(0, 10);
  }

  function eventTime(event = {}, data = {}) {
    if (data.startTime) return String(data.startTime).slice(0, 5);
    const raw = event?.start?.dateTime || event?.start || '';
    const match = String(raw).match(/T(\d{2}:\d{2})/);
    return match?.[1] || '';
  }

  function logicalKey(event = {}, data = {}) {
    const date = eventDate(event, data);
    const time = eventTime(event, data);
    const type = normalize(data.visitType || (/достав/i.test(event?.summary || '') ? 'delivery' : 'pickup'));
    const tel = phone(data.phone || '');
    if (tel && date) return `phone:${tel}|${date}|${time}|${type}`;
    const name = normalize(data.customerName || event?.summary || '');
    const address = normalize(data.address || event?.location || data.district || '');
    return `legacy:${name}|${date}|${time}|${type}|${address}`;
  }

  function aliases(event = {}, data = {}) {
    const result = new Set();
    const id = String(event?.id || data.eventId || '').trim();
    const pmkId = String(data.pmkId || event?._pmkId || event?.pmkData?.pmkId || '').trim();
    const logical = logicalKey(event, data);
    if (id) result.add(`id:${id}`);
    if (pmkId) result.add(`pmk:${pmkId}`);
    if (logical) result.add(`logical:${logical}`);
    return [...result];
  }

  function hash(value = '') {
    let h = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function stablePmkId(event = {}, data = {}) {
    const existing = String(data.pmkId || event?._pmkId || event?.pmkData?.pmkId || '').trim();
    return existing || `legacy-${hash(logicalKey(event, data))}`;
  }

  function newest(records = []) {
    return records.filter(Boolean).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] || null;
  }

  function resolve(event = {}, data = {}) {
    const store = readStore();
    return newest(aliases(event, data).map(alias => store[alias]));
  }

  function mark(event = {}, data = {}, status, extra = {}) {
    const now = extra.updatedAt || new Date().toISOString();
    const record = {
      status: String(status || data.requestStatus || ''),
      updatedAt: now,
      contractNumber: String(extra.contractNumber ?? data.contractNumber ?? ''),
      workStartedAt: String(extra.workStartedAt ?? data.workStartedAt ?? ''),
      completedAt: String(extra.completedAt ?? data.completedAt ?? (status === 'completed' ? now : '')),
      logicalKey: logicalKey(event, data),
      pmkId: stablePmkId(event, data),
    };
    const store = readStore();
    aliases(event, { ...data, pmkId: record.pmkId }).forEach(alias => { store[alias] = record; });
    const cutoff = Date.now() - MAX_AGE_MS;
    Object.keys(store).forEach(alias => {
      if (new Date(store[alias]?.updatedAt || 0).getTime() < cutoff) delete store[alias];
    });
    writeStore(store);
    try { globalThis.dispatchEvent?.(new CustomEvent('pmk-status-ledger-updated', { detail:{ status:record.status, logicalKey:record.logicalKey } })); } catch {}
    return record;
  }

  function statusFromDescription(description = '') {
    const match = String(description || '').match(/Статус\s*ПМК\s*:\s*([^\n\r]+)/i);
    if (!match) return '';
    const label = normalize(match[1]);
    if (/выполн|готов/.test(label)) return 'completed';
    if (/забрал|в работ/.test(label)) return 'picked-up';
    if (/ожидает достав|доставк/.test(label)) return 'pending-delivery';
    if (/ожидает забор|забор/.test(label)) return 'pending-pickup';
    return '';
  }

  function contractFromDescription(description = '') {
    return String(description || '').match(/Договор\s*ПМК\s*:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  }

  function apply(event = {}, data = {}) {
    const record = resolve(event, data);
    const descriptionStatus = statusFromDescription(event?.description || '');
    const descriptionContract = contractFromDescription(event?.description || '');
    if (!record && !descriptionStatus && !descriptionContract) return data;
    return {
      ...data,
      pmkId: data.pmkId || record?.pmkId || stablePmkId(event, data),
      requestStatus: record?.status || descriptionStatus || data.requestStatus,
      contractNumber: record?.contractNumber || descriptionContract || data.contractNumber || '',
      workStartedAt: record?.workStartedAt || data.workStartedAt || '',
      completedAt: record?.completedAt || data.completedAt || (descriptionStatus === 'completed' ? (event?.updated || '') : ''),
    };
  }

  function sameLogical(eventA = {}, dataA = {}, eventB = {}, dataB = {}) {
    return logicalKey(eventA, dataA) === logicalKey(eventB, dataB);
  }

  globalThis.eventMeta = function eventMetaWithLedgerV80(event) {
    return apply(event, previousEventMeta(event));
  };

  globalThis.PMK_STATUS_LEDGER_V80_API = {
    key: logicalKey,
    aliases,
    resolve,
    mark,
    apply,
    sameLogical,
    stablePmkId,
    storageKey: STORAGE_KEY,
  };
})();