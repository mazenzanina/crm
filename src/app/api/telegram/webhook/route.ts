import { NextRequest, NextResponse } from 'next/server';
import { cloudReady, serviceDb } from '@/lib/server';
import { telegramConfig, sendTelegramMessage, sendTelegramPhoto, sendTelegramVoice, answerCallbackQuery, welcomeKeyboard, linkedKeyboard, helpText, dailyKeyboard, isAdmin, isBlockedError } from '@/lib/telegram';
import { computeSky } from '@/lib/sky';
import { makeDailyMessage, joinMessage } from '@/lib/messages';

const CARD_FILES = ["00-the-fool","01-the-magician","02-the-high-priestess","03-the-empress","04-the-emperor","05-the-hierophant","06-the-lovers","07-the-chariot","08-strength","09-the-hermit","10-wheel-of-fortune","11-justice","12-the-hanged-man","13-death","14-temperance","15-the-devil","16-the-tower","17-the-star","18-the-moon","19-the-sun","20-judgement","21-the-world","22-ace-of-cups","23-two-of-cups","24-three-of-cups","25-four-of-cups","26-five-of-cups","27-six-of-cups","28-seven-of-cups","29-eight-of-cups","30-nine-of-cups","31-ten-of-cups","32-page-of-cups","33-knight-of-cups","34-queen-of-cups","35-king-of-cups","36-ace-of-pentacles","37-two-of-pentacles","38-three-of-pentacles","39-four-of-pentacles","40-five-of-pentacles","41-six-of-pentacles","42-seven-of-pentacles","43-eight-of-pentacles","44-nine-of-pentacles","45-ten-of-pentacles","46-page-of-pentacles","47-knight-of-pentacles","48-queen-of-pentacles","49-king-of-pentacles","50-ace-of-swords","51-two-of-swords","52-three-of-swords","53-four-of-swords","54-five-of-swords","55-six-of-swords","56-seven-of-swords","57-eight-of-swords","58-nine-of-swords","59-ten-of-swords","60-page-of-swords","61-knight-of-swords","62-queen-of-swords","63-king-of-swords","64-ace-of-wands","65-two-of-wands","66-three-of-wands","67-four-of-wands","68-five-of-wands","69-six-of-wands","70-seven-of-wands","71-eight-of-wands","72-nine-of-wands","73-ten-of-wands","74-page-of-wands","75-knight-of-wands","76-queen-of-wands","77-king-of-wands"];
function stableHash(s: string): number { let v=2166136261; for(let i=0;i<s.length;i++){ v^=s.charCodeAt(i); v=Math.imul(v,16777619);} return v>>>0; }
function cardFileFor(clientId: string, dateKey: string): string { return CARD_FILES[stableHash(`${dateKey}|${clientId}`) % CARD_FILES.length]; }
function dateKeyDaysAgo(days: number): string { const d=new Date(); d.setDate(d.getDate()-days); return d.toISOString().slice(0,10); }

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getClientByChat(chatId: string) {
  const db = serviceDb();
  const { data } = await db.from('clients').select('id,name,preferred_language,telegram_opt_in,sun_sign,birth_date,phone').eq('telegram_chat_id', chatId).maybeSingle();
  return data as any | null;
}

async function sendDailyFor(client: any, chatId: string) {
  const sky = computeSky();
  const db = serviceDb();
  const { data: settings } = await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();
  const bookingUrl = (settings as any)?.booking_url || 'https://tarot-tn.vercel.app/booking.html';
  const parts = makeDailyMessage({ id: client.id, name: client.name, sun_sign: client.sun_sign, preferred_language: 'en' }, sky, bookingUrl);
  const text = joinMessage(parts);
  const kb = dailyKeyboard(bookingUrl, client.id);
  const file = cardFileFor(client.id, sky.dateKey);
  const base = process.env.CARD_IMAGE_BASE || 'https://crm-flame-rho-25.vercel.app/img/tarot';
  const photoUrl = `${base}/${file}.jpg`;
  try { await sendTelegramPhoto(chatId, photoUrl, text, kb); } catch (e:any) { 
    if (e?.blocked || isBlockedError(String(e?.message||''))) { await db.from('clients').update({ telegram_opt_in: false, telegram_opted_out_at: new Date().toISOString() }).eq('id', client.id).then(()=>{},()=>{}); }
    await sendTelegramMessage(chatId, text, kb).catch(()=>{}); 
  }
}

export async function POST(req: NextRequest) {
  const cfg = telegramConfig();
  if (!cfg) return NextResponse.json({ ok: false }, { status: 503 });
  if (!cloudReady()) return NextResponse.json({ ok: false }, { status: 503 });
  const update = await req.json().catch(() => null) as any;
  const db = serviceDb();

  // 1) Callback queries
  const cq = update?.callback_query;
  if (cq?.id && cq?.data) {
    const chatId = String(cq.message?.chat?.id || cq.from?.id || '');
    const data = String(cq.data);
    const client = chatId ? await getClientByChat(chatId) : null;

    if (data === 'fb_up' || data === 'fb_down') {
      const val = data === 'fb_up' ? 'up' : 'down';
      if (client) {
        const sky = computeSky();
        await db.from('telegram_feedback').insert({ client_id: client.id, chat_id: chatId, date_key: sky.dateKey, feedback: val }).then(()=>{},()=>{});
      }
      await answerCallbackQuery(cq.id, val==='up' ? 'Thanks for feedback 👍' : 'Thanks — we will adjust 👎');
      await sendTelegramMessage(chatId, val==='up' ? 'Glad it resonated ✨ See you tomorrow 09:00.' : 'Noted — tomorrow will be closer to what you need. /today to replay.', linkedKeyboard());
      return NextResponse.json({ ok: true });
    }
    if (data === 'share') {
      await answerCallbackQuery(cq.id);
      const bot = (process.env.TELEGRAM_BOT_USERNAME || 'tarot_tn_bot').replace(/^@/,'');
      await sendTelegramMessage(chatId, `Share your daily sky ✨\nhttps://t.me/${bot}?start=ref_${client?.id || 'share'}\nYour friend taps → /start → +216... → gets their own note.`, linkedKeyboard());
      return NextResponse.json({ ok: true });
    }
    if (data === 'voice') {
      await answerCallbackQuery(cq.id);
      const voiceUrl = process.env.TELEGRAM_VOICE_URL || 'https://crm-flame-rho-25.vercel.app/audio/intro.ogg';
      try { await sendTelegramVoice(chatId, voiceUrl, 'A 15-sec hello from Mazen ✨'); } catch { await sendTelegramMessage(chatId, 'Voice intro coming soon — Mazen is recording a short hello for you ✨', linkedKeyboard()); }
      return NextResponse.json({ ok: true });
    }
    if (data === 'missed') {
      await answerCallbackQuery(cq.id);
      if (!client) { await sendTelegramMessage(chatId, 'Not linked yet. Send /start then +216...', welcomeKeyboard()); return NextResponse.json({ ok: true }); }
      // send last 3 days
      for (let d=2; d>=0; d--) {
        const dk = dateKeyDaysAgo(d);
        // compute sky for that date - approximate with current sky but different dateKey for card
        const sky = computeSky(); // sky positions same, but card varies with dateKey
        const fakeSky = { ...sky, dateKey: dk } as any;
        const { data: settings } = await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();
        const bookingUrl = (settings as any)?.booking_url || 'https://tarot-tn.vercel.app/booking.html';
        const parts = makeDailyMessage({ id: client.id, name: client.name, sun_sign: client.sun_sign, preferred_language: 'en' }, fakeSky, bookingUrl);
        const text = joinMessage(parts) + (d>0 ? `\n\n_${dk}_` : '');
        const kb = d===0 ? dailyKeyboard(bookingUrl, client.id) : undefined;
        const file = cardFileFor(client.id, dk);
        const base = process.env.CARD_IMAGE_BASE || 'https://crm-flame-rho-25.vercel.app/img/tarot';
        const photoUrl = `${base}/${file}.jpg`;
        try { if (d===0) await sendTelegramPhoto(chatId, photoUrl, text, kb); else await sendTelegramMessage(chatId, text); } catch { await sendTelegramMessage(chatId, text, kb).catch(()=>{}); }
        await new Promise(r=>setTimeout(r,200));
      }
      return NextResponse.json({ ok: true });
    }
    if (data === 'stop') {
      if (client) await db.from('clients').update({ telegram_opt_in: false, telegram_opted_out_at: new Date().toISOString() }).eq('id', client.id);
      await answerCallbackQuery(cq.id, 'Paused');
      await sendTelegramMessage(chatId, 'Paused. Send /resume to restart.', { inline_keyboard: [[{ text: '▶️ Resume', callback_data: 'resume' }]] });
      return NextResponse.json({ ok: true });
    }
    if (data === 'resume') {
      if (client) await db.from('clients').update({ telegram_opt_in: true, telegram_opted_in_at: new Date().toISOString(), telegram_opted_out_at: null }).eq('id', client.id);
      await answerCallbackQuery(cq.id, 'Resumed ✓');
      await sendTelegramMessage(chatId, 'Resumed ✨ Daily note at 09:00.', linkedKeyboard());
      return NextResponse.json({ ok: true });
    }
    if (data === 'today') {
      if (!client) { await answerCallbackQuery(cq.id, 'Not linked'); await sendTelegramMessage(chatId, 'Not linked yet. Send /start then +216...', welcomeKeyboard()); return NextResponse.json({ ok: true }); }
      if (!client.telegram_opt_in) { await answerCallbackQuery(cq.id, 'Paused'); await sendTelegramMessage(chatId, 'Paused. Send /resume.', { inline_keyboard: [[{ text: '▶️ Resume', callback_data: 'resume' }]] }); return NextResponse.json({ ok: true }); }
      await answerCallbackQuery(cq.id);
      await sendDailyFor(client, chatId);
      return NextResponse.json({ ok: true });
    }
    if (data === 'help' || data === 'hint_lang') {
      await answerCallbackQuery(cq.id);
      await sendTelegramMessage(chatId, helpText(), linkedKeyboard());
      return NextResponse.json({ ok: true });
    }
    if (data === 'hint_link') {
      await answerCallbackQuery(cq.id);
      await sendTelegramMessage(chatId, 'Send your WhatsApp number as +216...\nExample: +21622481622', welcomeKeyboard());
      return NextResponse.json({ ok: true });
    }
    await answerCallbackQuery(cq.id);
    return NextResponse.json({ ok: true });
  }

  // 2) Normal messages
  const msg = update?.message;
  if (!msg?.chat?.id) return NextResponse.json({ ok: true });
  const chatId = String(msg.chat.id);
  const username = msg.chat.username ? String(msg.chat.username) : null;
  const text: string = (msg.text || '').trim();

  if (/^\/stats/i.test(text)) {
    if (!isAdmin(chatId, username) && username !== 'tarot_tn_bot') {
      // also check if this chat is owner via env - fallback: only allow if adminIds empty? deny
      const adminIds = (process.env.TELEGRAM_ADMIN_IDS || '').trim();
      if (!adminIds) { await sendTelegramMessage(chatId, 'Admin only. Set TELEGRAM_ADMIN_IDS in Vercel to enable.', linkedKeyboard()); return NextResponse.json({ ok: true }); }
      await sendTelegramMessage(chatId, 'Admin only.', linkedKeyboard());
      return NextResponse.json({ ok: true });
    }
    const { count: total } = await db.from('clients').select('id', { count: 'exact', head: true });
    const { count: linked } = await db.from('clients').select('id', { count: 'exact', head: true }).not('telegram_chat_id','is',null);
    const { count: opted } = await db.from('clients').select('id', { count: 'exact', head: true }).eq('telegram_opt_in', true);
    const today = new Date().toISOString().slice(0,10);
    const { count: sentToday } = await db.from('telegram_sends').select('id', { count: 'exact', head: true }).eq('date_key', today);
    const { count: up } = await db.from('telegram_feedback').select('id', { count: 'exact', head: true }).eq('feedback','up').eq('date_key', today).then(r=>r as any, ()=>({count:0} as any));
    const { count: down } = await db.from('telegram_feedback').select('id', { count: 'exact', head: true }).eq('feedback','down').eq('date_key', today).then(r=>r as any, ()=>({count:0} as any));
    await sendTelegramMessage(chatId, `*Admin stats* 📊\nTotal clients: ${total||0}\nLinked to Telegram: ${linked||0}\nOpted in: ${opted||0}\nSent today (${today}): ${sentToday||0}\nFeedback today: 👍 ${up||0} 👎 ${down||0}`, linkedKeyboard());
    return NextResponse.json({ ok: true });
  }
  if (/^\/stop/i.test(text)) {
    await db.from('clients').update({ telegram_opt_in: false, telegram_opted_out_at: new Date().toISOString() }).eq('telegram_chat_id', chatId);
    await sendTelegramMessage(chatId, 'Paused. Send /resume to resume.', { inline_keyboard: [[{ text: '▶️ Resume', callback_data: 'resume' }]] });
    return NextResponse.json({ ok: true });
  }
  if (/^\/resume/i.test(text)) {
    const { data: cl } = await db.from('clients').select('id').eq('telegram_chat_id', chatId).maybeSingle();
    if (cl) await db.from('clients').update({ telegram_opt_in: true, telegram_opted_in_at: new Date().toISOString(), telegram_opted_out_at: null }).eq('id', (cl as any).id);
    await sendTelegramMessage(chatId, 'Resumed ✨ Daily at 09:00.', linkedKeyboard());
    return NextResponse.json({ ok: true });
  }
  if (/^\/help/i.test(text)) {
    await sendTelegramMessage(chatId, helpText(), linkedKeyboard());
    return NextResponse.json({ ok: true });
  }
  if (/^\/share/i.test(text)) {
    const client = await getClientByChat(chatId);
    const bot = (process.env.TELEGRAM_BOT_USERNAME || 'tarot_tn_bot').replace(/^@/,'');
    await sendTelegramMessage(chatId, `Share your daily sky ✨\nhttps://t.me/${bot}?start=ref_${client?.id || 'share'}\nYour friend taps → /start → +216...`, linkedKeyboard());
    return NextResponse.json({ ok: true });
  }
  if (/^\/voice/i.test(text)) {
    const voiceUrl = process.env.TELEGRAM_VOICE_URL || 'https://crm-flame-rho-25.vercel.app/audio/intro.ogg';
    try { await sendTelegramVoice(chatId, voiceUrl, 'Hello from Mazen ✨'); } catch { await sendTelegramMessage(chatId, 'Voice intro coming soon — Mazen is recording a short hello ✨', linkedKeyboard()); }
    return NextResponse.json({ ok: true });
  }
  if (/^\/missed/i.test(text)) {
    const client = await getClientByChat(chatId);
    if (!client) { await sendTelegramMessage(chatId, 'Not linked yet. Send /start then +216...', welcomeKeyboard()); return NextResponse.json({ ok: true }); }
    for (let d=2; d>=0; d--) {
      const dk = dateKeyDaysAgo(d);
      const sky = computeSky(); const fakeSky = { ...sky, dateKey: dk } as any;
      const { data: settings } = await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();
      const bookingUrl = (settings as any)?.booking_url || 'https://tarot-tn.vercel.app/booking.html';
      const parts = makeDailyMessage({ id: client.id, name: client.name, sun_sign: client.sun_sign, preferred_language: 'en' }, fakeSky, bookingUrl);
      const txt = joinMessage(parts) + (d>0 ? `\n\n_${dk}_` : '');
      const kb = d===0 ? dailyKeyboard(bookingUrl, client.id) : undefined;
      const file = cardFileFor(client.id, dk);
      const base = process.env.CARD_IMAGE_BASE || 'https://crm-flame-rho-25.vercel.app/img/tarot';
      const photoUrl = `${base}/${file}.jpg`;
      try { if (d===0) await sendTelegramPhoto(chatId, photoUrl, txt, kb); else await sendTelegramMessage(chatId, txt); } catch { await sendTelegramMessage(chatId, txt, kb).catch(()=>{}); }
      await new Promise(r=>setTimeout(r,250));
    }
    return NextResponse.json({ ok: true });
  }
  if (/^\/today/i.test(text)) {
    const client = await getClientByChat(chatId);
    if (!client) { await sendTelegramMessage(chatId, 'Not linked yet. Send /start then +216...', welcomeKeyboard()); return NextResponse.json({ ok: true }); }
    if (!client.telegram_opt_in) { await sendTelegramMessage(chatId, 'Paused. Send /resume to get today.', { inline_keyboard: [[{ text: '▶️ Resume', callback_data: 'resume' }]] }); return NextResponse.json({ ok: true }); }
    await sendDailyFor(client, chatId);
    return NextResponse.json({ ok: true });
  }

  if (/^\/start/i.test(text)) {
    const parts = text.split(/\s+/);
    const ref = parts[1] || '';
    // track ref if present like ref_<id>
    if (ref.startsWith('ref_')) {
      // store referrer for analytics if client already linked? just ignore for now but could log
      await db.from('telegram_refs').insert({ chat_id: chatId, ref: ref.slice(4), created_at: new Date().toISOString() }).then(()=>{},()=>{});
    }
    const client = await getClientByChat(chatId);
    if (client) {
      await sendTelegramMessage(chatId, `Hi ${client.name.split(' ')[0]} ✨ Already linked! /today to replay, /missed for last 3, /share to invite.`, linkedKeyboard());
    } else {
      await sendTelegramMessage(chatId, 'Hi ✨ Welcome to Tarot TN — your daily sky note.\nSend your WhatsApp number as *+216...* to link.\nExample: `+21622481622`', welcomeKeyboard());
    }
    return NextResponse.json({ ok: true });
  }

  const phoneMatch = text.replace(/\s/g, '').match(/^\+[1-9][0-9]{7,14}$/);
  if (phoneMatch) {
    const phone = phoneMatch[0];
    const { data: client } = await db.from('clients').select('id,name,sun_sign,birth_date,phone').eq('phone', phone).maybeSingle();
    if (client) {
      await db.from('clients').update({ telegram_chat_id: chatId, telegram_username: username, telegram_opt_in: true, telegram_opted_in_at: new Date().toISOString(), telegram_opted_out_at: null }).eq('id', (client as any).id);
      const first = (client as any).name.split(' ')[0];
      let onboarding = '';
      if (!(client as any).birth_date && !(client as any).sun_sign) onboarding = '\n\nWant it more personal? Send your sign or birth date. Optional.';
      await sendTelegramMessage(chatId, `Linked ✨ Welcome ${first}! Daily note at 09:00 Tunis.`+onboarding, linkedKeyboard());
      const fullClient = await getClientByChat(chatId);
      if (fullClient) await sendDailyFor(fullClient, chatId);
    } else {
      await sendTelegramMessage(chatId, 'Number not found in CRM. Check +216 format or ask Mazen to add you.', welcomeKeyboard());
    }
    return NextResponse.json({ ok: true });
  }

  const linked = await getClientByChat(chatId);
  if (linked && text.length >= 3 && text.length < 30) {
    const signMap: Record<string,string> = { aries:'Aries', taurus:'Taurus', gemini:'Gemini', cancer:'Cancer', leo:'Leo', virgo:'Virgo', libra:'Libra', scorpio:'Scorpio', sagittarius:'Sagittarius', capricorn:'Capricorn', aquarius:'Aquarius', pisces:'Pisces', 'bélier':'Aries', 'taureau':'Taurus', 'gémeaux':'Gemini', 'vierge':'Virgo', 'balance':'Libra', 'scorpion':'Scorpio', 'sagittaire':'Sagittarius', 'capricorne':'Capricorn', 'verseau':'Aquarius', 'poissons':'Pisces', 'حمل':'Aries','ثور':'Taurus','جوزاء':'Gemini','سرطان':'Cancer','اسد':'Leo','عذراء':'Virgo','ميزان':'Libra','عقرب':'Scorpio','قوس':'Sagittarius','جدي':'Capricorn','دلو':'Aquarius','حوت':'Pisces' } as any;
    const lower = text.toLowerCase();
    const found = (Object.keys(signMap) as string[]).find(k=> lower.includes(k));
    if (found) {
      const eng = signMap[found];
      await db.from('clients').update({ sun_sign: eng }).eq('id', linked.id);
      await sendTelegramMessage(chatId, `Saved ✨ ${eng} — tomorrow's note will be more personal. /today to see today again.`, linkedKeyboard());
      return NextResponse.json({ ok: true });
    }
  }

  await sendTelegramMessage(chatId, 'Send /start to link, /today to replay, /missed for last 3, /share to invite, /stop to pause. Or send +216...', linked ? linkedKeyboard() : welcomeKeyboard());
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, webhook: 'telegram' });
}
