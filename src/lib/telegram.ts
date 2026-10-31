export function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const username = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
  if (token.length < 20 || !username) return null;
  return { token, username };
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const cfg = telegramConfig();
  if (!cfg) throw new Error('Telegram not configured');
  const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Telegram ${res.status}: ${body.slice(0,120)}`);
  }
}
