'use strict';

/* Запуск: node tests/status-v80-two-events.test.js из корня репозитория. */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
}

global.localStorage = new MemoryStorage();
global.CustomEvent = class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
global.dispatchEvent = () => true;
global.addEventListener = () => {};
global.requestAnimationFrame = fn => { fn(); return 1; };
global.CSS = { escape: value => String(value) };
global.MutationObserver = class { observe() {} };
global.document = {
  readyState: 'complete', addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
  createElement() { return { className:'', textContent:'', dataset:{}, appendChild() {}, addEventListener() {}, closest() { return null; } }; },
  body: { appendChild() {} },
};
global.showToast = () => {};
global.displayAddress = data => data.address || '';
global.statusInfo = status => ({ label: { completed:'Выполнено', 'picked-up':'Забрали', 'pending-delivery':'Ожидает доставки' }[status] || status });
global.eventDateKey = event => String(event.start?.dateTime || event.start || '').slice(0, 10);
global.businessDateTimeParts = value => ({ date:String(value).slice(0, 10), time:(String(value).match(/T(\d\d:\d\d)/) || [])[1] || '' });
global.businessTodayKey = () => '2026-06-30';
global.dateKeyForDisplay = key => new Date(`${key}T12:00:00Z`);
global.escapeHtml = value => String(value);
global.bindEventActions = () => {};
global.renderEventCard = event => `<article data-event-card="${event.id}"></article>`;
global.pushAppHistory = () => {};
global.persistLocalEvents = () => {};
global.invalidateEventCaches = () => {};
global.renderToday = () => {};
global.renderAll = () => {};
global.setView = () => {};
global.toGoogleEvent = data => ({
  summary: `${data.visitType === 'delivery' ? 'ДОСТАВКА' : 'ЗАБОР'} • ${data.customerName}`,
  description: `Статус ПМК: ${{ completed:'Выполнено', 'pending-delivery':'Ожидает доставки', 'picked-up':'Забрали' }[data.requestStatus] || data.requestStatus}`,
  location: data.address || '', start:{ dateTime:`${data.visitDate}T${data.startTime}:00+03:00` },
  end:{ dateTime:`${data.visitDate}T${data.endTime || data.startTime}:00+03:00` }, extendedProperties:{ private:{} },
});

const firstStale = {
  id:'local-yandex-order-101', _provider:'yandex', _pmkId:'order-101', updated:'2026-06-30T20:00:00Z',
  start:{ dateTime:'2026-06-30T18:00:00+03:00' }, location:'ул. Первая, 1',
  pmkData:{ pmkId:'order-101', customerName:'Тест Один', phone:'+7 999 111-22-33', address:'ул. Первая, 1', visitDate:'2026-06-30', startTime:'18:00', endTime:'18:30', visitType:'delivery', requestStatus:'pending-delivery' },
};
const secondStale = {
  id:'google-old-202', updated:'2026-06-30T20:02:00Z', summary:'ДОСТАВКА • Тест Два • Советский',
  start:{ dateTime:'2026-06-30T19:00:00+03:00' }, location:'ул. Вторая, 2',
  pmkData:{ customerName:'Тест Два', phone:'+7 999 444-55-66', address:'ул. Вторая, 2', visitDate:'2026-06-30', startTime:'19:00', endTime:'19:30', visitType:'delivery', requestStatus:'pending-delivery' },
};

global.state = { events:[structuredClone(firstStale), structuredClone(secondStale)], localEvents:[], currentView:'delivery-waiting', selectedDayKey:'2026-06-30' };
global.getAllEvents = () => state.events;
global.eventMeta = event => ({ ...(event.pmkData || {}), requestStatus:event.pmkData?.requestStatus || (/Выполнено/.test(event.description || '') ? 'completed' : 'pending-delivery'), address:event.pmkData?.address || event.location || '' });
global.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72_API = { async saveToAvailableProviders(data, preferredId) { return { results:[{ provider:'Яндекс', ok:true, value:{ data, preferredId } }] }; } };
let refreshCount = 0;
global.refreshEvents = async () => {
  refreshCount += 1;
  if (refreshCount === 1) {
    state.events = [structuredClone(firstStale), structuredClone(secondStale)];
  } else {
    const ledger = global.PMK_STATUS_LEDGER_V80_API;
    const data = eventMeta(secondStale);
    const pmkId = ledger.stablePmkId(secondStale, data);
    const mirror = { id:`local-yandex-${pmkId}`, _provider:'yandex', _pmkId:pmkId, updated:'2026-06-30T20:04:00Z', start:{ dateTime:'2026-06-30T19:00:00+03:00' }, location:'ул. Вторая, 2', pmkData:{ ...data, pmkId, requestStatus:'completed', completedAt:'2026-06-30T20:03:00Z' } };
    state.events = [structuredClone(firstStale), structuredClone(secondStale), mirror];
  }
};

vm.runInThisContext(fs.readFileSync('status-ledger-v80.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('status-pipeline-v80.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('completed-workflow-v80.js', 'utf8'));

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const activeDelivery = () => state.events.filter(event => eventMeta(event).requestStatus === 'pending-delivery');

(async () => {
  PMK_STATUS_PIPELINE_V80_API.applyStatus('local-yandex-order-101', 'completed');
  await delay(30);
  assert.equal(activeDelivery().some(event => event.id === 'local-yandex-order-101'), false);
  assert.equal(PMK_COMPLETED_WORKFLOW_V80_API.events().filter(event => PMK_STATUS_LEDGER_V80_API.key(event, eventMeta(event)).includes('9991112233')).length, 1);
  console.log('PASS 1: структурированная заявка не вернулась после старого ответа синхронизации');

  PMK_STATUS_PIPELINE_V80_API.applyStatus('google-old-202', 'completed');
  await delay(30);
  assert.equal(activeDelivery().some(event => event.id === 'google-old-202'), false);
  const completed = PMK_COMPLETED_WORKFLOW_V80_API.events();
  const secondKey = PMK_STATUS_LEDGER_V80_API.key(secondStale, eventMeta(secondStale));
  assert.equal(completed.filter(event => PMK_STATUS_LEDGER_V80_API.key(event, eventMeta(event)) === secondKey).length, 1);
  assert.equal(completed.length, 2);
  console.log('PASS 2: старая заявка и зеркало Яндекса не вернулись и не задублировались');
  console.log('ALL TWO-EVENT TESTS PASSED');
})().catch(error => { console.error(error); process.exit(1); });