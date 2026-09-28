# Update the existing Cosmic CRM · 28 September 2026

**Deploy to the Vercel project that currently serves `https://crm-flame-rho-25.vercel.app/`.** This is a source-code update to the working cloud-backed CRM, **not** the separate `tarot-tn.vercel.app` website. Do not make a new Vercel/Supabase project, wipe the client database, re-import existing clients, or rerun the full `supabase/schema.sql` on a working database.

## What changes

- Public `/free-reading`: optional **birth date in DD/MM/YYYY** and **birth time**; local time is optional and no birth chart is inferred. The API stores dates as `YYYY-MM-DD` and the time as `HH:MM`; existing stored dates stay unchanged.
- CRM client editor/list: show birth dates in DD/MM/YYYY; edit optional birth time. Imported valid dates in either DD/MM/YYYY or legacy ISO are normalized to ISO storage.
- Daily drafts: more expressive **English, French, or Tunisian** tarot-and-astro sections: real daily sky at noon in Tunis, a **symbolic digital** Major Arcana card selected consistently per client/day, cosmic summary, love, work, a **reflective number (not a power percentage)** and a small practical ritual. The card is **not** a physical draw and birth time is not used to invent a natal chart.
- You still choose who is opted in, edit each message and booking invitation, open one prefilled WhatsApp chat at a time, press **Send** yourself, and confirm **I sent it** afterwards. The invitation includes booking at `+216 22 481 622` (or your saved Settings link) and how to reply STOP.

## Before deploying

1. In your working CRM, use **Settings → Export backup** if you want an extra private copy of the client list. Keep the backup private; it includes personal data.
2. Confirm you are viewing the **existing CRM project** in Vercel, not the public Tarot Tunisia website. Check **Settings → Environment Variables**: keep the current working `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**publishable** `sb_publishable_` or legacy anon only), `SUPABASE_SERVICE_ROLE_KEY` (**server only**), `ADMIN_EMAIL`, and any optional Turnstile variables. This release needs **no new secrets**. Never place a `sb_secret_` or service-role key in a `NEXT_PUBLIC_` variable or share secret values.
3. The supplied schema already has `public.clients.birth_time time` and `birth_date date`. If you are uncertain about the **actual deployed table**, use this **read-only** query in Supabase SQL Editor:

   ```sql
   select column_name, data_type
   from information_schema.columns
   where table_schema = 'public' and table_name = 'clients'
     and column_name in ('birth_date', 'birth_time')
   order by column_name;
   ```

   If `birth_time` exists, **no migration** is needed. Only if it is absent, add just that column with `alter table public.clients add column if not exists birth_time time;` in SQL Editor. Do **not** rerun the complete setup script on a working database.

## Deploy to the same Vercel project

**If the CRM is connected to Git:** In Vercel, open the **CRM** project → **Settings → Git** and note the connected repository, production branch and Root Directory. Unzip this package. Update the files in **that same repository** from the `mazen-cosmic-crm` folder, preserving the repository layout: if the Vercel Root Directory is `mazen-cosmic-crm`, update that folder; if it is the repository root, put `package.json`, `src`, `supabase`, etc. at the root. Commit and push to the connected production branch; watch **Deployments** in the existing CRM project until it is ready. **Do not** push this folder to the homepage repository.

**If the CRM was deployed with the Vercel CLI:** Unzip, open a terminal inside `mazen-cosmic-crm`, sign in with your own Vercel account, and link to the **existing** CRM project:

```bash
cd mazen-cosmic-crm
npx vercel@latest login
npx vercel@latest link
# Select the project that serves crm-flame-rho-25.vercel.app; cancel if asked to create a new one.
npx vercel@latest --prod
```

Do not share Vercel access tokens or your `.vercel` settings. If you normally deploy through Git, use the Git method instead of an unrelated new CLI project. The package excludes build outputs, dependencies and `.env.local`; Vercel installs the locked dependencies and builds automatically. **Do not deploy this CRM folder to `tarot-tn.vercel.app`.**

## Check after the deployment

1. Open the **same** `https://crm-flame-rho-25.vercel.app/` and sign in. Your existing clients and booking setting should still be there. If the project is connected to a custom domain, check that production domain too.
2. On `/free-reading`, check the **DD/MM/YYYY** placeholder and optional birth-time control. If you wish to submit a real test, use **only your own** number and check consent; avoid duplicate/fictional client signups.
3. In the CRM, inspect your own test record: birth date displays as DD/MM/YYYY and birth time can be edited. Open **Daily messages** for an opted-in test contact; check the real sky, symbolic digital card, reflective number, love/work/action sections, your saved booking link, and **STOP**. The prefilled WhatsApp chat is still **manual**; you can inspect it without pressing Send.
4. Previously edited drafts for **today** remain in this browser. If one still shows the old short version, choose **Refresh today's draft** for that client. It asks for confirmation because it replaces that client's unsent edits. Tomorrow's drafts use the new style automatically.
5. The **public homepage and its dedicated signup-page button remain separate**. This CRM redeploy does not change the homepage or its fixed **LAUNCH10 4-of-10 paid-reading counter**; free signup leads do not consume paid-discount spots. If your existing website page embeds or links to this CRM's `/free-reading`, it will use the updated form at the same URL, without redeploying the homepage.

## Security reminder

A server-only `sb_secret_` key appeared in an **earlier public CRM build**. The latest checked public build used a publishable key, but that alone does not invalidate the formerly exposed key. If you have not already rotated/revoked the old secret, do so in Supabase; if a legitimate server-only Vercel variable used it, update that variable to the new server-only key and redeploy. Never paste the key in chat or into browser-exposed `NEXT_PUBLIC_*` settings. Whether the old key was revoked is not known from this package.
