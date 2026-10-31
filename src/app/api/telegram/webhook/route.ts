import { NextRequest, NextResponse } from 'next/server';
import { cloudReady, serviceDb } from '@/lib/server';
import { telegramConfig } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  if (/^\/stop/i.test(text)) {
    await db.from('clients').update({ telegram_opt_in: false, telegram_opted_out_at: new Date().toISOString() }).eq('telegram_chat_id', chatId);
    await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: 'Paused. Send /start to resume. /stop to stay paused.', parse_mode: 'Markdown' })
    });
    return NextResponse.json({ ok: true });
  }

  if (/^\/start/i.test(text)) {
    await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: 'Hi! Send your WhatsApp number as +216... and I will link your daily note.\nExample: +21622481622', parse_mode: 'Markdown' })
    });
    return NextResponse.json({ ok: true });
  }

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
        body: JSON.stringify({ chat_id: chatId, text: 'Number not found in CRM. Please check +216 format.', parse_mode: 'Markdown' })
      });
    }
    return NextResponse.json({ ok: true });
  }

  await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: 'Send /start to link, /stop to pause. Or send +216...', parse_mode: 'Markdown' })
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, webhook: 'telegram' });
}

