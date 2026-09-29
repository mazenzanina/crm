/** Date-only helpers: display DD/MM/YYYY; keep ISO YYYY-MM-DD in the API/database. */

export function tunisTodayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isoToDMY(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/** Accept a human-entered DD/MM/YYYY or an existing ISO backup/API value. */
export function normalizeBirthDate(value: string, now: Date = new Date()): string | null {
  const text = value.trim();
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const iso = dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  if (iso < '1900-01-01' || iso > tunisTodayISO(now)) return null;
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

export function isAdultBirthDate(iso: string, now: Date = new Date()): boolean {
  const cutoff = new Date(`${tunisTodayISO(now)}T12:00:00Z`);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
  return iso <= cutoff.toISOString().slice(0, 10);
}
