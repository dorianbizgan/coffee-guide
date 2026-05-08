// Thin client over /api/ai. Always sends the current Supabase access token
// (real user OR anonymous-guest session) so the proxy can authorize.
//
// Provider routing: the server doesn't auto-fall-back. If we ask for
// "anthropic" and only GEMINI_API_KEY is set, we get a 503. We ping the
// public GET /api/ai once at startup, cache which providers exist, and pick
// in priority order: user's stored preference → google → anthropic → openai.
import { supabase } from "./supabase.js";

let _statusPromise = null;
async function statusOnce() {
  if (!_statusPromise) {
    _statusPromise = fetch("/api/ai")
      .then((r) => (r.ok ? r.json() : { anthropic: false, openai: false, google: false }))
      .catch(() => ({ anthropic: false, openai: false, google: false }));
  }
  return _statusPromise;
}

// Force a re-check (e.g. after config change). Rarely needed — Vercel env
// vars only change on redeploy.
export function refreshAiStatus() {
  _statusPromise = null;
  return statusOnce();
}

export async function aiStatus() {
  return statusOnce();
}

async function pickProvider(preferred) {
  const status = await statusOnce();
  const order = [];
  if (preferred && status[preferred]) order.push(preferred);
  for (const p of ["google", "anthropic", "openai"]) {
    if (status[p] && !order.includes(p)) order.push(p);
  }
  return order[0] || null;
}

async function bearerToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || "";
}

async function aiPost(payload, preferredProvider) {
  const provider = await pickProvider(preferredProvider);
  if (!provider) {
    throw new Error("No AI provider is configured on this deployment. Add ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in Vercel.");
  }
  const token = await bearerToken();
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...payload, provider }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { error: text }; }
  if (!res.ok) throw new Error(json.error || `AI call failed (${res.status})`);
  return { ...json, provider };
}

// Strip ```json fences and grab the first {...} blob, then JSON.parse.
// On a truncated/grounded response (Gemini sometimes returns the search
// summary first, then prose, then JSON), we prefer the LAST balanced {...}
// in the string. If parsing fails, fall back to a soft repair pass that
// strips trailing commas and trailing prose past the last }.
function extractJson(raw, finishReason) {
  const cleaned = (raw || "").replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    if (finishReason && finishReason !== "STOP") {
      throw new Error(`AI response was cut off (${finishReason}). Try again — usually transient.`);
    }
    throw new Error("AI returned no JSON object — try again.");
  }
  const slice = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (e) {
    // Soft repair: drop trailing commas before } or ]
    const repaired = slice.replace(/,\s*([}\]])/g, "$1");
    try { return JSON.parse(repaired); }
    catch {
      if (finishReason && finishReason !== "STOP") {
        throw new Error(`AI response was cut off (${finishReason}). Try again.`);
      }
      throw e;
    }
  }
}

// Dial-tweak suggestion based on what the user just tasted.
// Returns { tempC, clicks, advice }.
export async function suggestDialTweak({
  coffee, method, recipe, temp, clicks, tags, tasted, note,
  grinder, grinderRange, preferences, preferredProvider,
}) {
  const grinderLabel = grinder?.label || "Comandante C40";
  const rangeLabel = grinderRange
    ? `${grinderRange.min}–${grinderRange.max} ${grinderRange.unit || "clicks"} (lower = finer)`
    : "6–36 clicks (Comandante C40 scale)";

  const decafLine = coffee.decaf
    ? "\nThis bean is DECAF. Decaf beans are softer & more porous, so they extract faster than regular beans at the same setting — typically a coarser grind and slightly cooler water than the equivalent caffeinated bean."
    : "";
  const userPrompt = `You are a coffee brewing coach. The user is brewing ${coffee.name} from ${coffee.roaster} (${coffee.origin}, ${coffee.process}${coffee.decaf ? " · decaf" : ""}, ${coffee.roast} roast) using ${method.name}.${decafLine}
Current dial: ${temp}°C water, ${clicks} ${grinderRange?.unit || "clicks"} on a ${grinderLabel}, ${recipe.dose}g dose, 1:${recipe.ratio} ratio, ${recipe.time} total.
Grinder valid range: ${rangeLabel}.
Bean's expected notes: ${(coffee.notes || []).join(", ") || "—"}.
What the user tasted this brew: ${tasted?.length ? tasted.join(", ") : "—"}.
Issues/feedback: ${tags?.length ? tags.join(", ") : "—"}.
Their freeform note: ${note || "—"}
${preferences ? `\nThe user's overall taste preferences: ${preferences}` : ""}

Return ONLY valid JSON with exactly this shape, no prose, no markdown fences:
{"tempC": <integer 80-99>, "clicks": <integer in the grinder's valid range>, "advice": "<one or two short sentences explaining the change and what to look for next brew>"}`;

  const json = await aiPost({
    system: "You are a precise coffee brewing coach. Always reply with valid JSON only when asked. Keep advice under 50 words.",
    messages: [{ role: "user", content: userPrompt }],
    jsonMode: true,
    // mode "tip" pins Gemini's thinkingBudget=128 so dynamic thinking can't
    // eat our token budget mid-JSON, AND read-throughs the ai_cache table so
    // the same brew dial doesn't burn a token round-trip on retry.
    mode: "tip",
    max_tokens: 1200,
  }, preferredProvider);
  return extractJson(json.text, json.finishReason);
}

// Lookup an unknown bean online. Returns a partial bean profile that fills
// every field the new-coffee form / dashboard card needs.
export async function lookupBeanOnline(query, preferences, preferredProvider) {
  const userPrompt = `You are a coffee shop staff helper with web access. Find this coffee online: "${query}".

Search the roaster's official site first if you can identify it. Return a complete profile so the user doesn't have to fill anything in by hand.

Return ONLY valid JSON in EXACTLY this shape (no prose, no markdown fences). Every field is required — if you can't find it from the roaster's page, infer the most likely value from the coffee's region/style and put it in. NEVER leave a field blank or null.

{
  "name": "<full coffee name as printed on the bag>",
  "roaster": "<roaster name>",
  "origin": "<region, country — e.g. Yirgacheffe, Ethiopia>",
  "process": "<one of: Washed | Natural | Honey | Anaerobic Natural | Pulped Natural — for decaf, return the underlying process and set decaf:true below>",
  "roast": "<one of: light | medium-light | medium | medium-dark | dark>",
  "decaf": <true if this is a decaf coffee (Swiss Water, EA, MC, sugarcane, etc.) — false otherwise>,
  "variety": "<varietals — e.g. Heirloom, SL28, Bourbon>",
  "elevation": "<elevation with units — e.g. 1,950 m or 1,950–2,200 masl>",
  "notes": "<comma-separated tasting notes from the bag — e.g. jasmine, bergamot, white peach>",
  "bagSize": "<e.g. 250g, 340g, 12oz — best guess if unknown>",
  "stamp": "<one short label for the card stamp — e.g. Single Origin · Lot 04, or Anaerobic · 2026>"
}
${preferences ? `\nUse the user's taste preferences for context (do not override the roaster's actual notes): ${preferences}` : ""}`;

  const json = await aiPost({
    system: "You return only valid JSON. Use web search aggressively. Every requested field MUST be populated; if the roaster's page is missing one, infer it from origin/style. Do not include explanatory prose before or after the JSON.",
    messages: [{ role: "user", content: userPrompt }],
    useWebSearch: true,
    jsonMode: true,
    mode: "recipe",
    max_tokens: 4000,
  }, preferredProvider);
  try {
    const parsed = extractJson(json.text);
    return parsed.name ? parsed : null;
  } catch {
    return null;
  }
}
