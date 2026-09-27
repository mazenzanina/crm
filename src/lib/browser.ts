'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserAuth: SupabaseClient | null = null;

export function authClient(): SupabaseClient {
  if (!browserAuth) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase is not configured.');
    browserAuth = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
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
