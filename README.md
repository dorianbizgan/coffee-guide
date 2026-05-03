# Coffee Brew Tracker

Personal espresso, V60, and AeroPress brew tracker with search, AI assist, and optional GitHub sync.

Live: https://dorianbizgan.github.io/coffee-guide/

## Features

- Search across coffees, roasters, tags, and notes
- Click a row in the Quick Compare table to scroll to that coffee — the card animates with a bounce, glowing ring, and pulse
- Add / edit / delete coffees inline
- AI assist (bring-your-own Anthropic or OpenAI key, stored only in your browser):
  - Suggest the next dial-in tweak from your last brew's taste
  - Generate a starting recipe for a new coffee
  - Search the web for a coffee's profile and tailor a recipe to your taste preferences (Anthropic only)
  - Update an existing recipe based on how the last brew actually went
  - Rewrite/clean up notes
  - Explain why settings are what they are
- Two sync modes:
  - Browser-only — edits live in `localStorage`
  - GitHub — paste a Personal Access Token in Settings and edits commit back to this repo automatically

## File layout

```
index.html   ← the whole app
data.json    ← the coffees (read on load, written on GitHub sync)
README.md
```

## GitHub Pages setup

1. Push these files to the root of your repo (`coffee-guide`)
2. Repo → **Settings → Pages**
3. **Source: Deploy from a branch**, branch **main**, folder **/ (root)**
4. Site is live at `https://YOUR_USERNAME.github.io/coffee-guide/` in ~1 minute

## First run

1. Open the site
2. Click the gear icon → fill in:
   - **AI provider** — Anthropic (recommended, supports web search) or OpenAI
   - **API key** — get one from console.anthropic.com or platform.openai.com
   - **Taste preferences** — short paragraph the AI uses for recommendations
3. (Optional) **GitHub sync** — paste a fine-grained Personal Access Token with `contents:write` scope on this repo. Owner/repo auto-fill from the URL. Edits will commit back automatically (debounced 2s).

All keys are stored only in your browser's `localStorage`. No backend, no server.

## Updating the site

Just edit and push:

```bash
git add .
git commit -m "update"
git push
```

GitHub Pages redeploys automatically.

## How GitHub sync works

When a PAT is set, every edit triggers a debounced PUT to `https://api.github.com/repos/OWNER/REPO/contents/data.json`. GitHub Pages rebuilds, and on next page load the latest `data.json` is fetched. The app caches in `localStorage` so changes appear instantly even before the rebuild lands.

If you don't want sync: leave the PAT blank. Edits save in the browser only and persist across reloads on the same device.

## AI cost note

You pay per call directly to your AI provider. A typical "suggest tweak" uses ~1k tokens (≈ $0.01 on Sonnet); web-search lookups use 3-6k tokens (≈ $0.05-0.10). OpenAI pricing is similar.
