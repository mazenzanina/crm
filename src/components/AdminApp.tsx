'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronDown, CircleHelp,
  Clipboard, Cloud, Copy, ExternalLink, FileUp, Filter, Globe2, HeartHandshake, LayoutDashboard,
  LockKeyhole, LogOut, MessageCircle, Moon, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Send,
  Settings2, ShieldCheck, Sparkles, Sun, Users, WandSparkles, X,
} from 'lucide-react';
import { ClientEditor } from './ClientEditor';
import { MoonDisc } from './MoonDisc';
import { adminApi, authClient } from '@/lib/browser';
import { getDemoClients, getDemoSettings, importDemo, markDemoSent, setDemoClients, setDemoSettings, upsertDemoClient } from '@/lib/demo';
import { joinMessage, makeDailyMessage, whatsappLink, type MessageParts } from '@/lib/messages';
import { useSky } from '@/lib/useSky';
import {
  BOOKING_PAGE_URL, DEFAULT_BOOKING_URL, HOME_URL, SIGN_SYMBOLS,
  type AppSettings, type Client, type PlanetPosition, type SkySnapshot,
} from '@/lib/types';
import { settingsSchema, type ClientInput } from '@/lib/validation';

type Tab = 'overview' | 'clients' | 'dispatch' | 'settings';
type AuthState = 'loading' | 'setup' | 'signedOut' | 'ready';
const tabInfo: { id: Tab; name: string; detail: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', name: 'Overview', detail: 'The day at a glance', icon: LayoutDashboard },
  { id: 'clients', name: 'Clients', detail: 'People & consent', icon: Users },
  { id: 'dispatch', name: 'Daily messages', detail: 'Review & send', icon: Send },
  { id: 'settings', name: 'Settings', detail: 'Links & data', icon: Settings2 },
];
const languageLabel = { en: 'English', fr: 'Français', tn: 'تونسي' } as const;

function todayMessage(sky: SkySnapshot | null) {
  if (!sky) return 'Loading today’s positions...';
  const moon = sky.planets.find((p) => p.name === 'Moon');
  return `The ${sky.moon.phase.toLowerCase()} is in ${moon?.sign}. A new day, a new note.`;
}

function PlanetTile({ planet }: { planet: PlanetPosition }) {
  return <div className="planet-tile">
    <span className="planet-glyph">{planet.symbol}</span>
    <span className="planet-info"><strong>{planet.name}</strong><small>{SIGN_SYMBOLS[planet.sign]} {planet.sign}{planet.illuminatedPercent !== null && ['Moon', 'Mercury', 'Venus', 'Mars'].includes(planet.name) ? ` · ${Math.round(planet.illuminatedPercent)}% lit` : ''}</small></span>
    <span className="planet-degree">{planet.degree}°{String(planet.minute).padStart(2, '0')}′{planet.retrograde && <i title="Retrograde"> Rx</i>}</span>
  </div>;
}

function ClientAvatar({ client }: { client: Client }) {
  return <span className={`client-avatar avatar-${client.status}`} aria-hidden="true">{client.name.replace(/\(demo\)/i, '').trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>;
}

export function AdminApp({ configured, demo }: { configured: boolean; demo: boolean }) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ booking_url: DEFAULT_BOOKING_URL });
  const [settingDraft, setSettingDraft] = useState(DEFAULT_BOOKING_URL);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'lead' | 'active' | 'vip' | 'optedIn'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, MessageParts>>({});
  const [editor, setEditor] = useState<Client | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [offerUrl, setOfferUrl] = useState('/free-reading');
  const importInput = useRef<HTMLInputElement>(null);
  const { sky, error: skyError } = useSky();

  const alert = useCallback((message: string) => setNotice(message), []);
  useEffect(() => {
    setOfferUrl(`${window.location.origin}/free-reading`);
    if (demo) { setAuthState('ready'); return; }
    if (!configured) { setAuthState('setup'); return; }
    let alive = true;
    authClient().auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      if (!data.session) { setAuthState('signedOut'); return; }
      try { await adminApi('me'); if (alive) setAuthState('ready'); }
      catch { await authClient().auth.signOut(); if (alive) setAuthState('signedOut'); }
    }).catch(() => { if (alive) setAuthState('signedOut'); });
    return () => { alive = false; };
  }, [configured, demo]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setDataError('');
    try {
      if (demo) {
        setClients(getDemoClients());
        const next = getDemoSettings(); setSettings(next); setSettingDraft(next.booking_url);
      } else {
        const [allClients, config] = await Promise.all([
          (async () => {
            const all: Client[] = [];
            for (let page = 0; page < 200; page++) {
              const result = await adminApi<{ clients: Client[]; hasMore: boolean }>(`clients?page=${page}`);
              all.push(...result.clients);
              if (!result.hasMore) return all;
            }
            throw new Error('Client list exceeds this CRM’s 50,000-contact safety limit.');
          })(),
          adminApi<{ settings: AppSettings }>('settings'),
        ]);
        setClients(allClients);
        setSettings(config.settings); setSettingDraft(config.settings.booking_url);
      }
    } catch (err) { setDataError(err instanceof Error ? err.message : 'Could not load your CRM.'); }
    finally { setLoadingData(false); }
  }, [demo]);

  useEffect(() => { if (authState === 'ready') void loadData(); }, [authState, loadData]);
  useEffect(() => {
    if (!demo || authState !== 'ready') return;
    const update = () => setClients(getDemoClients());
    window.addEventListener('demo-clients-changed', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('demo-clients-changed', update); window.removeEventListener('storage', update); };
  }, [demo, authState]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 5200);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    if (!sky) return;
    try {
      const saved = localStorage.getItem(`mazen_crm_drafts_${sky.dateKey}`);
      setDrafts(saved ? JSON.parse(saved) as Record<string, MessageParts> : {});
    } catch { setDrafts({}); }
  }, [sky?.dateKey]); // intentionally reset when the Tunis date changes
  useEffect(() => {
    if (sky) try { localStorage.setItem(`mazen_crm_drafts_${sky.dateKey}`, JSON.stringify(drafts)); } catch { /* storage unavailable */ }
  }, [drafts, sky?.dateKey]);

  const eligible = useMemo(() => clients.filter((c) => c.daily_opt_in && c.phone && c.last_sent_on !== sky?.dateKey), [clients, sky?.dateKey]);
  const eligibleIds = useMemo(() => new Set(eligible.map((c) => c.id)), [eligible]);
  useEffect(() => { if (sky) setSelectedIds((ids) => ids.filter((id) => eligibleIds.has(id))); }, [sky?.dateKey, eligibleIds]);
  const queue = useMemo(() => selectedIds.map((id) => clients.find((c) => c.id === id)).filter((c): c is Client => Boolean(c && eligibleIds.has(c.id))), [selectedIds, clients, eligibleIds]);
  const activeClient = queue.find((c) => c.id === activeId) || queue[0] || null;
  const canDispatch = Boolean(sky && !skyError);
  const filtered = clients.filter((c) => {
    const query = search.trim().toLowerCase();
    const matches = !query || [c.name, c.phone, c.email || '', c.sun_sign || '', c.location || ''].some((value) => value.toLowerCase().includes(query));
    const matchStatus = filter === 'all' || (filter === 'optedIn' ? c.daily_opt_in : c.status === filter);
    return matches && matchStatus;
  });
  const sentToday = clients.filter((c) => c.last_sent_on && c.last_sent_on === sky?.dateKey).length;
  const optedIn = clients.filter((c) => c.daily_opt_in).length;

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError(''); setLoginBusy(true);
    try {
      const { error } = await authClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      await adminApi('me');
      setPassword(''); setAuthState('ready');
    } catch (err) {
      await authClient().auth.signOut();
      setLoginError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally { setLoginBusy(false); }
  }

  async function logout() {
    await authClient().auth.signOut(); setClients([]); setSelectedIds([]); setAuthState('signedOut');
  }

  function toggleSelection(client: Client) {
    if (!eligibleIds.has(client.id) || !sky) return;
    setSelectedIds((previous) => previous.includes(client.id) ? previous.filter((id) => id !== client.id) : [...previous, client.id]);
    setActiveId(client.id);
  }

  function composeFor(client: Client) {
    if (!canDispatch) { alert('The sky positions are loading. Please try again.'); return; }
    if (!client.daily_opt_in) { alert('This client has not opted in. Confirm their consent in their profile first.'); return; }
    if (client.last_sent_on === sky!.dateKey) { alert('Already marked as sent today. No duplicate message will be queued.'); return; }
    if (!selectedIds.includes(client.id)) setSelectedIds((previous) => [...previous, client.id]);
    setActiveId(client.id); setTab('dispatch');
  }

  function getDraft(client: Client): MessageParts {
    const key = `${sky?.dateKey}:${client.id}`;
    return drafts[key] || makeDailyMessage(client, sky!, settings.booking_url);
  }

  function changeDraft(client: Client, field: keyof MessageParts, value: string) {
    const key = `${sky!.dateKey}:${client.id}`;
    setDrafts((previous) => ({ ...previous, [key]: { ...getDraft(client), [field]: value } }));
  }

  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text); alert('Message copied. Send it manually, then mark it done.'); }
    catch { alert('Clipboard access was blocked. Select and copy the preview text instead.'); }
  }

  async function markSent(client: Client) {
    if (!window.confirm(`Have you actually sent today’s WhatsApp message to ${client.name}? This only records your confirmation; it cannot verify delivery.`)) return;
    setBusy(true);
    try {
      const updated = demo ? markDemoSent(client.id, sky!.dateKey)
        : (await adminApi<{ client: Client }>(`clients/${client.id}/sent`, 'POST', { dateKey: sky!.dateKey })).client;
      setClients((previous) => previous.map((item) => item.id === client.id ? updated : item));
      setSelectedIds((previous) => previous.filter((id) => id !== client.id));
      setActiveId(null);
      alert(`Marked ${client.name} as sent for today.`);
    } catch (err) { alert(err instanceof Error ? err.message : 'Could not update this client.'); }
    finally { setBusy(false); }
  }

  async function saveClient(input: ClientInput, previous: Client | null) {
    setBusy(true);
    try {
      const updated = demo ? upsertDemoClient(input, previous || undefined)
        : (await adminApi<{ client: Client }>(previous ? `clients/${previous.id}` : 'clients', previous ? 'PATCH' : 'POST', input)).client;
      setClients((items) => previous ? items.map((c) => c.id === previous.id ? updated : c) : [updated, ...items]);
      setEditor(null); alert(`${updated.name} ${previous ? 'updated' : 'added'}.`);
    } finally { setBusy(false); }
  }

  async function deleteClient(client: Client) {
    if (!window.confirm(`Permanently delete ${client.name} and their personal information? This cannot be undone.`)) return;
    setBusy(true);
    try {
      if (demo) setDemoClients(getDemoClients().filter((c) => c.id !== client.id));
      else await adminApi(`clients/${client.id}`, 'DELETE');
      setClients((items) => items.filter((c) => c.id !== client.id));
      setSelectedIds((ids) => ids.filter((id) => id !== client.id));
      setEditor(null); alert('Client deleted.');
    } catch (err) { alert(err instanceof Error ? err.message : 'Could not delete the client.'); }
    finally { setBusy(false); }
  }

  async function saveSettings() {
    const parsed = settingsSchema.safeParse({ booking_url: settingDraft });
    if (!parsed.success) { alert(parsed.error.issues[0]?.message || 'Check the booking link.'); return; }
    setBusy(true);
    try {
      if (demo) setDemoSettings(parsed.data);
      else await adminApi('settings', 'PUT', parsed.data);
      setSettings(parsed.data); alert('Booking link saved. It will appear at the end of newly generated messages.');
    } catch (err) { alert(err instanceof Error ? err.message : 'Could not save settings.'); }
    finally { setBusy(false); }
  }

  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 300_000) { alert('This file is too large. Split the JSON into smaller lists.'); return; }
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const entries = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'clients' in raw ? (raw as { clients: unknown }).clients : null);
      if (!Array.isArray(entries)) throw new Error('Please select a JSON file containing an array of clients.');
      if (!window.confirm('Imported clients will NOT be opted in to daily messages. You must confirm each person’s permission before sending. Continue?')) return;
      setBusy(true);
      const result = demo ? importDemo(entries) : await adminApi<{ imported: number; skipped: number }>('import', 'POST', entries);
      await loadData();
      alert(`Imported ${result.imported} contact(s); skipped ${result.skipped}. Daily messaging is OFF for every imported contact.`);
    } catch (err) { alert(err instanceof Error ? err.message : 'Import failed.'); }
    finally { setBusy(false); if (importInput.current) importInput.current.value = ''; }
  }

  function exportClients() {
    const file = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), clients }, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(file);
    const link = document.createElement('a'); link.href = href; link.download = `mazen-crm-clients-${sky?.dateKey || 'backup'}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    alert('Backup downloaded. Store it securely: it contains personal details.');
  }

  async function copyOfferUrl() { await copyText(offerUrl); }

  if (authState === 'loading') return <div className="full-state"><span className="loading-orb">✦</span><p>Opening your private universe...</p></div>;
  if (authState === 'setup') return <div className="auth-page"><div className="auth-card setup-card"><div className="auth-logo"><Image src="/img/logo-icon.png" alt="" width={54} height={54} /></div><span className="eyebrow">DATABASE CONNECTION NEEDED</span><h1>Let’s get this<br /><em>ready to go.</em></h1><p>This CRM is ready for Vercel, but it won’t collect people’s details until Supabase is connected. No public data is saved in an unconfigured deployment.</p><div className="setup-steps"><span><b>01</b> Create a Supabase project and run <code>supabase/schema.sql</code>.</span><span><b>02</b> Create your admin account in Supabase Authentication.</span><span><b>03</b> Add the four variables from <code>.env.example</code> to Vercel and redeploy.</span></div><p className="muted">See README.md for exact instructions, including moving clients from the old site.</p></div></div>;
  if (authState === 'signedOut') return <div className="auth-page"><div className="auth-card"><div className="auth-logo"><Image src="/img/logo-icon.png" alt="" width={54} height={54} /></div><span className="eyebrow">MAZEN ZANINA · PRIVATE PORTAL</span><h1>Your people.<br /><em>Your universe.</em></h1><p>Sign in to manage your clients, see today’s actual sky, and review WhatsApp messages before they go out.</p><form onSubmit={login} className="auth-form"><div className="form-field"><label htmlFor="login-email">Admin email</label><input id="login-email" type="email" autoComplete="username" value={email} required onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div><div className="form-field"><label htmlFor="login-password">Password</label><input id="login-password" type="password" autoComplete="current-password" value={password} required onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></div>{loginError && <p className="form-error" role="alert">{loginError}</p>}<button className="primary-btn" type="submit" disabled={loginBusy}>{loginBusy ? 'Signing in...' : 'Enter my CRM'} <ArrowRight size={18} /></button></form><div className="auth-bottom"><LockKeyhole size={15} /> Only the approved admin account can see client data.</div></div></div>;

  return <div className="dashboard-shell">
    <aside className="sidebar">
      <div className="sidebar-top">
        <a href={HOME_URL} target="_blank" rel="noreferrer" className="brand sidebar-brand"><span className="brand-mark"><Image src="/img/logo-icon.png" width={37} height={37} alt="" /></span><span className="brand-text"><strong>MAZEN ZANINA</strong><small>TAROT & ASTRO · CRM</small></span></a>
        <div className="sidebar-workspace"><span className="workspace-icon">✦</span><span><strong>My workspace</strong><small>Cosmic client studio</small></span><ChevronDown size={15} /></div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="CRM sections" className="side-nav">{tabInfo.map(({ id, name, detail, icon: Icon }) => <button type="button" key={id} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}><Icon size={19} strokeWidth={1.8} /><span><strong>{name}</strong><small>{detail}</small></span>{id === 'dispatch' && selectedIds.length > 0 && <b className="nav-count">{selectedIds.length}</b>}</button>)}</nav>
        <div className="nav-label nav-explore">EXPLORE</div>
        <div className="side-links"><Link href="/free-reading" target="_blank"><Sparkles size={18} /> Public free offer <ArrowUpRight size={14} /></Link><a href={HOME_URL} target="_blank" rel="noreferrer"><Globe2 size={18} /> Tarot Tunisia <ArrowUpRight size={14} /></a></div>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-sky"><span className="tiny-caption">TONIGHT’S MOON</span><div className="sidebar-moon-row"><MoonDisc sky={sky} size={33} /><div><strong>{sky?.moon.phase || 'Reading sky...'}</strong><small>{sky ? `${sky.moon.illumination}% illuminated` : 'Tunisia time'}</small></div></div><span className="sidebar-sky-line">Positions refresh daily in Tunis time.</span></div>
        <div className="profile-foot"><span className="profile-initial">M</span><span><strong>Mazen Zanina</strong><small>{demo ? 'Local preview mode' : 'Workspace admin'}</small></span>{!demo && <button className="icon-button signout" aria-label="Sign out" title="Sign out" type="button" onClick={() => void logout()}><LogOut size={17} /></button>}</div>
      </div>
    </aside>

    <div className="dashboard-main">
      <header className="topbar"><div className="topbar-path">WORKSPACE <span>/</span> {tabInfo.find((item) => item.id === tab)?.name.toUpperCase()}</div><div className="topbar-actions"><span className="topbar-date"><span className="badge-dot" /> {sky?.displayDate || 'Loading Tunis date...'}</span><Link className="topbar-offer" href="/free-reading" target="_blank">Free offer <ArrowUpRight size={15} /></Link></div></header>
      <main className="page-content">
        {demo && <div className="demo-banner"><Sparkles size={17} /> <span><strong>Preview mode</strong> · Your changes are stored in this browser only. Add Supabase before publishing the offer or collecting real leads.</span></div>}
        {dataError && <div className="alert-box data-alert"><span>{dataError}</span><button type="button" onClick={() => void loadData()}><RefreshCw size={15} /> Retry</button></div>}
        {notice && <div className="toast" role="status"><Check size={17} /> {notice}<button aria-label="Dismiss" type="button" onClick={() => setNotice('')}><X size={15} /></button></div>}

        {tab === 'overview' && <>
          <div className="page-title-row"><div><div className="eyebrow">✦ YOUR COSMIC COMMAND CENTRE</div><h1>Good to see you, <em>Mazen.</em></h1><p>The sky moves every day. Your client connections can too.</p></div><button type="button" className="outline-gold-btn" onClick={() => setTab('dispatch')}><Send size={17} /> Open daily messages <ArrowRight size={15} /></button></div>
          <div className="stats-grid"><div className="stat-card"><div className="stat-top"><span>Total clients</span><span className="stat-icon purple"><Users size={19} /></span></div><strong>{loadingData ? '—' : clients.length}</strong><small>Your growing constellation</small></div><div className="stat-card"><div className="stat-top"><span>Daily opt-ins</span><span className="stat-icon teal"><HeartHandshake size={19} /></span></div><strong>{loadingData ? '—' : optedIn}</strong><small>Explicit WhatsApp consent</small></div><div className="stat-card"><div className="stat-top"><span>Ready to send</span><span className="stat-icon gold"><Send size={19} /></span></div><strong>{loadingData ? '—' : eligible.length}</strong><small>Not yet marked today</small></div><div className="stat-card"><div className="stat-top"><span>Sent today</span><span className="stat-icon rose"><CheckCheck size={19} /></span></div><strong>{loadingData ? '—' : sentToday}</strong><small>Marked after manual send</small></div></div>
          <div className="overview-grid">
            <section className="sky-feature"><div className="sky-feature-head"><span className="small-section-label"><span className="badge-dot" /> TODAY IN THE SKY</span><span className="sky-feature-date">{sky?.displayDate || 'Calculating...'} · 12:00 Tunis</span></div><div className="sky-feature-body"><div><p className="sky-feature-kicker">THE MOON’S CURRENT CHAPTER</p><h2>{sky?.moon.phase || 'Reading the stars'}</h2><p className="sky-feature-sub">{sky ? `In ${sky.planets.find((p) => p.name === 'Moon')?.sign} · ${sky.moon.illumination}% illuminated` : skyError || 'Daily positions calculated from astronomical ephemeris.'}</p><p className="sky-feature-copy">{todayMessage(sky)} These positions are recalculated for each new Tunis calendar day.</p><button type="button" className="feature-button" onClick={() => setTab('dispatch')}>Create today’s messages <ArrowRight size={16} /></button></div><div className="large-moon"><div className="moon-halo" /><MoonDisc sky={sky} size={150} /><div className="orbit-star star-a">✦</div><div className="orbit-star star-b">✧</div></div></div><div className="sky-feature-foot"><span><Activity size={14} /> Real positions, not a fixed horoscope</span><span><Moon size={14} /> Refreshes at Tunis midnight</span></div></section>
            <section className="quick-actions card-surface"><div className="section-top"><div><span className="small-section-label">YOUR WORKFLOW</span><h3>Make today count</h3></div><WandSparkles size={21} /></div><button type="button" onClick={() => setTab('clients')}><span className="quick-icon quick-purple"><Users size={19} /></span><span><strong>Manage your people</strong><small>Add, edit, and track opt-in</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => { setTab('clients'); setEditor('new'); }}><span className="quick-icon quick-rose"><Plus size={19} /></span><span><strong>Add a new lead</strong><small>Grow your constellation</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => { setTab('dispatch'); setSelectedIds(eligible.map((c) => c.id)); }}><span className="quick-icon quick-gold"><Send size={19} /></span><span><strong>Review daily notes</strong><small>{eligible.length} consenting people ready</small></span><ArrowRight size={16} /></button><Link href="/free-reading" target="_blank" className="quick-action-link"><span className="quick-icon quick-teal"><Sparkles size={19} /></span><span><strong>Share your free offer</strong><small>Collect opt-in leads online</small></span><ArrowUpRight size={16} /></Link></section>
          </div>
          <div className="lower-grid"><section className="card-surface planet-panel"><div className="section-top"><div><span className="small-section-label">THE DAILY EPHEMERIS</span><h3>Where everything is today</h3></div><span className="info-pill">Tropical · Geocentric</span></div><div className="planet-grid">{sky ? sky.planets.map((planet) => <PlanetTile key={planet.name} planet={planet} />) : <p className="muted">{skyError || 'Calculating planetary positions...'}</p>}</div><p className="card-footnote">Calculated at 12:00 Africa/Tunis using Astronomy Engine. Rx marks apparent retrograde motion.</p></section>
          <section className="card-surface recent-panel"><div className="section-top"><div><span className="small-section-label">YOUR PEOPLE</span><h3>Recent connections</h3></div><button className="small-text-btn" type="button" onClick={() => setTab('clients')}>View all <ArrowRight size={14} /></button></div><div className="recent-list">{clients.length ? clients.slice(0, 5).map((client) => <button type="button" className="recent-person" key={client.id} onClick={() => setEditor(client)}><ClientAvatar client={client} /><span><strong>{client.name}</strong><small>{client.sun_sign ? `${SIGN_SYMBOLS[client.sun_sign]} ${client.sun_sign}` : 'Sun sign not set'} · {client.status}</small></span><span className={`tiny-status ${client.daily_opt_in ? 'yes' : 'no'}`}>{client.daily_opt_in ? 'Opted in' : 'No opt-in'}</span></button>) : <div className="empty-slim">No contacts yet. Share your free offer to get started.</div>}</div><div className="recent-bottom"><ShieldCheck size={15} /> Only opted-in people can enter the daily queue.</div></section></div>
        </>}

        {tab === 'clients' && <>
          <div className="page-title-row"><div><div className="eyebrow">✦ YOUR CONSTELLATION</div><h1>Your <em>clients.</em></h1><p>Keep their story, preferences and permission all in one place.</p></div><button type="button" className="primary-btn" onClick={() => setEditor('new')}><Plus size={18} /> Add client</button></div>
          <section className="card-surface client-panel"><div className="client-toolbar"><div className="search-box"><Search size={18} /><input aria-label="Search clients" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, city, sign..." /></div><div className="toolbar-end"><div className="filter-select"><Filter size={15} /><select aria-label="Filter clients" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="all">All clients</option><option value="lead">Leads</option><option value="active">Active</option><option value="vip">VIP</option><option value="optedIn">Opted in</option></select></div><button type="button" className="soft-btn" onClick={() => importInput.current?.click()} disabled={busy}><FileUp size={16} /> Import JSON</button><input ref={importInput} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} /></div></div><div className="table-subbar"><span>{filtered.length} {filtered.length === 1 ? 'person' : 'people'} · {eligible.length} ready for today</span><div><button type="button" className="small-text-btn" disabled={!sky || filtered.every((c) => !eligibleIds.has(c.id))} onClick={() => setSelectedIds((ids) => Array.from(new Set([...ids, ...filtered.filter((c) => eligibleIds.has(c.id)).map((c) => c.id)])))}><CheckCheck size={15} /> Check all eligible shown</button>{selectedIds.length > 0 && <button className="small-text-btn purple-text" type="button" onClick={() => setTab('dispatch')}>Review {selectedIds.length} <ArrowRight size={14} /></button>}</div></div>
            <div className="client-table-scroll"><table className="client-table"><thead><tr><th scope="col" className="checkbox-cell"><span className="visually-hidden">Select</span></th><th scope="col">CLIENT</th><th scope="col">SIGN / LANGUAGE</th><th scope="col">STATUS</th><th scope="col">DAILY NOTES</th><th scope="col">LAST SENT</th><th scope="col" className="right-align">ACTIONS</th></tr></thead><tbody>{filtered.map((client) => <tr key={client.id}><td className="checkbox-cell"><input type="checkbox" aria-label={`Select ${client.name} for today's message`} disabled={!eligibleIds.has(client.id) || !sky} checked={selectedIds.includes(client.id)} onChange={() => toggleSelection(client)} /></td><td><div className="table-person"><ClientAvatar client={client} /><span><strong>{client.name}</strong><small>{client.phone}</small></span></div></td><td><div className="sign-cell"><strong>{client.sun_sign ? `${SIGN_SYMBOLS[client.sun_sign]} ${client.sun_sign}` : '—'}</strong><small>{languageLabel[client.preferred_language]}</small></div></td><td><span className={`status-pill status-${client.status}`}>{client.status}</span></td><td><span className={`consent-pill ${client.daily_opt_in ? 'on' : 'off'}`}><span />{client.daily_opt_in ? 'Opted in' : 'Not opted in'}</span></td><td><span className={client.last_sent_on === sky?.dateKey ? 'sent-date today' : 'sent-date'}>{client.last_sent_on === sky?.dateKey ? 'Today ✓' : client.last_sent_on || 'Never'}</span></td><td><div className="table-actions"><button type="button" className="row-send" title={client.daily_opt_in ? 'Compose today’s message' : 'Requires opt-in'} disabled={!eligibleIds.has(client.id) || !sky} onClick={() => composeFor(client)}><Send size={15} /> Compose</button><button type="button" className="row-edit" aria-label={`Edit ${client.name}`} onClick={() => setEditor(client)}><Pencil size={15} /></button></div></td></tr>)}</tbody></table></div>
            {!filtered.length && <div className="empty-panel"><Users size={31} /><h3>No clients found</h3><p>{search || filter !== 'all' ? 'Try another search or filter.' : 'Add a client or share the free offer to get started.'}</p><button className="soft-btn" onClick={() => { setSearch(''); setFilter('all'); }} type="button">Clear filters</button></div>}
            <div className="table-footer"><ShieldCheck size={15} /> Contacts without documented opt-in cannot be checked or sent a daily note.<span><button type="button" onClick={exportClients}>Export backup <ArrowDownToLine size={14} /></button></span></div>
          </section>
        </>}

        {tab === 'dispatch' && <>
          <div className="page-title-row"><div><div className="eyebrow">✦ TODAY’S PERSONAL TOUCH</div><h1>Daily <em>dispatch.</em></h1><p>Check who gets a note, personalize its ending, then send one by one.</p></div><div className="sky-timestamp"><Moon size={18} /><span><strong>{sky?.moon.phase || 'Loading sky...'}</strong><small>{sky?.displayDate || 'Tunis time'}</small></span></div></div>
          <div className="dispatch-info"><ShieldCheck size={18} /><span><strong>Always reviewed by you.</strong> “Open WhatsApp” prepares one client’s message; you must press send in WhatsApp. Then mark it as sent here. Nothing is broadcast automatically.</span></div>
          <div className="dispatch-layout">
            <section className="card-surface queue-panel"><div className="queue-header"><span className="small-section-label">TODAY’S SEND LIST</span><span className="queue-counter">{queue.length} selected</span></div><div className="queue-actions"><button type="button" onClick={() => { setSelectedIds(eligible.map((c) => c.id)); setActiveId(null); }} disabled={!eligible.length || !sky}>Select all {eligible.length} eligible</button><button type="button" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>Clear</button></div><div className="queue-list">{clients.length ? clients.map((client) => {
              const isDone = client.last_sent_on === sky?.dateKey;
              const available = client.daily_opt_in && !isDone && Boolean(sky);
              return <div key={client.id} className={`queue-person ${activeClient?.id === client.id ? 'active' : ''} ${!available ? 'muted-queue' : ''}`}><input type="checkbox" aria-label={`Queue ${client.name}`} checked={selectedIds.includes(client.id)} disabled={!available} onChange={() => toggleSelection(client)} /><button type="button" className="queue-person-button" onClick={() => { if (available) composeFor(client); else setEditor(client); }}><ClientAvatar client={client} /><span><strong>{client.name}</strong><small>{isDone ? 'Sent today ✓' : !client.daily_opt_in ? 'Opt-in needed' : `${SIGN_SYMBOLS[client.sun_sign || 'Pisces']} ${client.sun_sign || 'Sun sign not set'} · ${languageLabel[client.preferred_language]}`}</small></span></button>{isDone && <Check size={15} className="done-mark" />}</div>;
            }) : <div className="empty-queue"><Users size={27} /><strong>Clients appear here.</strong><p>Share the free offer or add a person.</p></div>}</div><div className="queue-foot">{sentToday} marked today · {optedIn} opted in</div></section>
            <section className="composer-panel card-surface">{activeClient && sky ? <>
              <div className="composer-head"><div><span className="small-section-label">PERSONAL MESSAGE · {sky.dateKey}</span><h2>For {activeClient.name}</h2><p>{activeClient.sun_sign ? `${SIGN_SYMBOLS[activeClient.sun_sign]} ${activeClient.sun_sign}` : 'Your client'} · {languageLabel[activeClient.preferred_language]} · {activeClient.phone}</p></div><span className="composer-mark">✦</span></div>
              <div className="composer-skyline"><Moon size={17} /> {sky.moon.phase} · Moon in {sky.planets.find((p) => p.name === 'Moon')?.sign} · {sky.moon.illumination}% illuminated <span>LIVE DAILY SKY</span></div>
              <div className="compose-field"><div className="compose-label"><label htmlFor="message-body">Today’s sky note</label><span>EDITABLE</span></div><textarea id="message-body" rows={11} maxLength={1800} dir="auto" value={getDraft(activeClient).body} onChange={(event) => changeDraft(activeClient, 'body', event.target.value)} /><small>Generated for today’s real planetary positions and this person’s Sun sign. Edit as you like.</small></div>
              <div className="compose-field invitation-field"><div className="compose-label"><label htmlFor="message-invitation">Your invitation to book ✦</label><span>AT THE END</span></div><textarea id="message-invitation" rows={4} maxLength={800} dir="auto" value={getDraft(activeClient).invitation} onChange={(event) => changeDraft(activeClient, 'invitation', event.target.value)} /><small>Personalize this closing for the client. Your booking link can be changed in Settings.</small></div>
              <div className="message-preview"><div className="preview-label"><MessageCircle size={16} /> WHATSAPP PREVIEW <span>{joinMessage(getDraft(activeClient)).length} characters</span></div><pre dir="auto">{joinMessage(getDraft(activeClient))}</pre></div>
              <div className="composer-actions"><button type="button" className="soft-btn" onClick={() => void copyText(joinMessage(getDraft(activeClient)))}><Copy size={16} /> Copy text</button>{demo && activeClient.id.startsWith('demo-') ? <button className="primary-btn" type="button" disabled title="Replace the fictional demo phone first"><MessageCircle size={17} /> Add a real number to send</button> : <a className="primary-btn" href={whatsappLink(activeClient.phone, joinMessage(getDraft(activeClient)))} target="_blank" rel="noopener noreferrer" onClick={() => alert(`WhatsApp opened for ${activeClient.name}. Press send there, then come back and mark it done.`)}><MessageCircle size={17} /> Open WhatsApp <ArrowUpRight size={17} /></a>}</div>
              <button type="button" className="mark-sent-btn" disabled={busy || !activeClient.daily_opt_in} onClick={() => void markSent(activeClient)}><CheckCheck size={18} /> {busy ? 'Saving...' : 'I sent it — mark done & go to next'} <ArrowRight size={16} /></button>
              <p className="send-disclaimer">This records your confirmation only. WhatsApp delivery can’t be verified here. Each client can be marked once per Tunis calendar day.</p>
            </> : <div className="no-selection"><div className="no-selection-icon"><MessageCircle size={33} /></div><span className="eyebrow">START WITH A PERSON</span><h2>A thoughtful note,<br /><em>not a broadcast.</em></h2><p>{sky ? 'Check one or more opted-in clients on the left. You can personalize each daily message and booking invitation before opening WhatsApp.' : skyError || 'Loading today’s astronomical positions...'}</p><button type="button" className="soft-btn" onClick={() => setTab('clients')}>Browse clients <ArrowRight size={16} /></button></div>}</section>
          </div>
        </>}

        {tab === 'settings' && <>
          <div className="page-title-row"><div><div className="eyebrow">✦ THE LITTLE DETAILS</div><h1>Workspace <em>settings.</em></h1><p>Set your booking destination, share your free offer, and take your client list with you.</p></div></div>
          <div className="settings-grid"><section className="card-surface settings-card"><div className="settings-icon purple"><ExternalLink size={22} /></div><span className="small-section-label">CONVERT THE CONVERSATION</span><h3>Your booking link</h3><p>This link is added to the end of new daily messages. You can also personalize each client’s invitation before sending.</p><div className="form-field"><label htmlFor="booking-link">Booking URL</label><input id="booking-link" type="url" value={settingDraft} onChange={(event) => setSettingDraft(event.target.value)} placeholder="https://..." /></div><div className="preset-links"><button type="button" onClick={() => setSettingDraft(DEFAULT_BOOKING_URL)}>Use WhatsApp number</button><button type="button" onClick={() => setSettingDraft(BOOKING_PAGE_URL)}>Use website booking page</button></div><button type="button" className="primary-btn" disabled={busy} onClick={() => void saveSettings()}>{busy ? 'Saving...' : 'Save booking link'} <Check size={16} /></button></section>
          <section className="card-surface settings-card"><div className="settings-icon gold"><Sparkles size={22} /></div><span className="small-section-label">A FREE OFFER THAT GROWS YOUR LIST</span><h3>Your public signup page</h3><p>Share this on your homepage, Instagram bio or WhatsApp status. New leads appear in Clients with explicit daily-message opt-in.</p><div className="copy-url"><span title={offerUrl}>{offerUrl}</span><button type="button" aria-label="Copy free offer link" onClick={() => void copyOfferUrl()}><Copy size={17} /></button></div><Link className="soft-btn settings-link" href="/free-reading" target="_blank">Preview free offer <ArrowUpRight size={16} /></Link><div className="settings-note"><ShieldCheck size={17} /> Requires Supabase in production. Preview mode never collects cloud leads.</div></section>
          <section className="card-surface settings-card"><div className="settings-icon teal"><Cloud size={22} /></div><span className="small-section-label">YOUR DATA, YOUR CONTROL</span><h3>Back up & import</h3><p>Export your private contacts as JSON. To move clients from the old CRM, export its browser storage and import it here. Imported contacts are opted out by default.</p><div className="settings-buttons"><button type="button" className="soft-btn" onClick={exportClients}><ArrowDownToLine size={16} /> Export JSON</button><button type="button" className="soft-btn" onClick={() => importInput.current?.click()}><FileUp size={16} /> Import JSON</button><input ref={importInput} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} /></div><p className="card-footnote">Keep exported files somewhere private; they contain personal information.</p></section>
          <section className="card-surface settings-card"><div className="settings-icon rose"><CircleHelp size={22} /></div><span className="small-section-label">HOW THIS WORKS</span><h3>Simple & intentional</h3><div className="settings-faq"><p><strong>Does it send automatically?</strong><br />No. You choose people, review the note, open WhatsApp, then press send yourself.</p><p><strong>What changes each day?</strong><br />Real Sun, Moon and planet positions, lunar phase, date, aspect and reflective prompts.</p><p><strong>Can someone opt out?</strong><br />Yes. If they reply STOP, edit their profile and switch off Daily WhatsApp opt-in.</p></div></section></div>
        </>}
        <footer className="app-footer"><span>✦ Mazen Zanina · Cosmic CRM</span><span>Interpretive entertainment · <Link href="/privacy" target="_blank">Privacy</Link> · <a href={HOME_URL} target="_blank" rel="noreferrer">Tarot Tunisia ↗</a></span></footer>
      </main>
    </div>
    {editor && <ClientEditor key={editor === 'new' ? 'new' : editor.id} initial={editor === 'new' ? null : editor} busy={busy} onClose={() => setEditor(null)} onSave={saveClient} onDelete={deleteClient} />}
  </div>;
}
