// Grinder calibration registry + helpers.
//
// Recipe data in lib/data.js stores grind settings in Comandante C40 clicks
// (6-36 integer scale) because that's the most widely-cited reference in
// pourover/espresso literature. The user, however, owns whatever grinder
// they own — an Acaia Orbit with Lab Sweet V3 burrs uses a 0-10 floating
// scale, a 1Zpresso K-Max uses 0-90 integer ticks, etc.
//
// At render time we translate the Comandante-reference clicks into the
// user's grinder's units so the dial slider, readouts, brew-note stamp,
// and AI clamping all speak the user's language.

export const GRINDER_REFERENCE = {
  name: "Comandante C40",
  min: 6,
  max: 36,
  step: 1,
  fmt: "integer",
};

// Curated dataset of common grinders. Keys are normalized lowercase. The
// `aliases` array catches naming variations the user might type. For any
// grinder NOT in this list the app falls back to AI lookup (Gemini).
//
// Sources: manufacturer docs + community wikis (Home-Barista, Reddit
// /r/coffee grinder threads). Scales are conservative — better to under-
// state the range than overshoot it.
export const KNOWN_GRINDERS = [
  {
    name: "Comandante C40",
    aliases: ["comandante", "c40", "comandante c40 mk3", "comandante c40 mk4"],
    min: 6, max: 36, step: 1, fmt: "integer",
  },
  {
    name: "Acaia Orbit (Lab Sweet V3)",
    aliases: [
      "acaia orbit",
      "acaia lab sweet",
      "acaia lab sweet v3",
      "lab sweet v3",
      "orbit lab sweet",
      "acaia orbit lab sweet v3",
    ],
    min: 0, max: 10, step: 0.1, fmt: "decimal-1",
  },
  {
    name: "1Zpresso JX-Pro",
    aliases: ["jx-pro", "1zpresso jx", "1zpresso jx-pro", "jxpro", "1zpresso jxpro"],
    min: 0, max: 40, step: 1, fmt: "integer",
  },
  {
    name: "1Zpresso K-Max",
    aliases: ["k-max", "1zpresso k-max", "kmax", "1zpresso kmax"],
    min: 0, max: 90, step: 1, fmt: "integer",
  },
  {
    name: "1Zpresso K-Ultra",
    aliases: ["k-ultra", "1zpresso k-ultra", "kultra", "1zpresso kultra"],
    min: 0, max: 90, step: 1, fmt: "integer",
  },
  {
    name: "1Zpresso ZP6",
    aliases: ["zp6", "1zpresso zp6", "zp-6", "1zpresso zp-6"],
    min: 0, max: 40, step: 1, fmt: "integer",
  },
  {
    name: "Niche Zero",
    aliases: ["niche zero", "niche", "niche-zero"],
    min: 0, max: 50, step: 1, fmt: "integer",
  },
  {
    name: "DF64 / DF54",
    aliases: ["df64", "df54", "df-64", "df-54"],
    min: 0, max: 80, step: 1, fmt: "integer",
  },
  {
    name: "Fellow Ode (Gen 2)",
    aliases: ["fellow ode", "ode gen 2", "fellow ode gen 2", "ode 2"],
    min: 1, max: 11, step: 1, fmt: "integer",
  },
  {
    name: "Baratza Encore",
    aliases: ["baratza encore", "encore"],
    min: 1, max: 40, step: 1, fmt: "integer",
  },
  {
    name: "Baratza Virtuoso+",
    aliases: ["baratza virtuoso", "virtuoso+", "virtuoso plus"],
    min: 1, max: 40, step: 1, fmt: "integer",
  },
  {
    name: "Eureka Mignon Specialita",
    aliases: ["eureka mignon", "mignon specialita", "eureka specialita"],
    min: 0, max: 50, step: 1, fmt: "integer",
  },
];

// Look up a user-entered grinder name against our dataset. Returns the
// scale config or null if no match. Match priority: exact normalized name
// → alias substring → fuzzy partial.
export function findKnownGrinder(name) {
  if (!name) return null;
  const norm = name.toLowerCase().trim().replace(/\s+/g, " ");
  // Exact name
  for (const g of KNOWN_GRINDERS) {
    if (g.name.toLowerCase() === norm) return { ...g, match: "exact" };
  }
  // Exact alias
  for (const g of KNOWN_GRINDERS) {
    if ((g.aliases || []).some((a) => a === norm)) return { ...g, match: "alias" };
  }
  // Substring (user typed extra context, e.g. "my 1zpresso k-max v2")
  for (const g of KNOWN_GRINDERS) {
    for (const a of [g.name.toLowerCase(), ...(g.aliases || [])]) {
      if (a.length >= 4 && (norm.includes(a) || a.includes(norm))) {
        return { ...g, match: "fuzzy" };
      }
    }
  }
  return null;
}

// Decide which scale to use right now. Resolution order:
//   1. Cached AI lookup on the profile (`gear.grinderScale`) — but only
//      if it was recorded for this exact grinder name.
//   2. Our curated KNOWN_GRINDERS dataset.
//   3. The Comandante reference (the default everyone sees).
// Returning a deterministic scale ALWAYS lets the UI render without
// waiting for the network — the AI lookup just refines it later.
export function resolveGrinder(grinderName, cachedScale) {
  if (
    cachedScale &&
    cachedScale.name &&
    grinderName &&
    cachedScale.name.toLowerCase().trim() === grinderName.toLowerCase().trim()
  ) {
    return { ...cachedScale, source: cachedScale.source || "cache" };
  }
  const known = findKnownGrinder(grinderName);
  if (known) return { ...known, source: "preset" };
  return { ...GRINDER_REFERENCE, source: "reference" };
}

// Translate Comandante-reference clicks → the user's grinder scale.
// Uses linear percentage mapping. Not perfect across burr designs, but
// close enough to land in the right neighbourhood; users dial from
// there. Honours the user grinder's step + clamps to [min, max].
export function convertClicks(refClicks, userScale) {
  if (!userScale || userScale.name === GRINDER_REFERENCE.name) return refClicks;
  const refRange = GRINDER_REFERENCE.max - GRINDER_REFERENCE.min;
  if (refRange <= 0) return userScale.min;
  const pct = (refClicks - GRINDER_REFERENCE.min) / refRange;
  const clamped = Math.max(0, Math.min(1, pct));
  const raw = userScale.min + clamped * (userScale.max - userScale.min);
  const step = userScale.step > 0 ? userScale.step : 1;
  const snapped = Math.round(raw / step) * step;
  return Math.max(userScale.min, Math.min(userScale.max, snapped));
}

// Format a click value according to the grinder's display style.
export function formatClicks(n, scale) {
  if (n == null || !isFinite(n)) return "—";
  const fmt = scale?.fmt || "integer";
  if (fmt === "decimal-1") return (Math.round(n * 10) / 10).toFixed(1);
  if (fmt === "decimal-2") return (Math.round(n * 100) / 100).toFixed(2);
  return String(Math.round(n));
}

// Short human label of a click number ("3.2 on the Acaia", "22 clicks on
// the Comandante"). Used in copy, brew-log stamps, AI prompts.
export function describeClicks(n, scale) {
  const v = formatClicks(n, scale);
  if (scale?.fmt === "decimal-1") return `${v} on the ${scale.name}`;
  return `${v} clicks · ${scale?.name || "Comandante C40"}`;
}
