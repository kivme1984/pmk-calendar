import assert from 'node:assert/strict';
import parser from './smart-parser-next-core.js';

const cases = [
  {
    name: 'compact address, contact, source and wool rug',
    text: 'Д-120 Советский забор Героя Труда 12к2-45 п3э7 Марина +79000000001 Авито2. Ковер 2*3 шерстяной, пятна, кондиционер. С 16-19ч.',
    check(result) {
      assert.equal(result.contractNumber, 'Д-120');
      assert.equal(result.district, 'Советский');
      assert.equal(result.orderSource, 'Avito 2');
      assert.equal(result.phones[0].phone, '+79000000001');
      assert.equal(result.addresses.primaryAddress.house, '12к2');
      assert.equal(result.addresses.primaryAddress.apartment, '45');
      assert.equal(result.addresses.primaryAddress.entrance, '3');
      assert.equal(result.addresses.primaryAddress.floor, '7');
      assert.equal(result.rugs[0].material.value, 'Шерсть');
      assert.equal(result.rugs[0].services.stainRemoval, 'confirmed');
      assert.equal(result.rugs[0].services.conditioner, 'confirmed');
    },
  },
  {
    name: 'return address separated from pickup',
    text: 'Д-121 Сормово ул. Весенняя 8Б, кв.18, подъезд 1, этаж 5. Екатерина 89000000002. Назад везти на ул. Зимняя 24-47. Ковер 3*4, просто стирка.',
    check(result) {
      assert.equal(result.addresses.primaryAddress.house.toLowerCase(), '8б');
      assert.equal(result.addresses.primaryAddress.apartment, '18');
      assert.equal(result.addresses.returnAddress.house, '24');
      assert.equal(result.addresses.returnAddress.apartment, '47');
      assert.equal(result.rugs[0].services.basicWash, 'confirmed');
    },
  },
  {
    name: 'two contacts and roles',
    text: 'Голубева 31-39. Там встретит Татьяна 89000000003. Заказчик Светлана +79000000004. После 16:00. Два ковра измерить в цеху.',
    check(result) {
      assert.equal(result.phones.length, 2);
      assert.ok(result.phones.some(item => item.role === 'Встречает курьера'));
      assert.ok(result.phones.some(item => item.role === 'Заказчик'));
      assert.equal(result.rugs.length, 2);
      assert.ok(result.rugs.every(rug => rug.measurementStatus === 'measure-at-workshop'));
    },
  },
  {
    name: 'negated conditioner and pet hair service',
    text: 'Щербинки 1 дом 10Б кв 67. Ковер 2*3, пятна. Шерсть есть, но шерсть не чесать. Конд не хочет. Цена 2600 руб.',
    check(result) {
      assert.equal(result.rugs[0].services.stainRemoval, 'confirmed');
      assert.equal(result.rugs[0].services.petHairRemoval, 'denied');
      assert.equal(result.rugs[0].services.conditioner, 'denied');
      assert.equal(result.price.amount, 2600);
    },
  },
  {
    name: 'review stains instead of confirmed service',
    text: 'Д-122 Канавинский Зеленая 131-5 Николай +79000000005 сайт. Цена 3670. Посмотреть пятна. Ковры 5*1,5 и 2*1,5.',
    check(result) {
      assert.equal(result.orderSource, 'Сайт');
      assert.equal(result.rugs.length, 2);
      assert.equal(result.rugs[0].services.stainRemoval, 'review');
      assert.equal(result.rugs[1].services.stainRemoval, 'review');
    },
  },
  {
    name: 'dimensions in centimeters converted to meters',
    text: 'Два ковра синтетика: 230*160 и 300*79. На первом пластилин и краски. Шерсть вычесывать не надо.',
    check(result) {
      assert.equal(result.rugs.length, 2);
      assert.equal(result.rugs[0].length, 2.3);
      assert.equal(result.rugs[0].width, 1.6);
      assert.equal(result.rugs[1].length, 3);
      assert.equal(result.rugs[1].width, 0.79);
      assert.equal(result.rugs[0].services.petHairRemoval, 'denied');
    },
  },
  {
    name: 'high pile shaggy and pile lifting',
    text: 'Ковер Шегги 2,3*1,6, вычесывание волос, кондиционер и поднятие ворса. Цена 2500 руб.',
    check(result) {
      assert.equal(result.rugs[0].pile, 'Более 1 см');
      assert.equal(result.rugs[0].services.petHairRemoval, 'confirmed');
      assert.equal(result.rugs[0].services.pileLifting, 'confirmed');
    },
  },
  {
    name: 'unknown composition and conditional price',
    text: 'Ковер 2*3, возможно хлопок, запах мочи. Цена либо 2800 если синтетика, либо 5500 если хлопок.',
    check(result) {
      assert.equal(result.rugs[0].material.value, 'Хлопок');
      assert.equal(result.rugs[0].material.certainty, 'uncertain');
      assert.equal(result.rugs[0].services.urineOdorRemoval, 'confirmed');
      assert.equal(result.price.conditional, true);
      assert.ok(result.price.candidates.includes(2800));
      assert.ok(result.price.candidates.includes(5500));
    },
  },
  {
    name: 'oval rugs and runner',
    text: 'Два овальных ковра 100x310 и 150x225, плюс дорожка 100x310. Пятна с двух ковров, шерсть со всех, кондиционер на все.',
    check(result) {
      assert.equal(result.rugs.length, 3);
      assert.equal(result.rugs[0].shape, 'Овальный');
      assert.equal(result.rugs[2].shape, 'Дорожка');
      assert.equal(result.rugs[0].services.stainRemoval, 'confirmed');
      assert.equal(result.rugs[2].services.conditioner, 'confirmed');
    },
  },
  {
    name: 'access instructions and call ahead',
    text: 'Ул. Садовая 25-10, подъезд 1, этаж 4. Шлагбаум на замке, позвонить за 30 минут. Код домофона 2915#. Аркадий +79000000006.',
    check(result) {
      assert.equal(result.addresses.primaryAddress.accessCode, '2915#');
      assert.ok(result.addresses.primaryAddress.instructions.includes('Шлагбаум'));
      assert.equal(result.time.callAheadMinutes, 30);
    },
  },
  {
    name: 'daypart and all day constraints',
    text: 'Клиент дома весь день, но забор лучше вечером. Ковер маленький, размер неизвестен.',
    check(result) {
      assert.ok(result.time.constraints.some(item => item.type === 'all-day'));
      assert.ok(result.time.constraints.some(item => item.type === 'daypart'));
      assert.equal(result.rugs[0].measurementStatus, 'measure-at-workshop');
    },
  },
  {
    name: 'regular client and discount wording',
    text: 'Наш клиент. Ковер примерно 2*3, стирка с кондиционером со скидкой п/к. Ориентировочно 2160 руб.',
    check(result) {
      assert.equal(result.regularCustomer, true);
      assert.equal(result.rugs[0].approximate, true);
      assert.equal(result.price.conditional, true);
    },
  },
  {
    name: 'technical event excluded from corpus',
    text: 'забор доставка низ 10-14',
    check(result) {
      assert.equal(result.corpusEligible, false);
    },
  },
  {
    name: 'real request eligible for corpus',
    text: 'Д-130 Ленинский, улица Новая 7-15, подъезд 2, этаж 3. Ольга +79000000007. Ковер 2*3.',
    check(result) {
      assert.equal(result.corpusEligible, true);
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
    console.error(`FAILED: ${item.name}`);
    console.error(JSON.stringify(parsed, null, 2));
    throw error;
  }
}

console.log(JSON.stringify({ passed, total: cases.length }));
