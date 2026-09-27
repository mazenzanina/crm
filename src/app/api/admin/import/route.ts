import { NextRequest, NextResponse } from 'next/server';
import { privateFailure, requireAdmin } from '@/lib/server';
import { clientSchema } from '@/lib/validation';
import { approximateSunSign } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Old CRM used camelCase in localStorage. Imported contacts are ALWAYS opted out until consent is checked. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  if (Number(request.headers.get('content-length') || '0') > 350_000) return NextResponse.json({ error: 'Split this import into smaller files.' }, { status: 413 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!Array.isArray(raw) || raw.length > 500) return NextResponse.json({ error: 'Upload a JSON array of up to 500 clients.' }, { status: 400 });
  const valid: Record<string, unknown>[] = [];
  let invalid = 0;
  const seen = new Set<string>();
  for (const original of raw) {
    if (!original || typeof original !== 'object' || Array.isArray(original)) { invalid++; continue; }
    const row = original as Record<string, unknown>;
    const birth = row.birth_date || row.birthDate || null;
    const input = {
      name: row.name, phone: row.phone, email: row.email || null,
      location: row.location || null,
      birth_date: birth,
      birth_time: row.birth_time || row.birthTime || null,
      birth_place: row.birth_place || row.birthPlace || null,
      sun_sign: row.sun_sign || row.sunSign || (typeof birth === 'string' ? approximateSunSign(birth) : null),
      preferred_language: row.preferred_language || row.preferredLanguage || 'en',
      status: String(row.status || 'lead').toLowerCase(),
      total_spent_tnd: row.total_spent_tnd ?? row.totalSpentTND ?? 0,
      notes: row.notes || '', daily_opt_in: false,
    };
    const result = clientSchema.safeParse(input);
    if (!result.success || seen.has(result.data.phone)) { invalid++; continue; }
    seen.add(result.data.phone);
    valid.push({ ...result.data, opted_in_at: null, opted_out_at: null, opt_in_source: null });
  }
  if (!valid.length) return NextResponse.json({ error: 'No valid clients found. Each needs a name and international WhatsApp number.' }, { status: 400 });
  const { data, error } = await auth.db.from('clients').upsert(valid, { onConflict: 'phone', ignoreDuplicates: true }).select('id');
  if (error) return privateFailure();
  return NextResponse.json({ imported: data?.length || 0, skipped: raw.length - (data?.length || 0), invalid, message: 'Imported contacts have daily messaging OFF until you confirm their opt-in.' });
}
