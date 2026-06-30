'use strict';

// Regression run trigger: v81 instant removal after workflow installation.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const { performance } = require('perf_hooks');

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
}

class FakeClassList {
  constructor() { this.items = new Set(); }
  add(...items) { items.forEach(item => this.items.add(item)); }
  remove(...items) { items.forEach(item => this.items.delete(item)); }
  contains(item) { return this.items.has(item); }
}

function makeCard(id) {
  const container = {
    children: [],
    innerHTML: '',
    querySelector() { return this.children.find(item => !item.removed) || null; },
  };
  const card = {
    id,
    dataset:{ eventCard:id },
    classList:new FakeClassList(),
    parentElement:container,
    removed:false,
    appendChild() {},
    remove() { this.removed = true; container.children = container.children.filter(item => item !== this); },
  };
  container.children.push(card);
  return card;
}

function makeButton(id, status, card) {
  return {
    dataset:{ statusEvent:id, status }, textContent:status, disabled:false,
    classList:new FakeClassList(),
    closest(selector) { return selector === '.event-card' ? card : null; },
  };
}

const cardA = makeCard('event-a');
const cardB = makeCard('event-b');
const buttonA = makeButton('event-a', 'completed', cardA);
const buttonB = makeButton('event-b', 'completed', cardB);
const buttons = [buttonA, buttonB];
const cards = [cardA, cardB];

const events = [
  { id:'event-a', _provider:'yandex', _pmkId:'pmk-a', start:{ dateTime:'2026-06-30T18:00:00+03:00' }, pmkData:{ pmkId:'pmk-a', customerName:'Тест A', phone:'+7 999 100-00-01', address:'Адрес A', visitDate:'2026-06-30', startTime:'18:00', endTime:'18:30', visitType:'delivery', requestStatus:'pending-delivery' } },
  { id:'event-b', _provider:'google', _pmkId:'pmk-b', start:{ dateTime:'2026-06-30T19:00:00+03:00' }, pmkData:{ pmkId:'pmk-b', customerName:'Тест B', phone:'+7 999 100-00-02', address:'Адрес B', visitDate:'2026-06-30', startTime:'19:00', endTime:'19:30', visitType:'delivery', requestStatus:'pending-delivery' } },
];

global.localStorage = new MemoryStorage();
global.CustomEvent = class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
global.dispatchEvent = () => true;
global.addEventListener = () => {};
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.requestIdleCallback = callback => setTimeout(callback, 0);
global.CSS = { escape:value => String(value) };
global.document = {
  body:{ appendChild() {} },
  addEventListener() {},
  createElement() { return { className:'', textContent:'', dataset:{}, classList:new FakeClassList(), appendChild() {}, addEventListener() {}, close() {}, setAttribute() {} }; },
  querySelector(selector) {
    const cardMatch = selector.match(/^\[data-event-card="(.+)"\]$/);
    if (cardMatch) return cards.find(card => card.id === cardMatch[1] && !card.removed) || null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '[data-status-event][data-status]') return buttons;
    return [];
  },
};
global.state = { events, localEvents:[], currentView:'delivery-waiting', selectedDayKey:'2026-06-30' };
global.getAllEvents = () => events;
global.eventMeta = event => ({ ...event.pmkData });
global.eventDateKey = event => String(event.start.dateTime).slice(0, 10);
global.displayAddress = data => data.address || '';
global.persistLocalEvents = () => {};
global.invalidateEventCaches = () => {};
global.statusInfo = status => ({ label: status === 'completed' ? 'Выполнено' : status });
global.showToast = () => {};
global.toGoogleEvent = data => ({ description:`Статус ПМК: ${data.requestStatus === 'completed' ? 'Выполнено' : data.requestStatus}`, start:{ dateTime:`${data.visitDate}T${data.startTime}:00+03:00` }, end:{ dateTime:`${data.visitDate}T${data.endTime}:00+03:00` } });
global.renderAll = () => {
  const start = performance.now();
  while (performance.now() - start < 4000) {}
};
global.refreshEvents = async () => {
  await new Promise(resolve => setTimeout(resolve, 4000));
};
global.PMK_PROVIDER_CRUD_ANY_CALENDAR_V72_API = {
  async saveToAvailableProviders() {
    await new Promise(resolve => setTimeout(resolve, 4000));
    return { results:[{ provider:'Яндекс', ok:true }] };
  },
};

vm.runInThisContext(fs.readFileSync('status-ledger-v80.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('status-pipeline-v81.js', 'utf8'));

async function waitRemoved(card, limitMs = 200) {
  const start = performance.now();
  while (!card.removed && performance.now() - start < limitMs) await new Promise(resolve => setTimeout(resolve, 2));
  return performance.now() - start;
}

(async () => {
  const startA = performance.now();
  PMK_STATUS_PIPELINE_V81_API.applyStatus('event-a', 'completed', { sourceButton:buttonA });
  const elapsedA = await waitRemoved(cardA);
  assert.equal(cardA.removed, true, 'Первая карточка не была удалена');
  assert.ok(elapsedA < 200, `Первая карточка удалялась ${elapsedA.toFixed(1)} мс`);
  assert.ok(performance.now() - startA < 500, 'Первая операция заблокировала интерфейс');
  console.log(`PASS 1: первая карточка удалена за ${elapsedA.toFixed(1)} мс`);

  const startB = performance.now();
  PMK_STATUS_PIPELINE_V81_API.applyStatus('event-b', 'completed', { sourceButton:buttonB });
  const elapsedB = await waitRemoved(cardB);
  assert.equal(cardB.removed, true, 'Вторая карточка не была удалена');
  assert.ok(elapsedB < 200, `Вторая карточка удалялась ${elapsedB.toFixed(1)} мс`);
  assert.ok(performance.now() - startB < 500, 'Вторая операция заблокировала интерфейс');
  console.log(`PASS 2: вторая карточка удалена за ${elapsedB.toFixed(1)} мс`);
  console.log('ALL INSTANT TWO-EVENT TESTS PASSED');
  process.exit(0);
})().catch(error => { console.error(error); process.exit(1); });