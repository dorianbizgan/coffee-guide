-- favorite flag + custom brew methods + machine capabilities + brew_log
--
-- Adds support for:
-- 1. Per-coffee "favorite" boolean (star icon in the UI)
-- 2. Per-user custom brew methods (extra columns alongside espresso/v60/aeropress)
-- 3. Per-user list of machines with capability flags (preinfusion, pressure profile, etc)
-- 4. Per-coffee brew log history (last brew settings + outcome notes)
--
-- Run in Supabase → SQL Editor → New Query → paste → Run. Idempotent.

-- 1. Favorite flag on each coffee
alter table public.coffees
  add column if not exists favorite boolean not null default false;

-- 2. Custom brew methods bag — per-coffee, keyed by user-defined method name
-- (e.g. "Moka Pot", "French Press"). Each entry is shaped like the existing
-- espresso/v60/aeropress jsonb columns.
alter table public.coffees
  add column if not exists custom_methods jsonb not null default '{}'::jsonb;

-- 3. Brew log — append-only history of brews for this coffee, jsonb array of
-- {method, settings_snapshot, outcome, taste, comments, created_at}
alter table public.coffees
  add column if not exists brew_log jsonb not null default '[]'::jsonb;

-- 4. User-level: list of espresso machines they own, each with capability flags
-- {name, has_preinfusion, has_flow_control, has_pressure_profile, has_pid_temp,
--  has_steam_boiler, basket_grams, notes}
alter table public.user_profiles
  add column if not exists machines jsonb not null default '[]'::jsonb;

-- 5. User-level: custom brew method definitions — when the user wants to
-- track a brew style we don't ship by default. {key, label, default_settings}
alter table public.user_profiles
  add column if not exists custom_brew_methods jsonb not null default '[]'::jsonb;

-- Indexes for the favorite flag (fast filter / order by)
create index if not exists coffees_favorite_idx
  on public.coffees (user_id, favorite desc, position asc);
