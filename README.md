# Coffee Brew Tracker

Multi-user espresso, V60, and AeroPress brew tracker with AI assist. Built on Supabase + Vercel.

## Features

- Email signup/login (magic link supported); Google login (configure in Supabase Auth)
- Per-user data — each account sees only their own coffees, enforced by Postgres Row-Level Security
- Search across coffees, roasters, tags, and notes
- Quick-compare table → click a row to scroll & animate the matching card
- Add / edit / delete coffees with a clean modal editor
- AI assist (bring-your-own Anthropic or OpenAI key, kept in browser localStorage):
  - Suggest next dial-in tweak from a taste description
  - Generate starting recipe for a new coffee
  - Web-search a coffee online and tailor a recipe to your taste preferences (Anthropic only)
  - Update an existing recipe based on how the last brew went
  - Rewrite/clean up notes
  - Explain why settings are what they are
- Real-time sync across devices/tabs (Supabase Realtime)
- Layered card-highlight animation on navigation

## Stack

- **Frontend:** single `index.html`, no build step
- **Auth + DB:** Supabase (Postgres + Auth) — free tier
- **Hosting:** Vercel — free Hobby tier (non-commercial)

## Deploy to Vercel

1. Fork or push this repo
2. Import the repo at https://vercel.com/new
3. No environment variables needed — Supabase URL + publishable key are inlined (publishable key is safe in client code; security comes from Postgres RLS)
4. Deploy

## Roadmap

- [x] Phase 1 — Auth + per-user data + BYOK AI
- [ ] Phase 2 — User equipment profile (grinder, machine, basket, burrs, influencers); shared coffee catalog with cache & dedup; AI search bar
- [ ] Phase 3 — Server-side AI proxy + Stripe paid tier (free tier = manual; paid = AI)
- [ ] Phase 4 — Community approval / verified coffees
- [ ] Apple Sign-In (needs Apple Developer Program membership)
