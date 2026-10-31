export function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const username = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
  if (token.length < 20 || !username) return null;
  return { token, username };
}

type InlineButton = { text: string; callback_data?: string; url?: string };
type ReplyMarkup = { inline_keyboard: InlineButton[][] } | { keyboard: string[][]; resize_keyboard: boolean };

export async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: ReplyMarkup) {
  const cfg = telegramConfig();
  if (!cfg) throw new Error('Telegram not configured');
  const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`;
  const body: any = { chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  if (!res.ok) { const b = await res.text().catch(()=>''); throw new Error(`Telegram ${res.status}: ${b.slice(0,180)}`); }
  return res.json();
}

export async function sendTelegramPhoto(chatId: string, photoUrl: string, caption: string, replyMarkup?: ReplyMarkup) {
  const cfg = telegramConfig();
  if (!cfg) throw new Error('Telegram not configured');
  const url = `https://api.telegram.org/bot${cfg.token}/sendPhoto`;
  const body: any = { chat_id: chatId, photo: photoUrl, caption, parse_mode: 'Markdown' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  if (!res.ok) { const b = await res.text().catch(()=>''); throw new Error(`Telegram photo ${res.status}: ${b.slice(0,180)}`); }
  return res.json();
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const cfg = telegramConfig(); if (!cfg) return;
  await fetch(`https://api.telegram.org/bot${cfg.token}/answerCallbackQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  }).catch(()=>{});
}

// Keyboards
export function welcomeKeyboard(): ReplyMarkup {
  return { inline_keyboard: [[{ text: '✨ Link my daily note', callback_data: 'hint_link' }],[{ text: 'Français', callback_data: 'hint_lang' }, { text: 'عربي', callback_data: 'hint_lang' }],[{ text: 'Help / المساعدة', callback_data: 'help' }]] };
}

export function linkedKeyboard(lang: string): ReplyMarkup {
  return { inline_keyboard: [[{ text: lang==='fr'?'🔮 Ma carte du jour': lang==='tn'?'🔮 ورقتي اليوم':'🔮 Today', callback_data: 'today' }, { text: '📖 Book / Réserver', url: 'https://tarot-tn.vercel.app/booking.html' }],[{ text: '🇹🇳 TN', callback_data: 'lang_tn' }, { text: '🇫🇷 FR', callback_data: 'lang_fr' }, { text: '🇬🇧 EN', callback_data: 'lang_en' }],[{ text: lang==='fr'?'⏸️ Pause': lang==='tn'?'⏸️ وقّف':'⏸️ Pause', callback_data: 'stop' }]] };
}

export function dailyKeyboard(lang: string, bookingUrl: string): ReplyMarkup {
  const book = bookingUrl || 'https://tarot-tn.vercel.app/booking.html';
  return { inline_keyboard: [[{ text: lang==='fr'?'📖 Réserver': lang==='tn'?'📖 احجز':'📖 Book reading', url: book }],[{ text: '🇹🇳', callback_data: 'lang_tn' }, { text: '🇫🇷', callback_data: 'lang_fr' }, { text: '🇬🇧', callback_data: 'lang_en' }, { text: lang==='fr'?'⏸️ Pause': lang==='tn'?'⏸️ وقّف':'⏸️ Pause', callback_data: 'stop' }]] };
}

export function helpText(lang: string): string {
  if (lang==='fr') return `*Aide* — Tarot TN ✨\n/send *\\+216...* pour lier votre note quotidienne (09h00 Tunis)\n*/today* — revoir la note du jour\n*/lang* — choisir 🇹🇳/🇫🇷/🇬🇧\n*/stop* — pause  */resume* — reprendre\nRéservation: https://tarot-tn.vercel.app/booking.html`;
  if (lang==='tn') return `*المساعدة* — Tarot TN ✨\nابعث *\\+216...* باش تربط النوتة اليومية (09:00 تونس)\n*/today* — شوف نوتة اليوم\n*/lang* — اختار 🇹🇳/🇫🇷/🇬🇧\n*/stop* — وقّف  */resume* — كمّل`;
  return `*Help* — Tarot TN ✨\nSend *\\+216...* to link your daily note (09:00 Tunis)\n*/today* — replay today's note\n*/lang* — pick 🇹🇳/🇫🇷/🇬🇧\n*/stop* — pause  */resume* — resume\nBook: https://tarot-tn.vercel.app/booking.html`;
}
