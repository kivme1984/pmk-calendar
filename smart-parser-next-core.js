'use strict';

(function attachSmartParser(globalScope) {
  const DISTRICTS = [
    ['Автозаводский', /\bавтоз(?:авод(?:ский|а)?)?\b/i],
    ['Ленинский', /\bленинск(?:ий|ого)?\b/i],
    ['Канавинский', /\bканавинск(?:ий|ого)?\b/i],
    ['Московский', /\bмосковск(?:ий|ого)?\s*(?:район|р-?н)?\b/i],
    ['Сормовский', /\bсормов(?:о|ский|ского)?\b/i],
    ['Нижегородский', /\bнижегородск(?:ий|ого)?\s*(?:район|р-?н)?\b/i],
    ['Советский', /\bсоветск(?:ий|ого)?\s*(?:район|р-?н)?\b/i],
    ['Приокский', /\bприокск(?:ий|ого)?\b/i],
  ];

  const SETTLEMENT_MARKERS = /\b(?:г(?:ород)?\.?|деревня|д\.|пос(?:е[̈ё]лок)?\.?|село|с\.|снт|тиз|микрорайон|мкр\.?)\s*/i;
  const STREET_TYPES = '(?:улица|ул\\.?|проспект|пр-?т\\.?|проезд|переулок|пер\\.?|шоссе|наб(?:ережная)?\\.?|бульвар|площадь|пл\\.?|дорога|линия|тракт)';
  const TECHNICAL_EVENT = /^(?:стирка|вых(?:одной)?|забор[\s-]*(?:дост(?:авка)?|доставка)|доставка[\s-]*забор|не будет света|отпуск|санитарный день)\b/i;
  const STRUCTURED_DUPLICATE = /^(?:ЗАБОР|ДОСТАВКА)\s*•/i;
  const PHONE_CONTEXT = /(?:тел(?:ефон)?\.?|т\.?|контакт|звонить|если не дозвонитесь|заказчик|встретит|супруг|супруга)/i;

  const SERVICE_DEFS = [
    ['stainRemoval', /пятн|кров|кофе|вино|краск|пластилин|слайм|жидкост[ьи]\s+для\s+розжига|рвот/i],
    ['petHairRemoval', /шерст(?:ь|и)?\s*(?:животн|кош|собак)?|волос|выч[её]с|чесать/i],
    ['urineOdorRemoval', /моч[аи]|запах\s*(?:мочи)?|описал|описала|метк[аи]/i],
    ['conditioner', /конд(?:иционер|ей)?\b/i],
    ['pileLifting', /поднят(?:ие|ь)\s*ворс|подъ[её]м\s*ворс|расч[её]с|причес/i],
    ['disinfection', /дезинф|антибактери|обеззараж/i],
    ['ozonation', /озон/i],
    ['express', /экспресс|срочн|вернуть\s+до/i],
    ['doubleSidedWash', /с\s+обоих\s+сторон/i],
  ];

  const NEGATION_BEFORE = '(?:не\\s+(?:надо|нужно|хочет|хотят|делать|выводить|чесать)|без)';
  const NEGATION_AFTER = '(?:не\\s+(?:надо|нужно|хочет|хотят|делать|выводить|чесать))';
  const REVIEW_WORDS = /посмотр(?:еть|ите)|проверить|если\s+будут|возможно|не\s+понятно|под\s+вопросом|вроде|ориентировочно/i;

  function clean(value = '') {
    return String(value || '')
      .replace(/&#40;|&lpar;/gi, '(')
      .replace(/&#41;|&rpar;/gi, ')')
      .replace(/&nbsp;|\u00a0/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/\r/g, '\n')
      .replace(/[«»„“”]/g, '"')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function canonical(value = '') {
    return clean(value).toLowerCase().replace(/ё/g, 'е');
  }

  function titleCase(value = '') {
    return clean(value).toLowerCase().replace(/(^|[\s-])[а-яёa-z]/g, letter => letter.toUpperCase());
  }

  function unique(values = []) {
    return [...new Set(values.filter(Boolean))];
  }

  function normalizePhone(raw = '') {
    let digits = String(raw).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    if (digits.length === 10) digits = `7${digits}`;
    return digits.length === 11 && digits.startsWith('7') ? `+${digits}` : '';
  }

  function extractPhones(text = '') {
    const source = clean(text);
    const matches = [];
    const regex = /(?:\+?7|8)?[\s().-]*\d(?:[\s().-]*\d){9,11}/g;
    let match;
    while ((match = regex.exec(source))) {
      const phone = normalizePhone(match[0]);
      if (!phone) continue;
      const before = source.slice(Math.max(0, match.index - 70), match.index);
      const after = source.slice(regex.lastIndex, Math.min(source.length, regex.lastIndex + 70));
      const nearby = `${before} ${after}`;
      let role = '';
      if (/заказчик/i.test(nearby)) role = 'Заказчик';
      else if (/встретит|будет\s+отдавать/i.test(nearby)) role = 'Встречает курьера';
      else if (/супруг|муж/i.test(nearby)) role = 'Супруг';
      else if (/супруга|жена/i.test(nearby)) role = 'Супруга';
      else if (/если\s+не\s+дозвонитесь|запасн|второй\s+номер/i.test(nearby)) role = 'Дополнительный номер';
      else if (/для\s+доставк|возврат/i.test(nearby)) role = 'Контакт для возврата';
      matches.push({ phone, role, index: match.index, raw: clean(match[0]) });
    }
    const seen = new Set();
    return matches.filter(item => !seen.has(item.phone) && seen.add(item.phone));
  }

  function extractContractNumber(text = '') {
    const match = clean(text).match(/\bд\s*[-№]?\s*(\d{1,5})(?:\s*\((\d{1,2})\))?/i);
    if (!match) return '';
    return `Д-${match[1]}${match[2] ? `(${match[2]})` : ''}`;
  }

  function extractSource(text = '') {
    const value = canonical(text);
    const avito = value.match(/авито\s*([123])?/i);
    if (avito) return `Avito ${avito[1] || '1'}`;
    if (/\bфск\b/.test(value)) return 'ФСК';
    if (/\bнфс\b/.test(value)) return 'НФС';
    if (/сайт/.test(value)) return 'Сайт';
    if (/реком|рекомендац|по\s+совету/.test(value)) return 'Рекомендации';
    if (/телевиден/.test(value)) return 'Телевидение';
    if (/ватсап|whatsapp/.test(value)) return 'WhatsApp';
    if (/\bmax\b|макс/.test(value)) return 'MAX';
    return '';
  }

  function extractDistrict(text = '') {
    return DISTRICTS.find(([, pattern]) => pattern.test(text))?.[0] || '';
  }

  function extractStatus(text = '') {
    const value = canonical(text);
    if (/выполнен/.test(value)) return 'completed';
    if (/в\s+работе/.test(value)) return 'in-work';
    if (/перенос|сама\s+(?:позвонит|напишет)|позвонит\s+после/.test(value)) return 'follow-up';
    return '';
  }

  function shouldUseForCorpus(event = {}) {
    const summary = clean(event.summary || '');
    const description = clean(event.description || '');
    if (!summary) return false;
    if (TECHNICAL_EVENT.test(summary)) return false;
    if (STRUCTURED_DUPLICATE.test(summary)) return false;
    const merged = `${summary}\n${description}`;
    const hasPhone = extractPhones(merged).length > 0;
    const hasAddressCue = /\b(?:ул\.?|улица|проспект|пр-?т|шоссе|дом|кв\.?|подъезд|п\d|этаж|э\d)\b/i.test(merged);
    const hasRugCue = /ков[её]р|дорожк|циновк|шегги|размер|\d+[.,]?\d*\s*[xх×*]\s*\d+/i.test(merged);
    return hasPhone && (hasAddressCue || hasRugCue);
  }

  function normalizeHouse(value = '') {
    return clean(value).replace(/\s+/g, '').replace(/^д(?:ом)?\.?/i, '');
  }

  function parseAddressBlock(block = '') {
    const text = clean(block);
    if (!text) return null;
    const district = extractDistrict(text);
    const apartment = text.match(/(?:кв(?:артира)?\.?\s*)(\d+[а-я]?)/i)?.[1] || '';
    const entrance = text.match(/(?:подъезд|под\.?|п)\s*[-№]?\s*(\d{1,2})\b/i)?.[1] || '';
    const floor = text.match(/(?:этаж|эт\.?|э)\s*[-№]?\s*(\d{1,2})\b/i)?.[1] || '';
    const office = text.match(/(?:офис|оф\.)\s*([\d.]+)/i)?.[1] || '';
    const explicitHouse = text.match(/(?:дом|д\.)\s*([\d]+(?:[а-я]|\/[\dа-я]+|к\s*\d+|\s+корп(?:ус)?\.?\s*\d+)?)/i)?.[1] || '';

    let street = '';
    let house = explicitHouse;
    let compactApartment = '';

    const typed = text.match(new RegExp(`\\b(${STREET_TYPES})\\s+([а-яёa-z0-9.'’-]+(?:\\s+[а-яёa-z0-9.'’-]+){0,5}?)\\s*,?\\s*(?:дом|д\\.)?\\s*(\\d+[а-я]?(?:\\/\\d+[а-я]?|к\\d+)?)?(?:\\s*[-–]\\s*(\\d+[а-я]?))?`, 'i'));
    if (typed) {
      street = clean(`${typed[1].replace(/\.$/, '')} ${typed[2]}`);
      house ||= typed[3] || '';
      compactApartment = typed[4] || '';
    }

    if (!street) {
      const compact = text.match(/(?:^|[.;\n]|\b(?:район|забор|доставка)\b)\s*([а-яё][а-яё.'’-]*(?:\s+[а-яё][а-яё.'’-]*){0,4})\s+(\d+[а-я]?(?:\/\d+[а-я]?|к\d+)?)(?:\s*[-–]\s*(\d+[а-я]?))?/i);
      if (compact) {
        const candidate = clean(compact[1]);
        if (!/^(?:от|в|на|после|до|ковер|цена|район|забор|доставка)$/i.test(candidate)) {
          street = candidate;
          house ||= compact[2] || '';
          compactApartment = compact[3] || '';
        }
      }
    }

    const settlementMatch = text.match(new RegExp(`${SETTLEMENT_MARKERS.source}([а-яёa-z.'’-]+(?:\\s+[а-яёa-z.'’-]+){0,3})`, 'i'));
    let settlement = settlementMatch ? titleCase(settlementMatch[1]) : '';
    if (/нижний\s+новгород|\bнн\b/i.test(text)) settlement = 'Нижний Новгород';

    const code = text.match(/(?:код(?:овый)?\s*(?:замок|двери|домофона)?|домофон)\s*[:№-]?\s*([\d#*]{2,10}(?:\s+одновременно\s+нажать)?)/i)?.[1] || '';
    const instructions = [];
    if (/домофон\s+не\s+работает|домофон\s+отключ[её]н/i.test(text)) instructions.push('Домофон не работает');
    if (/шлагбаум/i.test(text)) instructions.push('Шлагбаум');
    const landmark = text.match(/(?:ориентир|вход|заезжать|набирать\s+в\s+навигаторе|где)\s*[:.-]?\s*([^\n.]{4,120})/i)?.[1] || '';
    if (landmark) instructions.push(clean(landmark));

    const result = {
      settlement,
      district,
      street: titleCase(street),
      house: normalizeHouse(house),
      apartment: apartment || compactApartment,
      entrance,
      floor,
      office,
      accessCode: clean(code),
      instructions: unique(instructions),
      raw: text,
    };
    return Object.values(result).some(value => Array.isArray(value) ? value.length : Boolean(value)) ? result : null;
  }

  function extractAddresses(text = '') {
    const source = clean(text);
    const returnMatch = source.match(/(?:назад|вернуть|привезти|доставить|возврат)[^\n.]{0,35}?(?:на|по)?\s*([^\n.]{4,150})/i);
    const returnAddress = returnMatch ? parseAddressBlock(returnMatch[1]) : null;
    const primarySource = returnMatch ? source.replace(returnMatch[0], ' ') : source;
    const primaryAddress = parseAddressBlock(primarySource);
    return { primaryAddress, returnAddress };
  }

  function extractContactNames(text = '', phones = []) {
    const source = clean(text);
    const names = [];
    const blocked = /^(?:Авито|Сайт|ФСК|НФС|Забор|Доставка|Район|Ковер|Цена|Дом|Улица|Подъезд|Этаж)$/i;
    phones.forEach(item => {
      const position = source.indexOf(item.raw);
      const around = source.slice(Math.max(0, position - 65), Math.min(source.length, position + item.raw.length + 65));
      const candidates = [...around.matchAll(/\b([А-ЯЁ][а-яё]{2,24})(?:\s+([А-ЯЁ][а-яё]{2,24}))?(?:\s+([А-ЯЁ][а-яё]{2,24}))?\b/g)]
        .map(match => clean([match[1], match[2], match[3]].filter(Boolean).join(' ')))
        .filter(name => !blocked.test(name) && !/^(?:Нижний Новгород|Советский Район|Московский Район)$/i.test(name));
      const name = candidates.at(-1) || '';
      names.push({ name, phone: item.phone, role: item.role });
    });
    if (!names.some(item => item.name)) {
      const explicit = source.match(/(?:имя|клиент|контакт|заказчик)\s*[:.-]?\s*([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/i)?.[1] || '';
      if (explicit) names.push({ name: titleCase(explicit), phone: phones[0]?.phone || '', role: 'Клиент' });
    }
    return names.filter(item => item.name || item.phone);
  }

  function normalizeDimension(value) {
    const number = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(number) || number <= 0) return 0;
    return number > 20 ? Math.round((number / 100) * 100) / 100 : number;
  }

  function extractDimensions(text = '') {
    const source = canonical(text);
    const results = [];
    const regex = /(\d+(?:[.,]\d+)?)\s*(?:см|м)?\s*(?:[xх×*]|\bна\b|\/)\s*(\d+(?:[.,]\d+)?)\s*(?:см|м)?/gi;
    let match;
    while ((match = regex.exec(source))) {
      const a = normalizeDimension(match[1]);
      const b = normalizeDimension(match[2]);
      if (!a || !b || a > 20 || b > 20) continue;
      const context = source.slice(Math.max(0, match.index - 55), Math.min(source.length, regex.lastIndex + 95));
      results.push({
        length: Math.max(a, b),
        width: Math.min(a, b),
        approximate: /пример|ориентир|около|\+\-|точно\s+не\s+зна|возможно/.test(context),
        raw: clean(match[0]),
        index: match.index,
        context,
      });
    }
    return results;
  }

  function classifyMaterial(context = '') {
    const value = canonical(context);
    if (/вискоз/.test(value)) return { value: 'Вискоза', certainty: 'confirmed' };
    if (/хлопок/.test(value)) return { value: 'Хлопок', certainty: /возможно|если|либо/.test(value) ? 'uncertain' : 'confirmed' };
    if (/шелк/.test(value)) return { value: 'Шёлк', certainty: 'confirmed' };
    if (/шерстян|\bшерсть\b/.test(value) && !/шерсть\s+(?:животн|кош|собак)|выч.*шерст|шерсть\s+не\s+чес/.test(value)) return { value: 'Шерсть', certainty: /возможно|если|либо|состав\s+неизвест/.test(value) ? 'uncertain' : 'confirmed' };
    if (/синтет|полипропилен|полиэстер|акрил|нейлон/.test(value)) return { value: 'Синтетика', certainty: 'confirmed' };
    if (/циновк|безворс|килим/.test(value)) return { value: 'Безворсный', certainty: 'confirmed' };
    return { value: '', certainty: 'unknown' };
  }

  function classifyPile(context = '') {
    const value = canonical(context);
    if (/высоко\w*\s*ворс|длинн\w*\s*ворс|шегги|шагги|мехов|травк/.test(value)) return 'Более 1 см';
    if (/коротк\w*\s*ворс|низк\w*\s*ворс|небольш\w*\s*ворс|до\s*1\s*см/.test(value)) return 'До 1 см';
    if (/безворс|циновк|килим/.test(value)) return 'Без ворса';
    return '';
  }

  function classifyShape(context = '') {
    const value = canonical(context);
    if (/овал/.test(value)) return 'Овальный';
    if (/кругл/.test(value)) return 'Круглый';
    if (/дорожк/.test(value)) return 'Дорожка';
    return 'Прямоугольный';
  }

  function stateForService(context = '', pattern) {
    const value = canonical(context);
    const hit = value.search(pattern);
    if (hit < 0) return 'absent';
    const local = value.slice(Math.max(0, hit - 50), Math.min(value.length, hit + 90));
    if (new RegExp(`${NEGATION_BEFORE}.{0,35}${pattern.source}|${pattern.source}.{0,35}${NEGATION_AFTER}`, 'i').test(local)) return 'denied';
    if (REVIEW_WORDS.test(local)) return 'review';
    return 'confirmed';
  }

  function extractServiceStates(context = '') {
    const states = {};
    SERVICE_DEFS.forEach(([key, pattern]) => {
      const state = stateForService(context, pattern);
      if (state !== 'absent') states[key] = state;
    });
    if (/просто\s+(?:стирка|помыть)|стандартн\w*\s+стирк|ничего\s+убирать\s+не\s+нужно/i.test(context)) states.basicWash = 'confirmed';
    return states;
  }

  function extractRugs(text = '') {
    const source = clean(text);
    const dimensions = extractDimensions(source);
    const countMatch = source.match(/\b(\d{1,2}|один|два|две|три|четыре|пять|шесть|семь)\s+(?:ковр|ков[её]р|дорож)/i);
    const words = { один: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7 };
    const declaredCount = countMatch ? Number(countMatch[1]) || words[canonical(countMatch[1])] || 0 : 0;
    const unknownMeasurements = /измерить|замер\s+в\s+цех|размер(?:ы)?\s+(?:не\s+зна|неизвест)|точно\s+не\s+зна/i.test(source);
    const mentionsSmall = [...source.matchAll(/\b(?:малыш|маленьк\w*\s+ков)/gi)].length;

    const rugs = dimensions.map((dimension, index) => {
      const previous = dimensions[index - 1]?.index ?? 0;
      const next = dimensions[index + 1]?.index ?? source.length;
      const context = source.slice(Math.max(previous, dimension.index - 100), Math.min(next, dimension.index + dimension.raw.length + 150));
      return {
        length: dimension.length,
        width: dimension.width,
        approximate: dimension.approximate,
        measurementStatus: dimension.approximate ? 'approximate' : 'known',
        shape: classifyShape(context),
        material: classifyMaterial(context),
        pile: classifyPile(context),
        services: extractServiceStates(context),
        notes: [],
        raw: dimension.raw,
      };
    });

    const targetCount = Math.max(declaredCount, rugs.length + mentionsSmall);
    while (rugs.length < targetCount) {
      rugs.push({
        length: 0,
        width: 0,
        approximate: false,
        measurementStatus: unknownMeasurements ? 'measure-at-workshop' : 'unknown',
        shape: /овал/i.test(source) ? 'Овальный' : (/дорожк/i.test(source) ? 'Дорожка' : ''),
        material: classifyMaterial(source),
        pile: classifyPile(source),
        services: extractServiceStates(source),
        notes: mentionsSmall ? ['Маленький ковёр'] : [],
        raw: '',
      });
    }

    if (!rugs.length && (unknownMeasurements || /ков[её]р|дорожк/i.test(source))) {
      rugs.push({
        length: 0,
        width: 0,
        approximate: false,
        measurementStatus: unknownMeasurements ? 'measure-at-workshop' : 'unknown',
        shape: classifyShape(source),
        material: classifyMaterial(source),
        pile: classifyPile(source),
        services: extractServiceStates(source),
        notes: [],
        raw: '',
      });
    }
    return rugs;
  }

  function extractTimeConstraints(text = '') {
    const value = canonical(text);
    const constraints = [];
    const ranges = [...value.matchAll(/(?:с\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:до|[-–])\s*(\d{1,2})(?::(\d{2}))?/g)];
    ranges.forEach(match => constraints.push({ type: 'range', from: `${match[1].padStart(2, '0')}:${match[2] || '00'}`, to: `${match[3].padStart(2, '0')}:${match[4] || '00'}`, raw: clean(match[0]) }));
    const before = value.match(/(?:строго\s+)?до\s*(\d{1,2})(?::(\d{2}))?/);
    if (before) constraints.push({ type: 'before', time: `${before[1].padStart(2, '0')}:${before[2] || '00'}`, raw: clean(before[0]) });
    const after = value.match(/после\s*(\d{1,2})(?::(\d{2}))?/);
    if (after) constraints.push({ type: 'after', time: `${after[1].padStart(2, '0')}:${after[2] || '00'}`, raw: clean(after[0]) });
    if (/весь\s+день|всегда\s+дома|дома\s+целый\s+день/.test(value)) constraints.push({ type: 'all-day', raw: 'весь день' });
    if (/в\s+районе\s+обеда|до\s+обеда|после\s+обеда|дн[её]м|вечер|утром|вторая\s+половина/.test(value)) {
      const daypart = value.match(/в\s+районе\s+обеда|до\s+обеда|после\s+обеда|дн[её]м|вечер|утром|вторая\s+половина/)?.[0];
      if (daypart) constraints.push({ type: 'daypart', value: daypart, raw: daypart });
    }
    const callAhead = value.match(/(?:позвонить|звонок|набрать|предупредить)[^\n.]{0,35}?(?:за\s*)?(\d{1,3})\s*(?:мин|час)/);
    let callAheadMinutes = 0;
    if (callAhead) callAheadMinutes = /час/.test(callAhead[0]) ? Number(callAhead[1]) * 60 : Number(callAhead[1]);
    else if (/позвонить\s+заранее|заранее\s+позвонить/.test(value)) callAheadMinutes = 30;
    return { constraints, callAheadMinutes };
  }

  function extractPrice(text = '') {
    const value = clean(text);
    const totals = [...value.matchAll(/(?:итого|всего|общая\s+сумма|цена|стоимость|примерно\s+на|от)\s*[:=-]?\s*(\d[\d\s]{2,5})\s*(?:₽|р\.?|руб)/gi)]
      .map(match => Number(match[1].replace(/\s/g, '')))
      .filter(Number.isFinite);
    const conditional = /если|либо|зависит|состав\s+неизвест|ориентировочно|примерно|от\s+\d/i.test(value);
    return { amount: totals.at(-1) || 0, conditional, candidates: unique(totals) };
  }

  function extractNotes(text = '') {
    const value = clean(text);
    const notes = [];
    const patterns = [
      /(?:помочь\s+свернуть|сами\s+вынесут)/i,
      /(?:писать\s+смс|написать\s+(?:ей\s+)?смс|глухая)/i,
      /(?:нужен\s+чек|чек\s+нужен|нужна\s+бумага)/i,
      /(?:ков[её]р\s+в\s+машине|выставлю\s+в\s+коридор)/i,
      /(?:домофон\s+не\s+работает|шлагбаум)/i,
      /(?:перестир|повторная\s+стирка)/i,
    ];
    patterns.forEach(pattern => {
      const match = value.match(pattern);
      if (match) notes.push(clean(match[0]));
    });
    return unique(notes);
  }

  function confidenceFor(parsed) {
    const warnings = [];
    if (!parsed.phones.length) warnings.push('Телефон не распознан');
    if (!parsed.addresses.primaryAddress?.street || !parsed.addresses.primaryAddress?.house) warnings.push('Адрес требует проверки');
    if (!parsed.contacts.some(item => item.name)) warnings.push('Имя клиента не распознано');
    if (!parsed.rugs.length) warnings.push('Ковры не распознаны');
    parsed.rugs.forEach((rug, index) => {
      if (rug.measurementStatus !== 'known') warnings.push(`Ковёр ${index + 1}: размер требует проверки`);
      if (rug.material.certainty === 'uncertain') warnings.push(`Ковёр ${index + 1}: состав неоднозначен`);
      Object.entries(rug.services).forEach(([service, state]) => {
        if (state === 'review') warnings.push(`Ковёр ${index + 1}: услуга ${service} требует осмотра`);
      });
    });
    const score = Math.max(0, 100 - warnings.length * 12);
    return { score, level: score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low', warnings: unique(warnings) };
  }

  function parse(rawText = '') {
    const text = clean(rawText);
    const phones = extractPhones(text);
    const result = {
      text,
      contractNumber: extractContractNumber(text),
      status: extractStatus(text),
      orderSource: extractSource(text),
      district: extractDistrict(text),
      phones,
      contacts: extractContactNames(text, phones),
      addresses: extractAddresses(text),
      rugs: extractRugs(text),
      time: extractTimeConstraints(text),
      price: extractPrice(text),
      notes: extractNotes(text),
      regularCustomer: /наш\s+клиент|пост\.?\s*клиент|п\/?к|со\s+скидкой\s+п\/?к/i.test(text),
      corpusEligible: shouldUseForCorpus({ summary: text, description: '' }),
    };
    result.confidence = confidenceFor(result);
    return result;
  }

  const api = {
    parse,
    clean,
    canonical,
    extractPhones,
    extractContractNumber,
    extractAddresses,
    extractRugs,
    extractTimeConstraints,
    extractPrice,
    shouldUseForCorpus,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  globalScope.PMK_SMART_PARSER_NEXT = api;
})(typeof window !== 'undefined' ? window : globalThis);
