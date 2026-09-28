# Start here · deploy Mazen Cosmic CRM to Vercel (first-time setup)

**Already have the working CRM at `crm-flame-rho-25.vercel.app`? STOP: use [UPDATE-EXISTING-CRM.md](UPDATE-EXISTING-CRM.md) instead. Keep its Vercel project, Supabase database and environment variables. Do not create a new project.**

**The project is ready to build on Vercel, but a real public signup cannot work without a database.** It deliberately refuses signups rather than silently losing client information if Supabase is not configured. This CRM is a separate project from your existing `tarot-tn.vercel.app` homepage.

## What you can safely share with the assistant

- A link to your **GitHub repository** or **Vercel project** (if you have one).
- Your **Supabase Project URL** (`https://...supabase.co`) and **publishable/anon key**. Those two are designed to be public in the browser.
- The **email address** you want as your CRM administrator.
- An image of a setup error **only after hiding keys/passwords and client details**.

**Never send in chat:** `SUPABASE_SERVICE_ROLE_KEY`, database password or URL with password, admin password, Vercel access token, recovery codes, or unredacted client exports. Enter secrets yourself in Vercel's Environment Variables screen and create your admin password inside Supabase.

## 1. Make the database (Supabase)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor → New query**. Open `supabase/schema.sql` from this ZIP, paste the full file, and click **Run**. This creates the tables, consent fields, and anti-spam limit.
3. Go to **Authentication → Users → Add user** and create a user with **your admin email and a password you keep private**. Confirm its email (or create it as confirmed from the dashboard). Turn off public Auth signups in Supabase Auth settings.
4. From Supabase **Project Settings → API** copy the Project URL, publishable/anon key and service-role secret. Keep the last one private.

## 2. Deploy the website (Vercel)

Vercel deploys a **folder/repository**, not the `.zip` itself. Unzip this package first. Choose either:

- **GitHub (easiest for redeploys):** create a private GitHub repository, upload the **contents inside `mazen-cosmic-crm`** so `package.json` is at the repo root, then go to [vercel.com/new](https://vercel.com/new), import it and choose the **Next.js** preset. `vercel.json` sets `npm ci` and `npm run build` automatically.
- **Vercel CLI:** on your own computer, open a terminal inside the unzipped `mazen-cosmic-crm` folder, run `npx vercel login`, then `npx vercel` (preview) or `npx vercel --prod` (production). You must authorize your own Vercel account locally; don't send me its token.

Before the production deployment, add these in **Vercel → your new CRM Project → Settings → Environment Variables**. Select **Production** (and **Preview** if you want preview deployments), then **Redeploy** after any changes:

| Variable | Get it from | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → publishable/anon key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service-role secret | **Yes: server only** |
| `ADMIN_EMAIL` | Email of the Supabase Auth user you created | Not a password |

You **do not need a `.env.local` file on Vercel**. Its Environment Variables screen replaces it. `.env.local` is only for running this project on your own computer; it is deliberately excluded from the ZIP.

## 3. Test before sharing the offer

Before requesting password-reset emails, go to **Supabase → Authentication → URL Configuration**: set **Site URL** to `https://YOUR-CRM.vercel.app` and add the exact **Redirect URL** `https://YOUR-CRM.vercel.app/reset-password`. Replace `YOUR-CRM` with your real Production hostname. If you forget your admin password, use **Forgot password?** on the deployed CRM sign-in page, not an old dashboard-sent reset link. Only a newly requested link using this version will direct you to the page for choosing a new password. Do not send anyone the link, password, or recovery token. If Safari displays “Load failed,” this version routes Auth through the same Vercel domain; check `/api/auth-bridge/health` to confirm the server can reach Supabase.

1. Open your new `https://YOUR-CRM.vercel.app/`. Sign in with the Supabase admin email/password. You should see the CRM, not a database setup warning.
2. Open `https://YOUR-CRM.vercel.app/free-reading`. Submit the form with **your own** WhatsApp number and consent checkboxes. Verify the lead appears under **Clients**.
3. Check the lead, open **Daily messages**, customize the message ending and test **Open WhatsApp**. The CRM **never auto-sends**; you press Send in WhatsApp yourself and then mark it done in the CRM.
4. In **Settings**, copy the live `/free-reading` URL. Replace the placeholder URL in `homepage-offer-cta.html` and paste that snippet into your **existing homepage project** source. Deploy the homepage separately. Do **not** overwrite your existing tarot website with this CRM ZIP.

Cloudflare Turnstile is **optional for an initial launch**. The form already includes an invisible bot trap and a database-backed daily limit. To add Turnstile later, set **both** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Vercel, allow your offer domain in Cloudflare, and redeploy. Never post the Turnstile secret in chat.

## Old CRM contacts

The old CRM kept contacts in your browser, not in Supabase. They will **not** automatically appear in the new CRM. Follow the export/import instructions in `README.md`; imported people start **opted out** until you confirm each person's permission to receive daily WhatsApp notes.

If you want me to preserve the old CRM's chart/social tabs or edit the existing homepage directly, I also need the **actual source repository or project ZIP**. A live Vercel URL alone does not grant access to its source or deployment account.
