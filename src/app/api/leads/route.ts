import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cloudReady, serviceDb } from '@/lib/server';
import { tunisDateKey } from '@/lib/sky';
import { approximateSunSign } from '@/lib/types';
import { firstValidationError, signupSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ok = () => NextResponse.json({ message: 'Thanks! Your request has been received. Look out for a WhatsApp message from Tarot TN.' });

export async function POST(request: NextRequest) {
  if (!cloudReady()) return NextResponse.json({ error: 'The signup form is not connected to the database yet.' }, { status: 503 });
  if (Number(request.headers.get('content-length') || '0') > 9_000) return NextResponse.json({ error: 'Your submission is too large.' }, { status: 413 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 }); }
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: firstValidationError(parsed.error) }, { status: 400 });
  const input = parsed.data;
  if (input.website) return ok(); // honeypot: do not create a record

  const ip = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  // A salted daily fingerprint; never write raw IPs to the database.
  const fingerprint = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(`${tunisDateKey()}:${ip}`).digest('hex');
  const db = serviceDb();
  const { data: allowed, error: rateError } = await db.rpc('claim_signup_attempt', { p_bucket: fingerprint, p_limit: 5 });
  if (rateError) {
    // The RPC can fail for several different reasons (schema cache, key, grants,
    // or a SQL error). Do not mislabel all of them as a missing SQL migration.
    // A PostgREST error code is safe to show to the owner; never log the bucket,
    // submitted contact data, API key, or raw request.
    const rawCode = String(rateError.code || '').toUpperCase();
    const code = /^[A-Z0-9_]{3,16}$/.test(rawCode) ? rawCode : 'UNKNOWN';
    const safeMessage = String(rateError.message || '')
      .replace(/\b[a-f0-9]{64}\b/gi, '[redacted fingerprint]')
      .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/gi, '[redacted key]')
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted token]')
      .slice(0, 300);
    console.error('Signup rate-limit RPC failed:', { code, message: safeMessage });
    return NextResponse.json({
      error: `Could not save your signup. Please report reference code ${code} to Tarot TN.`,
      supportCode: code,
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!allowed) return NextResponse.json({ error: 'Too many requests today. Please try again tomorrow.' }, { status: 429 });

  if (process.env.TURNSTILE_SECRET_KEY) {
    if (!input.turnstileToken) return NextResponse.json({ error: 'Please complete the security check.' }, { status: 400 });
    try {
      const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: input.turnstileToken, remoteip: ip }),
        signal: AbortSignal.timeout(7000),
      });
      const check = await result.json() as { success?: boolean };
      if (!check.success) return NextResponse.json({ error: 'Security check failed. Please try again.' }, { status: 400 });
    } catch { return NextResponse.json({ error: 'Security check is unavailable. Please try again.' }, { status: 503 }); }
  }

  const consentTime = new Date().toISOString();
  const { error } = await db.from('clients').insert({
    name: input.name, phone: input.phone, email: input.email,
    birth_date: input.birthDate,
    birth_time: input.birthTime,
    sun_sign: input.sunSign || (input.birthDate ? approximateSunSign(input.birthDate) : null),
    preferred_language: input.preferredLanguage, location: input.location,
    status: 'lead', daily_opt_in: true,
    opted_in_at: consentTime, privacy_accepted_at: consentTime, adult_confirmed_at: consentTime,
    opt_in_source: 'public free-reading form',
  });
  if (error?.code === '23505') return ok(); // Do not re-subscribe someone who previously opted out.
  if (error) {
    console.error('Lead insert failed:', error.code);
    return NextResponse.json({ error: 'Could not save your details. Please try again later.' }, { status: 503 });
  }
  return ok();
}
