// Thin client over /api/ai. Always sends the current Supabase access token
// so the server-side proxy can authorize the call.
import { supabase } from "./supabase.js";

async function bearerToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || "";
}

async function aiPost(payload) {
  const token = await bearerToken();
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `AI call failed (${res.status})`);
  return json;
}

export async function aiStatus() {
  const res = await fetch("/api/ai");
  if (!res.ok) return { anthropic: false, openai: false, google: false };
  return res.json().catch(() => ({ anthropic: false, openai: false, google: false }));
}

// Dial-tweak suggestion based on what the user just tasted.
// Returns { tempC, clicks, advice } or { error }.
export async function suggestDialTweak({ coffee, method, recipe, temp, clicks, tags, tasted, note, preferences }) {
  const userPrompt = `You are a coffee brewing coach. The user is brewing ${coffee.name} from ${coffee.roaster} (${coffee.origin}, ${coffee.process}, ${coffee.roast} roast) using ${method.name}.
Current dial: ${temp}°C water, ${clicks} clicks on a Comandante C40 (or similar 30-click hand grinder), ${recipe.dose}g dose, 1:${recipe.ratio} ratio, ${recipe.time} total.
Bean's expected notes: ${(coffee.notes || []).join(", ")}.
What the user tasted this brew: ${tasted?.length ? tasted.join(", ") : "—"}.
Issues/feedback: ${tags?.length ? tags.join(", ") : "—"}.
Their freeform note: ${note || "—"}
${preferences ? `\nThe user's overall taste preferences: ${preferences}` : ""}

Return ONLY valid JSON with this exact shape, no prose, no markdown fences:
{"tempC": <number 80-99>, "clicks": <number 6-36>, "advice": "<one or two short sentences explaining the change and what to look for next brew>"}`;

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
