import { NextRequest, NextResponse } from 'next/server';
import { cloudReady, serviceDb } from '@/lib/server';
import { computeSky } from '@/lib/sky';
import { makeDailyMessage, joinMessage } from '@/lib/messages';
import { sendTelegramMessage, telegramConfig } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET || process.env.DAILY_CRON_SECRET || '';
  if (expected.length < 8) return false;
  const got = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i,'') || '';
  return got === expected;
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  if (!telegramConfig()) return NextResponse.json({ error: 'Telegram not configured' }, { status: 503 });
  if (!cloudReady()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  const db = serviceDb();
  const sky = computeSky();
  const { data: settings } = await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();
  const bookingUrl = (settings as any)?.booking_url || 'https://tarot-tn.vercel.app/booking.html';
  const { data: clients, error } = await db.from('clients').select('id,name,sun_sign,preferred_language,telegram_chat_id').eq('telegram_opt_in', true).not('telegram_chat_id','is',null).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let sent = 0; let failed = 0;
  for (const c of (clients as any[]) || []) {
    try {
      const parts = makeDailyMessage(c as any, sky, bookingUrl);
      const text = joinMessage(parts);
      await sendTelegramMessage(c.telegram_chat_id, text);
      await db.from('telegram_sends').insert({ client_id: c.id, chat_id: c.telegram_chat_id, date_key: sky.dateKey });
      sent++;
      // avoid Telegram flood
      await new Promise(r => setTimeout(r, 120));
    } catch (e:any) {
      failed++;
    }
  }
  return NextResponse.json({ ok: true, date: sky.dateKey, sent, failed, total: clients?.length || 0 }, { headers: { 'Cache-Control': 'no-store' } });
}
