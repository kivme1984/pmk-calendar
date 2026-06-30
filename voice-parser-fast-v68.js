'use strict';

(() => {
  if (window.PMK_VOICE_PARSER_FAST_V68) return;
  window.PMK_VOICE_PARSER_FAST_V68 = true;

  const STORAGE_KEY = 'pmk-smart-paste-draft-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const title = value => clean(value).toLowerCase().replace(/(^|[\s-])[а-яё]/g, letter => letter.toUpperCase());
  const unique = values => [...new Set((values || []).filter(Boolean))];

  const NAMES = new Set(`
    александр алексей анатолий андрей антон аркадий артем артём борис вадим валентин валерий василий виктор виталий владимир владислав вячеслав геннадий георгий герман глеб григорий данила даниил денис дмитрий евгений егор иван игорь илья кирилл константин леонид лев макар максим марат марк матвей михаил никита николай олег павел петр пётр роман руслан сергей станислав степан тимофей федор фёдор юрий ярослав
    агата аглая алевтина александра алина алиса алла алёна алена анастасия ангелина анжела анжелика анна антонина арина валентина валерия варвара вера вероника виктория виолетта галина дарья диана ева евгения екатерина елена елизавета жанна зинаида злата зоя инна ирина карина каролина кристина ксения лариса лидия лилия любовь людмила майя маргарита марина мария марьяна надежда наталья нина нонна оксана олеся ольга полина раиса регина римма роза светлана снежана софия софья таисия тамара татьяна ульяна юлия яна
  `.trim().split(/\s+/));

  const NUMBER_WORDS = {
    ноль:0, нуль:0, один:1, одна:1, одно:1, первую:1, первый:1,
    два:2, две:2, три:3, четыре:4, пять:5, шесть:6, семь:7, восемь:8, девять:9, десять:10,
  };
  const NUMBER_WORD_PATTERN = '(?:полтора|полторы|ноль|нуль|один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)';
  const NUMBER_PHRASE_PATTERN = `(?:\\d+(?:[.,]\\d+)?|${NUMBER_WORD_PATTERN}(?:\\s+с\\s+(?:половиной|четвертью))?|${NUMBER_WORD_PATTERN}\\s+цел(?:ая|ых|ое)\\s+${NUMBER_WORD_PATTERN}\\s+десят(?:ая|ых|ые)?|${NUMBER_WORD_PATTERN}\\s+${NUMBER_WORD_PATTERN})`;

  const DISTRICTS = [
    ['Автозаводский', /автозаводск|автозавод|автоз/i], ['Ленинский', /ленинск/i],
    ['Канавинский', /канавин/i], ['Московский', /московск(?:ий|ого)?\s*(?:район|р-н)?/i],
    ['Сормовский', /сормов/i], ['Нижегородский', /нижегородск(?:ий|ого)?\s*(?:район|р-н)?/i],
    ['Советский', /советск(?:ий|ого)?\s*(?:район|р-н)?/i], ['Приокский', /приок/i],
  ];
  const SETTLEMENTS = [
    ['Нижний Новгород', /нижн(?:ий|его)?\s+новгород|\bнн\b/i], ['Бор', /(?:г\.?|город\s+)?бор\b/i],
    ['Дзержинск', /дзержинск/i], ['Кстово', /кстов/i], ['Богородск', /богородск/i],
    ['Балахна', /балахн/i], ['Городец', /городец/i], ['Павлово', /павлов/i], ['Арзамас', /арзамас/i],
  ];
  const MONTHS = { января:1, февраля:2, марта:3, апреля:4, мая:5, июня:6, июля:7, августа:8, сентября:9, октября:10, ноября:11, декабря:12 };
  const WEEKDAYS = { воскресенье:0, понедельник:1, вторник:2, среда:3, четверг:4, пятница:5, суббота:6 };

  function normalizedText(value = '') {
    return String(value)
      .replace(/\r/g, '\n')
      .replace(/[«»„“”]/g, '"')
      .replace(/\bикс\b/gi, ' на ')
      .replace(/\bумножить\s+на\b/gi, ' на ')
      .replace(/\s*([,;])\s*/g, '$1 ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function labeled(text, labels, max = 100) {
    const match = text.match(new RegExp(`(?:^|\\n|[.;])\\s*(?:${labels.join('|')})\\s*[:—–-]?\\s*([^\\n.;]{1,${max}})`, 'i'));
    return clean(match?.[1] || '');
  }

  function parseSpokenNumber(raw = '') {
    const source = clean(raw).toLowerCase().replace(/ё/g, 'е');
    const direct = Number(source.replace(',', '.'));
    if (Number.isFinite(direct)) return direct;
    if (/^полтор[аы]$/.test(source)) return 1.5;
    const half = source.match(new RegExp(`^(${NUMBER_WORD_PATTERN})\\s+с\\s+половиной$`));
    if (half) return Number(NUMBER_WORDS[half[1]] || 0) + 0.5;
    const quarter = source.match(new RegExp(`^(${NUMBER_WORD_PATTERN})\\s+с\\s+четвертью$`));
    if (quarter) return Number(NUMBER_WORDS[quarter[1]] || 0) + 0.25;
    const decimal = source.match(new RegExp(`^(${NUMBER_WORD_PATTERN})\\s+цел(?:ая|ых|ое)\\s+(${NUMBER_WORD_PATTERN})\\s+десят(?:ая|ых|ые)?$`));
    if (decimal) return Number(NUMBER_WORDS[decimal[1]] || 0) + Number(NUMBER_WORDS[decimal[2]] || 0) / 10;
    const pair = source.match(new RegExp(`^(${NUMBER_WORD_PATTERN})\\s+(${NUMBER_WORD_PATTERN})$`));
    if (pair && NUMBER_WORDS[pair[1]] >= 0 && NUMBER_WORDS[pair[2]] >= 0 && NUMBER_WORDS[pair[2]] < 10) {
      return Number(NUMBER_WORDS[pair[1]]) + Number(NUMBER_WORDS[pair[2]]) / 10;
    }
    return Number(NUMBER_WORDS[source] ?? NaN);
  }

  function extractName(text, fallback = '') {
    const explicit = labeled(text, ['имя(?:\\s+клиента)?', 'клиент(?:ка)?', 'заказчик', 'зовут'], 70)
      .replace(/\b(?:телефон|номер|адрес|улица|ков[её]р|размер).*$/i, '');
    if (explicit) {
      const first = normalizeNameToken(explicit.split(/\s+/)[0]);
      if (first) return title(first);
    }

    const tokens = text.toLowerCase().replace(/ё/g, 'е').match(/[а-я-]+/g) || [];
    const blockedPrevious = new Set(['улица','ул','проспект','проезд','переулок','район','поселок','деревня','село']);
    for (let index = 0; index < tokens.length; index += 1) {
      const token = normalizeNameToken(tokens[index]);
      if (!token || !NAMES.has(token) || blockedPrevious.has(tokens[index - 1])) continue;
      return title(token);
    }
    const fallbackToken = normalizeNameToken(String(fallback).split(/\s+/)[0]);
    return fallbackToken && NAMES.has(fallbackToken) ? title(fallbackToken) : '';
  }

  function normalizeNameToken(value = '') {
    return String(value).toLowerCase().replace(/ё/g, 'е').replace(/[^а-я-]/g, '');
  }

  function extractPhone(text, fallback = '') {
    const match = text.match(/(?:\+?7|8)?[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/);
    if (!match) return fallback || '';
    let digits = match[0].replace(/\D/g, '');
    if (digits.length === 10) digits = `7${digits}`;
    if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    return digits.length === 11 ? `+${digits}` : fallback || '';
  }

  function extractAddress(text, fallback = {}) {
    const result = { ...fallback };
    for (const [name, pattern] of SETTLEMENTS) if (pattern.test(text)) { result.settlement = name; break; }
    for (const [name, pattern] of DISTRICTS) if (pattern.test(text)) { result.district = name; break; }
    const street = text.match(/(?:^|[\s,.;\n])(улица|ул\.?|проспект|пр-т|проезд|переулок|пер\.?|шоссе|набережная|наб\.?|бульвар|площадь|микрорайон|мкр\.?)\s+([а-яёa-z0-9'’\-]+(?:\s+[а-яёa-z0-9'’\-]+){0,5}?)(?=\s*(?:,|дом|д\.?|квартира|кв\.?|подъезд|этаж|корпус|стр\.?|$))/i);
    if (street) result.street = clean(`${street[1].replace(/\.$/, '')} ${street[2]}`);
    const addressLabel = labeled(text, ['адрес'], 160);
    if (!result.street && addressLabel) {
      const generic = addressLabel.match(/^(.*?)(?=\s+(?:дом|д\.?)\s*\d|,\s*\d)/i)?.[1];
      if (generic) result.street = clean(generic.replace(/^(?:г\.?\s*[^,]+,?\s*)/i, ''));
    }
    const house = text.match(/(?:дом|д\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?(?:[\/-]\d+[а-яa-z]?)?)/i);
    const flat = text.match(/(?:квартира|кв\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?)/i);
    const entrance = text.match(/(?:подъезд|под\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?)/i);
    const floor = text.match(/(?:этаж|эт\.?)\s*[:№#-]?\s*(\d+[а-яa-z]?)/i);
    if (house) result.houseNumber = house[1];
    if (flat) result.apartmentNumber = flat[1];
    if (entrance) result.entrance = entrance[1];
    if (floor) result.floor = floor[1];
    result.settlement ||= 'Нижний Новгород';
    return result;
  }

  function extractContract(text, fallback = '') {
    const match = text.match(/(?:договор(?:\s+пмк)?|номер\s+договора|№\s*договора|\bд)\s*[:№#-]?\s*([дd]?\s*\d{3,4})\b/i);
    return clean(match?.[1] || fallback).replace(/\s+/g, '');
  }

  function extractDate(text, fallback = '') {
    if (/послезавтра/i.test(text)) return addDaysToKey(businessTodayKey(), 2);
    if (/завтра/i.test(text)) return addDaysToKey(businessTodayKey(), 1);
    if (/сегодня/i.test(text)) return businessTodayKey();
    const numeric = text.match(/(?:^|\D)(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?(?=\D|$)/);
    if (numeric) {
      let year = numeric[3] ? Number(numeric[3]) : Number(businessTodayKey().slice(0, 4));
      if (year < 100) year += 2000;
      return `${year}-${String(Number(numeric[2])).padStart(2, '0')}-${String(Number(numeric[1])).padStart(2, '0')}`;
    }
    for (const [monthName, month] of Object.entries(MONTHS)) {
      const match = text.match(new RegExp(`(?:^|\\D)(\\d{1,2})\\s+${monthName}(?:\\s+(\\d{4}))?`, 'i'));
      if (!match) continue;
      return `${Number(match[2] || businessTodayKey().slice(0, 4))}-${String(month).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`;
    }
    const lower = text.toLowerCase().replace(/ё/g, 'е');
    for (const [word, day] of Object.entries(WEEKDAYS)) {
      if (!new RegExp(`\\b${word.slice(0, -1)}`, 'i').test(lower)) continue;
      const today = dateKeyForDisplay(businessTodayKey()).getUTCDay();
      let delta = (day - today + 7) % 7;
      if (!delta || /следующ/i.test(lower)) delta += 7;
      return addDaysToKey(businessTodayKey(), delta);
    }
    return fallback || '';
  }

  function timeString(hour, minute = 0, context = '') {
    let value = Number(hour);
    if (/вечер|дня/i.test(context) && value < 12) value += 12;
    if (/ноч/i.test(context) && value === 12) value = 0;
    if (!(value >= 0 && value <= 23)) return '';
    return `${String(value).padStart(2, '0')}:${String(Number(minute || 0)).padStart(2, '0')}`;
  }

  function extractTime(text, fallback = {}) {
    const range = text.match(/(?:с\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:до|[-–—])\s*(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи)?/i);
    if (range) return { startTime: timeString(range[1], range[2], range[5]), endTime: timeString(range[3], range[4], range[5]), timeNote: clean(range[0]) };
    const single = text.match(/(?:после|к|в)\s*(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи)?/i);
    if (single) {
      const startTime = timeString(single[1], single[2], single[3]);
      return { startTime, endTime: addMinutesToTime(startTime, REQUEST_DURATION_MINUTES), timeNote: clean(single[0]) };
    }
    return { startTime: fallback.startTime || '', endTime: fallback.endTime || '', timeNote: fallback.timeNote || '' };
  }

  function material(text = '') {
    if (/вискоз/i.test(text)) return 'Вискоза';
    if (/ш[её]лк/i.test(text)) return 'Шёлк';
    if (/хлопок/i.test(text)) return 'Хлопок';
    if (/безворс|палас|циновк|килим/i.test(text)) return 'Безворсный';
    if (/шерстян|100\s*%\s*шерст/i.test(text)) return 'Шерсть';
    if (/синтет|полипропилен|полиэстер|акрил|нейлон|ш[еёа]гги|shaggy/i.test(text)) return 'Синтетика';
    return '';
  }

  function pile(text = '') {
    if (/безворс|палас|циновк|килим/i.test(text)) return 'Без ворса';
    if (/высок\w*\s+ворс|длинн\w*\s+ворс|ш[еёа]гги|shaggy|ворс\s*(?:более|свыше)\s*1/i.test(text)) return 'Более 1 см';
    if (/средн\w*\s+ворс|коротк\w*\s+ворс|низк\w*\s+ворс|ворс\s*до\s*1/i.test(text)) return 'До 1 см';
    return '';
  }

  function serviceData(text = '') {
    const urine = /запах\s*(?:мочи|кошач|собач)|моч[аи]|описал|описала|метк[аи]|туалет/i.test(text);
    const hair = /выч[её]с|вычес|шерсть\s*(?:кош|собак|животн)|много\s+шерсти|волос/i.test(text);
    const stain = /пятн|пятновывед|слайм|пластилин|маркер|фломастер|вино|кофе|кровь|краск|жир|гуашь/i.test(text);
    const disinfect = /дезинф|обеззараж|потоп|затоп|плесен/i.test(text);
    const lift = /подъ[её]м\s*ворс|поднять\s*ворс|расч[её]с|расчес|причес/i.test(text);
    const ozone = /озон|озонирован/i.test(text);
    const conditioner = /кондиционер|ароматиз|смягчител/i.test(text);
    const express = /экспресс|срочн|ускоренн|быстрее\s+обычного/i.test(text);
    return {
      issues: unique([stain ? 'Пятна' : '', hair ? (/волос/i.test(text) ? 'Волосы' : 'Шерсть') : '', urine ? 'Запах мочи' : '', disinfect ? 'Дезинфекция' : '', /слайм|пластилин/i.test(text) ? 'Слайм / пластилин' : '']),
      services: unique([stain ? 'Удаление пятен' : '', hair ? 'Вычёсывание шерсти и волос' : '', urine ? 'Удаление запаха мочи' : '', disinfect ? 'Дезинфекция' : '', lift ? 'Подъём ворса' : '', ozone ? 'Озонация' : '', conditioner ? 'Кондиционер' : '', express ? 'Экспресс-стирка' : '']),
    };
  }

  function dimensionMatches(text = '') {
    const results = [];
    const pattern = new RegExp(`(${NUMBER_PHRASE_PATTERN})\\s*(?:м(?:етр(?:а|ов)?)?|см)?\\s*(?:на|x|х|×|\\*)\\s*(${NUMBER_PHRASE_PATTERN})\\s*(?:м(?:етр(?:а|ов)?)?|см)?`, 'gi');
    let match;
    while ((match = pattern.exec(text))) {
      let length = parseSpokenNumber(match[1]);
      let width = parseSpokenNumber(match[2]);
      if (/см/i.test(match[0]) || length > 20 || width > 20) { length /= 100; width /= 100; }
      if (length > 0 && width > 0 && length <= 20 && width <= 20) results.push({ length: Number(length.toFixed(2)), width: Number(width.toFixed(2)), index: match.index, end: pattern.lastIndex });
    }
    const explicit = text.match(new RegExp(`длин[аы]?\\s*[:=-]?\\s*(${NUMBER_PHRASE_PATTERN}).{0,70}?ширин[аы]?\\s*[:=-]?\\s*(${NUMBER_PHRASE_PATTERN})`, 'i'));
    if (!results.length && explicit) {
      const length = parseSpokenNumber(explicit[1]);
      const width = parseSpokenNumber(explicit[2]);
      if (length > 0 && width > 0) results.push({ length, width, index: explicit.index || 0, end: (explicit.index || 0) + explicit[0].length });
    }
    return results;
  }

  function rugCount(text = '') {
    const numeric = text.match(/\b(\d{1,2})\s+ковр/i);
    if (numeric) return Math.min(30, Number(numeric[1]));
    const words = text.match(new RegExp(`\\b(${NUMBER_WORD_PATTERN})\\s+ковр`, 'i'))?.[1];
    return Math.min(30, Number(NUMBER_WORDS[words] || 0));
  }

  function extractRugs(text, fallback = []) {
    const found = dimensionMatches(text);
    let rugs = found.map((item, index) => {
      const start = index === 0 ? Math.max(0, item.index - 100) : found[index - 1].end;
      const end = found[index + 1]?.index ?? Math.min(text.length, item.end + 220);
      const context = text.slice(start, end);
      return { length: item.length, width: item.width, material: material(context), pile: pile(context), ...serviceData(context) };
    });
    if (!rugs.length && Array.isArray(fallback)) rugs = fallback.map(rug => ({ ...rug }));
    const count = rugCount(text);
    while (count && rugs.length < count) rugs.push({ length:0, width:0, material:'', pile:'', issues:[], services:[] });
    if (rugs.length === 1) {
      rugs[0].material ||= material(text);
      rugs[0].pile ||= pile(text);
      const services = serviceData(text);
      rugs[0].issues = unique([...(rugs[0].issues || []), ...services.issues]);
      rugs[0].services = unique([...(rugs[0].services || []), ...services.services]);
    }
    return rugs;
  }

  function parse(raw) {
    const text = normalizedText(raw);
    const baseParser = window.PMK_SMART_PARSER_V45?.parseText;
    let base = {};
    try { if (typeof baseParser === 'function' && baseParser !== parse) base = baseParser(text) || {}; } catch {}
    const address = extractAddress(text, base);
    const timing = extractTime(text, base);
    const priceMatch = text.match(/(?:итого|цена|стоимость|сумма)\s*[:=-]?\s*(\d[\d\s]{2,})\s*(?:₽|р\.?|руб)/i);
    const discountMatch = text.match(/скидк[аи]?\s*[:=-]?\s*(\d{1,2})\s*%/i);
    return {
      ...base,
      text,
      customerName: extractName(text, base.customerName),
      phone: extractPhone(text, base.phone),
      ...address,
      contractNumber: extractContract(text, base.contractNumber),
      visitDate: extractDate(text, base.visitDate),
      ...timing,
      rugs: extractRugs(text, base.rugs),
      estimatedPrice: priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : Number(base.estimatedPrice || 0),
      discount: discountMatch ? Number(discountMatch[1]) : Number(base.discount || 0),
      regularCustomer: /постоянн\w*\s+клиент|повторн\w*\s+заказ|уже\s+обращал/i.test(text) || Boolean(base.regularCustomer),
    };
  }

  function labels(parsed) {
    const values = [];
    if (parsed.customerName) values.push(`Имя: ${parsed.customerName}`);
    if (parsed.phone) values.push(`Телефон: ${parsed.phone}`);
    const address = [parsed.settlement, parsed.street, parsed.houseNumber && `д. ${parsed.houseNumber}`, parsed.apartmentNumber && `кв. ${parsed.apartmentNumber}`, parsed.entrance && `подъезд ${parsed.entrance}`, parsed.floor && `этаж ${parsed.floor}`].filter(Boolean).join(', ');
    if (address) values.push(`Адрес: ${address}`);
    if (parsed.district) values.push(`Район: ${parsed.district}`);
    if (parsed.contractNumber) values.push(`Договор: ${parsed.contractNumber}`);
    if (parsed.visitDate) values.push(`Дата: ${formatDateShort(parsed.visitDate)}`);
    if (parsed.startTime) values.push(`Время: ${parsed.startTime}${parsed.endTime ? `–${parsed.endTime}` : ''}`);
    (parsed.rugs || []).forEach((rug, index) => values.push(`Ковёр ${index + 1}: ${rug.length || '?'}×${rug.width || '?'} м${rug.material ? `, ${rug.material}` : ''}${rug.services?.length ? `, ${rug.services.join(', ')}` : ''}`));
    if (parsed.estimatedPrice) values.push(`Стоимость: ${formatMoney(parsed.estimatedPrice)}`);
    return values;
  }

  function missing(parsed) {
    const values = [];
    if (!parsed.customerName) values.push('имя');
    if (!parsed.phone) values.push('телефон');
    if (!parsed.street || !parsed.houseNumber) values.push('адрес');
    if (!parsed.district) values.push('район');
    if (!parsed.visitDate) values.push('дату');
    if (!parsed.startTime) values.push('время');
    if (!(parsed.rugs || []).length) values.push('размеры ковров');
    else if (parsed.rugs.some(rug => !rug.length || !rug.width || !rug.material)) values.push('параметры ковров');
    return unique(values);
  }

  function apply() {
    const textarea = $('#smartPasteInput');
    const raw = textarea?.value.trim() || '';
    if (!raw) return showToast('Вставьте или продиктуйте информацию клиента.', 'error');
    const parsed = parse(raw);
    const current = getFormData();
    const sourceComment = `Исходный текст клиента:\n${raw}`;
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
      contractNumber: parsed.contractNumber || current.contractNumber,
      visitType: parsed.visitType || current.visitType || 'pickup',
      visitDate: parsed.visitDate || current.visitDate,
      startTime: parsed.startTime || current.startTime,
      endTime: parsed.endTime || current.endTime,
      timeNote: parsed.timeNote || current.timeNote,
      rugs: parsed.rugs?.length ? parsed.rugs : current.rugs,
      estimatedPrice: parsed.estimatedPrice || current.estimatedPrice,
      discount: parsed.discount || current.discount,
      regularCustomer: parsed.regularCustomer || current.regularCustomer,
      managerComment: clean(current.managerComment).includes(raw) ? current.managerComment : [clean(current.managerComment), sourceComment].filter(Boolean).join('\n\n'),
      eventId: current.eventId,
      pmkId: current.pmkId,
    };
    fillForm(next);
    textarea.value = raw;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    try { localStorage.setItem(STORAGE_KEY, raw); } catch {}
    if (!current.eventId) {
      $('#eventId').value = '';
      $('#eventId').dataset.pmkId = current.pmkId || makeId();
      $('#deleteEventBtn')?.classList.add('hidden');
      $('#formTitle').textContent = 'Новая заявка — информация распределена';
    }
    const recognized = labels(parsed);
    const absent = missing(parsed);
    const result = $('#smartPasteResult');
    if (result) {
      result.className = `smart-paste-result ${recognized.length ? 'success' : 'warning'}`;
      result.innerHTML = `<strong>${recognized.length ? 'Распознано и распределено:' : 'Точные поля не найдены'}</strong>${recognized.length ? `<div>${recognized.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div>` : ''}${absent.length ? `<small>Нужно уточнить: ${escapeHtml(absent.join(', '))}.</small>` : '<small>Основные данные заполнены. Проверьте результат.</small>'}`;
    }
    const completeRugs = next.rugs?.length && next.rugs.every(rug => Number(rug.length) > 0 && Number(rug.width) > 0 && rug.material);
    if (completeRugs) {
      const toggle = $('#autoPrice');
      if (toggle) toggle.checked = true;
      window.PMK_PRICING_V48?.calculatePrice?.();
    }
    schedulePreviewUpdate();
    showToast(absent.length ? `Данные распределены. Уточните: ${absent.join(', ')}.` : 'Все распознанные данные распределены.', absent.length ? '' : 'success');
  }

  function install() {
    const oldButton = $('#smartPasteParseBtn');
    const textarea = $('#smartPasteInput');
    if (!oldButton || !textarea) return false;
    if (oldButton.dataset.voiceParser === '68') return true;
    const button = oldButton.cloneNode(true);
    button.dataset.voiceParser = '68';
    button.textContent = 'Разобрать и заполнить заявку';
    oldButton.replaceWith(button);
    button.addEventListener('click', apply);
    textarea.placeholder = 'Например: Светлана, Сормовский район, улица Коминтерна, дом 115. Два ковра: два на три, синтетика, пятна и шерсть; полтора на два, шерсть. Дополнительно удаление запаха мочи и озонирование.';
    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        apply();
      }
    }, true);
    if (window.PMK_SMART_PARSER_V45) window.PMK_SMART_PARSER_V45.parseText = parse;
    return true;
  }

  window.PMK_VOICE_PARSER_FAST_V68_API = { parse, apply, parseSpokenNumber, dimensionMatches, serviceData };
  const start = () => requestAnimationFrame(() => { if (!install()) setTimeout(install, 180); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();