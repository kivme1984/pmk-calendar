/**
 * Unified PMK Cloudflare Worker
 * - POST /suggest                -> DaData address suggestions
 * - GET  /calendar/health        -> Yandex CalDAV connectivity check
 * - GET  /calendar/events        -> PMK events from Yandex Calendar
 * - PUT  /calendar/events/:pmkId -> create/update Yandex event
 * - DELETE /calendar/events/:pmkId -> delete Yandex event
 *
 * Required Worker secrets/variables:
 * DADATA_API_KEY
 * YANDEX_CALDAV_URL      exact CalDAV collection URL copied from Yandex Calendar
 * YANDEX_LOGIN
 * YANDEX_APP_PASSWORD   app password created for Calendar
 * PMK_SYNC_TOKEN        separate random token entered in PMK Calendar settings
 * ALLOWED_ORIGIN        optional, defaults to https://kivme1984.github.io
 */

const DEFAULT_ORIGIN = 'https://kivme1984.github.io';
const MOSCOW_OFFSET = '+03:00';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === '/suggest' && request.method === 'POST') {
        return json(await handleSuggest(request, env), 200, cors);
      }

      if (url.pathname.startsWith('/calendar')) {
        verifyClientToken(request, env);
        const result = await handleCalendar(request, env, url);
        return json(result.body, result.status, cors);
      }

      return json({ error: 'Not found' }, 404, cors);
    } catch (error) {
      const status = Number(error.status || 500);
      return json({ error: error.message || 'Worker error' }, status, cors);
    }
  },
};

function corsHeaders(request, env) {
  const allowed = String(env.ALLOWED_ORIGIN || DEFAULT_ORIGIN)
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const resolved = allowed.includes('*') ? '*' : (allowed.includes(origin) ? origin : allowed[0]);
  return {
    'Access-Control-Allow-Origin': resolved,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  };
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function verifyClientToken(request, env) {
  if (!env.PMK_SYNC_TOKEN) throw httpError(500, 'PMK_SYNC_TOKEN is not configured');
  const token = String(request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || token !== String(env.PMK_SYNC_TOKEN)) throw httpError(401, 'Invalid sync token');
}

async function handleSuggest(request, env) {
  if (!env.DADATA_API_KEY) throw httpError(500, 'DADATA_API_KEY is not configured');
  const input = await request.json().catch(() => ({}));
  const query = String(input.query || '').trim();
  const count = Math.max(1, Math.min(20, Number(input.count || 8)));
  if (query.length < 3) return { suggestions: [] };

  const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Token ${env.DADATA_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      count,
      locations: [{ region: 'Нижегородская' }],
      restrict_value: false,
    }),
  });

  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; }
  catch { payload = { error: text || `DaData error ${response.status}` }; }
  if (!response.ok) throw httpError(response.status, payload?.message || payload?.error || `DaData error ${response.status}`);
  return payload;
}

function requireCalendarEnv(env) {
  const required = ['YANDEX_CALDAV_URL', 'YANDEX_LOGIN', 'YANDEX_APP_PASSWORD'];
  const missing = required.filter(name => !env[name]);
  if (missing.length) throw httpError(500, `Missing Worker secrets: ${missing.join(', ')}`);
}

function basicAuth(env) {
  const raw = `${env.YANDEX_LOGIN}:${env.YANDEX_APP_PASSWORD}`;
  const bytes = new TextEncoder().encode(raw);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return `Basic ${btoa(binary)}`;
}

function calendarBase(env) {
  return String(env.YANDEX_CALDAV_URL || '').trim().replace(/\/+$/, '');
}

async function caldavFetch(env, url, options = {}) {
  requireCalendarEnv(env);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': basicAuth(env),
      ...(options.headers || {}),
    },
  });
  if (!response.ok && response.status !== 207 && response.status !== 404) {
    const text = await response.text();
    throw httpError(response.status, `Yandex CalDAV ${response.status}: ${text.slice(0, 300)}`);
  }
  return response;
}

async function handleCalendar(request, env, url) {
  requireCalendarEnv(env);

  if (url.pathname === '/calendar/health' && request.method === 'GET') {
    const response = await caldavFetch(env, calendarBase(env), {
      method: 'PROPFIND',
      headers: { 'Depth': '0', 'Content-Type': 'application/xml; charset=utf-8' },
      body: '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/></d:prop></d:propfind>',
    });
    const text = await response.text();
    const displayName = xmlDecode(text.match(/<(?:[^:>]+:)?displayname[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?displayname>/i)?.[1] || 'ПМК — Заявки');
    return { status: 200, body: { ok: true, calendar: displayName || 'ПМК — Заявки' } };
  }

  if (url.pathname === '/calendar/events' && request.method === 'GET') {
    const from = normalizeDate(url.searchParams.get('from') || '1970-01-01');
    const to = normalizeDate(url.searchParams.get('to') || '2100-01-01');
    const events = await listEvents(env, from, to);
    return { status: 200, body: { events } };
  }

  const match = url.pathname.match(/^\/calendar\/events\/([^/]+)$/);
  if (!match) throw httpError(404, 'Calendar endpoint not found');
  const pmkId = decodeURIComponent(match[1]);
  if (!pmkId) throw httpError(400, 'pmkId is required');

  if (request.method === 'PUT') {
    const input = await request.json().catch(() => ({}));
    if (!input.event || !input.pmkData) throw httpError(400, 'event and pmkData are required');
    const result = await putEvent(env, pmkId, input.event, input.pmkData);
    return { status: 200, body: result };
  }

  if (request.method === 'DELETE') {
    await deleteEvent(env, pmkId);
    return { status: 200, body: { ok: true, pmkId } };
  }

  throw httpError(405, 'Method not allowed');
}

function normalizeDate(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw httpError(400, 'Invalid date format');
  return text;
}

function caldavTime(date, endOfDay = false) {
  return `${date.replaceAll('-', '')}T${endOfDay ? '235959' : '000000'}Z`;
}

async function listEvents(env, from, to) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${caldavTime(from)}" end="${caldavTime(to, true)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  const response = await caldavFetch(env, calendarBase(env), {
    method: 'REPORT',
    headers: { 'Depth': '1', 'Content-Type': 'application/xml; charset=utf-8' },
    body,
  });
  const xml = await response.text();
  const blocks = [...xml.matchAll(/<(?:[^:>]+:)?response\b[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?response>/gi)].map(match => match[1]);
  const events = [];
  for (const block of blocks) {
    const calendarData = block.match(/<(?:[^:>]+:)?calendar-data\b[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?calendar-data>/i)?.[1];
    if (!calendarData) continue;
    const href = xmlDecode(block.match(/<(?:[^:>]+:)?href\b[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?href>/i)?.[1] || '');
    const event = parseIcsEvent(xmlDecode(calendarData), href);
    if (event?.pmkData?.pmkId) events.push(event);
  }
  return events;
}

function resourceUrl(env, pmkId) {
  const safe = String(pmkId).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 180);
  return `${calendarBase(env)}/pmk-${safe}.ics`;
}

async function putEvent(env, pmkId, event, pmkData) {
  const ics = buildIcs(pmkId, event, pmkData);
  const url = resourceUrl(env, pmkId);
  const response = await caldavFetch(env, url, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
    body: ics,
  });
  return { ok: true, pmkId, status: response.status };
}

async function deleteEvent(env, pmkId) {
  const response = await caldavFetch(env, resourceUrl(env, pmkId), { method: 'DELETE' });
  if (response.status === 404) return;
}

function buildIcs(pmkId, event, pmkData) {
  const uid = `pmk-${String(pmkId).replace(/[^a-zA-Z0-9._-]/g, '-')}@promoykover`;
  const start = event?.start?.dateTime || '';
  const end = event?.end?.dateTime || '';
  const timeZone = event?.start?.timeZone || 'Europe/Moscow';
  const encodedData = base64UrlEncode(JSON.stringify(pmkData));
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Promoy Kover//PMK Calendar//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `LAST-MODIFIED:${utcStamp(new Date())}`,
    `DTSTART;TZID=${timeZone}:${localStamp(start)}`,
    `DTEND;TZID=${timeZone}:${localStamp(end)}`,
    `SUMMARY:${escapeIcs(event.summary || 'Заявка ПМК')}`,
    `DESCRIPTION:${escapeIcs(event.description || '')}`,
    `LOCATION:${escapeIcs(event.location || '')}`,
    `X-PMK-ID:${escapeIcs(pmkId)}`,
    `X-PMK-DATA:${encodedData}`,
    'CATEGORIES:PMK',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.flatMap(foldIcsLine).join('\r\n') + '\r\n';
}

function localStamp(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) throw httpError(400, `Invalid event datetime: ${value}`);
  return `${match[1]}${match[2]}${match[3]}T${match[4]}${match[5]}${match[6] || '00'}`;
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcs(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function unescapeIcs(value) {
  return String(value || '')
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function foldIcsLine(line) {
  const chunks = [];
  let remaining = String(line);
  while (remaining.length > 72) {
    chunks.push(remaining.slice(0, 72));
    remaining = ` ${remaining.slice(72)}`;
  }
  chunks.push(remaining);
  return chunks;
}

function unfoldIcs(text) {
  return String(text || '').replace(/\r?\n[ \t]/g, '');
}

function parseIcsEvent(ics, href = '') {
  const unfolded = unfoldIcs(ics);
  const block = unfolded.match(/BEGIN:VEVENT\r?\n([\s\S]*?)\r?\nEND:VEVENT/i)?.[1];
  if (!block) return null;
  const props = {};
  for (const line of block.split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const left = line.slice(0, separator);
    const value = line.slice(separator + 1);
    const [name, ...params] = left.split(';');
    props[name.toUpperCase()] = { value, params };
  }

  const pmkId = unescapeIcs(props['X-PMK-ID']?.value || '');
  if (!pmkId) return null;
  let pmkData = null;
  try { pmkData = JSON.parse(base64UrlDecode(props['X-PMK-DATA']?.value || '')); }
  catch { pmkData = { pmkId }; }

  return {
    id: pmkId,
    pmkData,
    summary: unescapeIcs(props.SUMMARY?.value || ''),
    description: unescapeIcs(props.DESCRIPTION?.value || ''),
    location: unescapeIcs(props.LOCATION?.value || ''),
    start: { dateTime: parseIcsDate(props.DTSTART?.value), timeZone: timezoneParam(props.DTSTART?.params) },
    end: { dateTime: parseIcsDate(props.DTEND?.value), timeZone: timezoneParam(props.DTEND?.params) },
    updated: new Date().toISOString(),
    htmlLink: 'https://calendar.yandex.ru/',
    resourceHref: href,
  };
}

function timezoneParam(params = []) {
  const item = params.find(value => value.toUpperCase().startsWith('TZID='));
  return item ? item.slice(5) : 'Europe/Moscow';
}

function parseIcsDate(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!match) return '';
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${MOSCOW_OFFSET}`;
}

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function xmlDecode(value) {
  return String(value || '')
    .replace(/&#13;/g, '\r')
    .replace(/&#10;/g, '\n')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
