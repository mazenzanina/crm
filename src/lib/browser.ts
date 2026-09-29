'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserAuth: SupabaseClient | null = null;

/**
 * Safari can reach Supabase as a page navigation while cross-origin fetches to
 * the same host fail with "Load failed". Only Auth calls use our same-origin,
 * allowlisted server bridge; the browser keeps Supabase's normal session logic.
 */
export const firstPartyAuthFetch: typeof fetch = (input, init) => {
  const source = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (configured) {
    const target = new URL(source, window.location.origin);
    const base = new URL(configured);
    const authPath = `${base.pathname.replace(/\/$/, '')}/auth/v1/`;
    if (target.origin === base.origin && target.pathname.startsWith(authPath)) {
      const relative = `/api/auth-bridge/${target.pathname.slice(authPath.length)}${target.search}`;
      const request = input instanceof Request ? new Request(relative, input) : relative;
      return fetch(request, { ...init, credentials: 'same-origin', cache: 'no-store' });
    }
  }
  return fetch(input, init);
};

export function authClient(): SupabaseClient {
  if (!browserAuth) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase is not configured.');
    browserAuth = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: { fetch: firstPartyAuthFetch },
    });
  }
  return browserAuth;
}

export async function adminApi<T>(path: string, method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET', body?: unknown): Promise<T> {
  const { data: { session } } = await authClient().auth.getSession();
  if (!session?.access_token) throw new Error('Your session expired. Please sign in again.');
  const result = await fetch(`/api/admin/${path}`, {
    method,
    cache: 'no-store',
    headers: { 'Authorization': `Bearer ${session.access_token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(json.error || `Request failed (${result.status}).`);
  return json as T;
}
