'use strict';

(() => {
  const STORAGE_KEY = 'pmk-smart-paste-draft-v1';
  const MONTHS = {
    января: 1, январь: 1, февраля: 2, февраль: 2, марта: 3, март: 3,
    апреля: 4, апрель: 4, мая: 5, май: 5, июня: 6, июнь: 6,
    июля: 7, июль: 7, августа: 8, август: 8, сентября: 9, сентябрь: 9,
    октября: 10, октябрь: 10, ноября: 11, ноябрь: 11, декабря: 12, декабрь: 12,
  };
  const WEEKDAYS = {
    воскресенье: 0, воскресенья: 0,
    понедельник: 1, понедельника: 1,
    вторник: 2, вторника: 2,
    среда: 3, среду: 3, среды: 3,
    четверг: 4, четверга: 4,
    пятница: 5, пятницу: 5, пятницы: 5,
    суббота: 6, субботу: 6, субботы: 6,
  };
  const SETTLEMENT_ALIASES = [
    ['Нижний Новгород', /нижн(?:ий|его)?\s+новгород|\bнн\b/i],
    ['Бор', /(?:город\s+)?бор\b/i],
    ['Дзержинск', /дзержинск/i],
    ['Кстово', /кстов/i],
    ['Богородск', /богородск/i],
    ['Балахна', /балахн/i],
    ['Городец', /городец/i],
    ['Павлово', /павлов/i],
    ['Арзамас', /арзамас/i],
  ];
  const DISTRICT_ALIASES = [
    ['Автозаводский', /автозаводск|автозавод|автоз/i],
    ['Ленинский', /ленинск/i],
    ['Канавинский', /канавинск|канавин/i],
    ['Московский', /московск(?:ий|ого)?\s+(?:район|р-н)|московский\s+район/i],
    ['Сормовский', /сормовск|сормов/i],
    ['Нижегородский', /нижегородск(?:ий|ого)?\s+(?:район|р-н)|нижегородский\s+район/i],
    ['Советский', /советск(?:ий|ого)?\s+(?:район|р-н)|советский\s+район/i],
    ['Приокский', /приокск|приок/i],
  ];
  const UNITS = {
    ноль: 0, нуль: 0, один: 1, одна: 1, одно: 1, первого: 1, первый: 1, первая: 1, первом: 1,
    два: 2, две: 2, второго: 2, второй: 2, вторая: 2, втором: 2,
    три: 3, третьего: 3, третий: 3, третья: 3, третьем: 3,
    четыре: 4, четвертого: 4, четвёртого: 4, четвертый: 4, четвёртый: 4, четвертая: 4, четвёртая: 4,
    пять: 5, пятого: 5, пятый: 5, пятая: 5, пятом: 5,
    шесть: 6, шестого: 6, шестой: 6, шестая: 6,
    семь: 7, седьмого: 7, седьмой: 7, седьмая: 7,
    восемь: 8, восьмого: 8, восьмой: 8, восьмая: 8,
    девять: 9, девятого: 9, девятый: 9, девятая: 9,
  };
  const TEENS = {
    десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14,
    пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18, девятнадцать: 19,
  };
  const TENS = {
    двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50,
    шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90,
  };
  const HUNDREDS = {
    сто: 100, двести: 200, триста: 300, четыреста: 400, пятьсот: 500,
    шестьсот: 600, семьсот: 700, восемьсот: 800, девятьсот: 900,
  };
  const DIGIT_WORDS = {
    ноль: '0', нуль: '0', один: '1', одна: '1', два: '2', две: '2', три: '3', четыре: '4',
    пять: '5', шесть: '6', семь: '7', восемь: '8', девять: '9',
  };
  const NUMBER_WORD_SOURCE = [
    ...Object.keys(UNITS), ...Object.keys(TEENS), ...Object.keys(TENS), ...Object.keys(HUNDREDS),
    'тысяча', 'тысячи', 'тысяч', 'полтора', 'полторы', 'половина', 'половиной',
    'четверть', 'четвертью', 'целая', 'целых', 'десятая', 'десятых', 'сотая', 'сотых',
    'точка', 'запятая',
  ].sort((a, b) => b.length - a.length).join('|');
  const NUMBER_PHRASE = `(?:\\d+(?:[.,]\\d+)?|(?:${NUMBER_WORD_SOURCE})(?:[\\s-]+(?:${NUMBER_WORD_SOURCE}|\\d+))*)`;

  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const unique = values => [...new Set((values || []).filter(Boolean))];
  const titleCase = value => clean(value).toLowerCase().replace(/(^|[\s-])[а-яё]/g, char => char.toUpperCase());
  const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function normalizeSpeech(text = '') {
    return String(text)
      .replace(/\r/g, '\n')
      .replace(/[«»„“”]/g, '"')
      .replace(/\bномер\s+номер\b/gi, 'номер')
      .replace(/\bикс\b/gi, ' на ')
      .replace(/\bумножить\s+на\b/gi, ' на ')
      .replace(/\s*([,;])\s*/g, '$1 ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function tokensOf(value = '') {
    return clean(value)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^а-яa-z0-9.,-]+/gi, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function integerFromWords(value = '') {
    const tokens = tokensOf(value);
    let total = 0;
    let current = 0;
    let found = false;
    for (const original of tokens) {
      const token = original.replace(/ё/g, 'е');
      if (/^\d+$/.test(token)) {
        current += Number(token);
        found = true;
      } else if (UNITS[token] !== undefined) {
        current += UNITS[token];
        found = true;
      } else if (TEENS[token] !== undefined) {
        current += TEENS[token];
        found = true;
      } else if (TENS[token] !== undefined) {
        current += TENS[token];
        found = true;
      } else if (HUNDREDS[token] !== undefined) {
        current += HUNDREDS[token];
        found = true;
      } else if (/^тысяч/.test(token)) {
        total += (current || 1) * 1000;
        current = 0;
        found = true;
      }
    }
    return found ? total + current : NaN;
  }

  function decimalDigitsFromWords(value = '') {
    const tokens = tokensOf(value);
    const digits = [];
    for (const token of tokens) {
      if (/^\d+$/.test(token)) digits.push(token);
      else if (DIGIT_WORDS[token] !== undefined) digits.push(DIGIT_WORDS[token]);
      else {
        const number = integerFromWords(token);
        if (Number.isFinite(number)) digits.push(String(number));
      }
    }
    return digits.join('');
  }

  function parseNumberPhrase(value = '', options = {}) {
    const raw = clean(value).toLowerCase().replace(/ё/g, 'е');
    if (!raw) return NaN;
    const direct = raw.match(/\d+(?:[.,]\d+)?/);
    if (direct && direct[0].length === raw.replace(/\s/g, '').length) return Number(direct[0].replace(',', '.'));
    if (/^полтор[аы]$/.test(raw)) return 1.5;

    const half = raw.match(/^(.+?)\s+с\s+половин(?:ой|а)$/);
    if (half) {
      const whole = integerFromWords(half[1]);
      if (Number.isFinite(whole)) return whole + 0.5;
    }
    const quarter = raw.match(/^(.+?)\s+с\s+четверт(?:ью|ь)$/);
    if (quarter) {
      const whole = integerFromWords(quarter[1]);
      if (Number.isFinite(whole)) return whole + 0.25;
    }
    const fraction = raw.match(/^(.+?)\s+цел(?:ая|ых)\s+(.+?)\s+(десят(?:ая|ых)|сот(?:ая|ых))$/);
    if (fraction) {
      const whole = integerFromWords(fraction[1]);
      const numerator = integerFromWords(fraction[2]);
      const divisor = fraction[3].startsWith('десят') ? 10 : 100;
      if (Number.isFinite(whole) && Number.isFinite(numerator)) return whole + numerator / divisor;
    }
    const spokenDecimal = raw.match(/^(.+?)\s+(?:точка|запятая)\s+(.+)$/);
    if (spokenDecimal) {
      const whole = integerFromWords(spokenDecimal[1]);
      const digits = decimalDigitsFromWords(spokenDecimal[2]);
      if (Number.isFinite(whole) && digits) return Number(`${whole}.${digits}`);
    }

    if (options.dimension) {
      const parts = raw.split(/\s+/);
      if (parts.length === 2) {
        const first = integerFromWords(parts[0]);
        const second = integerFromWords(parts[1]);
        if (Number.isFinite(first) && first <= 20 && Number.isFinite(second) && second >= 10 && second < 100) {
          return first + second / 100;
        }
      }
    }

    const words = integerFromWords(raw);
    if (Number.isFinite(words)) return words;
    const fallback = raw.match(/\d+(?:[.,]\d+)?/);
    return fallback ? Number(fallback[0].replace(',', '.')) : NaN;
  }

  function extractNearbyNumber(text, labelPattern, options = {}) {
    const after = text.match(new RegExp(`(?:${labelPattern})\\s*(?:номер|№|:|-)?\\s*(${NUMBER_PHRASE})`, 'i'));
    if (after) return parseNumberPhrase(after[1], options);
    const before = text.match(new RegExp(`(${NUMBER_PHRASE})\\s*(?:-?й|-?я|-?го)?\\s*(?:${labelPattern})`, 'i'));
    return before ? parseNumberPhrase(before[1], options) : NaN;
  }

  function formatPhone(raw = '') {
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
    if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
    if (digits.length === 10) return `+7${digits}`;
    return digits.length >= 10 ? `+${digits}` : '';
  }

  function extractPhone(text) {
    const numeric = text.match(/(?:\+?7|8)?[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/);
    if (numeric) return formatPhone(numeric[0]);

    const segment = text.match(/(?:телефон|номер\s+телефона|мобильный)\s*[:\-]?\s*([^\n.;]{10,120})/i)?.[1] || '';
    if (!segment) return '';
    const digitTokens = tokensOf(segment).map(token => DIGIT_WORDS[token]).filter(value => value !== undefined);
    if (digitTokens.length >= 10) return formatPhone(digitTokens.join('').slice(0, 11));
    return '';
  }

  function extractName(text) {
    const patterns = [
      /(?:имя(?:\s+клиента)?|клиент|заказчик)\s*[:\-]?\s*(?:зовут\s+)?([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/i,
      /(?:клиента|е[её]|его|меня)\s+зовут\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/i,
      /(?:обращается|записать|запишите)\s+([А-ЯЁ][а-яё]+)(?=\s|,|\.|$)/i,
      /(?:это|я)\s+([А-ЯЁ][а-яё]+)(?=\s|,|\.|$)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return titleCase(match[1]);
    }

    const blocked = /адрес|улиц|дом|квартир|подъезд|этаж|район|ков[её]р|размер|цена|стоимость|телефон|авито|яндекс|сайт|забор|доставка/i;
    const lines = text.split(/\n+/).map(clean).filter(Boolean);
    for (const line of lines) {
      if (blocked.test(line)) continue;
      const match = line.match(/^([А-ЯЁ][а-яё]{2,24})(?:\s+([А-ЯЁ][а-яё]{2,24}))?[,.;]?$/);
      if (match) return titleCase([match[1], match[2]].filter(Boolean).join(' '));
    }
    return '';
  }

  function extractSource(text) {
    const avito = text.match(/авито\s*([123])?/i);
    if (avito) return `Avito ${avito[1] || '1'}`;
    if (/яндекс/i.test(text)) return 'Яндекс';
    if (/рекомендац|посоветовал|посоветовала|по\s+совету/i.test(text)) return 'Рекомендации';
    if (/(?:^|\s)вк(?:\s|$)|вконтакте/i.test(text)) return 'ВК';
    if (/\bmax\b|макс/i.test(text)) return 'Макс';
    if (/квиз/i.test(text)) return 'Квиз';
    if (/сайт|форма\s+заказа|заявка\s+с\s+сайта/i.test(text)) return 'Сайт';
    if (/постоянн\w*\s+клиент|повторн\w*\s+заказ|уже\s+обращал/i.test(text)) return 'Постоянный клиент';
    return '';
  }

  function extractSettlement(text) {
    return SETTLEMENT_ALIASES.find(([, pattern]) => pattern.test(text))?.[0] || '';
  }

  function extractDistrict(text) {
    return DISTRICT_ALIASES.find(([, pattern]) => pattern.test(text))?.[0] || '';
  }

  function accessValue(text, labels) {
    const value = extractNearbyNumber(text, labels);
    return Number.isFinite(value) ? String(Math.round(value)) : '';
  }

  function extractAddress(text) {
    const settlement = extractSettlement(text);
    const district = extractDistrict(text);
    const addressLine = text.match(/(?:^|\n|[.;])\s*(?:адрес|жив[её]т|находится|забрать\s+по\s+адресу)\s*[:\-]?\s*([^\n.;]+)/i)?.[1] || '';
    const source = addressLine || text;

    let houseNumber = accessValue(source, 'дом|д\\.');
    const corpus = accessValue(source, 'корпус|корп\\.|к\\.');
    const building = accessValue(source, 'строение|стр\\.');
    if (houseNumber && corpus) houseNumber += ` к ${corpus}`;
    if (houseNumber && building) houseNumber += ` стр ${building}`;

    const apartmentNumber = accessValue(source, 'квартира|кв\\.');
    const entrance = accessValue(source, 'подъезд|под\\.');
    const floor = accessValue(source, 'этаж|эт\\.');

    let street = '';
    const typed = source.match(/\b(улица|ул\.?|проспект|пр-т|проезд|переулок|пер\.?|шоссе|набережная|наб\.?|бульвар|площадь|микрорайон)\s+([А-ЯЁа-яёA-Za-z0-9][А-ЯЁа-яёA-Za-z0-9\s'’-]{1,55}?)(?=\s*(?:,|дом\b|д\.|квартира\b|кв\.|подъезд\b|этаж\b|корпус\b|$))/i);
    if (typed) {
      const type = typed[1].replace(/\.$/, '');
      street = clean(`${type} ${typed[2]}`);
    }

    if (!street && addressLine) {
      let remainder = addressLine
        .replace(new RegExp(SETTLEMENT_ALIASES.map(([, pattern]) => pattern.source).join('|'), 'ig'), ' ')
        .replace(/(?:автозаводск\w*|ленинск\w*|канавинск\w*|московск\w*|сормовск\w*|нижегородск\w*|советск\w*|приокск\w*)\s*(?:район|р-н)?/ig, ' ')
        .replace(/(?:дом|д\.|квартира|кв\.|подъезд|под\.|этаж|эт\.|корпус|корп\.|строение|стр\.).*$/i, ' ')
        .replace(/^[,\s-]+|[,\s-]+$/g, ' ');
      street = clean(remainder);
    }

    if (!houseNumber) {
      const generic = source.match(new RegExp(`([А-ЯЁа-яё][А-ЯЁа-яё\\s'’-]{2,50}?)\\s+(${NUMBER_PHRASE})(?=\\s*(?:,|квартира|кв\\.|подъезд|этаж|$))`, 'i'));
      if (generic) {
        street ||= clean(generic[1]);
        const number = parseNumberPhrase(generic[2]);
        if (Number.isFinite(number)) houseNumber = String(Math.round(number));
      }
    }

    return {
      settlement,
      district,
      street,
      houseNumber,
      apartmentNumber,
      entrance,
      floor,
    };
  }

  function nextWeekdayKey(targetDay, nextWeek = false) {
    const currentKey = state.selectedDayKey || businessTodayKey();
    const current = dateKeyForDisplay(currentKey);
    let delta = (targetDay - current.getUTCDay() + 7) % 7;
    if (!delta || nextWeek) delta += 7;
    return addDaysToKey(currentKey, delta);
  }

  function extractDate(text) {
    if (/\bсегодня\b/i.test(text)) return businessTodayKey();
    if (/\bпослезавтра\b/i.test(text)) return addDaysToKey(businessTodayKey(), 2);
    if (/\bзавтра\b/i.test(text)) return addDaysToKey(businessTodayKey(), 1);

    const numeric = text.match(/(?:^|\s)(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?(?=\s|$|[.,])/);
    if (numeric) {
      const nowYear = Number(businessTodayKey().slice(0, 4));
      let year = numeric[3] ? Number(numeric[3]) : nowYear;
      if (year < 100) year += 2000;
      return `${year}-${String(Number(numeric[2])).padStart(2, '0')}-${String(Number(numeric[1])).padStart(2, '0')}`;
    }

    for (const [monthName, month] of Object.entries(MONTHS)) {
      const match = text.match(new RegExp(`(${NUMBER_PHRASE})\\s+${monthName}\\b`, 'i'));
      if (!match) continue;
      const day = parseNumberPhrase(match[1]);
      if (!Number.isFinite(day) || day < 1 || day > 31) continue;
      const today = businessTodayKey();
      let year = Number(today.slice(0, 4));
      const candidate = `${year}-${String(month).padStart(2, '0')}-${String(Math.round(day)).padStart(2, '0')}`;
      if (candidate < today && !/прошл/i.test(text)) year += 1;
      return `${year}-${String(month).padStart(2, '0')}-${String(Math.round(day)).padStart(2, '0')}`;
    }

    const lower = text.toLowerCase();
    for (const [name, weekday] of Object.entries(WEEKDAYS)) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(lower)) return nextWeekdayKey(weekday, /следующ/i.test(lower));
    }
    return '';
  }

  function normalizeHour(hour, context = '') {
    let value = Number(hour);
    if (!Number.isFinite(value)) return NaN;
    if (/вечер|дня/i.test(context) && value < 12) value += 12;
    if (/ноч/i.test(context) && value === 12) value = 0;
    return Math.max(0, Math.min(23, value));
  }

  function timeValue(hour, minute = 0, context = '') {
    const h = normalizeHour(hour, context);
    if (!Number.isFinite(h)) return '';
    return `${String(h).padStart(2, '0')}:${String(Math.max(0, Math.min(59, Number(minute) || 0))).padStart(2, '0')}`;
  }

  function extractTime(text) {
    const numericRange = text.match(/(?:с\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:до|[-–—])\s*(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи)?/i);
    if (numericRange) {
      const context = numericRange[5] || '';
      return {
        startTime: timeValue(numericRange[1], numericRange[2] || 0, context),
        endTime: timeValue(numericRange[3], numericRange[4] || 0, context),
        timeNote: clean(numericRange[0]),
      };
    }

    const wordRange = text.match(new RegExp(`(?:с\\s*)(${NUMBER_PHRASE})\\s*(?:до|[-–—])\\s*(${NUMBER_PHRASE})\\s*(утра|дня|вечера|ночи)?`, 'i'));
    if (wordRange) {
      const start = parseNumberPhrase(wordRange[1]);
      const end = parseNumberPhrase(wordRange[2]);
      const context = wordRange[3] || '';
      if (Number.isFinite(start) && Number.isFinite(end)) {
        return {
          startTime: timeValue(start, 0, context),
          endTime: timeValue(end, 0, context),
          timeNote: clean(wordRange[0]),
        };
      }
    }

    const singleNumeric = text.match(/(?:после|к|в|на)\s*(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи)?/i);
    if (singleNumeric) {
      const startTime = timeValue(singleNumeric[1], singleNumeric[2] || 0, singleNumeric[3] || '');
      return { startTime, endTime: addMinutesToTime(startTime, REQUEST_DURATION_MINUTES), timeNote: clean(singleNumeric[0]) };
    }

    const singleWord = text.match(new RegExp(`(?:после|к|в|на)\\s*(${NUMBER_PHRASE})\\s*(утра|дня|вечера|ночи)?`, 'i'));
    if (singleWord) {
      const hour = parseNumberPhrase(singleWord[1]);
      if (Number.isFinite(hour)) {
        const startTime = timeValue(hour, 0, singleWord[2] || '');
        return { startTime, endTime: addMinutesToTime(startTime, REQUEST_DURATION_MINUTES), timeNote: clean(singleWord[0]) };
      }
    }
    return {};
  }

  function extractMaterial(text) {
    if (/вискоз/i.test(text)) return 'Вискоза';
    if (/ш[её]лк|silk/i.test(text)) return 'Шёлк';
    if (/хлопок|хлопков|cotton/i.test(text)) return 'Хлопок';
    if (/без\s*ворс|безворс|циновк|килим/i.test(text)) return 'Безворсный';
    if (/шерстян|100\s*%\s*шерст|материал[^\n]{0,20}шерст/i.test(text) && !/шерсть\s+(?:кош|собак|животн)/i.test(text)) return 'Шерсть';
    if (/ш[еёа]гги|шагги|shaggy|синтет|полипропилен|полиэстер|акрил|нейлон|микрофибр|хит[-\s]*сет|heat\s*set|\bbcf\b|фризе/i.test(text)) return 'Синтетика';
    return '';
  }

  function extractPile(text) {
    if (/без\s*ворс|безворс|циновк|килим/i.test(text)) return 'Без ворса';
    if (/ш[еёа]гги|шагги|shaggy|длинн\w*\s*ворс|высок\w*\s*ворс|более\s*(?:одного|1)\s*см|травк/i.test(text)) return 'Более 1 см';
    if (/средн\w*\s*ворс|коротк\w*\s*ворс|низк\w*\s*ворс|до\s*(?:одного|1)\s*см/i.test(text)) return 'До 1 см';
    const measured = text.match(/ворс[^\dа-яё]{0,8}(${NUMBER_PHRASE})\s*(мм|см)/i);
    if (measured) {
      const amount = parseNumberPhrase(measured[1]);
      const cm = measured[2].toLowerCase() === 'мм' ? amount / 10 : amount;
      if (Number.isFinite(cm)) return cm > 1 ? 'Более 1 см' : 'До 1 см';
    }
    return '';
  }

  function extractServices(text) {
    return unique([
      /пятн|вино|кофе|кровь|краск|жирн\w*\s+след/i.test(text) ? 'Удаление пятен' : '',
      /шерст(?:ь|и)?\s*(?:животн|кош|собак)?|волос|вычес|выч[её]с/i.test(text) ? 'Вычёсывание шерсти и волос' : '',
      /запах\s*мочи|моч[аи]|описал|описала|метк[аи]\s+животн/i.test(text) ? 'Удаление запаха мочи' : '',
      /дезинф|обеззараж/i.test(text) ? 'Дезинфекция' : '',
      /слайм|пластилин/i.test(text) ? 'Удаление слайма / пластилина' : '',
      /расч[её]с|поднят(?:ие|ь)\s*ворс|подъ[её]м\s*ворс|причес/i.test(text) ? 'Подъём ворса' : '',
      /озон/i.test(text) ? 'Озонация' : '',
      /кондиционер/i.test(text) ? 'Кондиционер' : '',
      /экспресс|срочн|быстрее\s+обычного/i.test(text) ? 'Экспресс-стирка' : '',
    ]);
  }

  function rugFromContext(context, length, width) {
    return {
      length: Number(length || 0),
      width: Number(width || 0),
      material: extractMaterial(context),
      pile: extractPile(context),
      issues: [],
      services: extractServices(context),
    };
  }

  function dimensionMatches(text) {
    const matches = [];
    const numeric = /(\d+(?:[.,]\d+)?)\s*(?:м(?:етра|етров)?\s*)?(?:[xх×*]|на)\s*(\d+(?:[.,]\d+)?)\s*(?:м(?:етра|етров)?)?/ig;
    let match;
    while ((match = numeric.exec(text))) {
      matches.push({ index: match.index, end: numeric.lastIndex, a: Number(match[1].replace(',', '.')), b: Number(match[2].replace(',', '.')) });
    }

    const word = new RegExp(`(${NUMBER_PHRASE})\\s*(?:метр(?:а|ов)?\\s*)?(?:на|x|х|×)\\s*(${NUMBER_PHRASE})\\s*(?:метр(?:а|ов)?)?`, 'ig');
    while ((match = word.exec(text))) {
      if (/\d/.test(match[0])) continue;
      const a = parseNumberPhrase(match[1], { dimension: true });
      const b = parseNumberPhrase(match[2], { dimension: true });
      if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0 && a <= 20 && b <= 20) {
        matches.push({ index: match.index, end: word.lastIndex, a, b });
      }
    }
    return matches.sort((a, b) => a.index - b.index).filter((item, index, all) => !index || item.index !== all[index - 1].index);
  }

  function extractRugs(text) {
    const explicitWidth = text.match(new RegExp(`ширин[аы]?\\s*[:\\-]?\\s*(${NUMBER_PHRASE}).{0,45}?длин[аы]?\\s*[:\\-]?\\s*(${NUMBER_PHRASE})`, 'i'));
    if (explicitWidth) {
      const width = parseNumberPhrase(explicitWidth[1], { dimension: true });
      const length = parseNumberPhrase(explicitWidth[2], { dimension: true });
      if (Number.isFinite(width) && Number.isFinite(length)) return [rugFromContext(text, length, width)];
    }

    const matches = dimensionMatches(text);
    const rugs = matches.map((item, index) => {
      const previousEnd = index ? matches[index - 1].end : 0;
      const nextIndex = matches[index + 1]?.index ?? text.length;
      const contextStart = Math.max(previousEnd, item.index - 140);
      const contextEnd = Math.min(nextIndex, item.end + 180);
      return rugFromContext(text.slice(contextStart, contextEnd), item.a, item.b);
    });

    if (rugs.length === 1) {
      rugs[0].material ||= extractMaterial(text);
      rugs[0].pile ||= extractPile(text);
      rugs[0].services = unique([...rugs[0].services, ...extractServices(text)]);
    }
    return rugs;
  }

  function extractPrice(text) {
    const numeric = text.match(/(?:итого|цена|стоимость|сумма|насчитали|получается)\s*[:\-]?\s*(\d[\d\s]{2,})\s*(?:₽|р\.?|руб)/i);
    if (numeric) return Number(numeric[1].replace(/\s/g, ''));
    const words = text.match(new RegExp(`(?:итого|цена|стоимость|сумма|насчитали|получается)\\s*[:\\-]?\\s*(${NUMBER_PHRASE})\\s*(?:руб|рублей|рубля)`, 'i'));
    if (words) {
      const value = parseNumberPhrase(words[1]);
      if (Number.isFinite(value) && value >= 100) return Math.round(value);
    }
    return 0;
  }

  function extractDiscount(text) {
    const numeric = text.match(/скидк[аи]?\s*[:\-]?\s*(\d{1,2})\s*%/i);
    if (numeric) return Number(numeric[1]);
    const words = text.match(new RegExp(`скидк[аи]?\\s*[:\\-]?\\s*(${NUMBER_PHRASE})\\s*процент`, 'i'));
    const value = words ? parseNumberPhrase(words[1]) : NaN;
    return Number.isFinite(value) ? value : 0;
  }

  function extractCallAhead(text) {
    const numeric = text.match(/(?:позвонить|набрать|предупредить)[^\n]{0,30}?(?:за\s*)?(\d{1,3})\s*мин/i);
    if (numeric) return { callAhead: true, callAheadMinutes: Number(numeric[1]) };
    const words = text.match(new RegExp(`(?:позвонить|набрать|предупредить)[^\\n]{0,30}?(?:за\\s*)?(${NUMBER_PHRASE})\\s*мин`, 'i'));
    if (words) {
      const minutes = parseNumberPhrase(words[1]);
      if (Number.isFinite(minutes)) return { callAhead: true, callAheadMinutes: Math.round(minutes) };
    }
    if (/позвонить\s+заранее|предварительно\s+позвонить/i.test(text)) return { callAhead: true, callAheadMinutes: 30 };
    return {};
  }

  function parseText(rawText) {
    const text = normalizeSpeech(rawText);
    const source = extractSource(text);
    const regular = /постоянн\w*\s+клиент|повторн\w*\s+заказ|уже\s+обращал/i.test(text) || source === 'Постоянный клиент';
    const visitType = /\bдоставк/i.test(text) && !/\bзабор/i.test(text) ? 'delivery' : 'pickup';
    return {
      text,
      customerName: extractName(text),
      phone: extractPhone(text),
      orderSource: source,
      ...extractAddress(text),
      visitType,
      visitDate: extractDate(text),
      ...extractTime(text),
      rugs: extractRugs(text),
      estimatedPrice: extractPrice(text),
      discount: extractDiscount(text),
      regularCustomer: regular,
      ...extractCallAhead(text),
    };
  }

  function recognizedLabels(parsed) {
    const values = [];
    if (parsed.customerName) values.push(`Имя: ${parsed.customerName}`);
    if (parsed.phone) values.push(`Телефон: ${parsed.phone}`);
    const address = [parsed.settlement, parsed.street, parsed.houseNumber && `д. ${parsed.houseNumber}`, parsed.apartmentNumber && `кв. ${parsed.apartmentNumber}`, parsed.entrance && `подъезд ${parsed.entrance}`, parsed.floor && `этаж ${parsed.floor}`].filter(Boolean).join(', ');
    if (address) values.push(`Адрес: ${address}`);
    if (parsed.district) values.push(`Район: ${parsed.district}`);
    if (parsed.visitDate) values.push(`Дата: ${formatDateShort(parsed.visitDate)}`);
    if (parsed.startTime) values.push(`Время: ${parsed.startTime}${parsed.endTime ? `–${parsed.endTime}` : ''}`);
    parsed.rugs.forEach((rug, index) => {
      const details = [`${rug.length}×${rug.width} м`, rug.material, rug.pile, ...(rug.services || [])].filter(Boolean).join(', ');
      values.push(`Ковёр ${index + 1}: ${details}`);
    });
    if (parsed.estimatedPrice) values.push(`Стоимость: ${formatMoney(parsed.estimatedPrice)}`);
    if (parsed.regularCustomer) values.push('Постоянный клиент: скидка 10%');
    if (parsed.orderSource) values.push(`Источник: ${parsed.orderSource}`);
    return values;
  }

  function applyParsedText() {
    const textarea = qs('#smartPasteInput');
    const raw = textarea?.value.trim() || '';
    if (!raw) {
      textarea?.focus();
      showToast('Сначала вставьте или продиктуйте текст заявки.', 'error');
      return;
    }

    const parsed = parseText(raw);
    const current = getFormData();
    const wasEditing = Boolean(current.eventId);
    const currentComment = clean(current.managerComment);
    const rawComment = `Исходный текст клиента:\n${parsed.text}`;
    const next = {
      ...current,
      customerName: parsed.customerName || current.customerName,
      phone: parsed.phone || current.phone,
      orderSource: parsed.orderSource || current.orderSource,
      settlement: parsed.settlement || current.settlement || 'Нижний Новгород',
      district: parsed.district || current.district,
      street: parsed.street || current.street,
      houseNumber: parsed.houseNumber || current.houseNumber,
      apartmentNumber: parsed.apartmentNumber || current.apartmentNumber,
      entrance: parsed.entrance || current.entrance,
      floor: parsed.floor || current.floor,
      visitType: parsed.visitType || current.visitType,
      visitDate: parsed.visitDate || current.visitDate,
      startTime: parsed.startTime || current.startTime,
      endTime: parsed.endTime || current.endTime,
      timeNote: parsed.timeNote || current.timeNote,
      rugs: parsed.rugs.length ? parsed.rugs : current.rugs,
      estimatedPrice: parsed.estimatedPrice || current.estimatedPrice,
      discount: parsed.discount || current.discount,
      regularCustomer: parsed.regularCustomer || current.regularCustomer,
      callAhead: parsed.callAhead ?? current.callAhead,
      callAheadMinutes: parsed.callAheadMinutes || current.callAheadMinutes,
      managerComment: currentComment.includes(parsed.text) ? currentComment : [currentComment, rawComment].filter(Boolean).join('\n\n'),
      eventId: current.eventId,
      pmkId: current.pmkId,
    };

    fillForm(next);
    textarea.value = raw;
    try { localStorage.setItem(STORAGE_KEY, raw); } catch {}
    if (!wasEditing) {
      qs('#eventId').value = '';
      qs('#eventId').dataset.pmkId = current.pmkId || makeId();
      qs('#deleteEventBtn').classList.add('hidden');
      qs('#formTitle').textContent = 'Новая заявка — данные распределены';
    }

    const labels = recognizedLabels(parsed);
    const result = qs('#smartPasteResult');
    result.className = `smart-paste-result ${labels.length ? 'success' : 'warning'}`;
    result.innerHTML = labels.length
      ? `<strong>Распознано расширенным парсером:</strong><div>${labels.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div><small>Проверьте адрес и параметры ковров перед сохранением.</small>`
      : '<strong>Точные поля не распознаны.</strong><small>Исходный текст сохранён в комментарии. Добавьте больше ориентиров: имя, адрес, размеры и услуги.</small>';
    schedulePreviewUpdate();
    showToast(labels.length ? 'Данные подробно распределены по форме.' : 'Текст сохранён в комментарии.', labels.length ? 'success' : 'error');
  }

  function installEnhancedParser() {
    const textarea = qs('#smartPasteInput');
    const oldButton = qs('#smartPasteParseBtn');
    if (!textarea || !oldButton || oldButton.dataset.parserVersion === '45') return;

    const button = oldButton.cloneNode(true);
    button.dataset.parserVersion = '45';
    button.textContent = 'Распознать и распределить';
    oldButton.replaceWith(button);
    button.addEventListener('click', applyParsedText);

    textarea.placeholder = 'Можно продиктовать обычной фразой: Клиент Ольга, телефон 920 000 00 00, адрес улица Коминтерна дом сто пятнадцать, квартира сорок пять, пятый подъезд, третий этаж. Ковёр шегги два на три, пятна и шерсть, расчёсывание ворса. Постоянный клиент, завтра с трёх до пяти вечера.';
    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        applyParsedText();
      }
    }, true);

    const note = qs('.smart-paste-heading p');
    if (note) note.textContent = 'Вставьте текст или надиктуйте заявку обычными словами — приложение распознает числа, адрес, ковры и услуги.';
  }

  window.PMK_SMART_PARSER_V45 = { parseText, parseNumberPhrase, extractAddress, extractRugs };

  const start = () => setTimeout(installEnhancedParser, 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
