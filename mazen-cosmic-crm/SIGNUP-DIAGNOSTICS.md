# Diagnose the CRM signup error (September 2026)

The production CRM previously returned “Signup protection is not configured. Run the supplied Supabase SQL.” for **every** failed Supabase rate-limit RPC, even if the SQL function was present. The signup stops before saving a lead in this case. The updated `/api/leads` route keeps rate limiting enabled and returns a short, non-secret **reference code** if that RPC fails. The actual database error message is logged server-side in Vercel without the visitor's phone number, lead fields, API key, or rate-limit bucket.

## Deploy this CRM update (not the tarot website)

1. Deploy the **contents** of this `mazen-cosmic-crm` folder to the Vercel project that owns `crm-flame-rho-25.vercel.app`. If using the CLI: unzip the package, open a terminal in `mazen-cosmic-crm`, run `npx vercel@latest link`, select the existing **CRM** project, and run `npx vercel@latest --prod`. If the CRM is deployed from Git, update the source file `src/app/api/leads/route.ts` in that repository and push instead.
2. Keep the CRM's existing Production environment variables; this code change needs no new secrets. Do not deploy this Next.js folder to `tarot-tn.vercel.app`.
3. After deployment, try **one** signup using your own details on `/free-reading` (or through the website's embedded form). If it fails, report **only** the displayed reference code, such as `PGRST202`, `42501`, or `UNKNOWN`. Do not share any passwords, keys, tokens, customer data, or request payloads.
4. If the displayed code is `UNKNOWN`, Vercel → CRM project → **Logs** → the `/api/leads` request will contain a `Signup rate-limit RPC failed` entry with a PostgREST message. You may share the error code and a redacted message; hide project IDs, phone numbers, emails and keys. If signup succeeds, check that your lead appears under **Clients**.

A successful SQL Editor test plus a working Clients list proves only that those paths work; it does **not** prove the deployed REST RPC has the correct signature/cache/permissions. Don't disable the public form's protection or repeatedly submit signups while troubleshooting.
