// Data layer over Supabase + a guest-mode localStorage fallback.
// Schema (see supabase/migrations/0003_crema_redesign.sql):
//   beans(id uuid, user_id, name, roaster, origin, process, roast, variety,
//         elevation, notes text[], roast_date date, bag_size, method, accent,
//         stamp, favorite bool, position int, created_at, updated_at)
//   brew_logs(id, user_id, bean_id, method, temp_c, clicks, tags text[],
//             tasted text[], notes_text, settings jsonb, created_at)
//   user_profiles(user_id pk, gear jsonb, taste_preferences text, ai_provider,
//                 ai_model, custom_methods jsonb, machines jsonb, updated_at)
import { supabase } from "./supabase.js";
import { SAMPLE_COFFEES, ACCENTS } from "./data.js";

const GUEST_KEY = "crema-guest-shelf";
const GUEST_PROFILE_KEY = "crema-guest-profile";

function isGuest(user) {
  return !user || user.mode === "guest";
}

function readGuestShelf() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed with the design's sample coffees the first time
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(SAMPLE_COFFEES)); } catch {}
  return SAMPLE_COFFEES;
}
function writeGuestShelf(list) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(list)); } catch {}
}
function readGuestProfile() {
  try {
    const raw = localStorage.getItem(GUEST_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { gear: {}, tastePreferences: "", aiProvider: "anthropic" };
}
function writeGuestProfile(p) {
  try { localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(p)); } catch {}
}

function rowToCoffee(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    roaster: row.roaster,
    origin: row.origin,
    process: row.process,
    roast: row.roast,
    notes: row.notes || [],
    variety: row.variety || "",
    elevation: row.elevation || "",
    roastDate: row.roast_date || "",
    bagSize: row.bag_size || "",
    method: row.method || "v60",
    accent: row.accent || ACCENTS[0],
    stamp: row.stamp || "",
    favorite: !!row.favorite,
    brewLog: row.brew_log || [],
  };
}

function coffeeToRow(c, userId) {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    roaster: c.roaster,
    origin: c.origin,
    process: c.process,
    roast: c.roast,
    notes: c.notes || [],
    variety: c.variety || null,
    elevation: c.elevation || null,
    roast_date: c.roastDate || null,
    bag_size: c.bagSize || null,
    method: c.method || "v60",
    accent: c.accent || null,
    stamp: c.stamp || null,
    favorite: !!c.favorite,
  };
}

// Convert a UUID-or-undefined to a valid UUID string. Coffees created on the
// design side use ids like "c1", "c2" — those are localStorage-only and we
// never send them to Supabase. New rows created in authed mode get a uuid via
// crypto.randomUUID().
function ensureUuid(id) {
  if (typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export async function loadCoffees(user) {
  if (isGuest(user)) return readGuestShelf();
  const { data, error } = await supabase
    .from("beans")
    .select("*, brew_logs(*)")
    .order("favorite", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[db] loadCoffees:", error.message);
    return [];
  }
  // Map embedded brew_logs into the shape the UI expects (a brewLog array on the coffee).
  return (data || []).map((row) => {
    const logs = (row.brew_logs || []).map((l) => ({
      method: l.method,
      text: l.notes_text || "",
      tags: l.tags || [],
      tasted: l.tasted || [],
      temp: l.temp_c,
      clicks: l.clicks,
      savedAt: l.created_at,
    }));
    return { ...rowToCoffee(row), brewLog: logs };
  });
}

export async function saveCoffee(user, coffee) {
  if (isGuest(user)) {
    const list = readGuestShelf();
    const idx = list.findIndex((c) => c.id === coffee.id);
    const next = idx >= 0
      ? list.map((c, i) => (i === idx ? { ...c, ...coffee } : c))
      : [...list, coffee];
    writeGuestShelf(next);
    return coffee;
  }
  const row = coffeeToRow({ ...coffee, id: ensureUuid(coffee.id) }, user.id);
  const { data, error } = await supabase
    .from("beans")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return rowToCoffee(data);
}

export async function deleteCoffee(user, id) {
  if (isGuest(user)) {
    const list = readGuestShelf().filter((c) => c.id !== id);
    writeGuestShelf(list);
    return;
  }
  const { error } = await supabase.from("beans").delete().eq("id", id);
  if (error) throw error;
}

export async function setFavorite(user, id, favorite) {
  if (isGuest(user)) {
    const list = readGuestShelf().map((c) => (c.id === id ? { ...c, favorite } : c));
    writeGuestShelf(list);
    return;
  }
  const { error } = await supabase.from("beans").update({ favorite }).eq("id", id);
  if (error) throw error;
}

export async function setMethod(user, id, method) {
  if (isGuest(user)) {
    const list = readGuestShelf().map((c) => (c.id === id ? { ...c, method } : c));
    writeGuestShelf(list);
    return;
  }
  const { error } = await supabase.from("beans").update({ method }).eq("id", id);
  if (error) throw error;
}

export async function appendBrewLog(user, beanId, entry) {
  if (isGuest(user)) {
    const list = readGuestShelf().map((c) =>
      c.id === beanId ? { ...c, brewLog: [...(c.brewLog || []), entry] } : c
    );
    writeGuestShelf(list);
    return;
  }
  const { error } = await supabase.from("brew_logs").insert({
    user_id: user.id,
    bean_id: beanId,
    method: entry.method,
    temp_c: entry.temp,
    clicks: entry.clicks,
    tags: entry.tags || [],
    tasted: entry.tasted || [],
    notes_text: entry.text || "",
    settings: entry.settings || {},
  });
  if (error) throw error;
}

export async function loadProfile(user) {
  if (isGuest(user)) return readGuestProfile();
  const { data, error } = await supabase
    .from("user_profiles_v2")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    console.warn("[db] loadProfile:", error.message);
  }
  if (!data) return { gear: {}, tastePreferences: "", aiProvider: "anthropic" };
  return {
    gear: data.gear || {},
    tastePreferences: data.taste_preferences || "",
    aiProvider: data.ai_provider || "anthropic",
    aiModel: data.ai_model || null,
    machines: data.machines || [],
    customMethods: data.custom_methods || [],
  };
}

export async function saveProfile(user, profile) {
  if (isGuest(user)) {
    writeGuestProfile(profile);
    return profile;
  }
  const row = {
    user_id: user.id,
    gear: profile.gear || {},
    taste_preferences: profile.tastePreferences || "",
    ai_provider: profile.aiProvider || "anthropic",
    ai_model: profile.aiModel || null,
    machines: profile.machines || [],
    custom_methods: profile.customMethods || [],
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("user_profiles_v2").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
  return profile;
}

export async function loadAllBrewLogs(user) {
  if (isGuest(user)) {
    const list = readGuestShelf();
    return list
      .flatMap((c) =>
        (c.brewLog || []).map((l) => ({
          ...l,
          beanId: c.id,
          beanName: c.name,
          beanRoaster: c.roaster,
        }))
      )
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }
  const { data, error } = await supabase
    .from("brew_logs")
    .select("*, beans(name, roaster)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[db] loadAllBrewLogs:", error.message);
    return [];
  }
  return (data || []).map((l) => ({
    method: l.method,
    text: l.notes_text || "",
    tags: l.tags || [],
    tasted: l.tasted || [],
    temp: l.temp_c,
    clicks: l.clicks,
    savedAt: l.created_at,
    beanId: l.bean_id,
    beanName: l.beans?.name || "—",
    beanRoaster: l.beans?.roaster || "",
  }));
}
