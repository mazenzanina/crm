import { DEFAULT_BOOKING_URL, type AppSettings, type Client } from './types';
import { normalizePhone, clientSchema, type ClientInput } from './validation';
import { approximateSunSign } from './types';

const CLIENTS_KEY = 'mazen_cosmic_crm_demo_clients_v1';
const SETTINGS_KEY = 'mazen_cosmic_crm_demo_settings_v1';
const iso = '2026-09-20T10:00:00.000Z';

const initialClients: Client[] = [
  { id: 'demo-amal', name: 'Amal (demo)', phone: '+21600000001', email: 'amal@example.com', location: 'Tunis, Tunisia', birth_date: '1996-06-21', birth_time: null, birth_place: null, sun_sign: 'Gemini', preferred_language: 'tn', status: 'vip', total_spent_tnd: 0, notes: 'Illustrative contact only. Replace this number before sending.', daily_opt_in: true, opted_in_at: iso, opted_out_at: null, opt_in_source: 'illustrative demo record', privacy_accepted_at: null, adult_confirmed_at: null, last_sent_on: null, last_sent_at: null, created_at: iso, updated_at: iso },
  { id: 'demo-karim', name: 'Karim (demo)', phone: '+21600000002', email: null, location: 'Sousse, Tunisia', birth_date: null, birth_time: null, birth_place: null, sun_sign: 'Aries', preferred_language: 'fr', status: 'active', total_spent_tnd: 0, notes: 'Illustrative contact only. Replace this number before sending.', daily_opt_in: true, opted_in_at: iso, opted_out_at: null, opt_in_source: 'illustrative demo record', privacy_accepted_at: null, adult_confirmed_at: null, last_sent_on: null, last_sent_at: null, created_at: iso, updated_at: iso },
  { id: 'demo-yasmine', name: 'Yasmine (demo)', phone: '+21600000003', email: null, location: 'La Marsa, Tunisia', birth_date: null, birth_time: null, birth_place: null, sun_sign: 'Pisces', preferred_language: 'en', status: 'lead', total_spent_tnd: 0, notes: 'Illustrative contact, not opted in.', daily_opt_in: false, opted_in_at: null, opted_out_at: null, opt_in_source: null, privacy_accepted_at: null, adult_confirmed_at: null, last_sent_on: null, last_sent_at: null, created_at: iso, updated_at: iso },
];

export function getDemoClients(): Client[] {
  try {
    const saved = localStorage.getItem(CLIENTS_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed as Client[];
    }
  } catch { /* recover from corrupt local data */ }
  setDemoClients(initialClients);
  return initialClients;
}

export function setDemoClients(clients: Client[]): void {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  window.dispatchEvent(new Event('demo-clients-changed'));
}

export function getDemoSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return JSON.parse(saved) as AppSettings;
  } catch { /* fall back */ }
  return { booking_url: DEFAULT_BOOKING_URL };
}

export function setDemoSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function upsertDemoClient(input: ClientInput, existing?: Client): Client {
  const now = new Date().toISOString();
  const current = getDemoClients();
  const other = current.find((c) => c.phone === input.phone && c.id !== existing?.id);
  if (other) throw new Error('This WhatsApp number is already in your CRM.');
  const optingIn = input.daily_opt_in && !existing?.daily_opt_in;
  const optingOut = !input.daily_opt_in && Boolean(existing?.daily_opt_in);
  const next: Client = {
    ...input,
    id: existing?.id || crypto.randomUUID(),
    opted_in_at: optingIn ? now : existing?.opted_in_at || null,
    opted_out_at: optingOut ? now : existing?.opted_out_at || null,
    opt_in_source: optingIn ? 'admin confirmed prior opt-in (demo)' : existing?.opt_in_source || null,
    privacy_accepted_at: existing?.privacy_accepted_at || null, adult_confirmed_at: existing?.adult_confirmed_at || null,
    last_sent_on: existing?.last_sent_on || null,
    last_sent_at: existing?.last_sent_at || null,
    created_at: existing?.created_at || now,
    updated_at: now,
  };
  setDemoClients(existing ? current.map((c) => c.id === existing.id ? next : c) : [next, ...current]);
  return next;
}

export function addDemoLead(input: { name: string; phone: string; email: string | null; birthDate: string | null; sunSign: Client['sun_sign']; preferredLanguage: Client['preferred_language']; location: string | null }): void {
  const current = getDemoClients();
  const phone = normalizePhone(input.phone);
  if (current.some((c) => c.phone === phone)) return;
  const now = new Date().toISOString();
  const newLead: Client = {
    id: crypto.randomUUID(), name: input.name, phone, email: input.email, location: input.location,
    birth_date: input.birthDate, birth_time: null, birth_place: null,
    sun_sign: input.sunSign || (input.birthDate ? approximateSunSign(input.birthDate) : null),
    preferred_language: input.preferredLanguage, status: 'lead', total_spent_tnd: 0, notes: '',
    daily_opt_in: true, opted_in_at: now, opted_out_at: null, opt_in_source: 'public form (same-device preview only)',
    privacy_accepted_at: now, adult_confirmed_at: now,
    last_sent_on: null, last_sent_at: null, created_at: now, updated_at: now,
  };
  setDemoClients([newLead, ...current]);
}

export function markDemoSent(id: string, dateKey: string): Client {
  const current = getDemoClients();
  const client = current.find((c) => c.id === id);
  if (!client || !client.daily_opt_in || client.last_sent_on === dateKey) throw new Error('Already marked today or not opted in.');
  const updated: Client = { ...client, last_sent_on: dateKey, last_sent_at: new Date().toISOString() };
  setDemoClients(current.map((c) => c.id === id ? updated : c));
  return updated;
}

export function importDemo(raw: unknown[]): { imported: number; skipped: number } {
  const current = getDemoClients();
  const rows: Client[] = [];
  const seen = new Set(current.map((c) => c.phone));
  for (const original of raw.slice(0, 500)) {
    if (!original || typeof original !== 'object' || Array.isArray(original)) continue;
    const row = original as Record<string, unknown>;
    const birth = row.birth_date || row.birthDate || null;
    const parsed = clientSchema.safeParse({
      name: row.name, phone: row.phone, email: row.email || null, location: row.location || null,
      birth_date: birth, birth_time: row.birth_time || row.birthTime || null,
      birth_place: row.birth_place || row.birthPlace || null,
      sun_sign: row.sun_sign || row.sunSign || (typeof birth === 'string' ? approximateSunSign(birth) : null),
      preferred_language: row.preferred_language || row.preferredLanguage || 'en',
      status: String(row.status || 'lead').toLowerCase(),
      total_spent_tnd: row.total_spent_tnd ?? row.totalSpentTND ?? 0,
      notes: row.notes || '', daily_opt_in: false,
    });
    if (!parsed.success || seen.has(parsed.data.phone)) continue;
    seen.add(parsed.data.phone);
    const now = new Date().toISOString();
    rows.push({ ...parsed.data, id: crypto.randomUUID(), opted_in_at: null, opted_out_at: null, opt_in_source: null, privacy_accepted_at: null, adult_confirmed_at: null, last_sent_on: null, last_sent_at: null, created_at: now, updated_at: now } as Client);
  }
  setDemoClients([...rows, ...current]);
  return { imported: rows.length, skipped: raw.length - rows.length };
}
