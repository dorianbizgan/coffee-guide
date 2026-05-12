# Tests

End-to-end mobile-emulation tests with Playwright. They assert the page
fits inside the viewport on iPhone widths (375 / 393 / 440 / 744) and that
the happy-path flows work: open a card, start the brew timer, switch
methods, favorite, search, run the Log-a-coffee wizard.

## One-time setup

```bash
npm install
npx playwright install chromium
```

In sandboxed envs where the bundled chromium can't be downloaded, point at
a system chromium via `CHROME`:

```bash
CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:e2e
```

## Run

Start the dev server in one terminal:

```bash
npm run dev
```

And in another:

```bash
npm run test:e2e        # full happy-path smoke run
npm run test:overflow   # quick overflow audit on dashboard + detail
```

`E2E_URL` overrides the target (default `http://127.0.0.1:5173/`).

## What they cover

- Landing → Continue as guest → dashboard renders sample shelf
- Circular timer ring rendered, visible, within viewport on every card
- Click ring → timer ticks; open detail → same elapsed shown there
- Switch brew method from detail tabs and from card dropdown
- Favorite/unfavorite a card; Favorites filter chip
- Search the shelf
- Open Log-a-coffee wizard, walk all 3 steps, save, land in detail view
- No horizontal overflow at any of: landing, dashboard, detail, modal,
  back-to-dashboard, after method switch, final state
