import { NextRequest, NextResponse } from 'next/server';
import { cloudReady, serviceDb } from '@/lib/server';
import { telegramConfig, sendTelegramMessage, answerCallbackQuery, welcomeKeyboard, linkedKeyboard, helpText } from '@/lib/telegram';
import { computeSky } from '@/lib/sky';
import { makeDailyMessage, joinMessage } from '@/lib/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// tiny helper to get client language or default
async function getClientByChat(chatId: string) {
  const db = serviceDb();
  const { data } = await db.from('clients').select('id,name,preferred_language,telegram_opt_in,sun_sign,birth_date').eq('telegram_chat_id', chatId).maybeSingle();
  return data as any | null;
}

export async function POST(req: NextRequest) {
  const cfg = telegramConfig();
  if (!cfg) return NextResponse.json({ ok: false }, { status: 503 });
  if (!cloudReady()) return NextResponse.json({ ok: false }, { status: 503 });
  const update = await req.json().catch(() => null) as any;
  const db = serviceDb();

  // 1) Callback queries (inline buttons)
  const cq = update?.callback_query;
  if (cq?.id && cq?.data) {
    const chatId = String(cq.message?.chat?.id || cq.from?.id || '');
    const data = String(cq.data);
    const client = chatId ? await getClientByChat(chatId) : null;
    const lang = client?.preferred_language || 'en';

    if (data.startsWith('lang_')) {
      const newLang = data.replace('lang_','') as 'en'|'fr'|'tn';
      if (['en','fr','tn'].includes(newLang) && client) {
        await db.from('clients').update({ preferred_language: newLang }).eq('id', client.id);
        await answerCallbackQuery(cq.id, newLang==='fr'?'Français ✓': newLang==='tn'?'تم ✓':'English ✓');
        await sendTelegramMessage(chatId, newLang==='fr'?'Langue mise à jour 🇫🇷': newLang==='tn'?'تم تحديث اللغة 🇹🇳':'Language updated 🇬🇧', linkedKeyboard(newLang));
      } else if (!client) {
        await answerCallbackQuery(cq.id, 'Link first: send +216...');
        await sendTelegramMessage(chatId, 'Send your WhatsApp number as +216... to link, then you can change language.', welcomeKeyboard());
      } else {
        await answerCallbackQuery(cq.id);
      }
      return NextResponse.json({ ok: true });
    }

    if (data === 'stop') {
      if (client) await db.from('clients').update({ telegram_opt_in: false, telegram_opted_out_at: new Date().toISOString() }).eq('id', client.id);
      await answerCallbackQuery(cq.id, 'Paused');
      await sendTelegramMessage(chatId, lang==='fr'?'En pause. /resume pour reprendre.': lang==='tn'?'توقّف. ابعث /resume باش ترجع.':'Paused. Send /resume to restart.', { inline_keyboard: [[{ text: lang==='fr'?'▶️ Reprendre': lang==='tn'?'▶️ كمّل':'▶️ Resume', callback_data: 'resume' }]] });
      return NextResponse.json({ ok: true });
    }
    if (data === 'resume') {
      if (client) await db.from('clients').update({ telegram_opt_in: true, telegram_opted_in_at: new Date().toISOString(), telegram_opted_out_at: null }).eq('id', client.id);
      await answerCallbackQuery(cq.id, 'Resumed ✓');
      await sendTelegramMessage(chatId, lang==='fr'?'Repris ✨ Vous recevrez la note à 09:00.': lang==='tn'?'رجعت ✨ توصلك النوتة 09:00.':'Resumed ✨ Daily note at 09:00.', linkedKeyboard(lang));
      return NextResponse.json({ ok: true });
    }
    if (data === 'today') {
      if (!client) {
        await answerCallbackQuery(cq.id, 'Not linked');
        await sendTelegramMessage(chatId, 'Not linked yet. Send /start then +216...', welcomeKeyboard());
        return NextResponse.json({ ok: true });
      }
      if (!client.telegram_opt_in) {
        await answerCallbackQuery(cq.id, 'Paused');
        await sendTelegramMessage(chatId, 'Paused. Send /resume.', { inline_keyboard: [[{ text: '▶️ Resume', callback_data: 'resume' }]] });
        return NextResponse.json({ ok: true });
      }
      const sky = computeSky();
      const { data: settings } = await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();
      const bookingUrl = (settings as any)?.booking_url || 'https://tarot-tn.vercel.app/booking.html';
      const parts = makeDailyMessage({ id: client.id, name: client.name, sun_sign: client.sun_sign, preferred_language: client.preferred_language }, sky, bookingUrl);
      const text = joinMessage(parts);
      await answerCallbackQuery(cq.id);
      const { dailyKeyboard } = await import('@/lib/telegram');
      await sendTelegramMessage(chatId, text, dailyKeyboard(lang, bookingUrl));
      return NextResponse.json({ ok: true });
    }
    if (data === 'help' || data === 'hint_lang') {
      await answerCallbackQuery(cq.id);
      await sendTelegramMessage(chatId, helpText(lang), linkedKeyboard(lang));
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

  // /stop
  if (/^\/stop/i.test(text)) {
    await db.from('clients').update({ telegram_opt_in: false, telegram_opted_out_at: new Date().toISOString() }).eq('telegram_chat_id', chatId);
    const client = await getClientByChat(chatId); const lang = client?.preferred_language || 'en';
    await sendTelegramMessage(chatId, lang==='fr'?'En pause. /resume pour reprendre.': lang==='tn'?'توقّف. ابعث /resume باش ترجع.':'Paused. Send /resume to resume.', { inline_keyboard: [[{ text: lang==='fr'?'▶️ Reprendre': lang==='tn'?'▶️ كمّل':'▶️ Resume', callback_data: 'resume' }]] });
    return NextResponse.json({ ok: true });
  }
  if (/^\/resume/i.test(text)) {
    const { data: cl } = await db.from('clients').select('id,preferred_language').eq('telegram_chat_id', chatId).maybeSingle();
    if (cl) await db.from('clients').update({ telegram_opt_in: true, telegram_opted_in_at: new Date().toISOString(), telegram_opted_out_at: null }).eq('id', (cl as any).id);
    const lang = (cl as any)?.preferred_language || 'en';
    await sendTelegramMessage(chatId, lang==='fr'?'Repris ✨ 09:00 chaque jour.': lang==='tn'?'رجعت ✨ كل يوم 09:00.':'Resumed ✨ Daily at 09:00.', linkedKeyboard(lang));
    return NextResponse.json({ ok: true });
  }
  if (/^\/help/i.test(text)) {
    const client = await getClientByChat(chatId); const lang = client?.preferred_language || 'en';
    await sendTelegramMessage(chatId, helpText(lang), linkedKeyboard(lang));
    return NextResponse.json({ ok: true });
  }
  if (/^\/lang/i.test(text)) {
    await sendTelegramMessage(chatId, 'Choose language / اختر اللغة / Choisir la langue:', { inline_keyboard: [[{ text: '🇹🇳 TN', callback_data: 'lang_tn' }, { text: '🇫🇷 FR', callback_data: 'lang_fr' }, { text: '🇬🇧 EN', callback_data: 'lang_en' }]] });
    return NextResponse.json({ ok: true });
  }
  if (/^\/today/i.test(text)) {
    const client = await getClientByChat(chatId);
    if (!client) { await sendTelegramMessage(chatId, 'Not linked yet. Send /start then +216...', welcomeKeyboard()); return NextResponse.json({ ok: true }); }
    if (!client.telegram_opt_in) { await sendTelegramMessage(chatId, 'Paused. Send /resume to get today.', { inline_keyboard: [[{ text: '▶️ Resume', callback_data: 'resume' }]] }); return NextResponse.json({ ok: true }); }
    const sky = computeSky();
    const { data: settings } = await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();
    const bookingUrl = (settings as any)?.booking_url || 'https://tarot-tn.vercel.app/booking.html';
    const parts = makeDailyMessage({ id: client.id, name: client.name, sun_sign: client.sun_sign, preferred_language: client.preferred_language }, sky, bookingUrl);
    const t = joinMessage(parts);
    const { dailyKeyboard } = await import('@/lib/telegram');
    await sendTelegramMessage(chatId, t, dailyKeyboard(client.preferred_language, bookingUrl));
    return NextResponse.json({ ok: true });
  }

  if (/^\/start/i.test(text)) {
    const client = await getClientByChat(chatId);
    if (client) {
      await sendTelegramMessage(chatId, `Hi ${client.name.split(' ')[0]} ✨ Already linked! /today to replay, /lang to switch, /stop to pause.`, linkedKeyboard(client.preferred_language));
    } else {
      await sendTelegramMessage(chatId, 'Hi ✨ Welcome to Tarot TN — your daily sky note.\nSend your WhatsApp number as *+216...* to link.\nExample: `+21622481622`\n\n🇫🇷 Envoyez votre numéro WhatsApp en +216...\n🇹🇳 ابعث نومروك واتساب +216...', welcomeKeyboard());
    }
    return NextResponse.json({ ok: true });
  }

  const phoneMatch = text.replace(/\s/g, '').match(/^\+[1-9][0-9]{7,14}$/);
  if (phoneMatch) {
    const phone = phoneMatch[0];
    const { data: client } = await db.from('clients').select('id,name,preferred_language,sun_sign,birth_date').eq('phone', phone).maybeSingle();
    if (client) {
      await db.from('clients').update({ telegram_chat_id: chatId, telegram_username: username, telegram_opt_in: true, telegram_opted_in_at: new Date().toISOString(), telegram_opted_out_at: null }).eq('id', (client as any).id);
      const lang = (client as any).preferred_language || 'en';
      const first = (client as any).name.split(' ')[0];
      let onboarding = '';
      if (!(client as any).birth_date && !(client as any).sun_sign) {
        onboarding = lang==='fr'?'\n\nTu veux une note plus perso ? Envoie ton signe (ex: Gémeaux) ou ta date de naissance. Optionnel.': lang==='tn'?'\n\nتحب نوتة شخصية أكثر؟ ابعث برجك ولا تاريخ ميلادك. اختياري.':'\n\nWant it more personal? Send your sign or birth date. Optional.';
      }
      await sendTelegramMessage(chatId, (lang==='fr'?`Lié ✨ Bienvenue ${first} ! Note quotidienne à 09:00 Tunis.`: lang==='tn'?`تم الربط ✨ مرحبا ${first} ! نوتة يومية 09:00 تونس.`:`Linked ✨ Welcome ${first}! Daily note at 09:00 Tunis.`)+onboarding, linkedKeyboard(lang));
      // also send today immediately
      const sky = computeSky();
      const { data: settings } = await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();
      const bookingUrl = (settings as any)?.booking_url || 'https://tarot-tn.vercel.app/booking.html';
      const parts = makeDailyMessage({ id: (client as any).id, name: (client as any).name, sun_sign: (client as any).sun_sign, preferred_language: lang }, sky, bookingUrl);
      const t = joinMessage(parts);
      const { dailyKeyboard } = await import('@/lib/telegram');
      await sendTelegramMessage(chatId, t, dailyKeyboard(lang, bookingUrl));
    } else {
      await sendTelegramMessage(chatId, 'Number not found in CRM. Check +216 format or ask Mazen to add you.\n🇫🇷 Numéro introuvable. Vérifiez le +216.\n🇹🇳 النومرو موش موجود. ثبّت +216...', welcomeKeyboard());
    }
    return NextResponse.json({ ok: true });
  }

  // fallback — maybe they sent sign/birth_date after linking
  const linked = await getClientByChat(chatId);
  if (linked && text.length >= 3 && text.length < 30) {
    // try to capture sign
    const SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces','حمل','ثور','جوزاء','سرطان','اسد','عذراء','ميزان','عقرب','قوس','جدي','دلو','حوت','bélier','taureau','gémeaux','lion','vierge','balance','scorpion','sagittaire','capricorne','verseau','poissons'] as const;
    const lower = text.toLowerCase();
    const signMap: Record<string,string> = { aries:'Aries', taurus:'Taurus', gemini:'Gemini', cancer:'Cancer', leo:'Leo', virgo:'Virgo', libra:'Libra', scorpio:'Scorpio', sagittarius:'Sagittarius', capricorn:'Capricorn', aquarius:'Aquarius', pisces:'Pisces', 'bélier':'Aries', 'taureau':'Taurus', 'gémeaux':'Gemini', 'vierge':'Virgo', 'balance':'Libra', 'scorpion':'Scorpio', 'sagittaire':'Sagittarius', 'capricorne':'Capricorn', 'verseau':'Aquarius', 'poissons':'Pisces', 'حمل':'Aries','ثور':'Taurus','جوزاء':'Gemini','سرطان':'Cancer','اسد':'Leo','عذراء':'Virgo','ميزان':'Libra','عقرب':'Scorpio','قوس':'Sagittarius','جدي':'Capricorn','دلو':'Aquarius','حوت':'Pisces' } as any;
    const found = (Object.keys(signMap) as string[]).find(k=> lower.includes(k));
    if (found) {
      const eng = signMap[found];
      await db.from('clients').update({ sun_sign: eng }).eq('id', linked.id);
      await sendTelegramMessage(chatId, `Saved ✨ ${eng} — tomorrow's note will be more personal. /today to see today again.`, linkedKeyboard(linked.preferred_language));
      return NextResponse.json({ ok: true });
    }
  }

  await sendTelegramMessage(chatId, 'Send /start to link, /today to replay, /lang to switch, /stop to pause. Or send +216...', linked?.preferred_language ? linkedKeyboard(linked.preferred_language) : welcomeKeyboard());
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, webhook: 'telegram' });
}
