'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { BRAND_LOGO_SRC } from '@/lib/brandLogo';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, LockKeyhole, Moon, Sparkles } from 'lucide-react';
import { MoonDisc } from './MoonDisc';
import { addDemoLead } from '@/lib/demo';
import { useSky } from '@/lib/useSky';
import { SIGN_SYMBOLS, SIGNS, HOME_URL, type Language } from '@/lib/types';
import { firstValidationError, signupSchema } from '@/lib/validation';
import { isoToDMY, normalizeBirthDate } from '@/lib/dates';

type SignupProps = { configured: boolean; demo: boolean; turnstileSiteKey: string };

const blank = { name: '', phone: '+216', email: '', birthDate: '', birthTime: '', sunSign: '', location: '', preferredLanguage: 'tn' as Language,
  privacyConsent: false, dailyConsent: false, adultConsent: false, website: '' };

export function Signup({ configured, demo, turnstileSiteKey }: SignupProps) {
  const [form, setForm] = useState(blank);
  const [token, setToken] = useState('');
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { sky, error: skyError } = useSky();
  const moon = sky?.planets.find((p) => p.name === 'Moon');
  const sun = sky?.planets.find((p) => p.name === 'Sun');

  useEffect(() => {
    if (!turnstileSiteKey) return;
    const browser = window as typeof window & { onTurnstileSuccess?: (value: string) => void };
    browser.onTurnstileSuccess = setToken;
    return () => { delete browser.onTurnstileSuccess; };
  }, [turnstileSiteKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!configured && !demo) { setError('This form needs database setup before it can accept signups.'); return; }
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

  return <div className="offer-page">
    <div className="offer-glow offer-glow-one" /><div className="offer-glow offer-glow-two" />
    <header className="offer-nav">
      <a className="brand" href={HOME_URL} target="_blank" rel="noreferrer">
        <span className="brand-mark"><Image src={BRAND_LOGO_SRC} unoptimized width={36} height={36} alt="" /></span>
        <span className="brand-text"><strong>TAROT TN</strong><small>TAROT & ASTRO · TUNISIA</small></span>
      </a>
      <a className="offer-nav-link" href={HOME_URL} target="_blank" rel="noreferrer">Explore the website <ArrowUpRight size={15} /></a>
    </header>

    <main className="offer-grid">
      <div className="offer-story">
        <div className="mini-badge"><span className="badge-dot" /> A FREE LITTLE RITUAL FOR YOUR DAY</div>
        <h1>A note from<br />the <em>sky</em>,<br />just for you<span className="gold-dot">.</span></h1>
        <p className="offer-lede">A fresh moment with the sky every day. Receive a thoughtful tarot-and-astro reflection, with a symbolic digital card and real sky context, personally reviewed by the Tarot TN admin before sending on WhatsApp.</p>
        <div className="offer-benefits">
          <span><Check size={16} /> Today’s real Moon phase & planet positions</span>
          <span><Check size={16} /> A symbolic digital card &amp; reflective number</span>
          <span><Check size={16} /> Free, opt-in, and easy to stop</span>
        </div>
        <div className="offer-sky-card">
          <div className="offer-moon"><MoonDisc sky={sky} size={53} /></div>
          <div>
            <div className="tiny-caption">TODAY’S SKY AT NOON · TUNIS</div>
            <strong>{sky ? `${sky.moon.phase} · ${sky.moon.illumination}% illuminated` : 'Reading the sky...'}</strong>
            <p>{sky ? `Moon in ${moon?.sign} ${moon ? SIGN_SYMBOLS[moon.sign] : ''}  ·  Sun in ${sun?.sign} ${sun ? SIGN_SYMBOLS[sun.sign] : ''}` : skyError || 'Today’s positions update automatically.'}</p>
          </div>
          <Sparkles className="offer-sky-star" size={18} />
        </div>
        <div className="offer-quote">“A quiet moment with the cosmos, delivered personally.”<small> — TAROT TN</small></div>
      </div>

      <div className="offer-form-card">
        {done ? <div className="offer-success">
          <div className="success-icon"><CheckCircle2 size={34} /></div>
          <p className="eyebrow">YOU’RE ON THE LIST</p>
          <h2>Welcome to your<br /><em>daily sky.</em></h2>
          <p>{demo ? 'Preview only: this signup was saved in this browser, not to a shared cloud database.' : 'Your request was received. Tarot TN reviews each note and sends it personally on WhatsApp.'}</p>
          <a className="primary-btn" href={HOME_URL} target="_blank" rel="noreferrer">Explore Tarot TN <ArrowUpRight size={17} /></a>
          <button type="button" className="text-link" onClick={() => { setDone(false); setForm(blank); }}>Add another person</button>
        </div> : <>
          <div className="form-topline"><span>✦ FREE DAILY TAROT &amp; ASTRO NOTE</span><span>01 / 01</span></div>
          <div className="form-head-icon"><Moon size={22} /></div>
          <h2>Your cosmic note<br /><em>starts here.</em></h2>
          <p className="form-description">Tell us a little about yourself. We’ll use your details only for your opted-in WhatsApp sky note.</p>
          {demo && <div className="demo-inline"><Sparkles size={16} /> Local preview — signups here stay in this browser only.</div>}
          {!demo && !configured && <div className="alert-box">The signup database is not configured yet. Complete the setup in the project README before sharing this page.</div>}
          <form onSubmit={submit} className="offer-form">
            <div className="form-field"><label htmlFor="offer-name">Your name <b>*</b></label><input id="offer-name" required maxLength={80} value={form.name} placeholder="How should I greet you?" onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="form-field"><label htmlFor="offer-phone">WhatsApp number <b>*</b></label><input id="offer-phone" required type="tel" inputMode="tel" maxLength={35} value={form.phone} placeholder="+216 22 481 622" onChange={(event) => setForm({ ...form, phone: event.target.value })} /><small>Include your country code, like +216.</small></div>
            <div className="field-row"><div className="form-field"><label htmlFor="offer-birth">Birth date (DD/MM/YYYY) <span>optional</span></label><input id="offer-birth" type="text" inputMode="numeric" autoComplete="bday" maxLength={10} placeholder="25/09/1995" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} onBlur={() => { const iso = normalizeBirthDate(form.birthDate); if (iso) setForm((current) => ({ ...current, birthDate: isoToDMY(iso) })); }} /></div>
              <div className="form-field"><label htmlFor="offer-birth-time">Birth time <span>optional</span></label><input id="offer-birth-time" type="time" value={form.birthTime} onChange={(event) => setForm({ ...form, birthTime: event.target.value })} /><small>Local time, if known (24-hour HH:MM).</small></div></div>
            <div className="form-field"><label htmlFor="offer-sign">Sun sign <span>optional</span></label><select id="offer-sign" value={form.sunSign} onChange={(event) => setForm({ ...form, sunSign: event.target.value })}><option value="">Choose your sign</option>{SIGNS.map((sign) => <option key={sign} value={sign}>{SIGN_SYMBOLS[sign]} {sign}</option>)}</select></div>
            <div className="form-hint">Birth details are optional. Pick your sign if you know it; a date-only estimate can be off near a cusp. Daily notes are not a personal birth chart.</div>
            <div className="field-row"><div className="form-field"><label htmlFor="offer-lang">Preferred language</label><select id="offer-lang" value={form.preferredLanguage} onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value as Language })}><option value="tn">تونسي / Tunisian</option><option value="fr">Français</option><option value="en">English</option></select></div>
              <div className="form-field"><label htmlFor="offer-location">Your city <span>optional</span></label><input id="offer-location" maxLength={100} value={form.location} placeholder="e.g. Tunis" onChange={(event) => setForm({ ...form, location: event.target.value })} /></div></div>
            <div className="form-field"><label htmlFor="offer-email">Email <span>optional</span></label><input id="offer-email" type="email" maxLength={254} value={form.email} placeholder="hello@example.com" onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div className="hidden-trap" aria-hidden="true"><label htmlFor="offer-website">Website</label><input id="offer-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></div>
            <div className="offer-consents">
              <label className="consent"><input type="checkbox" checked={form.dailyConsent} onChange={(event) => setForm({ ...form, dailyConsent: event.target.checked })} /><span>I want free daily sky notes on WhatsApp. I can reply STOP anytime. <b>*</b></span></label>
              <label className="consent"><input type="checkbox" checked={form.privacyConsent} onChange={(event) => setForm({ ...form, privacyConsent: event.target.checked })} /><span>I agree to the <Link href="/privacy" target="_blank">privacy information</Link> and storage of my details for this offer. <b>*</b></span></label>
              <label className="consent"><input type="checkbox" checked={form.adultConsent} onChange={(event) => setForm({ ...form, adultConsent: event.target.checked })} /><span>I am at least 18 years old. <b>*</b></span></label>
            </div>
            {turnstileSiteKey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /><div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="onTurnstileSuccess" /></>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-btn form-submit" type="submit" disabled={working || (!demo && !configured)}>{working ? 'Saving your place...' : 'Get my free daily note'} <ArrowRight size={18} /></button>
            <div className="form-safe"><LockKeyhole size={13} /> Your information stays private. No automatic messages.</div>
          </form>
        </>}
      </div>
    </main>
    <footer className="offer-footer"><span>© Tarot TN · Made with intention ✦</span><span><Link href="/privacy">Privacy</Link><a href={HOME_URL} target="_blank" rel="noreferrer">Website ↗</a></span></footer>
  </div>;
}
