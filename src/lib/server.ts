import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_BOOKING_URL, type AppSettings } from './types';

export function cloudReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.ADMIN_EMAIL,
  );
}

export function serviceDb(): SupabaseClient {
  if (!cloudReady()) throw new Error('Cloud database is not configured.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getSettings(): Promise<AppSettings> {
  if (!cloudReady()) return { booking_url: DEFAULT_BOOKING_URL };
  const { data, error } = await serviceDb().from('app_settings').select('booking_url').eq('id', 1).maybeSingle();
  if (error) throw new Error('Could not load settings. Check Supabase SQL setup.');
  return { booking_url: data?.booking_url || DEFAULT_BOOKING_URL };
}

type AdminResult = { ok: true; db: SupabaseClient; email: string } | { ok: false; response: NextResponse };

/** Every private API route verifies the Supabase JWT and an exact admin email allowlist. */
export async function requireAdmin(request: NextRequest): Promise<AdminResult> {
  if (!cloudReady()) return { ok: false, response: NextResponse.json({ error: 'Configure the cloud database and ADMIN_EMAIL first.' }, { status: 503 }) };
  const match = /^Bearer (\S+)$/i.exec(request.headers.get('authorization') || '');
  if (!match) return { ok: false, response: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) };
  try {
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error } = await auth.auth.getUser(match[1]);
    if (error || !user || !user.email_confirmed_at || user.email?.toLowerCase() !== process.env.ADMIN_EMAIL!.trim().toLowerCase()) {
      return { ok: false, response: NextResponse.json({ error: 'This account is not authorized for the CRM.' }, { status: 403 }) };
    }
    return { ok: true, db: serviceDb(), email: user.email };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Could not verify this session.' }, { status: 503 }) };
  }
}

export function privateFailure() {
  return NextResponse.json({ error: 'Could not complete this request. Check the database schema and try again.' }, { status: 500 });
}
