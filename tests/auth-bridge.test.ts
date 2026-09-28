import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { NextRequest } from 'next/server';
import { GET, POST, PUT } from '../src/app/api/auth-bridge/[...path]/route';
import { firstPartyAuthFetch } from '../src/lib/browser';

const oldFetch = globalThis.fetch;
const oldWindow = globalThis.window;
const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const oldEmail = process.env.ADMIN_EMAIL;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test_only';
process.env.ADMIN_EMAIL = 'admin@example.com';

afterEach(() => {
  globalThis.fetch = oldFetch;
  globalThis.window = oldWindow;
  process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  process.env.ADMIN_EMAIL = oldEmail;
});

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });
const path = (name: string, query = '') => `https://crm.example/api/auth-bridge/${name}${query}`;

function jsonRequest(name: string, body: object, method = 'POST', query = '', headers: Record<string, string> = {}) {
  return new NextRequest(path(name, query), {
    method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...headers },
  });
}

test('browser Auth calls are redirected to a same-origin endpoint; non-Auth URLs are not', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  globalThis.window = { location: { origin: 'https://crm.example' } } as Window & typeof globalThis;
  const calls: string[] = [];
  globalThis.fetch = (async (url) => { calls.push(String(url)); return Response.json({ ok: true }); }) as typeof fetch;
  await firstPartyAuthFetch('https://project.supabase.co/auth/v1/token?grant_type=password', { method: 'POST' });
  await firstPartyAuthFetch('https://project.supabase.co/rest/v1/clients');
  assert.deepEqual(calls, [
    '/api/auth-bridge/token?grant_type=password',
    'https://project.supabase.co/rest/v1/clients',
  ]);
});

test('bridge health checks are first-party, public-key-only, and no-store', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test_only';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  globalThis.fetch = (async (url, init) => {
    assert.equal(String(url), 'https://project.supabase.co/auth/v1/health');
    assert.equal(new Headers(init?.headers).get('apikey'), 'sb_publishable_test_only');
    assert.equal(new Headers(init?.headers).get('cookie'), null);
    return Response.json({ status: 'ok' });
  }) as typeof fetch;
  const response = await GET(new NextRequest(path('health')), context(['health']));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('password recovery cannot be redirected away or requested for other emails', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test_only';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  let calls = 0;
  globalThis.fetch = (async (url) => {
    calls++;
    assert.equal(String(url), 'https://project.supabase.co/auth/v1/recover?redirect_to=https%3A%2F%2Fcrm.example%2Freset-password');
    return Response.json({});
  }) as typeof fetch;
  const query = '?redirect_to=https://evil.example/token';
  const denied = await POST(jsonRequest('recover', { email: 'other@example.com' }, 'POST', query), context(['recover']));
  assert.equal(denied.status, 200);
  assert.equal(calls, 0);
  const allowed = await POST(jsonRequest('recover', { email: 'ADMIN@example.com' }, 'POST', query), context(['recover']));
  assert.equal(allowed.status, 200);
  assert.equal(calls, 1);
});

test('bridge restricts paths and grants, then forwards admin sign-in without cookies', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test_only';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  let calls = 0;
  globalThis.fetch = (async (url, init) => {
    calls++;
    assert.equal(String(url), 'https://project.supabase.co/auth/v1/token?grant_type=password');
    assert.equal(new Headers(init?.headers).get('cookie'), null);
    assert.equal(JSON.parse(String(init?.body)).email, 'admin@example.com');
    return Response.json({ access_token: 'fake' });
  }) as typeof fetch;
  assert.equal((await POST(jsonRequest('admin/users', {}), context(['admin', 'users']))).status, 404);
  assert.equal((await POST(jsonRequest('token', {}, 'POST', '?grant_type=unknown'), context(['token']))).status, 400);
  assert.equal((await POST(jsonRequest('token', { email: 'other@example.com', password: 'dummy' }, 'POST', '?grant_type=password'), context(['token']))).status, 400);
  const response = await POST(jsonRequest('token', { email: 'admin@example.com', password: 'dummy' }, 'POST', '?grant_type=password', { Cookie: 'secret=browser-only' }), context(['token']));
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
});

test('password updates need a session and cannot update other user attributes', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test_only';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  let calls = 0;
  globalThis.fetch = (async (_url, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer recovery-jwt');
    assert.deepEqual(JSON.parse(String(init?.body)), { password: 'a-very-long-new-password' });
    return Response.json({ user: { id: 'fake' } });
  }) as typeof fetch;
  const get = await GET(new NextRequest(path('user')), context(['user']));
  assert.equal(get.status, 401);
  const update = await PUT(jsonRequest('user', { password: 'a-very-long-new-password', email: 'attacker@example.com' }, 'PUT', '', { Authorization: 'Bearer recovery-jwt' }), context(['user']));
  assert.equal(update.status, 200);
  assert.equal(calls, 1);
});
