'use strict';

// Regression trigger after workflow installation.
const assert = require('assert');
require('../period-model-v83.js');

const model = global.PMK_PERIOD_MODEL_V83_API;

const june = Array.from({ length:30 }, (_, index) => `2026-06-${String(index + 1).padStart(2,'0')}`);
const cells = model.monthCells(june);
assert.equal(cells.length % 7, 0, 'Месяц должен состоять из полных недель');
assert.equal(cells[0], '2026-06-01', 'Июнь 2026 начинается с понедельника');
assert.equal(cells[cells.length - 1], null, 'Конец месяца должен дополняться пустыми ячейками');

const schedule = {
  1:[['14:00','16:00','Автозаводский'],['16:00','17:00','Ленинский'],['17:00','18:00','Канавинский'],['18:00','19:00','Ленинский']],
};
assert.deepEqual(model.workingDistricts(schedule, '2026-06-29'), ['Автозаводский','Ленинский','Канавинский']);

const events = [
  { id:'p', visitType:'pickup', phone:'+79990000001', address:'Адрес 1' },
  { id:'d', visitType:'delivery', phone:'+79990000002', address:'Адрес 2' },
  { id:'a', visitType:'pickup', phone:'', address:'Адрес 3' },
];
const meta = event => event;
const address = event => event.address;
assert.deepEqual(model.filterDayEvents(events, 'pickup', meta, address).map(item => item.id), ['p','a']);
assert.deepEqual(model.filterDayEvents(events, 'delivery', meta, address).map(item => item.id), ['d']);
assert.deepEqual(model.filterDayEvents(events, 'attention', meta, address).map(item => item.id), ['a']);

console.log('PASS: month table starts on Monday and uses complete weeks');
console.log('PASS: working districts are unique');
console.log('PASS: pickup, delivery and attention filters work');
console.log('ALL PERIOD V83 TESTS PASSED');
