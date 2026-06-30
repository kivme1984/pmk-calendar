'use strict';

const assert = require('assert');
require('../archive-policy-v82.js');

const policy = global.PMK_ARCHIVE_POLICY_V82_API;
const now = Date.parse('2026-07-01T12:00:00Z');
const recent = { id:'recent', completedAt:'2026-06-25T12:00:01Z' };
const weekOld = { id:'week-old', completedAt:'2026-06-24T12:00:00Z' };

assert.equal(policy.isArchived(recent.completedAt, now), false, 'Событие младше недели не должно быть в архиве');
assert.equal(policy.isArchived(weekOld.completedAt, now), true, 'Событие возрастом 7 дней должно перейти в архив');

const result = policy.split([recent, weekOld], item => item.completedAt, now);
assert.deepEqual(result.active.map(item => item.id), ['recent']);
assert.deepEqual(result.archived.map(item => item.id), ['week-old']);

console.log('PASS 1: недавняя заявка остаётся во вкладке Выполнено');
console.log('PASS 2: заявка старше недели автоматически переходит в Архив');
console.log('ALL ARCHIVE V82 TESTS PASSED');
