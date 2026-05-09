-- 0007_brew_logs_clicks_numeric.sql
-- brew_logs.clicks was declared `int`, which silently truncated fractional
-- grinder values (Acaia Orbit step 0.1, Mahlkönig EK43 step 0.1, etc.).
-- A user saving "5.3 clicks" got back 5 next time they opened the bean.
--
-- Already applied to production via Supabase MCP.

alter table public.brew_logs
  alter column clicks type numeric using clicks::numeric;
