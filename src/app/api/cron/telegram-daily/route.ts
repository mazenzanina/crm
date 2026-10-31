import { NextRequest, NextResponse } from 'next/server';
import { cloudReady, serviceDb } from '@/lib/server';
import { computeSky } from '@/lib/sky';
import { makeDailyMessage, joinMessage } from '@/lib/messages';
import { telegramConfig, sendTelegramMessage, dailyKeyboard } from '@/lib/telegram';

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

const CARD_FILES = ["00-the-fool","01-the-magician","02-the-high-priestess","03-the-empress","04-the-emperor","05-the-hierophant","06-the-lovers","07-the-chariot","08-strength","09-the-hermit","10-wheel-of-fortune","11-justice","12-the-hanged-man","13-death","14-temperance","15-the-devil","16-the-tower","17-the-star","18-the-moon","19-the-sun","20-judgement","21-the-world","22-ace-of-cups","23-two-of-cups","24-three-of-cups","25-four-of-cups","26-five-of-cups","27-six-of-cups","28-seven-of-cups","29-eight-of-cups","30-nine-of-cups","31-ten-of-cups","32-page-of-cups","33-knight-of-cups","34-queen-of-cups","35-king-of-cups","36-ace-of-pentacles","37-two-of-pentacles","38-three-of-pentacles","39-four-of-pentacles","40-five-of-pentacles","41-six-of-pentacles","42-seven-of-pentacles","43-eight-of-pentacles","44-nine-of-pentacles","45-ten-of-pentacles","46-page-of-pentacles","47-knight-of-pentacles","48-queen-of-pentacles","49-king-of-pentacles","50-ace-of-swords","51-two-of-swords","52-three-of-swords","53-four-of-swords","54-five-of-swords","55-six-of-swords","56-seven-of-swords","57-eight-of-swords","58-nine-of-swords","59-ten-of-swords","60-page-of-swords","61-knight-of-swords","62-queen-of-swords","63-king-of-swords","64-ace-of-wands","65-two-of-wands","66-three-of-wands","67-four-of-wands","68-five-of-wands","69-six-of-wands","70-seven-of-wands","71-eight-of-wands","72-nine-of-wands","73-ten-of-wands","74-page-of-wands","75-knight-of-wands","76-queen-of-wands","77-king-of-wands"];
function stableHash(s: string): number { let v=2166136261; for(let i=0;i<s.length;i++){ v^=s.charCodeAt(i); v=Math.imul(v,16777619);} return v>>>0; }
function cardFileFor(clientId: string, dateKey: string): string { return CARD_FILES[stableHash(`${dateKey}|${clientId}`) % CARD_FILES.length]; }

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
      const kb = dailyKeyboard(bookingUrl, c.id);
      if (dry) { sent++; continue; }
      // Try to send with card image (now hosted on CRM at /img/tarot/<file>.jpg); fallback to text
      const file = cardFileFor(c.id, sky.dateKey);
      const base = process.env.CARD_IMAGE_BASE || 'https://crm-flame-rho-25.vercel.app/img/tarot';
      const photoUrl = `${base}/${file}.jpg`;
      // images disabled per user - text only
      await sendTelegramMessage(c.telegram_chat_id, text, kb);
      await db.from('telegram_sends').insert({ client_id: c.id, chat_id: c.telegram_chat_id, date_key: sky.dateKey }).then(()=>{},()=>{});
      sent++;
      await new Promise(r => setTimeout(r, 130));
    } catch (e:any) {
      const msg = String(e?.message||'') + String(e?.body||'');
      if (/blocked|deactivated|kicked|chat not found|user is deactivated|bot was blocked/i.test(msg)) {
        await db.from('clients').update({ telegram_opt_in: false, telegram_opted_out_at: new Date().toISOString() }).eq('id', c.id).then(()=>{},()=>{});
      }
      failed++;
    }
  }
  return NextResponse.json({ ok: true, date: sky.dateKey, sent, failed, skipped, total: clients?.length || 0, dry }, { headers: { 'Cache-Control': 'no-store' } });
}
