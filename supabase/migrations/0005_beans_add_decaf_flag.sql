-- 0005_beans_add_decaf_flag.sql
-- Decaf is a separate dimension from process — a bean can be a "Washed
-- Decaf", "EA Decaf", "Swiss Water Decaf", etc. The brew-side adjustments
-- are roughly the same regardless of decaf method (softer beans, extract
-- faster — coarser grind, slightly cooler water), so we collapse it to a
-- boolean and keep `process` for the actual processing method.
--
-- Already applied to production via Supabase MCP on 2026-05-08.

alter table public.beans
  add column if not exists decaf boolean not null default false;
