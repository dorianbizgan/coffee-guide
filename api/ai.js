// Vercel serverless AI proxy.
//
// Why this exists: lets users run Crema without pasting an API key
// into the browser. The deployer sets ANTHROPIC_API_KEY (and optionally
// OPENAI_API_KEY) once in Vercel's project env vars, and every signed-in user
// of the deployment gets AI features for free at the deployer's cost.
//
// Auth: callers MUST present a valid Supabase access token (Bearer header).
// We verify it server-side against Supabase's userinfo endpoint. This stops
// random internet traffic from burning the deployer's tokens.
//
// Methods:
//   GET  -> returns which providers are configured (no auth required, public status)
//   POST -> { provider, model, system, messages, useWebSearch, max_tokens, jsonMode }
//
// Runtime: Node 18+ (Vercel default). Uses native fetch.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://udzsveyedwbmygvpvxpx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_-mBzL95B_KjuBYpEjmHJiQ_oy63JplW";

// Tip cards are cached so repeated identical prompts don't burn AI tokens.
const TIP_CACHE_TTL_DAYS = 7;

// Recipe schema — used as Gemini's responseSchema when mode="recipe" so the
// model returns exactly the shape we expect with no prose preamble. This is
// dramatically faster (no wasted tokens) and eliminates parse failures.
const METHOD_SETTINGS_SCHEMA = (keys) => ({
  type: "OBJECT",
  properties: Object.fromEntries(keys.map(k => [k, { type: "STRING" }]))
});
const RECIPE_SCHEMA = {
  type: "OBJECT",
  properties: {
    roaster: { type: "STRING", description: "Name of the roaster" },
    name:    { type: "STRING", description: "Coffee name" },
    meta:    { type: "STRING", description: "Origin · process · altitude · varietal" },
    color:   { type: "STRING", description: "Hex color matching the actual coffee bag's dominant color from the roaster's site (e.g. #5c4a3a)" },
    tags:    { type: "ARRAY", items: { type: "STRING" } },
    espresso: {
      type: "OBJECT",
      properties: {
        settings: METHOD_SETTINGS_SCHEMA([
          "Grind (Acaia Orbit SSP V3)", "Brew Temp", "Dose", "Yield",
          "Pressure", "Preinfusion", "Total Shot Time", "Basket"
        ]),
        notes: { type: "STRING" }
      }
    },
    v60: {
      type: "OBJECT",
      properties: {
        settings: METHOD_SETTINGS_SCHEMA([
          "Grind (Acaia Orbit SSP V3)", "Water Temp", "Dose", "Water",
          "Ratio", "Bloom", "Target Drawdown"
        ]),
        notes: { type: "STRING" }
      }
    },
    aeropress: {
      type: "OBJECT",
      properties: {
        settings: METHOD_SETTINGS_SCHEMA([
          "Grind (Acaia Orbit SSP V3)", "Water Temp", "Dose", "Water",
          "Method", "Steep Time", "Press Time"
        ]),
        notes: { type: "STRING" }
      }
    }
  },
  required: ["name", "espresso", "v60", "aeropress"]
};

const crypto = require("crypto");
function hashTipKey({ provider, model, system, prompt, useWebSearch, jsonMode }) {
  const canonical = JSON.stringify({ provider, model, system, prompt, useWebSearch: !!useWebSearch, jsonMode: !!jsonMode });
  return "tip:" + crypto.createHash("sha256").update(canonical).digest("hex");
}

async function readTipCache(key, accessToken) {
  // Reads via the user's session — RLS policy must allow authenticated SELECT on ai_cache.
  const url = `${SUPABASE_URL}/rest/v1/ai_cache?key=eq.${encodeURIComponent(key)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=value,provider,created_at`;
  try {
    const r = await fetch(url, {
      headers: {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });
    if (!r.ok) return null;
    const arr = await r.json();
    return arr[0] || null;
  } catch { return null; }
}

async function writeTipCache(key, value, provider, accessToken) {
  const expires = new Date(Date.now() + TIP_CACHE_TTL_DAYS * 86400_000).toISOString();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ai_cache`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({ key, value, provider, expires_at: expires })
    });
  } catch (e) {
    // Cache writes are best-effort — never fail the user request because of cache problems
    console.warn("[ai-cache] write failed:", e?.message || e);
  }
}

// Per-IP rate limiter (resets on cold start; for serious abuse use Upstash/Redis).
const RATE = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20; // 20 calls per minute per IP

function rateLimit(ip) {
  const now = Date.now();
  const entry = RATE.get(ip) || { hits: [], blockedUntil: 0 };
  if (entry.blockedUntil > now) return false;
  entry.hits = entry.hits.filter(t => now - t < RATE_WINDOW_MS);
  if (entry.hits.length >= RATE_MAX) {
    entry.blockedUntil = now + RATE_WINDOW_MS;
    RATE.set(ip, entry);
    return false;
  }
  entry.hits.push(now);
  RATE.set(ip, entry);
  return true;
}

async function verifySupabaseUser(accessToken) {
  if (!accessToken) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "apikey": SUPABASE_PUBLISHABLE_KEY
      }
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => { raw += chunk; if (raw.length > 200_000) { req.destroy(); reject(new Error("body too large")); } });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  res.setHeader("Vary", "Authorization");
  // GET: public status — tells client which providers are configured server-side
  if (req.method === "GET") {
    return jsonResponse(res, 200, {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      google: !!process.env.GEMINI_API_KEY,
      version: 2
    });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return jsonResponse(res, 405, { error: "Method not allowed" });
  }

  // Auth: require a Supabase user
  const auth = req.headers["authorization"] || req.headers["Authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const user = await verifySupabaseUser(token);
  if (!user) return jsonResponse(res, 401, { error: "Sign in to use AI" });

  // Rate limit per IP+user
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "0.0.0.0";
  const key = `${user.id}:${ip}`;
  if (!rateLimit(key)) return jsonResponse(res, 429, { error: "Too many AI requests — slow down for a minute." });

  let body;
  try { body = await readBody(req); }
  catch { return jsonResponse(res, 400, { error: "Bad JSON body" }); }

  const provider =
    body.provider === "openai" ? "openai" :
    body.provider === "google" ? "google" :
    "anthropic";
  const system = String(body.system || "");
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const userPrompt = messages[0]?.content || body.userPrompt || "";
  const useWebSearch = !!body.useWebSearch;
  const mode = body.mode === "tip" ? "tip" : body.mode === "recipe" ? "recipe" : "default";
  // Recipe calls return JSON only — drop the cap to ~1500 to cut latency.
  // The recipe schema fits comfortably within that.
  const defaultMax = mode === "recipe" ? 1500 : 2048;
  const maxTokens = Math.min(Math.max(parseInt(body.max_tokens || defaultMax, 10) || defaultMax, 64), 4096);
  // Recipe and explicit JSON-mode requests both want JSON output.
  const jsonMode = !!body.jsonMode || mode === "recipe";

  // Hard caps to keep costs bounded
  if (system.length > 8000 || userPrompt.length > 12000) {
    return jsonResponse(res, 413, { error: "Prompt too long" });
  }
  if (!userPrompt) return jsonResponse(res, 400, { error: "Missing user prompt" });

  // Read-through cache for tip-mode requests so repeated questions don't burn tokens.
  // Cache entries are ai-generated text only (no PII). Disabled silently if the
  // ai_cache table doesn't exist yet.
  let cacheKey = null;
  if (mode === "tip") {
    cacheKey = hashTipKey({ provider, model: body.model || null, system, prompt: userPrompt, useWebSearch, jsonMode });
    const cached = await readTipCache(cacheKey, token);
    if (cached?.value) {
      return jsonResponse(res, 200, {
        text: cached.value,
        provider: cached.provider || provider,
        model: body.model || null,
        cached: true,
        cachedAt: cached.created_at
      });
    }
  }

  // Helper: write the result to cache (tip mode only) and emit the JSON response
  const respond = async (out, providerOut, model) => {
    if (cacheKey && out) await writeTipCache(cacheKey, out, providerOut, token);
    return jsonResponse(res, 200, { text: out, provider: providerOut, model, cached: false });
  };

  try {
    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return jsonResponse(res, 503, { error: "Server-side Anthropic not configured" });
      const reqBody = {
        model: body.model || "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userPrompt }]
      };
      const headers = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      };
      if (useWebSearch) {
        reqBody.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }];
        headers["anthropic-beta"] = "web-search-2025-03-05";
      }
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers, body: JSON.stringify(reqBody)
      });
      const text = await r.text();
      if (!r.ok) return jsonResponse(res, r.status, { error: `Anthropic ${r.status}: ${text.slice(0, 400)}` });
      const json = JSON.parse(text);
      const out = (json.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
      return respond(out, "anthropic", reqBody.model);
    }

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return jsonResponse(res, 503, { error: "Server-side OpenAI not configured" });
      const reqBody = {
        model: body.model || "gpt-4o",
        messages: [{ role: "system", content: system }, { role: "user", content: userPrompt }]
      };
      if (jsonMode) reqBody.response_format = { type: "json_object" };
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify(reqBody)
      });
      const text = await r.text();
      if (!r.ok) return jsonResponse(res, r.status, { error: `OpenAI ${r.status}: ${text.slice(0, 400)}` });
      const json = JSON.parse(text);
      const out = (json.choices?.[0]?.message?.content || "").trim();
      return respond(out, "openai", reqBody.model);
    }

    // Google Gemini (free tier covers light personal use of this app)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return jsonResponse(res, 503, { error: "Server-side Gemini not configured" });
    const model = body.model || "gemini-2.5-flash";
    const reqBody = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: mode === "recipe" ? 0.4 : 0.7 }
    };
    // Gemini constraint: when the google_search tool is active you CANNOT
    // also set responseMimeType=application/json or responseSchema. The API
    // returns 400 INVALID_ARGUMENT. So when grounding is on we let the model
    // emit prose-with-JSON and rely on extractJsonBlock client-side.
    if (useWebSearch) {
      reqBody.tools = [{ google_search: {} }];
    } else {
      if (jsonMode) reqBody.generationConfig.responseMimeType = "application/json";
      if (mode === "recipe") reqBody.generationConfig.responseSchema = RECIPE_SCHEMA;
    }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody)
    });
    const text = await r.text();
    if (!r.ok) return jsonResponse(res, r.status, { error: `Gemini ${r.status}: ${text.slice(0, 400)}` });
    const json = JSON.parse(text);
    const parts = json.candidates?.[0]?.content?.parts || [];
    const out = parts.map(p => p.text || "").join("\n").trim();
    return respond(out, "google", model);
  } catch (e) {
    return jsonResponse(res, 502, { error: "Upstream error: " + (e?.message || String(e)).slice(0, 300) });
  }
};
