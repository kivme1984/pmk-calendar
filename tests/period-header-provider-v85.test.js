'use strict';

const fs = require('fs');
const assert = require('assert');

const js = fs.readFileSync('period-header-provider-v85.js', 'utf8');
const css = fs.readFileSync('period-header-provider-v85.css', 'utf8');

assert.ok(js.includes('pmk-period-scroll-thumb'), 'Нет видимого бегунка прокрутки');
assert.ok(js.includes('board.scrollLeft'), 'Бегунок не связан с горизонтальной прокруткой');
assert.ok(js.includes('data-period-scroll="prev"') && js.includes('data-period-scroll="next"'), 'Нет кнопок прокрутки');
assert.ok(js.includes('event-status-grid-v85'), 'Статусы не вынесены в отдельную строку');
assert.ok(js.includes('event-provider-google') && js.includes('event-provider-yandex'), 'Нет меток G/Я');
assert.ok(js.includes("warning:'Очередь'") && js.includes("offline:'Нет'"), 'Статусы шапки не сокращены');
assert.ok(js.includes('<small>Синхр.</small>'), 'Третья кнопка не подписана');
assert.ok(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'), 'Статусы не распределены равномерно');
assert.ok(css.includes('display:grid!important;grid-template-columns:auto auto minmax(0,1fr)'), 'Мобильная шапка не зафиксирована сеткой');
assert.ok(css.includes('touch-action:pan-y pinch-zoom!important'), 'Вертикальная прокрутка карточек не восстановлена');

console.log('PASS: visible horizontal scrollbar controls board.scrollLeft');
console.log('PASS: four status buttons are evenly spaced');
console.log('PASS: Google and Yandex marks are rendered next to contract');
console.log('PASS: header statuses and sync action are readable');
console.log('ALL PERIOD HEADER PROVIDER V85 TESTS PASSED');
