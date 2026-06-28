export default {
  async fetch(request, env) {
    const allowed = 'https://kivme1984.github.io';
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': origin === allowed ? origin : allowed,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/suggest') return reply({ error: 'Not found' }, 404, cors);
    if (origin && origin !== allowed) return reply({ error: 'Origin is not allowed' }, 403, cors);
    if (!env.DADATA_API_KEY) return reply({ error: 'DADATA_API_KEY is not configured' }, 500, cors);

    let body;
    try { body = await request.json(); }
    catch { return reply({ error: 'Invalid JSON' }, 400, cors); }

    const query = String(body?.query || '').trim().slice(0, 300);
    if (query.length < 3) return reply({ suggestions: [] }, 200, cors);

    const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${env.DADATA_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        count: Math.max(1, Math.min(Number(body?.count || 8), 20)),
        division: 'administrative',
        locations: [{ region: 'Нижегородская' }],
        locations_boost: [{ city: 'Нижний Новгород' }],
      }),
    });

    if (!response.ok) return reply({ error: 'DaData request failed', status: response.status }, response.status, cors);
    const data = await response.json();
    return reply({ suggestions: data.suggestions || [] }, 200, cors);
  },
};

function reply(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  });
}
