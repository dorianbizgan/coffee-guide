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

// Brew-method anchor points let us translate between grinders without
// pretending all burr designs are linear. An "anchor" is the typical
// click/setting on a given grinder for a given brew method — espresso
// pulls fine, V60 lands medium-fine, French press is coarse, etc. To
// convert a value from grinder A to grinder B we find the two anchors in
// A that bracket the source value, compute the position between them,
// and apply the same position to the matching anchors in B.
//
// This is still an approximation — actual sweet spots depend on bean,
// burr wear, and personal taste — but it's massively better than
// "0.5 × of full range on A → 0.5 × of full range on B" because the
// usable brewing range often only covers part of a grinder's scale and
// the curve isn't linear.
export const GRINDER_REFERENCE = {
  name: "Comandante C40",
  min: 6, max: 36, step: 1, fmt: "integer",
  anchors: { espresso: 8, moka: 14, aeropress: 18, v60: 22, chemex: 25, french: 30, cold: 36 },
};

// Curated dataset of common grinders. Keys are normalized lowercase. The
// `aliases` array catches naming variations the user might type. For any
// grinder NOT in this list the app falls back to AI lookup (Gemini).
//
// Sources: manufacturer docs + community wikis (Home-Barista, Reddit
// /r/coffee grinder threads). Scales are conservative — better to under-
// state the range than overshoot it.
// Each entry pairs the physical scale (min/max/step/fmt) with typical
// brew-method settings (anchors). Anchors are community-consensus
// starting points sourced from each maker's docs + the home-barista /
// reddit /r/coffee wikis. Single-burr-design grinders only — espresso
// flat burrs vs conical burrs differ enough that we don't try to share
// anchors across them; each grinder gets its own.
export const KNOWN_GRINDERS = [
  {
    name: "Comandante C40",
    aliases: ["comandante", "c40", "comandante c40 mk3", "comandante c40 mk4"],
    min: 6, max: 36, step: 1, fmt: "integer",
    anchors: { espresso: 8, moka: 14, aeropress: 18, v60: 22, chemex: 25, french: 30, cold: 36 },
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
    anchors: { espresso: 2.5, moka: 4.0, aeropress: 5.5, v60: 6.5, chemex: 7.5, french: 8.5, cold: 10.0 },
  },
  {
    name: "1Zpresso JX-Pro",
    aliases: ["jx-pro", "1zpresso jx", "1zpresso jx-pro", "jxpro", "1zpresso jxpro"],
    min: 0, max: 40, step: 1, fmt: "integer",
    anchors: { espresso: 8, moka: 13, aeropress: 18, v60: 22, chemex: 25, french: 30, cold: 38 },
  },
  {
    name: "1Zpresso K-Max",
    aliases: ["k-max", "1zpresso k-max", "kmax", "1zpresso kmax"],
    min: 0, max: 90, step: 1, fmt: "integer",
    anchors: { espresso: 12, moka: 24, aeropress: 42, v60: 55, chemex: 65, french: 78, cold: 90 },
  },
  {
    name: "1Zpresso K-Ultra",
    aliases: ["k-ultra", "1zpresso k-ultra", "kultra", "1zpresso kultra"],
    min: 0, max: 90, step: 1, fmt: "integer",
    anchors: { espresso: 10, moka: 22, aeropress: 40, v60: 52, chemex: 62, french: 75, cold: 88 },
  },
  {
    name: "1Zpresso ZP6",
    aliases: ["zp6", "1zpresso zp6", "zp-6", "1zpresso zp-6"],
    min: 0, max: 40, step: 1, fmt: "integer",
    anchors: { espresso: 6, moka: 10, aeropress: 15, v60: 20, chemex: 23, french: 28, cold: 38 },
  },
  {
    name: "Niche Zero",
    aliases: ["niche zero", "niche", "niche-zero"],
    min: 0, max: 50, step: 1, fmt: "integer",
    anchors: { espresso: 13, moka: 20, aeropress: 28, v60: 34, chemex: 38, french: 44, cold: 50 },
  },
  {
    name: "DF64 / DF54",
    aliases: ["df64", "df54", "df-64", "df-54"],
    min: 0, max: 80, step: 1, fmt: "integer",
    anchors: { espresso: 18, moka: 30, aeropress: 45, v60: 55, chemex: 62, french: 70, cold: 80 },
  },
  {
    name: "Fellow Ode (Gen 2)",
    aliases: ["fellow ode", "ode gen 2", "fellow ode gen 2", "ode 2"],
    min: 1, max: 11, step: 1, fmt: "integer",
    // Ode is filter-only; espresso anchor is the finest end as a "go here if you must" sentinel.
    anchors: { espresso: 1, moka: 3, aeropress: 4, v60: 5, chemex: 6, french: 8, cold: 11 },
  },
  {
    name: "Baratza Encore",
    aliases: ["baratza encore", "encore"],
    min: 1, max: 40, step: 1, fmt: "integer",
    anchors: { espresso: 8, moka: 12, aeropress: 16, v60: 20, chemex: 24, french: 28, cold: 38 },
  },
  {
    name: "Baratza Virtuoso+",
    aliases: ["baratza virtuoso", "virtuoso+", "virtuoso plus"],
    min: 1, max: 40, step: 1, fmt: "integer",
    anchors: { espresso: 6, moka: 10, aeropress: 14, v60: 18, chemex: 22, french: 28, cold: 38 },
  },
  {
    name: "Eureka Mignon Specialita",
    aliases: ["eureka mignon", "mignon specialita", "eureka specialita"],
    min: 0, max: 50, step: 1, fmt: "integer",
    // Specialita is espresso-focused, the coarse anchors are aspirational
    anchors: { espresso: 10, moka: 18, aeropress: 28, v60: 35, chemex: 40, french: 45, cold: 50 },
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

// Snap a numeric value to `scale.step` and clamp to [min, max]. Used by
// every conversion helper.
function snapAndClamp(value, scale) {
  const step = scale?.step > 0 ? scale.step : 1;
  // Decimal-stepped grinders need rounding to the step's precision, not
  // integer rounding. e.g. step 0.1 → multiply by 10, round, divide.
  const k = step < 1 ? Math.round(1 / step) : 1;
  const snapped = Math.round(value * k) / k;
  return Math.max(scale.min, Math.min(scale.max, snapped));
}

// Sorted ascending anchor list for a scale: [[methodId, clickValue], ...].
// Falls back to [[min], [max]] if the scale has no anchors at all.
function sortedAnchors(scale) {
  const a = scale?.anchors || null;
  if (!a) return null;
  return Object.entries(a)
    .map(([k, v]) => [k, Number(v)])
    .filter(([, v]) => Number.isFinite(v))
    .sort((x, y) => x[1] - y[1]);
}

// Anchor-based value translation between two grinder scales. Finds the
// bracket of anchors in `fromScale` that surrounds `value`, computes
// position within that bracket, then maps to the matching bracket in
// `toScale`. If `methodId` is provided AND both scales have that anchor,
// we anchor exactly at the method's value first (giving more accurate
// "V60 on Comandante 22 = V60 on Acaia 6.5" semantics) and only
// interpolate to the next anchor when the source value diverges from
// the method anchor.
//
// Returns null if anchor data is missing on either side — caller falls
// back to linear-percentage translation.
function convertViaAnchors(value, fromScale, toScale, methodId) {
  const fromA = sortedAnchors(fromScale);
  const toA = sortedAnchors(toScale);
  if (!fromA || !toA) return null;
  // Build a same-order anchor pair list so each fromA[i] has a toA match.
  // We iterate fromA, looking up the same key in toA's map.
  const toMap = Object.fromEntries(toA);
  const pairs = fromA
    .filter(([k]) => Number.isFinite(toMap[k]))
    .map(([k, fv]) => [k, fv, toMap[k]]);
  if (pairs.length < 2) return null;
  // Find bracket [i, i+1] such that fromValues[i] <= value <= fromValues[i+1].
  let lo = 0;
  let hi = pairs.length - 1;
  if (value <= pairs[0][1]) { lo = 0; hi = 1; }
  else if (value >= pairs[pairs.length - 1][1]) { lo = pairs.length - 2; hi = pairs.length - 1; }
  else {
    for (let i = 0; i < pairs.length - 1; i++) {
      if (value >= pairs[i][1] && value <= pairs[i + 1][1]) { lo = i; hi = i + 1; break; }
    }
  }
  const [, fLo, tLo] = pairs[lo];
  const [, fHi, tHi] = pairs[hi];
  const span = fHi - fLo;
  const pct = span === 0 ? 0 : (value - fLo) / span;
  return tLo + pct * (tHi - tLo);
}

// Cross-grinder click conversion. Tries anchor-based mapping first (when
// both grinders publish brew-method settings); falls back to linear-
// percentage when one of the grinders has no anchors yet (e.g. an AI-
// looked-up scale that returned only min/max/step).
export function convertClicksBetween(value, fromScale, toScale, methodId) {
  if (!fromScale || !toScale) return value;
  if (fromScale.name === toScale.name) return value;
  // 1) Anchor-based
  const anchor = convertViaAnchors(value, fromScale, toScale, methodId);
  if (anchor != null && Number.isFinite(anchor)) return snapAndClamp(anchor, toScale);
  // 2) Linear-percentage fallback
  const fromRange = fromScale.max - fromScale.min;
  if (fromRange <= 0) return snapAndClamp(toScale.min, toScale);
  const pct = (value - fromScale.min) / fromRange;
  const clamped = Math.max(0, Math.min(1, pct));
  const raw = toScale.min + clamped * (toScale.max - toScale.min);
  return snapAndClamp(raw, toScale);
}

// Convenience: translate from the Comandante reference (recipe storage
// format) to the user's grinder. methodId is optional but helps the
// anchor mapping pick the right bracket.
export function convertClicks(refClicks, userScale, methodId) {
  if (!userScale || userScale.name === GRINDER_REFERENCE.name) return refClicks;
  return convertClicksBetween(refClicks, GRINDER_REFERENCE, userScale, methodId);
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
