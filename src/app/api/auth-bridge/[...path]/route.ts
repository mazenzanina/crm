import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path: string[] }> };

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

/**
 * Same-origin bridge for the small subset of Supabase Auth used by this CRM.
 * Only the public publishable key is forwarded; no service-role key is used.
 * Never log requests: password, session JWT, and refresh tokens pass in them.
 */
async function forward(request: NextRequest, context: Context): Promise<Response> {
  const { path: segments } = await context.params;
  const path = segments.join('/');
  const method = request.method;
  const allowed = (path === 'token' && method === 'POST') ||
    (path === 'recover' && method === 'POST') ||
    (path === 'user' && (method === 'GET' || method === 'PUT')) ||
    (path === 'logout' && method === 'POST') ||
    (path === 'health' && method === 'GET');
  if (!allowed) return failure('Not found.', 404);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!base || !key || !adminEmail) return failure('Authentication is not configured.', 503);

  const upstreamUrl = new URL(`${base}/auth/v1/${path}`);
  let body: string | undefined;
  if (method !== 'GET') {
    if (Number(request.headers.get('content-length') || 0) > 16_384) return failure('Request too large.', 413);
    body = await request.text();
    if (Buffer.byteLength(body, 'utf8') > 16_384) return failure('Request too large.', 413);
  }

  if (path === 'token') {
    const grant = request.nextUrl.searchParams.get('grant_type');
    if (grant !== 'password' && grant !== 'refresh_token') return failure('Unsupported sign-in method.', 400);
    upstreamUrl.searchParams.set('grant_type', grant);
    if (grant === 'password') {
      try {
        const input = JSON.parse(body || '');
        if (typeof input.email !== 'string' || input.email.trim().toLowerCase() !== adminEmail)
          return failure('Invalid login credentials.', 400);
      } catch { return failure('Invalid sign-in request.', 400); }
    }
  }

  if (path === 'recover') {
    try {
      const input = JSON.parse(body || '');
      if (typeof input.email !== 'string') return failure('Invalid email.', 400);
      if (input.email.trim().toLowerCase() !== adminEmail) {
        // Keep the response generic so this endpoint doesn't reveal account membership.
        return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } });
      }
    } catch { return failure('Invalid email.', 400); }
    // Never let callers select an arbitrary redirect for a private recovery link.
    upstreamUrl.searchParams.set('redirect_to', `${request.nextUrl.origin}/reset-password`);
  }

  if (path === 'user' && method === 'PUT') {
    try {
      const input = JSON.parse(body || '');
      if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 256)
        return failure('Choose a password of 12–256 characters.', 400);
      // Password is the only user attribute this single-admin CRM needs to update.
      body = JSON.stringify({ password: input.password, ...(typeof input.nonce === 'string' ? { nonce: input.nonce } : {}) });
    } catch { return failure('Invalid password-change request.', 400); }
  }

  if (path === 'logout') {
    const scope = request.nextUrl.searchParams.get('scope');
    if (scope && !['local', 'global', 'others'].includes(scope)) return failure('Invalid logout request.', 400);
    if (scope) upstreamUrl.searchParams.set('scope', scope);
  }

  const authorization = request.headers.get('authorization');
  if (path === 'user' && !authorization?.startsWith('Bearer ')) return failure('Please sign in.', 401);
  const headers = new Headers({
    apikey: key,
    Authorization: authorization?.startsWith('Bearer ') ? authorization : `Bearer ${key}`,
    Accept: 'application/json',
  });
  if (method !== 'GET') headers.set('Content-Type', 'application/json');
  const apiVersion = request.headers.get('x-supabase-api-version');
  if (apiVersion && /^\d{4}-\d{2}-\d{2}$/.test(apiVersion)) headers.set('x-supabase-api-version', apiVersion);

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    });
    const output = await upstream.text();
    if (output.length > 100_000) return failure('Authentication service returned an invalid response.', 502);
    const contentType = upstream.headers.get('content-type') || '';
    if (output && !contentType.includes('application/json'))
      return failure('Authentication service returned an invalid response.', 502);
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    if (contentType.includes('application/json')) responseHeaders.set('Content-Type', 'application/json');
    const responseVersion = upstream.headers.get('x-supabase-api-version');
    if (responseVersion) responseHeaders.set('x-supabase-api-version', responseVersion);
    return new Response([204, 205, 304].includes(upstream.status) ? null : output, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return failure('Authentication service could not be reached. Try another network or retry later.', 502);
  }
}

export async function GET(request: NextRequest, context: Context) { return forward(request, context); }
export async function POST(request: NextRequest, context: Context) { return forward(request, context); }
export async function PUT(request: NextRequest, context: Context) { return forward(request, context); }
