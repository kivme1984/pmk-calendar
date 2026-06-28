'use strict';

(() => {
  const STORAGE_KEY = 'pmk-smart-paste-draft-v1';
  const DISTRICTS = ['Автозаводский','Ленинский','Канавинский','Московский','Сормовский','Нижегородский','Советский','Приокский'];
  const SETTLEMENTS = ['Нижний Новгород','Бор','Дзержинск','Кстово','Богородск','Балахна','Городец','Павлово','Арзамас'];
  const WEEKDAYS = {
    воскресенье: 0,
    понедельник: 1,
    вторник: 2,
    среда: 3,
    четверг: 4,
    пятница: 5,
    суббота: 6,
  };

  const clean = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const numberValue = value => Number(String(value || '').replace(/\s/g, '').replace(',', '.')) || 0;
  const unique = values => [...new Set(values.filter(Boolean))];
  const has = (text, pattern) => pattern.test(text);

  function formatPhone(raw = '') {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
    if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
    if (digits.length === 10) return `+7${digits}`;
    return clean(raw);
  }

  function extractPhone(text) {
    const match = text.match(/(?:\+?7|8)?[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/);
    return match ? formatPhone(match[0]) : '';
  }

  function extractName(text) {
    const explicit = text.match(/(?:^|\n|[.;])\s*(?:имя|клиент|заказчик)\s*[:\-]?\s*([А-ЯЁ][а-яё]{1,30})(?=\s|[.,;\n]|$)/i);
    if (explicit) return explicit[1].replace(/^./, char => char.toUpperCase());

    const contextual = text.match(/(?:^|[.\n;])\s*([А-ЯЁ][а-яё]{1,30})\s*[.,]?\s*(?=дома|будет|жд[её]т|можно|после|до|с\s*\d)/i);
    if (contextual) return contextual[1].replace(/^./, char => char.toUpperCase());

    const blocked = new Set([...DISTRICTS, ...SETTLEMENTS, 'Сегодня', 'Завтра', 'Забор', 'Доставка']);
    const lines = text.split(/\n+/).map(clean).filter(Boolean);
    for (const line of lines) {
      if (/телефон|адрес|район|ков[её]р|цена|стоимость|размер|авито|яндекс|сайт/i.test(line)) continue;
      const single = line.match(/^([А-ЯЁ][а-яё]{2,24})(?:[.,])?$/);
      if (single && !blocked.has(single[1])) return single[1];
    }
    return '';
  }

  function extractSource(text) {
    const avito = text.match(/авито\s*([123])?/i);
    if (avito) return `Avito ${avito[1] || '1'}`;
    if (/яндекс/i.test(text)) return 'Яндекс';
    if (/рекомендац|посоветовал|посоветовала/i.test(text)) return 'Рекомендации';
    if (/(?:^|\s)вк(?:\s|$)|вконтакте/i.test(text)) return 'ВК';
    if (/\bmax\b|макс/i.test(text)) return 'Макс';
    if (/квиз/i.test(text)) return 'Квиз';
    if (/сайт|форма\s+заказа|заявка\s+с\s+сайта/i.test(text)) return 'Сайт';
    if (/постоянн\w*\s+клиент|повторн\w*\s+заказ/i.test(text)) return 'Постоянный клиент';
    return '';
  }

  function extractDistrict(text) {
    return DISTRICTS.find(item => new RegExp(item, 'i').test(text)) || '';
  }

  function extractSettlement(text) {
    return SETTLEMENTS.find(item => new RegExp(item.replace(' ', '\\s+'), 'i').test(text)) || '';
  }

  function extractAddress(text) {
    const result = {
      settlement: extractSettlement(text),
      district: extractDistrict(text),
      street: '',
      houseNumber: '',
      apartmentNumber: '',
      entrance: '',
      floor: '',
    };

    const explicitAddress = text.match(/(?:^|\n)\s*адрес\s*[:\-]\s*([^\n]+)/i)?.[1] || '';
    const source = explicitAddress || text;
    const streetPatterns = [
      /(?:ул(?:ица)?\.?|пр(?:оспект)?\.?|пр-т|пер(?:еулок)?\.?|шоссе|наб(?:ережная)?\.?)\s*([А-ЯЁа-яёA-Za-z0-9\- ]+?)\s*,?\s*(?:д(?:ом)?\.?\s*)?(\d+[А-ЯЁа-яёA-Za-z\/-]*)/i,
      /(?:^|\n)\s*(?:район\s*[:\-]?\s*)?(?:Автозаводский|Ленинский|Канавинский|Московский|Сормовский|Нижегородский|Советский|Приокский)?\s*([А-ЯЁ][А-ЯЁа-яё\- ]{2,40})\s+(\d+[А-ЯЁа-яёA-Za-z\/-]*)(?=\s|,|\.|$)/i,
    ];
    for (const pattern of streetPatterns) {
      const match = source.match(pattern);
      if (!match) continue;
      result.street = clean(match[1]).replace(/^(?:ул(?:ица)?\.?|пр(?:оспект)?\.?|пр-т|пер(?:еулок)?\.?)\s*/i, '');
      result.houseNumber = clean(match[2]);
      break;
    }

    result.apartmentNumber = clean(text.match(/(?:кв(?:артира)?\.?\s*)(\d+[А-ЯЁа-яёA-Za-z\/-]*)/i)?.[1] || '');
    result.entrance = clean(text.match(/(?:подъезд|под\.)\s*№?\s*(\d+)/i)?.[1] || '');
    result.floor = clean(text.match(/(?:этаж|эт\.)\s*№?\s*(\d+)/i)?.[1] || '');
    return result;
  }

  function nextWeekdayKey(targetDay) {
    const currentKey = state.selectedDayKey || businessTodayKey();
    const current = dateKeyForDisplay(currentKey);
    const delta = (targetDay - current.getUTCDay() + 7) % 7 || 7;
    return addDaysToKey(currentKey, delta);
  }

  function extractDate(text) {
    if (/\bсегодня\b/i.test(text)) return businessTodayKey();
    if (/\bзавтра\b/i.test(text)) return addDaysToKey(businessTodayKey(), 1);

    const date = text.match(/(?:^|\s)(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?(?=\s|$|[.,])/);
    if (date) {
      const nowYear = Number(businessTodayKey().slice(0, 4));
      let year = date[3] ? Number(date[3]) : nowYear;
      if (year < 100) year += 2000;
      const month = Math.max(1, Math.min(12, Number(date[2])));
      const day = Math.max(1, Math.min(31, Number(date[1])));
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const lower = text.toLowerCase();
    for (const [name, day] of Object.entries(WEEKDAYS)) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(lower)) return nextWeekdayKey(day);
    }
    return '';
  }

  function extractTime(text) {
    const rangePatterns = [
      /(?:с\s*)?(\d{1,2})[:.](\d{2})\s*(?:до|[-–—])\s*(\d{1,2})[:.](\d{2})/i,
      /(?:с\s*)?(\d{1,2})\s*(?:до|[-–—])\s*(\d{1,2})(?=\s|$|[.,])/i,
    ];
    for (const pattern of rangePatterns) {
      const match = text.match(pattern);
      if (!match) continue;
      if (match.length === 5) {
        return {
          startTime: `${String(match[1]).padStart(2, '0')}:${match[2]}`,
          endTime: `${String(match[3]).padStart(2, '0')}:${match[4]}`,
          timeNote: '',
        };
      }
      return {
        startTime: `${String(match[1]).padStart(2, '0')}:00`,
        endTime: `${String(match[2]).padStart(2, '0')}:00`,
        timeNote: '',
      };
    }

    const single = text.match(/(?:дома\s*)?(?:с|после|к)\s*(\d{1,2})[:.](\d{2})/i);
    if (single) {
      const startTime = `${String(single[1]).padStart(2, '0')}:${single[2]}`;
      return {
        startTime,
        endTime: addMinutesToTime(startTime, REQUEST_DURATION_MINUTES),
        timeNote: clean(single[0]),
      };
    }
    return {};
  }

  function extractIssues(text) {
    return unique([
      has(text, /пятн/i) ? 'Пятна' : '',
      has(text, /шерст/i) ? 'Шерсть' : '',
      has(text, /волос/i) ? 'Волосы' : '',
      has(text, /запах\s*мочи|моч[аи]|описал|описала/i) ? 'Запах мочи' : '',
      has(text, /дезинф/i) ? 'Дезинфекция' : '',
      has(text, /слайм|пластилин/i) ? 'Слайм / пластилин' : '',
    ]);
  }

  function extractServices(text) {
    return unique([
      has(text, /поднят(?:ие|ь)\s*ворс|подъ[её]м\s*ворс/i) ? 'Подъём ворса' : '',
      has(text, /удален\w*\s*запах|удалить\s*запах/i) ? 'Удаление запаха мочи' : '',
      has(text, /озон/i) ? 'Озонация' : '',
      has(text, /кондиционер/i) ? 'Кондиционер' : '',
      has(text, /экспресс|срочн/i) ? 'Экспресс-стирка' : '',
    ]);
  }

  function extractMaterial(text) {
    if (/вискоз/i.test(text)) return 'Вискоза';
    if (/ш[её]лк/i.test(text)) return 'Шёлк';
    if (/хлопок|хлопков/i.test(text)) return 'Хлопок';
    if (/шерст/i.test(text) && !/шерсть\s+(?:животн|кош|собак)/i.test(text)) return 'Шерсть';
    if (/безворс/i.test(text)) return 'Безворсный';
    if (/синтет/i.test(text)) return 'Синтетика';
    return '';
  }

  function extractPile(text) {
    if (/без\s*ворс|безворс/i.test(text)) return 'Без ворса';
    if (/шегги|длинн\w*\s*ворс|высок\w*\s*ворс|более\s*1\s*см/i.test(text)) return 'Более 1 см';
    if (/средн\w*\s*ворс|коротк\w*\s*ворс|до\s*1\s*см/i.test(text)) return 'До 1 см';
    return '';
  }

  function rugFromText(text, length, width) {
    return {
      length,
      width,
      material: extractMaterial(text),
      pile: extractPile(text),
      issues: extractIssues(text),
      services: extractServices(text),
    };
  }

  function extractRugs(text) {
    const explicit = text.match(/ширин[аы]?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:м)?[^\n]{0,30}?длин[аы]?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i);
    if (explicit) return [rugFromText(text, numberValue(explicit[2]), numberValue(explicit[1]))];

    const rugs = [];
    const lines = text.split(/\n+/).map(clean).filter(Boolean);
    const pattern = /(\d+(?:[.,]\d+)?)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)/ig;
    for (const line of lines) {
      let match;
      while ((match = pattern.exec(line))) {
        rugs.push(rugFromText(line, numberValue(match[1]), numberValue(match[2])));
      }
      pattern.lastIndex = 0;
    }

    if (!rugs.length) {
      let match;
      while ((match = pattern.exec(text))) rugs.push(rugFromText(text, numberValue(match[1]), numberValue(match[2])));
    }

    if (rugs.length === 1) {
      rugs[0].issues = extractIssues(text);
      rugs[0].services = extractServices(text);
      rugs[0].material ||= extractMaterial(text);
      rugs[0].pile ||= extractPile(text);
    }
    return rugs;
  }

  function extractPrice(text) {
    const explicit = text.match(/(?:итого|цена|стоимость|сумма)\s*[:\-]?\s*(\d[\d\s]{2,})\s*(?:₽|р\.?|руб)/i);
    if (explicit) return Number(explicit[1].replace(/\s/g, ''));
    const trailing = [...text.matchAll(/(\d[\d\s]{2,})\s*(?:₽|р\.?|руб(?:лей)?)/ig)]
      .map(match => Number(match[1].replace(/\s/g, '')))
      .filter(value => value >= 300 && value <= 200000);
    return trailing.at(-1) || 0;
  }

  function extractDiscount(text) {
    const match = text.match(/скидк[аи]?\s*[:\-]?\s*(\d{1,2})\s*%/i);
    return match ? Number(match[1]) : 0;
  }

  function extractCallAhead(text) {
    const match = text.match(/(?:позвонить|набрать|предупредить)[^\n]{0,20}?(?:за\s*)?(\d{1,3})\s*мин/i);
    if (match) return { callAhead: true, callAheadMinutes: Number(match[1]) };
    if (/позвонить\s+заранее|предварительно\s+позвонить/i.test(text)) return { callAhead: true, callAheadMinutes: 30 };
    return {};
  }

  function parseText(text) {
    const normalized = clean(text.replace(/\r/g, '\n')).replace(/\n{3,}/g, '\n\n');
    const address = extractAddress(normalized);
    const time = extractTime(normalized);
    const rugs = extractRugs(normalized);
    const source = extractSource(normalized);
    const regular = /постоянн\w*\s+клиент|повторн\w*\s+заказ|уже\s+обращал/i.test(normalized) || source === 'Постоянный клиент';
    const visitType = /\bдоставк/i.test(normalized) && !/забор/i.test(normalized) ? 'delivery' : 'pickup';
    return {
      text: normalized,
      customerName: extractName(normalized),
      phone: extractPhone(normalized),
      orderSource: source,
      ...address,
      visitType,
      visitDate: extractDate(normalized),
      ...time,
      rugs,
      estimatedPrice: extractPrice(normalized),
      discount: extractDiscount(normalized),
      regularCustomer: regular,
      ...extractCallAhead(normalized),
    };
  }

  function recognizedLabels(parsed) {
    const values = [];
    if (parsed.customerName) values.push(`Имя: ${parsed.customerName}`);
    if (parsed.phone) values.push(`Телефон: ${parsed.phone}`);
    if (parsed.street || parsed.houseNumber) values.push(`Адрес: ${[parsed.street, parsed.houseNumber].filter(Boolean).join(', ')}`);
    if (parsed.district) values.push(`Район: ${parsed.district}`);
    if (parsed.visitDate) values.push(`Дата: ${formatDateShort(parsed.visitDate)}`);
    if (parsed.startTime) values.push(`Время: ${parsed.startTime}${parsed.endTime ? `–${parsed.endTime}` : ''}`);
    if (parsed.rugs.length) values.push(`Ковров: ${parsed.rugs.length}`);
    if (parsed.estimatedPrice) values.push(`Стоимость: ${formatMoney(parsed.estimatedPrice)}`);
    if (parsed.orderSource) values.push(`Источник: ${parsed.orderSource}`);
    return values;
  }

  function applyParsedText() {
    const textarea = qs('#smartPasteInput');
    const raw = textarea?.value.trim() || '';
    if (!raw) {
      textarea?.focus();
      showToast('Сначала вставьте текст клиента.', 'error');
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
    localStorage.setItem(STORAGE_KEY, raw);
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
      ? `<strong>Распознано:</strong><div>${labels.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div><small>Проверьте заполненные поля перед сохранением.</small>`
      : '<strong>Точные поля не распознаны.</strong><small>Исходный текст перенесён в комментарий — заполните нужные данные вручную.</small>';
    schedulePreviewUpdate();
    showToast(labels.length ? 'Данные распределены по форме.' : 'Текст сохранён в комментарии.', labels.length ? 'success' : 'error');
  }

  async function pasteFromClipboard() {
    const textarea = qs('#smartPasteInput');
    if (!textarea) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) throw new Error('Буфер обмена пуст.');
      textarea.value = text;
      localStorage.setItem(STORAGE_KEY, text);
      textarea.focus();
      showToast('Текст вставлен. Нажмите «Распределить по полям».', 'success');
    } catch {
      textarea.focus();
      showToast('Нажмите и удерживайте поле, затем выберите «Вставить».', 'error');
    }
  }

  function clearSmartPaste() {
    const textarea = qs('#smartPasteInput');
    if (textarea) textarea.value = '';
    localStorage.removeItem(STORAGE_KEY);
    const result = qs('#smartPasteResult');
    if (result) {
      result.className = 'smart-paste-result hidden';
      result.innerHTML = '';
    }
  }

  function createSmartPasteBlock() {
    const form = qs('#requestForm');
    const layout = qs('.form-layout', form);
    if (!form || !layout || qs('#smartPasteCard')) return;

    const style = document.createElement('style');
    style.textContent = `
      .smart-paste-card{margin-bottom:18px;border:2px solid rgba(245,183,0,.42);background:linear-gradient(135deg,rgba(255,193,7,.12),rgba(255,255,255,.92))}
      .smart-paste-heading{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}.smart-paste-heading>span{display:grid;place-items:center;min-width:38px;height:38px;border-radius:12px;background:#f5b700;color:#111;font-weight:900}.smart-paste-heading h2{margin:0 0 3px}.smart-paste-heading p{margin:0;opacity:.7}
      .smart-paste-card textarea{width:100%;min-height:132px;box-sizing:border-box;resize:vertical;font:inherit;line-height:1.45}
      .smart-paste-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.smart-paste-actions .button{min-height:44px}.smart-paste-primary{font-weight:800}
      .smart-paste-result{margin-top:10px;padding:12px;border-radius:12px}.smart-paste-result.hidden{display:none}.smart-paste-result.success{background:rgba(31,157,85,.1);border:1px solid rgba(31,157,85,.25)}.smart-paste-result.warning{background:rgba(191,115,0,.1);border:1px solid rgba(191,115,0,.25)}
      .smart-paste-result>div{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.smart-paste-result span{padding:5px 8px;border-radius:999px;background:rgba(0,0,0,.06);font-size:13px}.smart-paste-result small{display:block;opacity:.7}
      @media(max-width:700px){.smart-paste-card{margin:0 0 14px}.smart-paste-card textarea{min-height:150px}.smart-paste-actions{display:grid;grid-template-columns:1fr 1fr}.smart-paste-actions .smart-paste-primary{grid-column:1/-1;order:-1}.smart-paste-actions .button{width:100%;padding-inline:10px}}
    `;
    document.head.appendChild(style);

    const card = document.createElement('section');
    card.id = 'smartPasteCard';
    card.className = 'form-card smart-paste-card';
    card.innerHTML = `
      <div class="smart-paste-heading"><span>⚡</span><div><h2>Быстро вставить заявку</h2><p>Вставьте весь текст из сайта, MAX, СМС или переписки — приложение распределит данные по полям.</p></div></div>
      <label class="field">Информация клиента
        <textarea id="smartPasteInput" rows="6" placeholder="Например: Ленинский, ул. Пограничников 3, Ольга, +79200388933, Авито 1, шегги, подъём ворса, 3,9 × 2,6, цена 6080 ₽, завтра с 18:00"></textarea>
      </label>
      <div class="smart-paste-actions">
        <button type="button" id="smartPasteParseBtn" class="button button-primary smart-paste-primary">Распределить по полям</button>
        <button type="button" id="smartPasteClipboardBtn" class="button button-secondary">Вставить из буфера</button>
        <button type="button" id="smartPasteClearBtn" class="button button-ghost">Очистить</button>
      </div>
      <div id="smartPasteResult" class="smart-paste-result hidden"></div>
    `;
    form.insertBefore(card, layout);

    const textarea = qs('#smartPasteInput');
    try { textarea.value = localStorage.getItem(STORAGE_KEY) || ''; } catch {}
    textarea.addEventListener('input', () => {
      try {
        if (textarea.value.trim()) localStorage.setItem(STORAGE_KEY, textarea.value);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {}
    });
    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        applyParsedText();
      }
    });
    qs('#smartPasteParseBtn').addEventListener('click', applyParsedText);
    qs('#smartPasteClipboardBtn').addEventListener('click', pasteFromClipboard);
    qs('#smartPasteClearBtn').addEventListener('click', clearSmartPaste);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createSmartPasteBlock, { once: true });
  else createSmartPasteBlock();
})();
