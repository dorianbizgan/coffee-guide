// Thin client over /api/ai. Always sends the current Supabase access token
// so the server-side proxy can authorize the call.
//
// Provider selection: the user picks their AI provider in Gear →
// Preferences. We default to Google Gemini because it's the only one with
// a usable free tier — the others require the deployer to have paid keys.
// The choice is threaded through every aiPost so the server doesn't have
// to guess.
import { supabase } from "./supabase.js";

const DEFAULT_PROVIDER = "google";

async function bearerToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || "";
}

async function aiPost(payload) {
  const token = await bearerToken();
  // If the caller didn't pin a provider, fall back to the saved profile
  // preference; if that's missing too, use the default. We avoid making
  // every callsite read profile, so we cache it on a module-level slot
  // that `setAiProvider` updates whenever the profile loads.
  const body = { provider: payload.provider || _provider || DEFAULT_PROVIDER, ...payload };
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `AI call failed (${res.status})`);
  return json;
}

// Module-level "current user preference". Set from App when the profile
// loads / changes. This lets every aiPost honour the user's pick without
// having to plumb the profile through every call signature.
let _provider = null;
export function setAiProvider(p) {
  _provider = p || null;
}

export async function aiStatus() {
  const res = await fetch("/api/ai");
  if (!res.ok) return { anthropic: false, openai: false, google: false };
  return res.json().catch(() => ({ anthropic: false, openai: false, google: false }));
}

// Look up the click/setting range for a coffee grinder the app doesn't
// know about. Returns { name, min, max, step, fmt, anchors } or null.
// Called once per unknown grinder; the App caches the result on the
// user's profile so repeat visits don't re-burn tokens.
// `anchors` give typical settings for each brew method — these are what
// the dial uses to translate between grinders without falling back to
// "0.5 of full range = 0.5 of full range" linear math.
export async function lookupGrinderScale(grinderName) {
  if (!grinderName || !grinderName.trim()) return null;
  const userPrompt = `What is the burr-adjustment scale of the coffee grinder "${grinderName}", and what are the typical settings for common brew methods?
Return ONLY valid JSON with this exact shape — no prose, no markdown fences:
{
  "name": "<canonical product name>",
  "min": <number, value at finest>,
  "max": <number, value at coarsest>,
  "step": <number, smallest increment: 1 for click grinders, 0.1 for stepless dials, etc.>,
  "fmt": "<integer | decimal-1 | decimal-2>",
  "anchors": {
    "espresso":  <typical espresso setting>,
    "moka":      <typical moka pot setting>,
    "aeropress": <typical Aeropress setting>,
    "v60":       <typical V60 pourover setting>,
    "chemex":    <typical Chemex setting>,
    "french":    <typical French press setting>,
    "cold":      <typical cold brew setting>
  }
}
Examples:
- Comandante C40 → {"name":"Comandante C40","min":6,"max":36,"step":1,"fmt":"integer","anchors":{"espresso":8,"moka":14,"aeropress":18,"v60":22,"chemex":25,"french":30,"cold":36}}
- Acaia Orbit (Lab Sweet V3) → {"name":"Acaia Orbit (Lab Sweet V3)","min":0,"max":10,"step":0.1,"fmt":"decimal-1","anchors":{"espresso":2.5,"moka":4,"aeropress":5.5,"v60":6.5,"chemex":7.5,"french":8.5,"cold":10}}
All anchor values MUST be within [min, max]. If the grinder is genuinely unknown, return {"unknown": true}.`;
  try {
    const json = await aiPost({
      system: "You are a coffee grinder catalog. Return only valid JSON.",
      messages: [{ role: "user", content: userPrompt }],
      jsonMode: true,
      max_tokens: 400,
    });
    const cleaned = (json.text || "").replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (parsed.unknown) return null;
    if (
      typeof parsed.min !== "number" ||
      typeof parsed.max !== "number" ||
      typeof parsed.step !== "number" ||
      parsed.max <= parsed.min
    ) return null;
    const fmt = ["integer", "decimal-1", "decimal-2"].includes(parsed.fmt) ? parsed.fmt : "integer";
    // Sanity-check anchors: every value must be within the declared scale
    // range. Drop any that aren't so a single bad value can't poison the
    // conversion table.
    let anchors = null;
    if (parsed.anchors && typeof parsed.anchors === "object") {
      anchors = {};
      for (const k of ["espresso", "moka", "aeropress", "v60", "chemex", "french", "cold"]) {
        const v = parsed.anchors[k];
        if (typeof v === "number" && v >= parsed.min && v <= parsed.max) anchors[k] = v;
      }
      if (Object.keys(anchors).length < 2) anchors = null;
    }
    return {
      name: parsed.name || grinderName,
      min: parsed.min,
      max: parsed.max,
      step: parsed.step,
      fmt,
      anchors,
      source: "ai",
    };
  } catch {
    return null;
  }
}

// Dial-tweak suggestion based on what the user just tasted.
// Returns { tempC, clicks, advice } or { error }.
// `grinder` is the user's resolved grinder scale ({ name, min, max, step,
// fmt }). The AI is told that scale explicitly and asked to reply with
// clicks in the user's units — so an Acaia Orbit user gets "6.4" back,
// not "22 on a Comandante" that the UI then has to translate.
export async function suggestDialTweak({ coffee, method, recipe, temp, clicks, tags, tasted, note, preferences, grinder }) {
  const grinderName = grinder?.name || "Comandante C40";
  const gMin = grinder?.min ?? 6;
  const gMax = grinder?.max ?? 36;
  const gStep = grinder?.step ?? 1;
  const stepHint =
    gStep < 1 ? `in increments of ${gStep} (decimals allowed)` : `as whole numbers`;
  const userPrompt = `You are a coffee brewing coach. The user is brewing ${coffee.name} from ${coffee.roaster} (${coffee.origin}, ${coffee.process}, ${coffee.roast} roast) using ${method.name}.
Grinder: ${grinderName}. Its adjustment scale runs from ${gMin} (finest) to ${gMax} (coarsest), ${stepHint}.
Current dial: ${temp}°C water, ${clicks} on the grinder, ${recipe.dose}g dose, 1:${recipe.ratio} ratio, ${recipe.time} total.
Bean's expected notes: ${(coffee.notes || []).join(", ")}.
What the user tasted this brew: ${tasted?.length ? tasted.join(", ") : "—"}.
Issues/feedback: ${tags?.length ? tags.join(", ") : "—"}.
Their freeform note: ${note || "—"}
${preferences ? `\nThe user's overall taste preferences: ${preferences}` : ""}

Return ONLY valid JSON with this exact shape, no prose, no markdown fences:
{"tempC": <number 80-99>, "clicks": <number between ${gMin} and ${gMax} on the ${grinderName} scale>, "advice": "<one or two short sentences explaining the change and what to look for next brew. Reference the user's grinder by name and use its actual scale numbers.>"}`;

  const json = await aiPost({
    system: "You are a precise coffee brewing coach. Always reply with valid JSON only when asked.",
    messages: [{ role: "user", content: userPrompt }],
    jsonMode: true,
    max_tokens: 600,
  });
  const cleaned = (json.text || "").replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned);
}

// Lookup an unknown bean online. Returns a partial bean profile we can prefill
// the form with. Tries Anthropic first (web search) then falls back to text.
export async function lookupBeanOnline(query, preferences) {
  const userPrompt = `You're a coffee shop staff helper. The user wants to log a coffee they own but doesn't have all the details. Find this coffee online: "${query}".

Important categorization rules so the user's recipe routes to the right brew method:
- ESPRESSO BLENDS (e.g. Olympia Big Truck, Onyx Southern Weather, Counter Culture Hologram, Stumptown Hair Bender, Proud Mary Pillow Fight, comfort blends, dark/medium-dark roasts marketed for milk drinks) — set "intendedMethod" to "espresso", and set "roast" to medium-dark or dark unless the roaster explicitly says otherwise.
- SINGLE-ORIGIN LIGHT ROASTS (washed/natural Ethiopias, Kenyas, Geishas, Pink Bourbons) — set "intendedMethod" to "v60", "roast" to light or medium-light.
- DARK ROAST SINGLE ORIGINS — "intendedMethod" = "espresso".
- If you genuinely cannot tell, default "intendedMethod" to "v60".

Return ONLY valid JSON in this shape (no prose, no markdown):
{
  "name": "<full coffee name>",
  "roaster": "<roaster name>",
  "origin": "<region, country>",
  "process": "<Washed | Natural | Honey | Anaerobic Natural | Pulped Natural>",
  "roast": "<light | medium-light | medium | medium-dark | dark>",
  "intendedMethod": "<espresso | v60 | aeropress | french | chemex | moka | cold>",
  "variety": "<varietals if known, else empty>",
  "elevation": "<e.g. 1,800 m, else empty>",
  "notes": "<comma-separated tasting notes>"
}
${preferences ? `\nKeep the user's taste preferences in mind: ${preferences}` : ""}`;

  const json = await aiPost({
    system: "Return only valid JSON when asked. Use web search to find accurate details. Be especially careful to identify whether a coffee is an espresso blend or a single-origin filter coffee — get this wrong and the user gets the wrong recipe.",
    messages: [{ role: "user", content: userPrompt }],
    useWebSearch: true,
    jsonMode: true,
    mode: "recipe",
    max_tokens: 1200,
  });
  const cleaned = (json.text || "").replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return parsed.name ? parsed : null;
  } catch {
    return null;
  }
}
