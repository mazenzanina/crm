import { z } from 'zod';
import { isAdultBirthDate, normalizeBirthDate } from './dates';
import { SIGNS } from './types';

export function normalizePhone(raw: string): string {
  const compact = raw.trim().replace(/[\s().-]/g, '');
  const withPlus = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  return withPlus;
}

const phone = z.string().max(35).transform(normalizePhone).pipe(
  z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use an international number, e.g. +216 22 481 622.'),
);

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable().transform((value) => value || null);
const optionalEmail = z.string().trim().max(254).optional().nullable().transform((value) => value || null).pipe(z.string().email().nullable());
const optionalSign = z.enum(SIGNS).optional().nullable().transform((value) => value || null);
const optionalDate = z.string().trim().optional().nullable()
  .transform((value) => value || null)
  .refine((value) => !value || normalizeBirthDate(value) !== null, 'Use a valid birth date in DD/MM/YYYY format.')
  .transform((value) => value ? normalizeBirthDate(value) : null);
// Postgres may export a minute-precision time as HH:mm:00. Accept it on import,
// while storing newly entered and imported minute-precision values as HH:mm.
const optionalTime = z.string().trim().optional().nullable().transform((value) => value || null)
  .refine((value) => !value || /^([01]\d|2[0-3]):[0-5]\d(?::00(?:\.0+)?)?$/.test(value), 'Use a local time like 14:30.')
  .transform((value) => value?.slice(0, 5) || null);

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone,
  email: optionalEmail,
  birthDate: optionalDate,
  birthTime: optionalTime,
  sunSign: optionalSign,
  preferredLanguage: z.enum(['en', 'fr', 'tn']),
  location: optionalText(100),
  privacyConsent: z.literal(true),
  dailyConsent: z.literal(true),
  adultConsent: z.literal(true),
  website: z.string().optional().default(''), // invisible honeypot
  turnstileToken: z.string().max(2000).optional(),
}).refine((data) => {
  if (!data.birthDate) return true;
  return isAdultBirthDate(data.birthDate);
}, { message: 'This offer is for people aged 18 or older.', path: ['birthDate'] });

export const clientSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone,
  email: optionalEmail,
  location: optionalText(100),
  birth_date: optionalDate,
  birth_time: optionalTime,
  birth_place: optionalText(100),
  sun_sign: optionalSign,
  preferred_language: z.enum(['en', 'fr', 'tn']),
  status: z.enum(['lead', 'active', 'vip']),
  total_spent_tnd: z.coerce.number().finite().min(0).max(10_000_000),
  notes: z.string().trim().max(2000),
  daily_opt_in: z.boolean(),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const settingsSchema = z.object({
  booking_url: z.string().trim().url().max(400).refine((value) => {
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }, 'The booking link must start with https://'),
});

export function firstValidationError(error: z.ZodError): string {
  return error.issues[0]?.message || 'Please check your details.';
}
