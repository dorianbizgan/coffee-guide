# Crema — Coffee Brew Tracker

Multi-user espresso, V60, and AeroPress brew tracker with AI assist. Built on Supabase + Vercel, served as a single static `index.html` plus one serverless function.

## Features

- **Espresso-crema visual identity** — marbled tiger-stripe background rendered via SVG turbulence; live foam-bubble canvas; Apple-tier glassmorphic surfaces.
- Email signup/login, magic-link login, Google login, **forgot-password** flow with branded reset emails.
- **Try the demo** mode — local-only browser session, no Supabase, no email needed (workaround for free-tier email rate limits while you're iterating).
- Per-user data, with Postgres Row-Level Security so accounts never see each other.
- Search across coffees, roasters, tags, and notes.
- Quick-compare table — click a row to scroll-and-pulse the matching card.
- Add / edit / delete coffees with a clean modal editor.
- **AI assist — no API key needed when deployed with `ANTHROPIC_API_KEY` in Vercel**:
  - Suggest the next dial-in tweak from a taste description
  - Generate a starting recipe for a new coffee
  - Web-search a coffee online and tailor a recipe to your taste preferences
  - Update an existing recipe based on how the last brew went
  - Rewrite / clean up notes
  - Explain the reasoning behind the settings
- Bring-your-own-key fallback when no server key is configured.

## Stack

- **Frontend:** single `index.html`, no build step
- **Serverless:** `/api/ai.js` — proxies to Anthropic / OpenAI using server-stored keys, verifying a Supabase access token on every call
- **Auth + DB:** Supabase (Postgres + Auth) — free tier
- **Hosting:** Vercel — free Hobby tier (non-commercial)

## Deploy to Vercel

1. Fork or push this repo.
2. Import the repo at https://vercel.com/new.
3. **(Recommended) Add an `ANTHROPIC_API_KEY`** environment variable in Vercel → Project → Settings → Environment Variables. Get one at https://console.anthropic.com/. With this set, every signed-in user of your deployment gets AI features without pasting a key. Optionally also set `OPENAI_API_KEY`.
4. Deploy.

If you skip step 3, the app still works — users can paste their own key under Settings → AI provider → Advanced.

## Configure the Supabase project (one-time)

After deploying:

1. **Site URL** — Authentication → URL Configuration → set "Site URL" to your Vercel production URL (e.g. `https://crema.vercel.app`).
2. **Redirect URLs** — add the same URL plus any preview-deployment patterns you want to support (e.g. `https://*.vercel.app`). The forgot-password link won't work otherwise.
3. **Branded emails** — paste the templates in [`supabase/email-templates/`](supabase/email-templates/) into Authentication → Email Templates. See the README in that folder for which file goes where.
4. **Google login (optional)** — Authentication → Providers → Google → enable, follow the setup wizard.

## Hitting the free-tier email rate limit?

Supabase's free tier limits auth emails (signup, magic link, recovery) to a small number per hour. While you're building or testing the site, click **"Try the demo (no email, local only)"** on the login screen — it skips Supabase auth entirely and stores everything in your browser's localStorage. When you're ready, sign up properly and your demo data isn't lost (it stays in localStorage; you can copy it across via Settings → Export Data).

If you need higher email limits in production, add a custom SMTP provider in Authentication → SMTP Settings (free tiers from SendGrid, Resend, Mailgun, etc.).

### Security notes for `/api/ai`

- The proxy verifies a Supabase access token before each call, so anonymous internet traffic can't burn your tokens.
- A 20-requests-per-minute rate limit per `(user, IP)` is built in. For production you'd want a proper Redis-backed limiter (e.g. Upstash).
- The Supabase publishable key in `index.html` is safe to expose; row-level security on the database enforces per-user isolation.

## Roadmap

- [x] Phase 1 — Auth + per-user data + BYOK AI
- [x] Phase 2 — User equipment profile (grinder, machine, basket, burrs, influencers)
- [x] Phase 3 — Server-side AI proxy (no client-side API key needed)
- [x] Phase 4 — Forgot-password flow + branded transactional emails + demo mode
- [ ] Phase 5 — Community approval / verified coffees
- [ ] Apple Sign-In (needs Apple Developer Program membership)
