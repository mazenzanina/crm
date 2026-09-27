'use client';

import { useState, type FormEvent } from 'react';
import { CalendarDays, Check, Trash2, X } from 'lucide-react';
import { SIGN_SYMBOLS, SIGNS, type Client, type ClientStatus, type Language } from '@/lib/types';
import { clientSchema, firstValidationError, type ClientInput } from '@/lib/validation';

type EditorProps = {
  initial: Client | null;
  busy: boolean;
  onClose: () => void;
  onSave: (input: ClientInput, initial: Client | null) => Promise<void>;
  onDelete: (client: Client) => Promise<void>;
};

type FormState = {
  name: string; phone: string; email: string; location: string;
  birth_date: string; birth_time: string; birth_place: string;
  sun_sign: string; preferred_language: Language; status: ClientStatus;
  total_spent_tnd: string; notes: string; daily_opt_in: boolean;
};

function initialForm(client: Client | null): FormState {
  return {
    name: client?.name || '', phone: client?.phone || '+216',
    email: client?.email || '', location: client?.location || '',
    birth_date: client?.birth_date || '', birth_time: client?.birth_time?.slice(0, 5) || '', birth_place: client?.birth_place || '',
    sun_sign: client?.sun_sign || '', preferred_language: client?.preferred_language || 'tn',
    status: client?.status || 'lead', total_spent_tnd: String(client?.total_spent_tnd || 0),
    notes: client?.notes || '', daily_opt_in: client?.daily_opt_in || false,
  };
}

export function ClientEditor({ initial, busy, onClose, onSave, onDelete }: EditorProps) {
  const [form, setForm] = useState<FormState>(() => initialForm(initial));
  const [error, setError] = useState('');
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const parsed = clientSchema.safeParse({ ...form, sun_sign: form.sun_sign || null, total_spent_tnd: Number(form.total_spent_tnd) });
    if (!parsed.success) { setError(firstValidationError(parsed.error)); return; }
    if (parsed.data.daily_opt_in && !initial?.daily_opt_in && !window.confirm('Has this person explicitly agreed to receive daily WhatsApp messages? Only continue if yes.')) return;
    try { await onSave(parsed.data, initial); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save this client.'); }
  }

  return <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <div className="editor-header"><div><p className="eyebrow">CLIENT PROFILE</p><h2 id="editor-title">{initial ? 'Edit client' : 'Add a client'}</h2></div><button className="icon-button" aria-label="Close editor" type="button" onClick={onClose}><X size={19} /></button></div>
      <form className="editor-form" onSubmit={submit}>
        <div className="editor-section-label">PERSONAL DETAILS</div>
        <div className="form-field"><label htmlFor="edit-name">Full name *</label><input id="edit-name" required value={form.name} placeholder="Client name" onChange={(event) => setField('name', event.target.value)} /></div>
        <div className="field-row"><div className="form-field"><label htmlFor="edit-phone">WhatsApp number *</label><input id="edit-phone" type="tel" required value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="+216 ..." /></div><div className="form-field"><label htmlFor="edit-email">Email</label><input id="edit-email" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} placeholder="Optional" /></div></div>
        <div className="form-field"><label htmlFor="edit-location">City / location</label><input id="edit-location" value={form.location} onChange={(event) => setField('location', event.target.value)} placeholder="Tunis, Tunisia" /></div>
        <div className="editor-section-label">ASTRO & PREFERENCES</div>
        <div className="field-row"><div className="form-field"><label htmlFor="edit-date">Birth date</label><input id="edit-date" type="date" value={form.birth_date} onChange={(event) => setField('birth_date', event.target.value)} /></div><div className="form-field"><label htmlFor="edit-sign">Sun sign</label><select id="edit-sign" value={form.sun_sign} onChange={(event) => setField('sun_sign', event.target.value)}><option value="">Not set</option>{SIGNS.map((sign) => <option key={sign} value={sign}>{SIGN_SYMBOLS[sign]} {sign}</option>)}</select></div></div>
        <div className="field-row"><div className="form-field"><label htmlFor="edit-time">Birth time</label><input id="edit-time" type="time" value={form.birth_time} onChange={(event) => setField('birth_time', event.target.value)} /></div><div className="form-field"><label htmlFor="edit-place">Birth place</label><input id="edit-place" value={form.birth_place} onChange={(event) => setField('birth_place', event.target.value)} placeholder="Optional" /></div></div>
        <div className="field-row"><div className="form-field"><label htmlFor="edit-lang">Message language</label><select id="edit-lang" value={form.preferred_language} onChange={(event) => setField('preferred_language', event.target.value as Language)}><option value="tn">تونسي / Tunisian</option><option value="fr">Français</option><option value="en">English</option></select></div><div className="form-field"><label htmlFor="edit-status">Status</label><select id="edit-status" value={form.status} onChange={(event) => setField('status', event.target.value as ClientStatus)}><option value="lead">Lead</option><option value="active">Active</option><option value="vip">VIP</option></select></div></div>
        <div className="editor-section-label">CRM NOTES</div>
        <div className="form-field"><label htmlFor="edit-spent">Total spent (TND)</label><input id="edit-spent" type="number" min={0} step="0.01" value={form.total_spent_tnd} onChange={(event) => setField('total_spent_tnd', event.target.value)} /></div>
        <div className="form-field"><label htmlFor="edit-notes">Private notes</label><textarea id="edit-notes" rows={3} value={form.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Remember anything useful for the session..." /></div>
        <label className={`optin-toggle ${form.daily_opt_in ? 'is-on' : ''}`}><input type="checkbox" checked={form.daily_opt_in} onChange={(event) => setField('daily_opt_in', event.target.checked)} /><span className="toggle-track"><span /></span><span><strong>Daily WhatsApp opt-in</strong><small>Only turn on after this client has explicitly agreed. Turn off immediately when they reply STOP.</small></span></label>
        {initial?.opted_in_at && <div className="consent-record"><CalendarDays size={14} /> Consent recorded {new Date(initial.opted_in_at).toLocaleDateString('en-GB')} · {initial.opt_in_source || 'CRM'}</div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="editor-actions"><button type="button" className="ghost-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Saving...' : 'Save client'} <Check size={16} /></button></div>
        {initial && <button type="button" className="delete-link" disabled={busy} onClick={() => void onDelete(initial)}><Trash2 size={15} /> Delete this client and their details</button>}
      </form>
    </section>
  </div>;
}
