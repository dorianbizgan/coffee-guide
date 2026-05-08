-- 0006_beans_add_storage.sql
-- Storage method changes how fast a bag ages — sealed in a freezer
-- effectively pauses aging, vacuum / fridge slow it, room temp is the
-- baseline. The recipe engine uses storage + roast_date to compute an
-- "effective age" that drives a fine grind + temp adjustment.
--
-- Already applied to production via Supabase MCP on 2026-05-08.

alter table public.beans
  add column if not exists storage text not null default 'room'
    check (storage in ('room', 'vacuum', 'fridge', 'freezer'));

-- Optional: when the bag went into the freezer. If set, time after this
-- date counts at ~5% of normal. If unset (and storage='freezer'), we
-- assume the bag has been frozen the whole time since roast.
alter table public.beans
  add column if not exists frozen_since date;
