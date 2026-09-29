'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { BRAND_LOGO_SRC } from '@/lib/brandLogo';
import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { authClient } from '@/lib/browser';

type Step = 'checking' | 'request' | 'sent' | 'change' | 'done';

/** Remove one-time tokens (and recovery error details) from the browser address bar. */
function clearRecoveryUrl() {
  window.history.replaceState(window.history.state, '', window.location.pathname);
}

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Supabase's default (implicit) flow returns #access_token=...&type=recovery.
    // Also recognize ?code=... in case the project's Auth flow is switched to PKCE.
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const linkError = query.has('error') || fragment.has('error');
    const recoveryLink = fragment.get('type') === 'recovery' || query.get('type') === 'recovery' || query.has('code');

    if (linkError) {
      clearRecoveryUrl();
      setError('This reset link is invalid or has expired. Request a new email below.');
      setStep('request');
      return;
    }
    if (!recoveryLink) {
      setStep('request');
      return;
    }

    let active = true;
    try {
      const { data: { subscription } } = authClient().auth.onAuthStateChange((event, session) => {
        if (!active) return;
        // Supabase exchanges the email link for a short-lived signed-in session.
        // INITIAL_SESSION also covers the case where URL processing preceded subscription.
        if (event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            clearRecoveryUrl();
            setStep('change');
          } else if (event === 'INITIAL_SESSION') {
            clearRecoveryUrl();
            setError('This reset link could not be verified. Request a new email below.');
            setStep('request');
          }
        }
      });
      return () => { active = false; subscription.unsubscribe(); };
    } catch {
      clearRecoveryUrl();
      setError('Password recovery is not configured on this deployment.');
      setStep('request');
    }
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setBusy(true);
    try {
      // The exact production URL must be in Supabase Auth → URL Configuration → Redirect URLs.
      const { error: requestError } = await authClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (requestError) throw requestError;
      // Supabase intentionally does not say whether an email address has an account.
      setStep('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request a reset email. Try again.');
    } finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password.length < 12) { setError('Choose a password of at least 12 characters.'); return; }
    if (password !== confirmation) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      const { error: updateError } = await authClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(''); setConfirmation('');
      clearRecoveryUrl();
      setStep('done');
      // Revoke existing sessions after a forgotten-password reset where possible.
      try { await authClient().auth.signOut({ scope: 'global' }); }
      catch { /* Password was saved; do not falsely report a failed reset if logout fails. */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set the new password. Request a fresh link and try again.');
    } finally { setBusy(false); }
  }

  const heading = step === 'change' ? 'Choose a new password' : step === 'done' ? 'Password updated' : 'Reset your password';

  return <main className="auth-page"><section className="auth-card" aria-label="Password recovery">
    <div className="auth-logo"><Image src={BRAND_LOGO_SRC} unoptimized alt="" width={54} height={54} /></div>
    <span className="eyebrow">TAROT TN · PRIVATE PORTAL</span>
    <h1>{heading}</h1>
    {step === 'checking' && <p>Checking your password-reset link…</p>}
    {step === 'request' && <>
      <p>Enter your admin email. We’ll email a one-time link to set a new password.</p>
      <form onSubmit={requestReset} className="auth-form">
        <div className="form-field"><label htmlFor="recovery-email">Admin email</label>
          <input id="recovery-email" type="email" autoComplete="email" value={email} required onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email me a reset link'} <ArrowRight size={18} /></button>
      </form>
    </>}
    {step === 'sent' && <p>If an account exists for that email, a new reset link is on its way. Open the <strong>newest</strong> email in the same browser. Do not share the link; it contains a one-time token.</p>}
    {step === 'change' && <>
      <p>Your recovery link was accepted. Enter a new password for your account.</p>
      <form onSubmit={changePassword} className="auth-form">
        <div className="form-field"><label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" /></div>
        <div className="form-field"><label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'} <ArrowRight size={18} /></button>
      </form>
    </>}
    {step === 'done' && <p>Your password has been updated. Return to the CRM and sign in with the new password. If it still says “Load failed,” tell me the full new error message; that is a separate connection issue.</p>}
    <div className="auth-bottom"><LockKeyhole size={15} /> <Link className="auth-recovery-link" href="/">Back to CRM sign-in</Link></div>
  </section></main>;
}
