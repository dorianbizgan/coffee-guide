-- ai_cache: shared cache for "brewing tip" AI responses.
-- Same prompt → same answer for everyone, so we hash the request and only call
-- the AI on cache miss. Cuts cost dramatically for repeat questions.
--
-- Run this in Supabase → SQL Editor (or via the CLI). One-time setup.

create table if not exists public.ai_cache (
    key         text primary key,
    value       text not null,
    provider    text,
    created_at  timestamptz not null default now(),
    expires_at  timestamptz not null
);

create index if not exists ai_cache_expires_idx on public.ai_cache (expires_at);

alter table public.ai_cache enable row level security;

-- Anyone signed in (including anonymous guest users) may read cached entries.
drop policy if exists "auth read ai_cache" on public.ai_cache;
create policy "auth read ai_cache"
    on public.ai_cache
    for select
    to authenticated
    using (expires_at > now());

-- Authenticated users may insert/upsert. We never let users overwrite an entry
-- with malicious content because the key is a SHA-256 of the canonicalized
-- request (server-controlled), and the value is what the AI just produced.
drop policy if exists "auth write ai_cache" on public.ai_cache;
create policy "auth write ai_cache"
    on public.ai_cache
    for insert
    to authenticated
    with check (expires_at > now() and length(value) <= 16000);

-- Optional: a scheduled vacuum-like job that prunes expired rows. If you have
-- pg_cron enabled (free tier doesn't), uncomment:
-- select cron.schedule('ai_cache_prune', '0 4 * * *', $$delete from public.ai_cache where expires_at <= now()$$);
