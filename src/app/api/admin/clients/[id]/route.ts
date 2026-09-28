import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { privateFailure, requireAdmin } from '@/lib/server';
import { clientSchema, firstValidationError } from '@/lib/validation';

export const runtime = 'nodejs';
const uuid = z.string().uuid();
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!uuid.safeParse(id).success) return NextResponse.json({ error: 'Invalid client.' }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid client data.' }, { status: 400 }); }
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: firstValidationError(parsed.error) }, { status: 400 });
  const { data: old, error: readError } = await auth.db.from('clients').select('daily_opt_in').eq('id', id).maybeSingle();
  if (readError) return privateFailure();
  if (!old) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  const change: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.daily_opt_in !== old.daily_opt_in) {
    if (parsed.data.daily_opt_in) {
      change.opted_in_at = new Date().toISOString();
      change.opted_out_at = null;
      change.opt_in_source = 'admin confirmed prior opt-in';
    } else {
      change.opted_out_at = new Date().toISOString();
    }
  }
  const { data, error } = await auth.db.from('clients').update(change).eq('id', id).select('*').single();
  if (error?.code === '23505') return NextResponse.json({ error: 'That WhatsApp number belongs to another client.' }, { status: 409 });
  return error ? privateFailure() : NextResponse.json({ client: data });
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!uuid.safeParse(id).success) return NextResponse.json({ error: 'Invalid client.' }, { status: 400 });
  const { error } = await auth.db.from('clients').delete().eq('id', id);
  return error ? privateFailure() : NextResponse.json({ deleted: true });
}
