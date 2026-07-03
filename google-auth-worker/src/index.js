'use strict';

const VERSION = '1.0.0';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const SESSION_AAD = 'pmk-google-session-v1';
const STATE_TTL_SECONDS = 10 * 60;

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      console.error('PMK Google auth worker error', error);
      const status = Number(error?.status || 500);
      return json({ ok: false, error: status === 500 ? 'internal_error' : String(error.message || 'request_failed') }, status, request, env);
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') return corsPreflight(request, env);

  if (url.pathname === '/health' && request.method === 'GET') {
    return json({
      ok: true,
      service: 'pmk-google-auth',
      version: VERSION,
      configured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.TOKEN_ENCRYPTION_KEY && env.STATE_HMAC_KEY),
    }, 200, request, env);
  }

  if (url.pathname === '/auth/start' && request.method === 'GET') return startAuthorization(request, env);
  if (url.pathname === '/auth/callback' && request.method === 'GET') return finishAuthorization(request, env);

  if (url.pathname === '/token' && request.method === 'POST') {
    assertAllowedOrigin(request, env);
    return issueAccessToken(request, env);
  }

  if (url.pathname === '/revoke' && request.method === 'POST') {
    assertAllowedOrigin(request, env);
    return revokeSession(request, env);
  }

  return json({ ok: false, error: 'not_found' }, 404, request, env);
}

async function startAuthorization(request, env) {
  assertConfigured(env);
  const url = new URL(request.url);
  const returnTo = validateReturnTo(url.searchParams.get('return_to'), env);
  const deviceId = sanitizeDeviceId(url.searchParams.get('device_id'));
  const now = Math.floor(Date.now() / 1000);
  const state = await signState({
    v: 1,
    returnTo,
    deviceId,
    iat: now,
    exp: now + STATE_TTL_SECONDS,
    nonce: randomToken(18),
  }, env);

  const redirectUri = `${url.origin}/auth/callback`;
  const google = new URL(GOOGLE_AUTH_URL);
  google.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  google.searchParams.set('redirect_uri', redirectUri);
  google.searchParams.set('response_type', 'code');
  google.searchParams.set('scope', CALENDAR_SCOPE);
  google.searchParams.set('access_type', 'offline');
  google.searchParams.set('prompt', 'consent');
  google.searchParams.set('include_granted_scopes', 'true');
  google.searchParams.set('state', state);

  return redirect(google.toString());
}

async function finishAuthorization(request, env) {
  assertConfigured(env);
  const url = new URL(request.url);
  let state;

  try {
    state = await verifyState(url.searchParams.get('state') || '', env);
  } catch {
    return redirectWithError(defaultReturnTo(env), 'invalid_state');
  }

  const returnTo = validateReturnTo(state.returnTo, env);
  const oauthError = url.searchParams.get('error');
  if (oauthError) return redirectWithError(returnTo, oauthError);

  const code = url.searchParams.get('code');
  if (!code) return redirectWithError(returnTo, 'missing_code');

  const redirectUri = `${url.origin}/auth/callback`;
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenPayload = await safeJson(tokenResponse);
  if (!tokenResponse.ok) {
    console.error('Google code exchange failed', tokenResponse.status, tokenPayload?.error);
    return redirectWithError(returnTo, tokenPayload?.error || 'code_exchange_failed');
  }
  if (!tokenPayload.refresh_token) return redirectWithError(returnTo, 'refresh_token_missing');

  const now = Math.floor(Date.now() / 1000);
  const sessionDays = clampNumber(env.SESSION_DAYS, 30, 730, 365);
  const session = await sealSession({
    v: 1,
    refreshToken: tokenPayload.refresh_token,
    scope: tokenPayload.scope || CALENDAR_SCOPE,
    deviceId: state.deviceId || '',
    iat: now,
    exp: now + sessionDays * 86400,
  }, env);

  const fragment = new URLSearchParams({
    'pmk-google-auth': session,
    'pmk-google-auth-exp': String(now + sessionDays * 86400),
  });
  return redirect(`${returnTo}#${fragment.toString()}`);
}

async function issueAccessToken(request, env) {
  assertConfigured(env);
  const sessionToken = bearerToken(request);
  if (!sessionToken) return json({ ok: false, error: 'missing_session' }, 401, request, env);

  let session;
  try {
    session = await unsealSession(sessionToken, env);
  } catch {
    return json({ ok: false, error: 'invalid_session', reconnect: true }, 401, request, env);
  }

  const requestBody = await request.json().catch(() => ({}));
  const requestDeviceId = sanitizeDeviceId(requestBody?.device_id || '');
  if (session.deviceId && requestDeviceId !== session.deviceId) {
    return json({ ok: false, error: 'device_mismatch', reconnect: true }, 401, request, env);
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: session.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokenPayload = await safeJson(tokenResponse);
  if (!tokenResponse.ok) {
    const reconnect = tokenPayload?.error === 'invalid_grant';
    return json({
      ok: false,
      error: tokenPayload?.error || 'refresh_failed',
      reconnect,
    }, reconnect ? 401 : 502, request, env);
  }

  return json({
    ok: true,
    access_token: tokenPayload.access_token,
    expires_in: Number(tokenPayload.expires_in || 3600),
    scope: tokenPayload.scope || session.scope || CALENDAR_SCOPE,
    token_type: tokenPayload.token_type || 'Bearer',
    session_expires_at: session.exp,
  }, 200, request, env);
}

async function revokeSession(request, env) {
  assertConfigured(env);
  const sessionToken = bearerToken(request);
  if (!sessionToken) return json({ ok: true, revoked: false }, 200, request, env);

  let session;
  try {
    session = await unsealSession(sessionToken, env);
  } catch {
    return json({ ok: true, revoked: false }, 200, request, env);
  }

  await fetch(GOOGLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: session.refreshToken }),
  }).catch(() => null);

  return json({ ok: true, revoked: true }, 200, request, env);
}

function assertConfigured(env) {
  const missing = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'TOKEN_ENCRYPTION_KEY', 'STATE_HMAC_KEY'].filter(name => !env[name]);
  if (missing.length) {
    const error = new Error(`Missing worker configuration: ${missing.join(', ')}`);
    error.status = 503;
    throw error;
  }
}

function defaultReturnTo(env) {
  const origin = String(env.APP_ORIGIN || 'https://kivme1984.github.io').replace(/\/$/, '');
  const path = normalizeAppPath(env.APP_PATH || '/pmk-calendar/');
  return `${origin}${path}`;
}

function validateReturnTo(value, env) {
  const fallback = defaultReturnTo(env);
  if (!value) return fallback;
  let url;
  try { url = new URL(value); } catch { return fallback; }
  const allowedOrigin = new URL(fallback).origin;
  const allowedPath = normalizeAppPath(env.APP_PATH || '/pmk-calendar/');
  if (url.origin !== allowedOrigin || !url.pathname.startsWith(allowedPath)) return fallback;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function normalizeAppPath(value) {
  const path = String(value || '/').startsWith('/') ? String(value) : `/${value}`;
  return path.endsWith('/') ? path : `${path}/`;
}

function sanitizeDeviceId(value) {
  const clean = String(value || '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 96);
  return clean || 'pmk-device';
}

function redirectWithError(returnTo, code) {
  const fragment = new URLSearchParams({ 'pmk-google-error': String(code || 'authorization_failed').slice(0, 100) });
  return redirect(`${returnTo}#${fragment.toString()}`);
}

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function bearerToken(request) {
  const value = request.headers.get('Authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

function assertAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.APP_ORIGIN || 'https://kivme1984.github.io').replace(/\/$/, '');
  if (origin && origin !== allowed) {
    const error = new Error('Origin is not allowed');
    error.status = 403;
    throw error;
  }
}

function corsPreflight(request, env) {
  try { assertAllowedOrigin(request, env); }
  catch { return new Response(null, { status: 403 }); }
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.APP_ORIGIN || 'https://kivme1984.github.io').replace(/\/$/, '');
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  };
  if (origin === allowed) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(payload, status, request, env) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env),
    },
  });
}

async function signState(payload, env) {
  const encoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSign(encoded, env.STATE_HMAC_KEY);
  return `${encoded}.${base64UrlEncode(signature)}`;
}

async function verifyState(token, env) {
  const [payloadPart, signaturePart] = String(token || '').split('.');
  if (!payloadPart || !signaturePart) throw new Error('bad state');
  const expected = await hmacSign(payloadPart, env.STATE_HMAC_KEY);
  const received = base64UrlDecode(signaturePart);
  if (!constantTimeEqual(expected, received)) throw new Error('bad signature');
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now || payload.iat > now + 60) throw new Error('expired state');
  return payload;
}

async function hmacSign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

async function sealSession(payload, env) {
  const key = await importEncryptionKey(env.TOKEN_ENCRYPTION_KEY);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv,
    additionalData: new TextEncoder().encode(SESSION_AAD),
  }, key, plaintext);
  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

async function unsealSession(token, env) {
  const [version, ivPart, cipherPart] = String(token || '').split('.');
  if (version !== 'v1' || !ivPart || !cipherPart) throw new Error('invalid session');
  const key = await importEncryptionKey(env.TOKEN_ENCRYPTION_KEY);
  const plaintext = await crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: base64UrlDecode(ivPart),
    additionalData: new TextEncoder().encode(SESSION_AAD),
  }, key, base64UrlDecode(cipherPart));
  const payload = JSON.parse(new TextDecoder().decode(plaintext));
  const now = Math.floor(Date.now() / 1000);
  if (payload.v !== 1 || !payload.refreshToken || !payload.exp || payload.exp < now) throw new Error('expired session');
  return payload;
}

async function importEncryptionKey(value) {
  const bytes = base64UrlDecode(String(value || ''));
  if (bytes.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must decode to 32 bytes');
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function base64UrlEncode(bytes) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

function randomToken(size = 24) {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(size)));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { return { error: text.slice(0, 200) }; }
}
