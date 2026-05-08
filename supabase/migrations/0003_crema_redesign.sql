-- 0003_crema_redesign.sql
-- Crema (Coffee Field Guide) redesign — fresh schema designed around the
-- new UI's data shape. The old `coffees` and `user_profiles` tables are
-- LEFT IN PLACE for safe rollback; the new app reads/writes only the tables
-- declared below. Once you've confirmed the redesign is stable you can drop
-- them with `drop table public.coffees cascade;`.
--
-- Run in Supabase → SQL Editor → New Query → paste → Run. Idempotent.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. beans — one row per bag of coffee on a user's shelf.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.beans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  roaster     text,
  origin      text,
  process     text,
  roast       text check (roast in ('light','medium-light','medium','medium-dark','dark')),
  notes       text[]    not null default '{}',
  variety     text,
  elevation   text,
  roast_date  date,
  bag_size    text,
  method      text not null default 'v60',
  accent      text,
  stamp       text,
  favorite    boolean   not null default false,
  position    int       not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists beans_user_idx
  on public.beans (user_id, favorite desc, position asc, created_at asc);

alter table public.beans enable row level security;

drop policy if exists "beans owner read"   on public.beans;
drop policy if exists "beans owner insert" on public.beans;
drop policy if exists "beans owner update" on public.beans;
drop policy if exists "beans owner delete" on public.beans;

create policy "beans owner read"
  on public.beans for select to authenticated
  using (auth.uid() = user_id);
create policy "beans owner insert"
  on public.beans for insert to authenticated
  with check (auth.uid() = user_id);
create policy "beans owner update"
  on public.beans for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "beans owner delete"
  on public.beans for delete to authenticated
  using (auth.uid() = user_id);

-- updated_at maintenance
create or replace function public.beans_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists beans_updated_at on public.beans;
create trigger beans_updated_at
  before update on public.beans
  for each row execute function public.beans_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. brew_logs — append-only history of brews. One row per saved tasting note.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.brew_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  bean_id     uuid not null references public.beans(id) on delete cascade,
  method      text not null,
  temp_c      int,
  clicks      int,
  tags        text[]   not null default '{}',
  tasted      text[]   not null default '{}',
  notes_text  text,
  settings    jsonb    not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists brew_logs_user_idx
  on public.brew_logs (user_id, created_at desc);
create index if not exists brew_logs_bean_idx
  on public.brew_logs (bean_id, created_at desc);

alter table public.brew_logs enable row level security;

drop policy if exists "brew_logs owner read"   on public.brew_logs;
drop policy if exists "brew_logs owner insert" on public.brew_logs;
drop policy if exists "brew_logs owner update" on public.brew_logs;
drop policy if exists "brew_logs owner delete" on public.brew_logs;

create policy "brew_logs owner read"
  on public.brew_logs for select to authenticated
  using (auth.uid() = user_id);
create policy "brew_logs owner insert"
  on public.brew_logs for insert to authenticated
  with check (auth.uid() = user_id);
create policy "brew_logs owner update"
  on public.brew_logs for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "brew_logs owner delete"
  on public.brew_logs for delete to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. user_profiles (redesigned) — gear, taste preferences, AI choice.
-- Stored as one row per user with JSONB sub-objects so we can extend without
-- migrations. Keyed by user_id (pk) so upserts are simple.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.user_profiles_v2 (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  gear               jsonb not null default '{}'::jsonb,
  taste_preferences  text  not null default '',
  ai_provider        text  not null default 'anthropic',
  ai_model           text,
  machines           jsonb not null default '[]'::jsonb,
  custom_methods     jsonb not null default '[]'::jsonb,
  updated_at         timestamptz not null default now()
);

alter table public.user_profiles_v2 enable row level security;

drop policy if exists "profiles owner read"   on public.user_profiles_v2;
drop policy if exists "profiles owner write"  on public.user_profiles_v2;

create policy "profiles owner read"
  on public.user_profiles_v2 for select to authenticated
  using (auth.uid() = user_id);
create policy "profiles owner write"
  on public.user_profiles_v2 for insert to authenticated
  with check (auth.uid() = user_id);
create policy "profiles owner update"
  on public.user_profiles_v2 for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. (No view aliasing.) The old `user_profiles` table from the legacy app
-- still holds data; we deliberately leave it alone. The new client reads &
-- upserts `user_profiles_v2` directly. Drop the legacy table once you're
-- confident nobody depends on it.
-- ─────────────────────────────────────────────────────────────────────────
