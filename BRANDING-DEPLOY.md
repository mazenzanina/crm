# Tarot TN · manual-only CRM + website logo fix

This source is derived from the **manual-only CRM ZIP**, not the future automatic-WhatsApp branch. There are no Cron jobs, automatic-send routes, or Meta credentials here. Daily WhatsApp messages are still opened and sent individually by the owner.

The previous live CRM returned **404** for `/img/logo-icon.png`, and Next's image optimizer consequently failed. This release embeds the *same original moon-and-stars logo* directly into the CRM signup form, sign-in, reset-password page, and admin sidebar. It also includes a bundled app icon. The public `public/img/logo-icon.png` remains in the ZIP.

Visible names, page titles, privacy text, message footers and admin labels now say **Tarot TN**. Existing links, consent, Supabase data and the LAUNCH10 paid-reading counter are unaffected. Internal localStorage keys beginning with `mazen_` are deliberately unchanged so existing same-day edited drafts and demo data are not lost.

Deploy **this CRM source** into the current Git repository/Root Directory of the Vercel project for `crm-flame-rho-25.vercel.app`. Deploy the separate **website ZIP** into the Git repository/Root Directory serving `tarot-tn.vercel.app`. Copy each ZIP's inner files into its existing repo; do not commit ZIPs as single files and do not change the Vercel project Root Directory. Read `UPDATE-EXISTING-CRM.md` for data-safe instructions. Neither site is changed live until you push these updates.

After both deployments, test the linked website signup page in EN, FR and Tunisian, the embedded logo, the private CRM sign-in, and the booking/draw links. Check the homepage LAUNCH10 display still says **4 of 10 paid spots remain**. A form rendering correctly does not by itself prove the cloud database saved a lead; use your own details for a test and confirm the entry appears in Clients.
