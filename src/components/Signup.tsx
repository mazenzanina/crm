'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { BRAND_LOGO_SRC } from '@/lib/brandLogo';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, CalendarDays, CheckCircle2, LockKeyhole, Moon } from 'lucide-react';
import { addDemoLead } from '@/lib/demo';
import { SIGN_SYMBOLS, SIGNS, HOME_URL, type Language } from '@/lib/types';
import { firstValidationError, signupSchema } from '@/lib/validation';
import { isoToDMY, normalizeBirthDate, tunisTodayISO } from '@/lib/dates';

type SignupProps = { configured: boolean; demo: boolean; turnstileSiteKey: string };

const blank = { name: '', phone: '+216', email: '', birthDate: '', birthTime: '', sunSign: '', location: '', preferredLanguage: 'tn' as Language,
  privacyConsent: false, dailyConsent: false, adultConsent: false, website: '' };

export function Signup({ configured, demo, turnstileSiteKey }: SignupProps) {
  const [form, setForm] = useState(blank);
  const [token, setToken] = useState('');
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (requested === 'tn' || requested === 'fr' || requested === 'en') {
      setForm((current) => ({ ...current, preferredLanguage: requested }));
    }
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    const browser = window as typeof window & { onTurnstileSuccess?: (value: string) => void };
    browser.onTurnstileSuccess = setToken;
    return () => { delete browser.onTurnstileSuccess; };
  }, [turnstileSiteKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!configured && !demo) { setError('Signup is temporarily unavailable. Please try again later.'); return; }
    const parsed = signupSchema.safeParse({ ...form, turnstileToken: token });
    if (!parsed.success) { setError(firstValidationError(parsed.error)); return; }
    if (turnstileSiteKey && !token) { setError('Please complete the security check.'); return; }
    setWorking(true);
    try {
      if (demo) {
        addDemoLead(parsed.data);
      } else {
        const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Could not submit the form.');
      }
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.'); }
    finally { setWorking(false); }
  }

  return <div className="offer-page offer-page-compact">
    <header className="offer-nav">
      <a className="brand" href={HOME_URL} aria-label="Back to Tarot TN">
        <span className="brand-mark"><Image src={BRAND_LOGO_SRC} unoptimized width={36} height={36} alt="" /></span>
        <span className="brand-text"><strong>TAROT TN</strong><small>TAROT & ASTRO · TUNISIA</small></span>
      </a>
      <a className="offer-nav-link" href={HOME_URL}>← Back to website</a>
    </header>

    <main className="signup-main">
      <section className="offer-form-card" aria-labelledby="signup-title">
        {done ? <div className="offer-success">
          <div className="success-icon"><CheckCircle2 size={30} /></div>
          <p className="eyebrow">YOU’RE ON THE LIST</p>
          <h1 id="signup-title">Your daily note<br /><em>is on its way.</em></h1>
          <p>{demo ? 'Preview only — this was not saved to the shared database.' : 'Request received. Your note will be sent personally on WhatsApp.'}</p>
          <a className="primary-btn" href={HOME_URL}>Back to Tarot TN <ArrowRight size={17} /></a>
          <button type="button" className="text-link" onClick={() => { setDone(false); setForm({ ...blank, preferredLanguage: form.preferredLanguage }); }}>Add another person</button>
        </div> : <>
          <div className="form-topline"><span>✦ FREE DAILY NOTE</span><span>18+</span></div>
          <div className="form-head-icon"><Moon size={20} /></div>
          <h1 id="signup-title">Your cosmic note<br /><em>starts here.</em></h1>
          <p className="form-description">A short daily note, sent personally on WhatsApp.</p>
          {demo && <div className="demo-inline">Preview only — signups stay in this browser.</div>}
          {!demo && !configured && <div className="alert-box">Signup is not available right now.</div>}
          <form onSubmit={submit} className="offer-form">
            <div className="form-field"><label htmlFor="offer-name">Name <b>*</b></label><input id="offer-name" required maxLength={80} value={form.name} autoComplete="name" placeholder="Your name" onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="form-field"><label htmlFor="offer-phone">WhatsApp number <b>*</b></label><input id="offer-phone" required type="tel" inputMode="tel" maxLength={35} value={form.phone} autoComplete="tel" placeholder="+216 22 481 622" onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
            <div className="field-row"><div className="form-field"><label htmlFor="offer-birth">Birth date <span>optional · DD/MM/YYYY</span></label><input id="offer-birth" type="text" inputMode="numeric" autoComplete="bday" maxLength={10} placeholder="25/09/1995" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} onBlur={() => { const iso = normalizeBirthDate(form.birthDate); if (iso) setForm((current) => ({ ...current, birthDate: isoToDMY(iso) })); }} /><div className="birth-picker-row"><label className="birth-picker-trigger" htmlFor="offer-birth-picker"><CalendarDays size={15} aria-hidden="true" /><span>Choose date</span></label><input className="birth-picker-native" id="offer-birth-picker" type="date" aria-label="Choose birth date from calendar" autoComplete="off" min="1900-01-01" max={tunisTodayISO()} value={normalizeBirthDate(form.birthDate) || ''} onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value ? isoToDMY(event.target.value) : '' }))} /></div></div>
              <div className="form-field"><label htmlFor="offer-birth-time">Birth time <span>optional</span></label><input id="offer-birth-time" type="time" value={form.birthTime} onChange={(event) => setForm({ ...form, birthTime: event.target.value })} /></div></div>
            <div className="field-row"><div className="form-field"><label htmlFor="offer-lang">Message language</label><select id="offer-lang" value={form.preferredLanguage} onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value as Language })}><option value="tn">تونسي / Tunisian</option><option value="fr">Français</option><option value="en">English</option></select></div>
              <div className="form-field"><label htmlFor="offer-sign">Sun sign <span>optional</span></label><select id="offer-sign" value={form.sunSign} onChange={(event) => setForm({ ...form, sunSign: event.target.value })}><option value="">Choose your sign</option>{SIGNS.map((sign) => <option key={sign} value={sign}>{SIGN_SYMBOLS[sign]} {sign}</option>)}</select></div></div>
            <details className="optional-fields"><summary>More details (optional)</summary><div className="field-row"><div className="form-field"><label htmlFor="offer-location">City</label><input id="offer-location" maxLength={100} value={form.location} placeholder="Tunis" onChange={(event) => setForm({ ...form, location: event.target.value })} /></div><div className="form-field"><label htmlFor="offer-email">Email</label><input id="offer-email" type="email" maxLength={254} value={form.email} placeholder="you@example.com" onChange={(event) => setForm({ ...form, email: event.target.value })} /></div></div></details>
            <div className="hidden-trap" aria-hidden="true"><label htmlFor="offer-website">Website</label><input id="offer-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></div>
            <div className="offer-consents">
              <label className="consent"><input type="checkbox" checked={form.dailyConsent} onChange={(event) => setForm({ ...form, dailyConsent: event.target.checked })} /><span>Send me free daily notes on WhatsApp. Reply STOP anytime. <b>*</b></span></label>
              <label className="consent"><input type="checkbox" checked={form.privacyConsent} onChange={(event) => setForm({ ...form, privacyConsent: event.target.checked })} /><span>I agree to the <Link href="/privacy" target="_blank">privacy notice</Link> and storage of my details. <b>*</b></span></label>
              <label className="consent"><input type="checkbox" checked={form.adultConsent} onChange={(event) => setForm({ ...form, adultConsent: event.target.checked })} /><span>I am 18 or older. <b>*</b></span></label>
            </div>
            {turnstileSiteKey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /><div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="onTurnstileSuccess" /></>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-btn form-submit" type="submit" disabled={working || (!demo && !configured)}>{working ? 'Submitting…' : 'Get my free note'} <ArrowRight size={17} /></button>
            <div className="form-safe"><LockKeyhole size={13} /> Sent personally. Not automatic.</div>
          </form>
        </>}
      </section>
    </main>
    <footer className="offer-footer"><span>© Tarot TN · 18+</span><span><Link href="/privacy">Privacy</Link><a href={HOME_URL}>Website</a></span></footer>
  </div>;
}
