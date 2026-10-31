 import { NextRequest, NextResponse } from 'next/server';
import { cloudReady, serviceDb } from '@/lib/server';
import { telegramConfig } from '@/lib/telegram';
import { verifyDailyLink } from '@/lib/dailyLink';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tgReply(text: string) { return { method: 'sendMessage', text, parse_mode: 'Markdown' as const }; }

export async function POST(req: NextRequest) {
  const cfg = telegramConfig();
  if (!cfg) return NextResponse.json({ ok: false }, { status: 503 });
  if (!cloudReady()) return NextResponse.json({ ok: false }, { status: 503 });
  const update = await req.json().catch(() => null) as any;
  const msg = update?.message;
  if (!msg?.chat?.id) return NextResponse.json({ ok: true });
  const chatId = String(msg.chat.id);
  const username = msg.chat.username ? String(msg.chat.username) : null;
  const text: string = (msg.text || '').trim();
  const db = serviceDb();

  // /stop -> opt out
  if (/^\/stop/i.test(text)) {
    await db.from('clients').update({ telegram_opt_in: false, telegram_opted_out_at: new Date().toISOString() }).eq('telegram_chat_id', chatId);
    await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: 'Paused. Send /start to resume. /stop to stay paused.', parse_mode: 'Markdown' })
    });
    return NextResponse.json({ ok: true });
  }

  if (/^\/start/i.test(text)) {
    const payload = text.split(/\s+/)[1] || '';
    // Try daily link token first: format day.uuid.exp.sig
    if (payload && payload.includes('.')) {
      const signingKey = process.env.DAILY_LINK_SIGNING_KEY || '';
      const verified = verifyDailyLink(payload, signingKey);
      if (verified) {
        const { data } = await db.from('clients').select('id').eq('id', verified.clientId).maybeSingle();
        if (data) {
          await db.from('clients').update({ telegram_chat_id: chatId, telegram_username: username, telegram_opt_in: true, telegram_opted_in_at: new Date().toISOString(), telegram_opted_out_at: null }).eq('id', verified.clientId);
          await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: 'Linked! ✨ You will get your daily note at 09:00 Tunis. Send /stop to pause.', parse_mode: 'Markdown' })
          });
          return NextResponse.json({ ok: true });
        }
      }
    }
    // No token or invalid -> ask for phone
    await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: 'Hi! Send your WhatsApp number as +216... and I will link your daily note.\\nExample: +21622481622', parse_mode: 'Markdown' })
    });
    return NextResponse.json({ ok: true });
  }

  // If user sends phone number like +216...
  const phoneMatch = text.replace(/\s/g, '').match(/^\+[1-9][0-9]{7,14}$/);
  if (phoneMatch) {
    const phone = phoneMatch[0];
    const { data: client } = await db.from('clients').select('id').eq('phone', phone).maybeSingle();
    if (client) {
      await db.from('clients').update({ telegram_chat_id: chatId, telegram_username: username, telegram_opt_in: true, telegram_opted_in_at: new Date().toISOString(), telegram_opted_out_at: null }).eq('id', client.id);
      await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: 'Linked! ✨ Daily note at 09:00 Tunis. /stop to pause.', parse_mode: 'Markdown' })
      });
    } else {
      await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: 'Number not found in CRM. Please check +216 format or send your daily link: t.me/' + cfg.username + '?start=YOUR_TOKEN', parse_mode: 'Markdown' })
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Fallback
  await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: 'Send /start to link, /stop to pause. Or send +216...', parse_mode: 'Markdown' })
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, webhook: 'telegram' });
}
