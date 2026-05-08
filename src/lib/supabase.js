import { createClient } from "@supabase/supabase-js";

// Public-facing Supabase project. The publishable key is safe to ship in the
// client bundle — RLS is what actually protects user data.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://udzsveyedwbmygvpvxpx.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_-mBzL95B_KjuBYpEjmHJiQ_oy63JplW";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SUPABASE_URL_PUBLIC = SUPABASE_URL;
