import { NextRequest, NextResponse } from 'next/server';
import { privateFailure, requireAdmin } from '@/lib/server';
import { clientSchema, firstValidationError } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const page = Number(new URL(request.url).searchParams.get('page') || '0');
  if (!Number.isInteger(page) || page < 0 || page > 199) return NextResponse.json({ error: 'Invalid page.' }, { status: 400 });
  const size = 250;
  const { data, error } = await auth.db.from('clients').select('*')
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(page * size, (page + 1) * size - 1);
  return error ? privateFailure() : NextResponse.json({ clients: data, hasMore: (data?.length || 0) === size }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid client data.' }, { status: 400 }); }
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: firstValidationError(parsed.error) }, { status: 400 });
  const input = parsed.data;
  const consent = input.daily_opt_in ? {
    opted_in_at: new Date().toISOString(), opt_in_source: 'admin confirmed prior opt-in', opted_out_at: null,
  } : { opted_in_at: null, opt_in_source: null, opted_out_at: null };
  const { data, error } = await auth.db.from('clients').insert({ ...input, ...consent }).select('*').single();
  if (error?.code === '23505') return NextResponse.json({ error: 'This WhatsApp number is already in your CRM.' }, { status: 409 });
  return error ? privateFailure() : NextResponse.json({ client: data }, { status: 201 });
}
