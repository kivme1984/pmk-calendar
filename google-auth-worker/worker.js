export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://kivme1984.github.io',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
      if (url.pathname === '/auth/start') return startAuth(request, env, cors);
      if (url.pathname === '/auth/callback') return finishAuth(request, env, cors);
      if (url.pathname === '/token') return issueAccessToken(request, env, cors);
      if (url.pathname === '/revoke') return revokeSession(request, env, cors);
      if (url.pathname === '/health') return json({ ok: true, service: 'pmk-google-auth' }, cors);
      return json({ error: 'not_found' }, cors, 404);
    } catch (error) {
      return json({ error: error.message || 'server_error' }, cors, 500);
    }
  },
};

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE = 'https://oauth2.googleapis.com/revoke';
const SESSION_TTL = 60 * 60 * 24 * 180;

function json(payload, cors, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function callbackUrl(request) {
  const url = new URL(request.url);
  return `${url.origin}/auth/callback`;
}

function randomId() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function startAuth(request, env) {
  const source = new URL(request.url);
  const returnTo = source.searchParams.get('return_to') || env.DEFAULT_RETURN_TO || 'https://kivme1984.github.io/pmk-calendar/';
  const deviceId = source.searchParams.get('device_id') || randomId();
  const state = randomId();
  await env.SESSION_KV.put(`state:${state}`, JSON.stringify({ returnTo, deviceId }), { expirationTtl: 600 });

  const auth = new URL(GOOGLE_AUTH);
  auth.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  auth.searchParams.set('redirect_uri', callbackUrl(request));
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
  auth.searchParams.set('access_type', 'offline');
  auth.searchParams.set('prompt', 'consent');
  auth.searchParams.set('include_granted_scopes', 'true');
  auth.searchParams.set('state', state);
  return Response.redirect(auth.toString(), 302);
}

async function finishAuth(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const stored = state ? await env.SESSION_KV.get(`state:${state}`, 'json') : null;
  if (!code || !stored) return Response.redirect(`${env.DEFAULT_RETURN_TO || 'https://kivme1984.github.io/pmk-calendar/'}#pmk-google-error=auth_failed`, 302);
  await env.SESSION_KV.delete(`state:${state}`);

  const tokenResponse = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl(request),
    }),
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok || !token.refresh_token) {
    return Response.redirect(`${stored.returnTo}#pmk-google-error=no_refresh_token`, 302);
  }

  const session = randomId();
  const sessionHash = await sha256(session);
  await env.SESSION_KV.put(`session:${sessionHash}`, JSON.stringify({
    refreshToken: token.refresh_token,
    deviceId: stored.deviceId,
    createdAt: Date.now(),
  }), { expirationTtl: SESSION_TTL });

  const expiresAt = Date.now() + SESSION_TTL * 1000;
  const back = new URL(stored.returnTo);
  back.hash = `pmk-google-auth=${encodeURIComponent(session)}&pmk-google-auth-exp=${expiresAt}`;
  return Response.redirect(back.toString(), 302);
}

async function readBearer(request) {
  const header = request.headers.get('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function issueAccessToken(request, env, cors) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, cors, 405);
  const session = await readBearer(request);
  if (!session) return json({ error: 'missing_session', reconnect: true }, cors, 401);
  const body = await request.json().catch(() => ({}));
  const sessionHash = await sha256(session);
  const stored = await env.SESSION_KV.get(`session:${sessionHash}`, 'json');
  if (!stored || (stored.deviceId && body.device_id && stored.deviceId !== body.device_id)) {
    return json({ error: 'invalid_session', reconnect: true }, cors, 401);
  }

  const response = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: stored.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    await env.SESSION_KV.delete(`session:${sessionHash}`);
    return json({ error: 'refresh_failed', reconnect: true }, cors, 401);
  }

  return json({ access_token: payload.access_token, expires_in: payload.expires_in || 3600, token_type: payload.token_type || 'Bearer' }, cors);
}

async function revokeSession(request, env, cors) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, cors, 405);
  const session = await readBearer(request);
  if (!session) return json({ ok: true }, cors);
  const sessionHash = await sha256(session);
  const stored = await env.SESSION_KV.get(`session:${sessionHash}`, 'json');
  if (stored?.refreshToken) {
    await fetch(GOOGLE_REVOKE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: stored.refreshToken }),
    }).catch(() => null);
  }
  await env.SESSION_KV.delete(`session:${sessionHash}`);
  return json({ ok: true }, cors);
}
