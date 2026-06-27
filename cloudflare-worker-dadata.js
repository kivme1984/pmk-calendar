export default {
  async fetch(request, env) {
    const allowedOrigin = 'https://kivme1984.github.io';
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/suggest') {
      return json({ error: 'Not found' }, 404, corsHeaders);
    }

    if (origin && origin !== allowedOrigin) {
      return json({ error: 'Origin is not allowed' }, 403, corsHeaders);
    }

    if (!env.DADATA_API_KEY) {
      return json({ error: 'DADATA_API_KEY is not configured' }, 500, corsHeaders);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, corsHeaders);
    }

    const query = String(payload?.query || '').trim().slice(0, 300);
    const count = Math.max(1, Math.min(Number(payload?.count || 8), 20));
    if (query.length < 3) {
      return json({ suggestions: [] }, 200, corsHeaders);
    }

    const dadataResponse = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
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

    if (!dadataResponse.ok) {
      const errorText = await dadataResponse.text();
      return json({ error: 'DaData request failed', status: dadataResponse.status, details: errorText.slice(0, 300) }, dadataResponse.status, corsHeaders);
    }

    const data = await dadataResponse.json();
    const suggestions = (data.suggestions || []).map(item => ({
      value: item.value || '',
      unrestricted_value: item.unrestricted_value || item.value || '',
      data: {
        city: item.data?.city || '',
        settlement: item.data?.settlement || '',
        city_district: item.data?.city_district || '',
        street: item.data?.street || '',
        street_with_type: item.data?.street_with_type || '',
        house: item.data?.house || '',
        block: item.data?.block || '',
        flat: item.data?.flat || '',
        geo_lat: item.data?.geo_lat || '',
        geo_lon: item.data?.geo_lon || '',
        fias_id: item.data?.fias_id || '',
      },
    }));

    return json({ suggestions }, 200, corsHeaders);
  },
};

function json(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}
