import { NextRequest, NextResponse } from 'next/server';
import { cloudReady, serviceDb } from '@/lib/server';
import { computeSky } from '@/lib/sky';
import { makeDailyMessage, joinMessage, symbolicCardName } from '@/lib/messages';
import { telegramConfig, sendTelegramMessage, sendTelegramPhoto, dailyKeyboard } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET || process.env.DAILY_CRON_SECRET || '';
  if (expected.length < 8) return false;
  const got = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i,'') || new URL(req.url).searchParams.get('secret') || '';
  return got === expected;
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }

function cardSlug(cardNameEn: string): string {
  return cardNameEn.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  if (!telegramConfig()) return NextResponse.json({ error: 'Telegram not configured' }, { status: 503 });
  if (!cloudReady()) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  const db = serviceDb();
  const sky = computeSky();
  const { data: settings } = await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();
  const bookingUrl = (settings as any)?.booking_url || 'https://tarot-tn.vercel.app/booking.html';
  const { data: clients, error } = await db.from('clients').select('id,name,sun_sign,preferred_language,telegram_chat_id').eq('telegram_opt_in', true).not('telegram_chat_id','is',null).limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let sent = 0; let failed = 0; let skipped = 0;
  const dry = new URL(req.url).searchParams.get('dry') === '1';
  for (const c of (clients as any[]) || []) {
    try {
      const lang = 'en'; // forced English
      const parts = makeDailyMessage(c as any, sky, bookingUrl);
      const text = joinMessage(parts);
      const kb = dailyKeyboard(lang, bookingUrl);
      if (dry) { sent++; continue; }
      // Try to send with card image if hosted; fallback to text
      // Card images expected at https://tarot-tn.vercel.app/img/cards/<slug>.jpg — if not found, sendMessage fallback
      const cardName = symbolicCardName(c.id, sky.dateKey, lang);
      const slug = cardSlug(cardName);
      const base = process.env.CARD_IMAGE_BASE || 'https://tarot-tn.vercel.app/img/cards';
      const photoUrl = `${base}/${slug}.jpg`;
      let usedPhoto = false;
      // Only attempt photo if not in dry mode; if photo fails, fallback to text
      try {
        // quick HEAD check omitted to save time; just try and fallback on error
        if (process.env.CARD_IMAGES_ENABLED === '1') {
          await sendTelegramPhoto(c.telegram_chat_id, photoUrl, text, kb);
          usedPhoto = true;
        }
      } catch {}
      if (!usedPhoto) {
        await sendTelegramMessage(c.telegram_chat_id, text, kb);
      }
      await db.from('telegram_sends').insert({ client_id: c.id, chat_id: c.telegram_chat_id, date_key: sky.dateKey }).then(()=>{},()=>{});
      sent++;
      await new Promise(r => setTimeout(r, 130));
    } catch (e:any) {
      // if failed due to blocked/deleted, optionally opt-out automatically? keep opted in for now
      failed++;
    }
  }
  return NextResponse.json({ ok: true, date: sky.dateKey, sent, failed, skipped, total: clients?.length || 0, dry }, { headers: { 'Cache-Control': 'no-store' } });
}
