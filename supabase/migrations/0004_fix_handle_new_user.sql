-- 0004_fix_handle_new_user.sql
-- Bug fix: signup was failing with "Database error saving new user".
--
-- Root cause: the on_auth_user_created trigger calls handle_new_user(),
-- which was inserting into public.user_profiles. That table was dropped
-- after the redesign migration (0003) ran, so every signup — real OR
-- anonymous-guest — failed inside the trigger and Supabase rolled back
-- the auth.users insert.
--
-- Fix: repoint the function at user_profiles_v2 (the new schema) and make
-- the insert idempotent. The trigger itself is unchanged.
--
-- Already applied to production via Supabase MCP on 2026-05-08; checking
-- it in for parity with future environments.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles_v2 (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
