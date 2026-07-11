'use strict';

(function attachSmartParser(globalScope) {
  const DISTRICTS = [
    ['Автозаводский', /автоз(?:авод(?:ский|а)?)?/i],
    ['Ленинский', /ленинск(?:ий|ого)?/i],
    ['Канавинский', /канавинск(?:ий|ого)?/i],
    ['Московский', /московск(?:ий|ого)?\s*(?:район|р-?н)?/i],
    ['Сормовский', /сормов(?:о|ский|ского)?/i],
    ['Нижегородский', /нижегородск(?:ий|ого)?\s*(?:район|р-?н)?/i],
    ['Советский', /советск(?:ий|ого)?\s*(?:район|р-?н)?/i],
    ['Приокский', /приокск(?:ий|ого)?/i],
  ];

  const STREET_TYPE_SOURCE = '(?:улица|ул\\.?|проспект|пр-?т\\.?|проезд|переулок|пер\\.?|шоссе|наб(?:ережная)?\\.?|бульвар|площадь|пл\\.?|дорога|линия|тракт)';
  const TECHNICAL_EVENT = /^(?:стирка|вых(?:одной)?|забор[\s-]*(?:дост(?:авка)?|доставка)|доставка[\s-]*забор|не\s+будет\s+света|отпуск|санитарный\s+день)(?:\s|$)/i;
  const STRUCTURED_DUPLICATE = /^(?:ЗАБОР|ДОСТАВКА)\s*•/i;

  const SERVICE_PATTERNS = {
    stainRemoval: /пятн|кров|кофе|вино|краск|пластилин|слайм|жидкост[ьи]\s+для\s+розжига|рвот|фикали/i,
    petHairRemoval: /шерст(?:ь|и)(?![а-яё])(?:\s+(?:животн|кош|собак))?|волос|выч[её]с|чесать/i,
    urineOdorRemoval: /моч[аи]|запах\s*(?:мочи)?|описал|описала|метк[аи]/i,
    conditioner: /конд(?:иционер|ей)?(?![а-яё])/i,
    pileLifting: /поднят(?:ие|ь)\s*ворс|подъ[её]м\s*ворс|расч[её]с|причес/i,
    disinfection: /дезинф|антибактери|обеззараж/i,
    ozonation: /озон/i,
    express: /экспресс|срочн|вернуть\s+до/i,
    doubleSidedWash: /с\s+обоих\s+сторон/i,
  };

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

  function roleNear(value = '') {
    if (/заказчик/i.test(value)) return 'Заказчик';
    if (/встретит|будет\s+отдавать/i.test(value)) return 'Встречает курьера';
    if (/супруг|муж/i.test(value)) return 'Супруг';
    if (/супруга|жена/i.test(value)) return 'Супруга';
    if (/если\s+не\s+дозвонитесь|запасн|второй\s+номер/i.test(value)) return 'Дополнительный номер';
    if (/для\s+доставк|возврат/i.test(value)) return 'Контакт для возврата';
    return '';
  }

  function extractPhones(text = '') {
    const source = clean(text);
    const matches = [];
    const regex = /(?:\+?7|8)?[\s().-]*\d(?:[\s().-]*\d){9,11}/g;
    let match;
    while ((match = regex.exec(source))) {
      const phone = normalizePhone(match[0]);
      if (!phone) continue;
      const nearby = source.slice(Math.max(0, match.index - 80), Math.min(source.length, regex.lastIndex + 45));
      matches.push({ phone, role: roleNear(nearby), index: match.index, raw: clean(match[0]) });
    }
    const seen = new Set();
    return matches.filter(item => !seen.has(item.phone) && seen.add(item.phone));
  }

  function extractContractNumber(text = '') {
    const match = clean(text).match(/(?:^|[\s.(])д\s*[-№]?\s*(\d{1,5})(?:\s*\((\d{1,2})\))?/i);
    return match ? `Д-${match[1]}${match[2] ? `(${match[2]})` : ''}` : '';
  }

  function extractSource(text = '') {
    const value = canonical(text);
    const avito = value.match(/авито\s*([123])?/i);
    if (avito) return `Avito ${avito[1] || '1'}`;
    if (/(?:^|\s)фск(?:\s|$)/.test(value)) return 'ФСК';
    if (/(?:^|\s)нфс(?:\s|$)/.test(value)) return 'НФС';
    if (/сайт/.test(value)) return 'Сайт';
    if (/реком|рекомендац|по\s+совету/.test(value)) return 'Рекомендации';
    if (/телевиден/.test(value)) return 'Телевидение';
    if (/ватсап|whatsapp/.test(value)) return 'WhatsApp';
    if (/(?:^|\s)max(?:\s|$)|макс/.test(value)) return 'MAX';
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
    if (!summary || TECHNICAL_EVENT.test(summary) || STRUCTURED_DUPLICATE.test(summary)) return false;
    const merged = `${summary}\n${description}`;
    const hasPhone = extractPhones(merged).length > 0;
    const hasAddressCue = /(?:^|\s)(?:ул\.?|улица|проспект|пр-?т|шоссе|дом|кв\.?|подъезд|п\s*\d|этаж|э\s*\d)/i.test(merged);
    const hasRugCue = /ков[её]р|дорожк|циновк|шегги|размер|\d+[.,]?\d*\s*[xх×*]\s*\d+/i.test(merged);
    return hasPhone && (hasAddressCue || hasRugCue);
  }

  function normalizeHouse(value = '') {
    return clean(value).replace(/\s+/g, '').replace(/^д(?:ом)?\.?/i, '');
  }

  function trimStreetCandidate(value = '') {
    let result = clean(value)
      .replace(/^(?:д\s*[-№]?\s*\d+(?:\(\d+\))?\s*)/i, '')
      .replace(/^(?:выполнен\w*|в\s+работе|от\s+\d+[.\/-]\d+|забор|доставка)\s*/ig, '')
      .replace(/^(?:автоз(?:авод\w*)?|ленинск\w*|канавинск\w*|московск\w*|сормов\w*|нижегородск\w*|советск\w*|приокск\w*)\s*(?:район|р-?н)?\s*/i, '');
    const words = result.split(/\s+/).filter(Boolean);
    const stopIndex = Math.max(words.lastIndexOf('забор'), words.lastIndexOf('доставка'), words.lastIndexOf('район'));
    if (stopIndex >= 0) result = words.slice(stopIndex + 1).join(' ');
    return clean(result.replace(/^[,.;:-]+|[,.;:-]+$/g, ''));
  }

  function parseAddressBlock(block = '') {
    const text = clean(block);
    if (!text) return null;
    const district = extractDistrict(text);
    const apartmentExplicit = text.match(/(?:кв(?:артира)?\.?\s*)(\d+[а-я]?)/i)?.[1] || '';
    const entrance = text.match(/(?:подъезд|под\.?|п)\s*[-№]?\s*(\d{1,2})\s*(?=э|эт|этаж|\s|,|\.|$)/i)?.[1] || '';
    const floor = text.match(/(?:этаж|эт\.?|э)\s*[-№]?\s*(\d{1,2})\b/i)?.[1] || '';
    const office = text.match(/(?:офис|оф\.)\s*([\d.]+)/i)?.[1] || '';
    const explicitHouse = text.match(/(?:дом|д\.)\s*([\d]+(?:[а-я]|\/[\dа-я]+|к\s*\d+|\s+корп(?:ус)?\.?\s*\d+)?)/i)?.[1] || '';

    let street = '';
    let house = explicitHouse;
    let compactApartment = '';

    const typed = text.match(new RegExp(`(${STREET_TYPE_SOURCE})\\s+([а-яёa-z0-9.'’-]+(?:\\s+[а-яёa-z0-9.'’-]+){0,5}?)\\s*,?\\s*(?:дом|д\\.)?\\s*(\\d+[а-я]?(?:\\/\\d+[а-я]?|к\\d+)?)?(?:\\s*[-–]\\s*(\\d+[а-я]?))?`, 'i'));
    if (typed) {
      street = clean(`${typed[1].replace(/\.$/, '')} ${typed[2]}`);
      house ||= typed[3] || '';
      compactApartment = typed[4] || '';
    }

    if (!street) {
      const compactRegex = /([а-яё][а-яё.'’-]*(?:\s+[а-яё][а-яё.'’-]*){0,6})\s+(\d+[а-я]?(?:\/\d+[а-я]?|к\d+)?)\s*(?:[-–]\s*(\d+[а-я]?))?/ig;
      let candidate;
      while ((candidate = compactRegex.exec(text))) {
        const possibleStreet = trimStreetCandidate(candidate[1]);
        if (!possibleStreet || /^(?:ковер|цена|размер|после|до|с|на)$/i.test(possibleStreet)) continue;
        street = possibleStreet;
        house ||= candidate[2] || '';
        compactApartment = candidate[3] || '';
      }
    }

    let settlement = '';
    const settlementMatch = text.match(/(?:город|г\.|деревня|пос(?:е[̈ё]лок)?\.?|село|снт|тиз|микрорайон|мкр\.?)\s*([а-яёa-z.'’-]+(?:\s+[а-яёa-z.'’-]+){0,2})/i);
    if (settlementMatch) settlement = titleCase(settlementMatch[1]);
    if (/нижний\s+новгород|(?:^|\s)нн(?:\s|$)/i.test(text)) settlement = 'Нижний Новгород';

    const code = text.match(/(?:код(?:овый)?\s*(?:замок|двери|домофона)?|домофон)\s*[:№-]?\s*([\d#*]{2,10})/i)?.[1] || '';
    const instructions = [];
    if (/домофон\s+не\s+работает|домофон\s+отключ[её]н/i.test(text)) instructions.push('Домофон не работает');
    if (/шлагбаум/i.test(text)) instructions.push('Шлагбаум');
    const landmark = text.match(/(?:ориентир|вход|заезжать|набирать\s+в\s+навигаторе|где)\s*[:.-]?\s*([^\n.]{4,100})/i)?.[1] || '';
    if (landmark) instructions.push(clean(landmark));

    const result = {
      settlement,
      district,
      street: titleCase(street),
      house: normalizeHouse(house),
      apartment: apartmentExplicit || compactApartment,
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
    const returnMatch = source.match(/(?:назад\s+(?:везти|привезти)?|вернуть|привезти|доставить|возврат)[^\n.]{0,28}?(?:на|по)?\s*((?:ул\.?|улица|проспект|пр-?т|шоссе|площадь)?\s*[а-яёa-z.'’-]+(?:\s+[а-яёa-z.'’-]+){0,4}\s+\d+[а-я]?(?:\/\d+[а-я]?|к\d+)?(?:\s*[-–]\s*\d+[а-я]?)?)/i);
    const returnAddress = returnMatch ? parseAddressBlock(returnMatch[1]) : null;
    const primarySource = returnMatch ? source.replace(returnMatch[0], ' ') : source;
    return { primaryAddress: parseAddressBlock(primarySource), returnAddress };
  }

  function extractContactNames(text = '', phones = []) {
    const source = clean(text);
    return phones.map(item => {
      const position = source.indexOf(item.raw);
      const before = source.slice(Math.max(0, position - 70), position);
      const after = source.slice(position + item.raw.length, Math.min(source.length, position + item.raw.length + 45));
      const rolePattern = item.role === 'Заказчик' ? /заказчик\s+([А-ЯЁа-яё]{2,25}(?:\s+[А-ЯЁа-яё]{2,25}){0,2})/i
        : item.role === 'Встречает курьера' ? /встретит\s+([А-ЯЁа-яё]{2,25}(?:\s+[А-ЯЁа-яё]{2,25}){0,2})/i
          : null;
      let name = rolePattern?.exec(`${before} ${after}`)?.[1] || '';
      if (!name) {
        const beforeNames = [...before.matchAll(/(?:^|[\s,.;(])([А-ЯЁ][а-яё]{2,24})(?:\s+([А-ЯЁ][а-яё]{2,24}))?(?=[\s,.;)]|$)/g)];
        const afterNames = [...after.matchAll(/(?:^|[\s,.;(])([А-ЯЁ][а-яё]{2,24})(?:\s+([А-ЯЁ][а-яё]{2,24}))?(?=[\s,.;)]|$)/g)];
        const blocked = /^(?:Авито|Сайт|Фск|Нфс|Забор|Доставка|Район|Ковер|Цена|Дом|Улица|Подъезд|Этаж)$/i;
        const candidates = [...beforeNames, ...afterNames]
          .map(match => clean([match[1], match[2]].filter(Boolean).join(' ')))
          .filter(candidate => !blocked.test(candidate));
        name = candidates.at(-1) || '';
      }
      return { name: titleCase(name), phone: item.phone, role: item.role || 'Клиент' };
    });
  }

  function normalizeDimension(value) {
    const number = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(number) || number <= 0) return 0;
    return number > 20 ? Math.round((number / 100) * 100) / 100 : number;
  }

  function extractDimensions(text = '') {
    const source = canonical(text);
    const results = [];
    const regex = /(\d+(?:[.,]\d+)?)\s*(?:см|м)?\s*(?:[xх×*]|\bна\b)\s*(\d+(?:[.,]\d+)?)\s*(?:см|м)?/gi;
    let match;
    while ((match = regex.exec(source))) {
      const a = normalizeDimension(match[1]);
      const b = normalizeDimension(match[2]);
      if (!a || !b || a > 20 || b > 20) continue;
      const context = source.slice(Math.max(0, match.index - 100), Math.min(source.length, regex.lastIndex + 150));
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
    if (/хлопок/.test(value)) return { value: 'Хлопок', certainty: /возможно|если|либо|неизвест/.test(value) ? 'uncertain' : 'confirmed' };
    if (/шелк/.test(value)) return { value: 'Шёлк', certainty: 'confirmed' };
    if (/шерстян|100\s*%\s*шерст|материал[^\n]{0,20}шерст/.test(value)) return { value: 'Шерсть', certainty: /возможно|если|либо|неизвест/.test(value) ? 'uncertain' : 'confirmed' };
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
    if (/дорожк/.test(value)) return 'Дорожка';
    if (/овал/.test(value)) return 'Овальный';
    if (/кругл/.test(value)) return 'Круглый';
    return 'Прямоугольный';
  }

  function serviceState(context = '', key, pattern) {
    const value = canonical(context);
    const match = pattern.exec(value);
    pattern.lastIndex = 0;
    if (!match) return 'absent';
    const local = value.slice(Math.max(0, match.index - 55), Math.min(value.length, match.index + match[0].length + 80));

    const denied = key === 'conditioner'
      ? /конд[^\n.]{0,25}не\s+(?:хочет|надо|нужно)|без\s+конд/i.test(local)
      : key === 'petHairRemoval'
        ? /шерст[^\n.]{0,45}(?:не\s+чесать|выч[её]сывать\s+не\s+надо|не\s+выч[её]сывать)|(?:не\s+надо|не\s+нужно)\s+выч/i.test(local)
        : key === 'stainRemoval'
          ? /пятн[^\n.]{0,35}(?:не\s+выводить|выводить\s+не\s+нужно)|(?:не\s+надо|не\s+нужно)\s+выводить\s+пятн/i.test(local)
          : new RegExp(`(?:не\\s+(?:надо|нужно|хочет|делать)|без)\\s*.{0,20}(?:${pattern.source})|(?:${pattern.source}).{0,20}не\\s+(?:надо|нужно|хочет|делать)`, 'i').test(local);
    if (denied) return 'denied';

    const review = key === 'stainRemoval'
      ? /посмотр(?:еть|ите)\s+пятн|пятн[^\n.]{0,25}(?:не\s+понятно|возможно|если\s+будут|под\s+вопросом|вроде)/i.test(local)
      : /посмотр(?:еть|ите)|проверить|возможно|не\s+понятно|под\s+вопросом|вроде/i.test(local);
    return review ? 'review' : 'confirmed';
  }

  function extractServiceStates(context = '') {
    const states = {};
    Object.entries(SERVICE_PATTERNS).forEach(([key, pattern]) => {
      const state = serviceState(context, key, pattern);
      if (state !== 'absent') states[key] = state;
    });
    if (/просто\s+(?:стирка|помыть)|стандартн\w*\s+стирк|ничего\s+убирать\s+не\s+нужно/i.test(context)) states.basicWash = 'confirmed';
    return states;
  }

  function mergeServiceStates(globalStates, localStates) {
    const merged = { ...globalStates, ...localStates };
    Object.keys(merged).forEach(key => {
      const values = [globalStates[key], localStates[key]].filter(Boolean);
      if (values.includes('denied')) merged[key] = 'denied';
      else if (values.includes('review')) merged[key] = 'review';
      else if (values.includes('confirmed')) merged[key] = 'confirmed';
    });
    return merged;
  }

  function extractRugs(text = '') {
    const source = clean(text);
    const dimensions = extractDimensions(source);
    const wordCounts = { один: 1, одна: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7 };
    const countMatch = source.match(/(?:^|\s)(\d{1,2}|один|одна|два|две|три|четыре|пять|шесть|семь)\s+(?:ковр|ков[её]р|дорож)/i);
    const declaredCount = countMatch ? Number(countMatch[1]) || wordCounts[canonical(countMatch[1])] || 0 : 0;
    const unknownMeasurements = /измерить|замер\s+в\s+цех|размер(?:ы)?\s+(?:не\s+зна|неизвест)|точно\s+не\s+зна/i.test(source);
    const smallMentions = [...source.matchAll(/(?:малыш|маленьк\w*\s+ков)/gi)].length;
    const globalServices = extractServiceStates(source);

    const rugs = dimensions.map((dimension, index) => {
      const previous = dimensions[index - 1]?.index ?? 0;
      const next = dimensions[index + 1]?.index ?? source.length;
      const context = source.slice(Math.max(previous, dimension.index - 85), Math.min(next, dimension.index + dimension.raw.length + 120));
      return {
        length: dimension.length,
        width: dimension.width,
        approximate: dimension.approximate,
        measurementStatus: dimension.approximate ? 'approximate' : 'known',
        shape: classifyShape(context),
        material: classifyMaterial(context),
        pile: classifyPile(context),
        services: mergeServiceStates(globalServices, extractServiceStates(context)),
        notes: [],
        raw: dimension.raw,
      };
    });

    const targetCount = Math.max(declaredCount, dimensions.length + smallMentions);
    while (rugs.length < targetCount) {
      rugs.push({
        length: 0,
        width: 0,
        approximate: false,
        measurementStatus: unknownMeasurements ? 'measure-at-workshop' : 'unknown',
        shape: /дорожк/i.test(source) ? 'Дорожка' : (/овал/i.test(source) ? 'Овальный' : ''),
        material: classifyMaterial(source),
        pile: classifyPile(source),
        services: { ...globalServices },
        notes: smallMentions ? ['Маленький ковёр'] : [],
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
        services: { ...globalServices },
        notes: smallMentions ? ['Маленький ковёр'] : [],
        raw: '',
      });
    }
    return rugs;
  }

  function extractTimeConstraints(text = '') {
    const value = canonical(text);
    const constraints = [];
    const rangeRegex = /(?:с\s*)(\d{1,2})(?::(\d{2}))?\s*(?:до|[-–])\s*(\d{1,2})(?::(\d{2}))?\s*(?:ч(?:ас(?:а|ов)?)?\.?)?/g;
    let match;
    while ((match = rangeRegex.exec(value))) {
      constraints.push({ type: 'range', from: `${match[1].padStart(2, '0')}:${match[2] || '00'}`, to: `${match[3].padStart(2, '0')}:${match[4] || '00'}`, raw: clean(match[0]) });
    }
    const compactRange = value.match(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*ч(?:ас(?:а|ов)?)?\.?/);
    if (compactRange && !constraints.some(item => item.raw.includes(compactRange[0].trim()))) {
      constraints.push({ type: 'range', from: `${compactRange[1].padStart(2, '0')}:${compactRange[2] || '00'}`, to: `${compactRange[3].padStart(2, '0')}:${compactRange[4] || '00'}`, raw: clean(compactRange[0]) });
    }
    const before = value.match(/(?:строго\s+)?до\s*(\d{1,2})(?::(\d{2}))?/);
    if (before) constraints.push({ type: 'before', time: `${before[1].padStart(2, '0')}:${before[2] || '00'}`, raw: clean(before[0]) });
    const after = value.match(/после\s*(\d{1,2})(?::(\d{2}))?/);
    if (after) constraints.push({ type: 'after', time: `${after[1].padStart(2, '0')}:${after[2] || '00'}`, raw: clean(after[0]) });
    if (/весь\s+день|всегда\s+дома|дома\s+целый\s+день/.test(value)) constraints.push({ type: 'all-day', raw: 'весь день' });
    const daypart = value.match(/в\s+районе\s+обеда|до\s+обеда|после\s+обеда|дн[её]м|вечер|утром|вторая\s+половина/)?.[0];
    if (daypart) constraints.push({ type: 'daypart', value: daypart, raw: daypart });
    const callAhead = value.match(/(?:позвонить|звонок|набрать|предупредить)[^\n.]{0,35}?(?:за\s*)?(\d{1,3})\s*(мин|час)/);
    let callAheadMinutes = 0;
    if (callAhead) callAheadMinutes = callAhead[2].startsWith('час') ? Number(callAhead[1]) * 60 : Number(callAhead[1]);
    else if (/позвонить\s+заранее|заранее\s+позвонить/.test(value)) callAheadMinutes = 30;
    return { constraints, callAheadMinutes };
  }

  function extractPrice(text = '') {
    const value = clean(text);
    const candidates = [];
    const withCurrency = /(?:цена|стоимость|итого|всего|общая\s+сумма|примерно\s+на|от|либо)?\s*[:=-]?\s*(\d[\d\s]{2,5})\s*(?:₽|р\.?|руб)/gi;
    let match;
    while ((match = withCurrency.exec(value))) candidates.push(Number(match[1].replace(/\s/g, '')));
    const conditionalNumbers = /(?:цена\s+)?(?:либо|от)\s*(\d{3,6})|(?:либо)\s*(\d{3,6})/gi;
    while ((match = conditionalNumbers.exec(value))) candidates.push(Number(match[1] || match[2]));
    const filtered = unique(candidates.filter(number => Number.isFinite(number) && number >= 100));
    const conditional = /если|либо|зависит|состав\s+неизвест|ориентировочно|примерно|(?:^|\s)от\s+\d/i.test(value);
    return { amount: filtered.at(-1) || 0, conditional, candidates: filtered };
  }

  function extractNotes(text = '') {
    const value = clean(text);
    const notes = [];
    [
      /(?:помочь\s+свернуть|сами\s+вынесут)/i,
      /(?:писать\s+смс|написать\s+(?:ей\s+)?смс|глухая)/i,
      /(?:нужен\s+чек|чек\s+нужен|нужна\s+бумага)/i,
      /(?:ков[её]р\s+в\s+машине|выставлю\s+в\s+коридор)/i,
      /(?:домофон\s+не\s+работает|шлагбаум)/i,
      /(?:перестир|повторная\s+стирка)/i,
    ].forEach(pattern => {
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
