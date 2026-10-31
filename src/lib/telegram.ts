export function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const username = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
  if (token.length < 20 || !username) return null;
  return { token, username };
}

type InlineButton = { text: string; callback_data?: string; url?: string };
type ReplyMarkup = { inline_keyboard: InlineButton[][] };

export async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: ReplyMarkup) {
  const cfg = telegramConfig();
  if (!cfg) throw new Error('Telegram not configured');
  const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`;
  const body: any = { chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  if (!res.ok) { const b = await res.text().catch(()=>''); const err = `Telegram ${res.status}: ${b.slice(0,180)}`; if (isBlockedError(b)) (err as any).blocked = true; throw Object.assign(new Error(err), { blocked: isBlockedError(b), body: b }); }
  return res.json();
}

export async function sendTelegramPhoto(chatId: string, photoUrl: string, caption: string, replyMarkup?: ReplyMarkup) {
  const cfg = telegramConfig();
  if (!cfg) throw new Error('Telegram not configured');
  const url = `https://api.telegram.org/bot${cfg.token}/sendPhoto`;
  const body: any = { chat_id: chatId, photo: photoUrl, caption, parse_mode: 'Markdown' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  if (!res.ok) { const b = await res.text().catch(()=>''); const err = `Telegram photo ${res.status}: ${b.slice(0,180)}`; throw Object.assign(new Error(err), { blocked: isBlockedError(b), body: b }); }
  return res.json();
}

export async function sendTelegramVoice(chatId: string, voiceUrl: string, caption?: string, replyMarkup?: ReplyMarkup) {
  const cfg = telegramConfig();
  if (!cfg) throw new Error('Telegram not configured');
  const url = `https://api.telegram.org/bot${cfg.token}/sendVoice`;
  const body: any = { chat_id: chatId, voice: voiceUrl };
  if (caption) { body.caption = caption; body.parse_mode = 'Markdown'; }
  if (replyMarkup) body.reply_markup = replyMarkup;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  if (!res.ok) { const b = await res.text().catch(()=>''); throw Object.assign(new Error(`Telegram voice ${res.status}: ${b.slice(0,180)}`), { blocked: isBlockedError(b), body: b }); }
  return res.json();
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const cfg = telegramConfig(); if (!cfg) return;
  await fetch(`https://api.telegram.org/bot${cfg.token}/answerCallbackQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  }).catch(()=>{});
}

export function isBlockedError(body: string): boolean {
  return /blocked|deactivated|kicked|chat not found|user is deactivated|bot was blocked/i.test(body);
}

export function isAdmin(chatId: string, username: string | null): boolean {
  const adminIds = (process.env.TELEGRAM_ADMIN_IDS || process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s=>s.trim()).filter(Boolean);
  const adminUsers = (process.env.TELEGRAM_ADMIN_USERNAMES || '').split(',').map(s=>s.trim().replace(/^@/,'')).filter(Boolean);
  if (adminIds.includes(chatId)) return true;
  if (username && adminUsers.includes(username)) return true;
  // also allow CRM owner email's chat if set
  return false;
}

// Keyboards
export function welcomeKeyboard(): ReplyMarkup {
  return { inline_keyboard: [[{ text: '✨ Link my daily note', callback_data: 'hint_link' }],[{ text: 'Help', callback_data: 'help' }]] };
}

export function linkedKeyboard(): ReplyMarkup {
  return { inline_keyboard: [[{ text: '🔮 Today', callback_data: 'today' }, { text: '📖 Book reading', url: 'https://tarot-tn.vercel.app/booking.html' }],[{ text: '⏸️ Pause', callback_data: 'stop' }]] };
}

export function dailyKeyboard(bookingUrl: string, clientId?: string): ReplyMarkup {
  // backwards compat: if first arg looks like lang (en/fr/tn) and second is url, swap
  let book = bookingUrl;
  let cid = clientId;
  if (bookingUrl === 'en' || bookingUrl === 'fr' || bookingUrl === 'tn') {
    book = clientId || 'https://tarot-tn.vercel.app/booking.html';
    cid = undefined;
  }
  book = book || 'https://tarot-tn.vercel.app/booking.html';
  const bot = (process.env.TELEGRAM_BOT_USERNAME || 'tarot_tn_bot').replace(/^@/,'');
  const shareUrl = `https://t.me/${bot}?start=ref_${cid || 'share'}`;
  return { inline_keyboard: [
    [{ text: '📖 Book reading', url: book }],
    [{ text: '👍', callback_data: 'fb_up' }, { text: '👎', callback_data: 'fb_down' }, { text: '🎙️ Voice', callback_data: 'voice' }],
    [{ text: '🔮 Today', callback_data: 'today' }, { text: '📅 Missed', callback_data: 'missed' }, { text: '⏸️ Pause', callback_data: 'stop' }]
  ] };
}

export function helpText(): string {
  return `*Help* — Tarot TN ✨\nSend *\\+216...* to link your daily note (09:00 Tunis)\n*/today* — replay today's note\n*/missed* — last 3 days\n*/stop* — pause  */resume* — resume\nBook: https://tarot-tn.vercel.app/booking.html`;
}

export function shareText(botUsername: string): string {
  const bot = botUsername.replace(/^@/, '');
  return `Share your daily sky ✨\nhttps://t.me/${bot}?start=share\nYour friend taps → /start → +216... → gets their own note.`;
}
