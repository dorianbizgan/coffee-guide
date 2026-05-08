# Crema email templates

Branded HTML for the four Supabase auth emails so they match the look of the
site (warm cream background, espresso-ink CTA, the same wordmark you see in
the header).

## Install

In the Supabase dashboard:

1. Go to **Authentication → Email Templates**.
2. For each template type below, paste the matching file's contents into the
   **Source** tab (NOT the WYSIWYG tab — Supabase will mangle inline styles).
3. Click **Save**.

| Supabase template          | File in this folder    |
| -------------------------- | ---------------------- |
| Confirm signup             | `confirm.html`         |
| Magic Link                 | `magic-link.html`      |
| Reset Password (Recovery)  | `recovery.html`        |
| Invite user                | `invite.html`          |

The optional `_base.html` file is the shared layout for reference; you don't
paste it into Supabase directly.

## Subjects (recommended)

- Confirm signup: `Welcome to Crema — confirm your email`
- Magic Link: `Your Crema sign-in link`
- Reset Password: `Reset your Crema password`
- Invite user: `You've been invited to Crema`

## Notes

- All templates use only the Supabase Liquid variables that ship by default:
  `{{ .ConfirmationURL }}`, plus `{{ .Email }}` if you want to mention the user's
  address. They render correctly in Gmail, Outlook (web + desktop), Apple Mail,
  and most third-party clients.
- The hero gradient and rounded corners are pure inline CSS so they survive
  CSS-stripping clients. The coffee-cup logo is rendered via a CSS radial
  gradient on a `<span>` so no image hosting is needed.
- If you change the brand color in `index.html`, also bump the matching hex
  values in these templates: `#1d0f04` (espresso ink), `#3a1c08` (deep), and
  `#c0844a` / `#8a4f1c` (gold / amber accent).
