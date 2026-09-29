import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { privateFailure, requireAdmin } from '@/lib/server';
import { tunisDateKey } from '@/lib/sky';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

/** Logs the admin's confirmation, NOT a WhatsApp delivery receipt. */
export async function POST(request: NextRequest, context: Context) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid client.' }, { status: 400 });
  const today = tunisDateKey();
  let posted: unknown;
  try { posted = await request.json(); } catch { return NextResponse.json({ error: 'Missing message date.' }, { status: 400 }); }
  const parsed = z.object({ dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(posted);
  if (!parsed.success || parsed.data.dateKey !== today) {
    return NextResponse.json({ error: 'A new Tunis day has started. Refresh today’s message before marking it sent.' }, { status: 409 });
  }
  const { data, error } = await auth.db.from('clients')
    .update({ last_sent_on: today, last_sent_at: new Date().toISOString() })
    .eq('id', id).eq('daily_opt_in', true)
    .or(`last_sent_on.is.null,last_sent_on.neq.${today}`)
    .select('*').maybeSingle();
  if (error) return privateFailure();
  if (!data) return NextResponse.json({ error: 'Already marked today, not opted in, or not found. Refresh your list.' }, { status: 409 });
  return NextResponse.json({ client: data });
}
