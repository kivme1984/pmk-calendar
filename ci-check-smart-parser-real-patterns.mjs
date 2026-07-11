import assert from 'node:assert/strict';
import parser from './smart-parser-next.js';

const cases = [
  {
    name: 'slash dimensions in centimeters',
    text: 'Три коврика: 150/80, 180/120, 170/115. Просто стирка, удалять пятна не нужно.',
    check(result) {
      assert.equal(result.rugs.length, 3);
      assert.deepEqual(result.rugs.map(rug => [rug.length, rug.width]), [[1.5, 0.8], [1.8, 1.2], [1.7, 1.15]]);
      assert.ok(result.rugs.every(rug => rug.services.stainRemoval === 'denied'));
    },
  },
  {
    name: 'measure on site for declared count',
    text: 'Три ковра, замер на месте. Один ковёр в подарок.',
    check(result) {
      assert.equal(result.rugs.length, 3);
      assert.ok(result.rugs.every(rug => rug.measurementStatus === 'measure-at-workshop'));
    },
  },
  {
    name: 'same dimensions for two rugs',
    text: 'Два ковра одинаковые, 1,33*1,95, кондиционер.',
    check(result) {
      assert.equal(result.rugs.length, 2);
      assert.ok(result.rugs.every(rug => rug.length === 1.95 && rug.width === 1.33));
      assert.ok(result.rugs.every(rug => rug.services.conditioner === 'confirmed'));
    },
  },
  {
    name: 'conditional stains explicitly denied',
    text: 'Четыре ковра. Пятна если есть не выводим. Просто стирка.',
    check(result) {
      assert.equal(result.rugs.length, 4);
      assert.ok(result.rugs.every(rug => rug.services.stainRemoval === 'denied'));
    },
  },
  {
    name: 'conditioner not needed',
    text: 'Ковер 3*4, если пятна плюс обработка. Конд не нужен.',
    check(result) {
      assert.equal(result.rugs[0].services.stainRemoval, 'review');
      assert.equal(result.rugs[0].services.conditioner, 'denied');
    },
  },
  {
    name: 'underscore time range',
    text: 'Забор с11_14 ч. Клиент дома.',
    check(result) {
      assert.ok(result.time.constraints.some(item => item.type === 'range' && item.from === '11:00' && item.to === '14:00'));
    },
  },
  {
    name: 'call ahead without call verb',
    text: 'За 15 мин ждёт. Ковер 2*3.',
    check(result) {
      assert.equal(result.time.callAheadMinutes, 15);
    },
  },
  {
    name: 'barrier typo and free entrance',
    text: 'Шлакбаум, домофона нет в доме, вход свободный. Улица Новая 10-5.',
    check(result) {
      assert.ok(result.addresses.primaryAddress.instructions.includes('Шлагбаум'));
      assert.ok(result.addresses.primaryAddress.instructions.some(note => /Домофон/i.test(note)));
    },
  },
  {
    name: 'ten digit phone gets Russian country code',
    text: 'Ул. Новая 5, Валерия 9535514477. Ковер 2*3.',
    check(result) {
      assert.equal(result.phones[0].phone, '+79535514477');
    },
  },
  {
    name: 'long pile plus urine and pet hair are separate',
    text: 'Ковер 1,6*2,3 длинный ворс, пятно мочи, запах мочи, вычесывание шерсти.',
    check(result) {
      assert.equal(result.rugs[0].pile, 'Более 1 см');
      assert.equal(result.rugs[0].services.stainRemoval, 'confirmed');
      assert.equal(result.rugs[0].services.urineOdorRemoval, 'confirmed');
      assert.equal(result.rugs[0].services.petHairRemoval, 'confirmed');
    },
  },
];

let passed = 0;
for (const item of cases) {
  const parsed = parser.parse(item.text);
  try {
    item.check(parsed);
    passed += 1;
  } catch (error) {
    console.error(`FAILED REAL PATTERN: ${item.name}`);
    console.error(JSON.stringify(parsed, null, 2));
    throw error;
  }
}

console.log(JSON.stringify({ passed, total: cases.length, suite: 'real-patterns' }));
