# Mazen Zanina · Cosmic CRM

**Already using the working CRM? Follow [UPDATE-EXISTING-CRM.md](UPDATE-EXISTING-CRM.md) to redeploy the existing CRM Vercel project.** Do not create a new project or overwrite the separate Tarot Tunisia homepage. **First-time setup?** See [VERCEL-START-HERE.md](VERCEL-START-HERE.md).

A Vercel-ready, private client CRM for [Tarot Tunisia](https://tarot-tn.vercel.app/), plus a public **free daily tarot-and-astro signup**. This package updates the standalone cloud-backed CRM. It is **not** the homepage source or the unrelated legacy browser-only CRM. Preserve the current Supabase project and data when redeploying.

## What is included

- **Fresh sky each Tunis day:** the Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto at **12:00 Africa/Tunis**, with tropical signs, zodiac degrees, apparent retrogrades, lunar phase/illumination, inner-planet illumination, and nearby Moon aspects. The server calculates positions with `astronomy-engine` whenever the date changes. No hard-coded 2026 transit table, third-party astronomy API key, or Vercel cron job is needed. An open browser refreshes the sky within one minute of Tunis midnight.
- **Opt-in lead collection:** public `/free-reading` form captures name, international WhatsApp number, chosen language, and optional email, city, **birth date (DD/MM/YYYY), local birth time (HH:MM)** and Sun sign. Dates are saved in ISO `YYYY-MM-DD` form, times as local `HH:MM`; neither is used to claim a natal chart. Separate privacy, daily-WhatsApp, and 18+ consent is required; the server stores consent time and origin. The public form cannot read client records.
- **Daily review queue:** check eligible clients individually or select all eligible clients; preview richer *different daily* English, French, or Tunisian Arabic messages with real sky context, a stable symbolic digital Major Arcana card per client/day, cosmic summary, love, career, reflective number and practical ritual. Cards are selected digitally, not physically drawn; numbers are prompts, not fabricated power percentages. Edit the body and booking invitation separately. Existing unsent edited drafts remain until you explicitly use **Refresh today's draft** to replace one.
- **Manual WhatsApp workflow:** open the chosen client’s pre-filled chat, press **Send in WhatsApp**, return to the CRM and confirm **I sent it**. This app does **not** automatically send or verify delivery. One confirmed send per person per Tunis calendar day; no unchecked/opted-out person is queued.
- **Secure CRM data:** Supabase database + email/password Auth with one exact admin email allowlist. The browser cannot query the client database directly; protected server API routes verify each admin JWT. Row Level Security has no public client-table policies.
- **Separate homepage:** this release touches the CRM only. Keep your existing dedicated signup page and its prominent homepage button as they are; if they load this CRM’s `/free-reading`, the upgraded form appears after the CRM redeploy. Your default invitation goes to [business WhatsApp +216 22 481 622](https://wa.me/21622481622); change it in Settings if desired. The homepage’s fixed LAUNCH10 paid-reading counter is unrelated to free signups and is untouched.

### Important: this is not an automatic WhatsApp broadcast

A normal WhatsApp URL opens **one** pre-filled chat; browsers cannot silently dispatch a bulk campaign. Automatic bulk sending requires a separate WhatsApp Business Platform integration, approved templates and appropriate opt-in. This version gives you the checked-client queue and personal review you chose, without API credentials or hidden sends.

## Run locally (preview mode)

Prerequisite: Node.js 20+.

```bash
cd mazen-cosmic-crm
npm install
npm run dev
```

Open `http://localhost:3000/` for the CRM or `/free-reading` for the opt-in page. **With no environment variables in development, a clearly labeled preview mode stores fictional sample contacts and test signups in that browser only.** The illustrative phone numbers cannot be sent to. This mode is disabled in production. Production without Supabase shows setup instructions and refuses public submissions rather than losing leads.

## Set up the cloud database and admin

1. Create a project at [Supabase](https://supabase.com/). In the **SQL Editor**, run all of `supabase/schema.sql` once. This creates the client table, booking setting, and an atomic hashed-IP daily signup limit. It enables RLS and denies anonymous/authenticated direct table access.
2. In Supabase **Authentication → Users**, add your admin email and password. Confirm the email. In Auth settings, disable public account signups; **public leads use the separate free-reading form, not Supabase Auth**.
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase publishable/anon key (safe for browser Auth; it does not grant direct client-table access).
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role secret; **server only**, never prefix with `NEXT_PUBLIC_`, commit, or paste into your homepage.
   - `ADMIN_EMAIL`: exact email of the admin user you created.
4. Restart `npm run dev`. Sign in to `/` with the admin email/password. Test one lead on `/free-reading` with **your own WhatsApp number**; it should appear as a Lead in Clients. Check the opt-in record, queue that lead, preview and edit the message, and test the WhatsApp action.
5. Optional spam hardening: configure **both** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` using a Cloudflare Turnstile widget authorized for your deployed offer domain. The public form includes a honeypot and a DB-backed limit of five attempts per hashed IP per Tunis day even without Turnstile; hashed rate-limit counters are removed after around eight days. Never configure only the secret without the site key.

> The service-role key bypasses RLS. Keep it secret. The server checks the authorized Supabase user before allowing any admin data operations. Public form POSTs can only add a new opted-in lead; duplicate phone numbers do not reactivate someone who opted out.

### Forgotten admin password

The CRM sign-in has **Forgot password?** and a `/reset-password` page. After deploying this version, configure **Supabase → Authentication → URL Configuration**:

- **Site URL:** your production CRM origin, such as `https://YOUR-CRM-DOMAIN.vercel.app` (not `localhost` or your separate public homepage).
- **Redirect URLs:** add the exact `https://YOUR-CRM-DOMAIN.vercel.app/reset-password` path. Use your actual Production domain, not a Vercel preview domain. Supabase must allow the `redirectTo` used by the CRM.

Then open the deployed CRM’s sign-in page → **Forgot password?**, enter your admin email, and use the **newest** reset email. Its link opens `/reset-password` to enter and confirm a new password. Old links generated before configuring the URL or deploying this page may still go to the wrong destination; request a new one instead. A dashboard-sent reset link can have a different redirect: prefer requesting it from this CRM page. Do not share recovery links or tokens with anyone. Email verification and password recovery are separate processes.

**If iPhone Safari says “Load failed”:** this version sends only the necessary Auth requests through the CRM’s own origin at `/api/auth-bridge/*`, avoiding a browser-to-Supabase cross-origin request. The bridge uses the public publishable key, forwards a strict allowlist of Auth endpoints, restricts reset emails to the configured admin address, and never uses the service-role key. After deployment, visit `https://YOUR-CRM-DOMAIN.vercel.app/api/auth-bridge/health` in Safari: a JSON response confirms the Vercel server can reach Supabase. A 404 means the new code is not deployed to that domain; a 503 means server Auth variables are missing; a 502 means the server could not reach Supabase. If you still see an error, report **only** its text, not a password, token, or recovery URL. The same-domain bridge is a mitigation; it cannot guarantee a particular device or network will work.

## Deploy to Vercel (first-time projects only)

**For your already-working CRM at `crm-flame-rho-25.vercel.app`, use [UPDATE-EXISTING-CRM.md](UPDATE-EXISTING-CRM.md) instead. Do not create another project or rerun the full database schema.**

1. Push this **`mazen-cosmic-crm` directory** to GitHub (or deploy it with the Vercel CLI). If importing a bigger repository, set Vercel’s **Root Directory** to `mazen-cosmic-crm`. Framework preset: **Next.js**. Build command: `npm run build`.
2. In **Vercel → Project → Settings → Environment Variables**, add the same four Supabase/admin variables from `.env.example` for Production (and Preview if you use preview deployments). Add the two optional Turnstile keys together if needed. Deploy or redeploy after setting them.
3. Visit `https://YOUR-CRM-DOMAIN.vercel.app/` and sign in; visit `https://YOUR-CRM-DOMAIN.vercel.app/free-reading` and submit a test lead. In the CRM **Settings** tab, copy your real offer URL. The public form should only be shared after this test succeeds.
4. Open `homepage-offer-cta.html`, replace `https://YOUR-CRM-DOMAIN.vercel.app/free-reading` with your real URL, and paste the snippet into your **existing** `tarot-tn.vercel.app` homepage source (`index.html`) before `</body>`. Redeploy the *homepage project separately*. The original homepage source was not supplied, so this project cannot edit its live Vercel deployment directly.
5. In CRM Settings, choose either the default WhatsApp booking destination `+216 22 481 622` or `https://tarot-tn.vercel.app/booking.html` and press **Save booking link**. The URL is appended to new drafts; you can customize each closing independently.

**If you want the old CRM’s other chart/social/events tabs preserved within this project, please provide its GitHub repository or ZIP; a deployed website URL is not source code.** Keep your public homepage as a separate deployment until you explicitly decide to merge them.

## Move contacts out of the old CRM

The old CRM stored clients **in that browser only**, under localStorage key `tarot_tn_crm_clients` on `workspace-01a0c180-38d2-70c9-aa98-1.vercel.app`. The new domain or cloud database cannot read another site’s browser storage.

1. In the browser where your contacts were used, open the **old CRM**. In DevTools → Application → Local Storage, choose the old CRM’s domain, then find `tarot_tn_crm_clients`. Copy its JSON value and save it as a UTF-8 file named `old-crm-clients.json`. Alternatively, in the old site’s DevTools Console, run this small export you can inspect first:

   ```js
   const text = localStorage.getItem('tarot_tn_crm_clients');
   if (!text) alert('No client list in this browser.');
   else {
     const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
     const a = document.createElement('a'); a.href = url; a.download = 'old-crm-clients.json'; a.click();
     setTimeout(() => URL.revokeObjectURL(url), 1000);
   }
   ```

2. In the **new** CRM, open **Clients → Import JSON** or **Settings → Import JSON**. It accepts old camelCase (`birthDate`, `sunSign`, `totalSpentTND`, `preferredLanguage`) and new snake_case records. It skips duplicates by WhatsApp number and invalid contacts.
3. **Every imported contact starts with daily opt-in OFF**, even if the old site could send them messages. Confirm documented permission with each person before turning the opt-in switch on. Do not treat an existing phone number as consent.
4. You can download a private JSON backup from Settings. Imported backups also default to opt-out as a safety precaution; review and re-enable permissions deliberately. Keep backups off public drives.

## Sending and privacy checklist

- Check **Clients** for valid numbers in international format (`+216...`) and daily opt-in, then **Daily messages → Select all eligible** or check specific clients.
- Edit the generated sky note and especially **Your invitation to book** at the end; choose English/Français/تونسي per client in their profile.
- Click **Open WhatsApp**, inspect the chat, actually send, and only then click **I sent it — mark done & go to next**. The CRM stores your confirmation but cannot detect delivery.
- If someone replies **STOP**, switch off **Daily WhatsApp opt-in** in their client profile immediately; the queue excludes them. On request, correct or delete their record.
- Review and adapt `/privacy` for your business and local law before going live. Age 18+ is required; the Sun sign guessed from an optional birth date is approximate around zodiac cusp days. Birth time is optional and kept as local time; the readings are interpretive entertainment, not physical draws, natal-chart calculations or professional advice.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

`/api/sky` is public and contains no personal information. `/api/admin/*` needs the authorized admin’s bearer token. Without Supabase credentials in production, admin and lead endpoints fail closed. No external request is needed to calculate the sky.
