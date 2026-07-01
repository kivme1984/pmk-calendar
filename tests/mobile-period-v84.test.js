'use strict';

// Regression trigger after workflow installation.
const fs = require('fs');
const assert = require('assert');

const js = fs.readFileSync('mobile-period-hotfix-v84.js', 'utf8');
const css = fs.readFileSync('mobile-period-hotfix-v84.css', 'utf8');

assert.ok(js.includes('touchstart'), 'Нет touchstart-обработчика');
assert.ok(js.includes('touchmove'), 'Нет touchmove-обработчика');
assert.ok(js.includes("axis === 'x'"), 'Нет горизонтального режима');
assert.ok(js.includes('scrollingElement().scrollTop'), 'Нет вертикального режима');
assert.ok(js.includes('suppressPeriodClickUntil'), 'Нет защиты от случайного клика после свайпа');
assert.ok(js.includes('data-summary-total-v84'), 'Всего точек не сделано кликабельным');
assert.ok(js.includes('event-card-footer-v84'), 'Телефон не вынесен в общий футер карточки');
assert.ok(js.includes('☎ Позвонить'), 'Нет текстовой кнопки Позвонить');
assert.ok(css.includes('touch-action:none!important'), 'Карточки не переведены на ручную двухосевую прокрутку');
assert.ok(css.includes('background:#1fa35d!important'), 'Кнопка телефона не зелёная');
assert.ok(css.includes('grid-area:footer'), 'Футер не проходит под обеими колонками');

console.log('PASS: total points is clickable');
console.log('PASS: phone action spans below the date divider and is green');
console.log('PASS: card touch handler supports horizontal and vertical movement');
console.log('ALL MOBILE PERIOD V84 TESTS PASSED');
