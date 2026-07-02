'use strict';

(function attachSmartParserNext(globalScope) {
  const core = typeof module !== 'undefined' && module.exports
    ? require('./smart-parser-next-core.js')
    : globalScope.PMK_SMART_PARSER_NEXT;

  if (!core) throw new Error('PMK smart parser core is not loaded');

  const STREET_TYPES = '(?:улица|ул\\.?|проспект|пр-?т\\.?|проезд|переулок|пер\\.?|шоссе|наб(?:ережная)?\\.?|бульвар|площадь|пл\\.?|дорога|линия|тракт)';
  const HOUSE = '\\d+(?:к\\d+|\\/\\d+[а-я]?|[а-я])?';

  function clean(value = '') {
    return core.clean(value);
  }

  function titleCase(value = '') {
    return clean(value).toLowerCase().replace(/(^|[\s-])[а-яёa-z]/g, letter => letter.toUpperCase());
  }

  function trimStreet(value = '') {
    let result = clean(value)
      .replace(/^(?:д\s*[-№]?\s*\d+(?:\(\d+\))?\s*)/i, '')
      .replace(/^(?:выполнен\w*|в\s+работе|от\s+\d+[.\/-]\d+|забор|доставка)\s*/ig, '')
      .replace(/^(?:автоз(?:авод\w*)?|ленинск\w*|канавинск\w*|московск\w*|сормов\w*|нижегородск\w*|советск\w*|приокск\w*)\s*(?:район|р-?н)?\s*/i, '');
    const words = result.split(/\s+/).filter(Boolean);
    const lower = words.map(word => word.toLowerCase());
    const stopIndex = Math.max(lower.lastIndexOf('забор'), lower.lastIndexOf('доставка'), lower.lastIndexOf('район'));
    if (stopIndex >= 0) result = words.slice(stopIndex + 1).join(' ');
    return clean(result.replace(/^[,.;:-]+|[,.;:-]+$/g, ''));
  }

  function parseAddressSegment(segment = '', inheritedDistrict = '') {
    const text = clean(segment);
    if (!text) return null;

    const apartmentExplicit = text.match(/(?:кв(?:артира)?\.?\s*)(\d+[а-я]?)/i)?.[1] || '';
    const entrance = text.match(/(?:подъезд|под\.?|п)\s*[-№]?\s*(\d{1,2})\s*(?=э|эт|этаж|\s|,|\.|$)/i)?.[1] || '';
    const floor = text.match(/(?:этаж|эт\.?|э)\s*[-№]?\s*(\d{1,2})(?=\s|,|\.|$)/i)?.[1] || '';
    const office = text.match(/(?:офис|оф\.)\s*([\d.]+)/i)?.[1] || '';

    let street = '';
    let house = '';
    let compactApartment = '';

    const typed = text.match(new RegExp(`(${STREET_TYPES})\\s+([а-яёa-z.'’-]+(?:\\s+[а-яёa-z.'’-]+){0,5}?)\\s*,?\\s*(?:дом|д\\.)?\\s*(${HOUSE})(?:\\s*[-–]\\s*(\\d+[а-я]?))?`, 'i'));
    if (typed) {
      street = `${typed[1].replace(/\.$/, '')} ${typed[2]}`;
      house = typed[3];
      compactApartment = typed[4] || '';
    }

    if (!street) {
      const addressZone = text
        .split(/(?:\+?7|8)?[\s().-]*\d(?:[\s().-]*\d){9,11}/)[0]
        .split(/(?:ков[её]р|дорожк|цена|стоимость|размер|стирка|пятн|шерст|конд)/i)[0];
      const regex = new RegExp(`([а-яё][а-яё.'’-]*(?:\\s+[а-яё][а-яё.'’-]*){0,6})\\s+(${HOUSE})(?:\\s*[-–]\\s*(\\d+[а-я]?))?`, 'ig');
      let candidate;
      while ((candidate = regex.exec(addressZone))) {
        const possibleStreet = trimStreet(candidate[1]);
        if (!possibleStreet || /^(?:ковер|цена|размер|после|до|с|на)$/i.test(possibleStreet)) continue;
        street = possibleStreet;
        house = candidate[2];
        compactApartment = candidate[3] || '';
        break;
      }
    }

    const explicitHouse = text.match(new RegExp(`(?:дом|д\\.)\\s*(${HOUSE})`, 'i'))?.[1] || '';
    if (explicitHouse) house = explicitHouse;

    const accessCode = text.match(/(?:код(?:овый)?\s*(?:замок|двери|домофона)?|домофон)\s*[:№-]?\s*([\d#*]{2,10})/i)?.[1] || '';
    const instructions = [];
    if (/домофон\s+не\s+работает|домофон\s+отключ[её]н/i.test(text)) instructions.push('Домофон не работает');
    if (/шлагбаум/i.test(text)) instructions.push('Шлагбаум');

    return {
      settlement: /нижний\s+новгород|(?:^|\s)нн(?:\s|$)/i.test(text) ? 'Нижний Новгород' : '',
      district: inheritedDistrict || core.parse(text).district || '',
      street: titleCase(street),
      house: clean(house).replace(/\s+/g, ''),
      apartment: apartmentExplicit || compactApartment,
      entrance,
      floor,
      office,
      accessCode,
      instructions,
      raw: text,
    };
  }

  function priorityAddresses(text = '', inheritedDistrict = '') {
    const source = clean(text);
    const returnMarker = /(?:назад\s+(?:везти|привезти)?|вернуть(?:\s+нужно)?|привезти|доставить|возврат)(?:\s+нужно\s+будет)?\s*(?:на)?\s*/i;
    const markerMatch = returnMarker.exec(source);
    let primaryText = source;
    let returnText = '';
    if (markerMatch) {
      returnText = source.slice(markerMatch.index + markerMatch[0].length).split(/[.\n]/)[0];
      primaryText = source.slice(0, markerMatch.index);
    }
    return {
      primaryAddress: parseAddressSegment(primaryText, inheritedDistrict),
      returnAddress: returnText ? parseAddressSegment(returnText, '') : null,
    };
  }

  function parse(rawText = '') {
    const parsed = core.parse(rawText);
    const addresses = priorityAddresses(parsed.text, parsed.district);
    if (addresses.primaryAddress?.street && addresses.primaryAddress?.house) parsed.addresses.primaryAddress = addresses.primaryAddress;
    if (addresses.returnAddress?.street && addresses.returnAddress?.house) parsed.addresses.returnAddress = addresses.returnAddress;

    const warnings = parsed.confidence.warnings.filter(warning => warning !== 'Адрес требует проверки');
    if (!parsed.addresses.primaryAddress?.street || !parsed.addresses.primaryAddress?.house) warnings.push('Адрес требует проверки');
    parsed.confidence.warnings = [...new Set(warnings)];
    parsed.confidence.score = Math.max(0, 100 - parsed.confidence.warnings.length * 12);
    parsed.confidence.level = parsed.confidence.score >= 85 ? 'high' : parsed.confidence.score >= 60 ? 'medium' : 'low';
    return parsed;
  }

  const api = { ...core, parse, priorityAddresses, parseAddressSegment };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  globalScope.PMK_SMART_PARSER_NEXT = api;
})(typeof window !== 'undefined' ? window : globalThis);
