import { NextRequest, NextResponse } from 'next/server';
import { getSettings, privateFailure, requireAdmin } from '@/lib/server';
import { firstValidationError, settingsSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  try { return NextResponse.json({ settings: await getSettings() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return privateFailure(); }
}
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid settings.' }, { status: 400 }); }
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: firstValidationError(parsed.error) }, { status: 400 });
  const { data, error } = await auth.db.from('app_settings')
    .upsert({ id: 1, booking_url: parsed.data.booking_url }, { onConflict: 'id' }).select('booking_url').single();
  return error ? privateFailure() : NextResponse.json({ settings: data });
}
