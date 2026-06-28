export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return reply({ ok: true, service: 'pmk-address', version: 46 }, 200, cors);
    }

    if (!['GET', 'POST'].includes(request.method) || url.pathname !== '/suggest') {
      return reply({ error: 'Not found' }, 404, cors);
    }

    if (!env.DADATA_API_KEY) {
      return reply({ error: 'DADATA_API_KEY is not configured' }, 500, cors);
    }

    let query = '';
    let count = 8;

    if (request.method === 'GET') {
      query = String(url.searchParams.get('q') || url.searchParams.get('query') || '');
      count = Number(url.searchParams.get('count') || 8);
    } else {
      let body;
      try {
        body = await request.json();
      } catch {
        return reply({ error: 'Invalid JSON' }, 400, cors);
      }
      query = String(body?.query || '');
      count = Number(body?.count || 8);
    }

    query = query.trim().slice(0, 300);
    count = Math.max(1, Math.min(Number.isFinite(count) ? count : 8, 20));
    if (query.length < 3) return reply({ suggestions: [] }, 200, cors);

    let response;
    try {
      response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${env.DADATA_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          count,
          division: 'administrative',
          locations: [{ region: 'Нижегородская' }],
          locations_boost: [{ city: 'Нижний Новгород' }],
        }),
      });
    } catch (error) {
      return reply({ error: 'DaData connection failed', details: String(error?.message || error) }, 502, cors);
    }

    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw: raw.slice(0, 500) };
    }

    if (!response.ok) {
      return reply({
        error: 'DaData request failed',
        status: response.status,
        details: data?.message || data?.family || data?.raw || '',
      }, response.status, cors);
    }

    return reply({ suggestions: Array.isArray(data.suggestions) ? data.suggestions : [] }, 200, cors);
  },
};

function reply(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cors,
    },
  });
}
