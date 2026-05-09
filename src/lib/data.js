// Brew methods + recipe engine + sample beans + bean catalog.
// Verbatim from design handoff data.js, exported as ES modules.

export const BREW_METHODS = [
  {
    id: "v60",
    name: "V60 Pourover",
    short: "V60",
    icon: "v60",
    yieldMl: 300,
    base: { ratio: 16.5, temp: 96, dose: 18, water: 297, grind: "Medium-fine", clicks: 22, time: "3:00" },
    steps: [
      { t: "Bloom", d: "Pour 2× coffee weight in slow circles. Wet all grounds.", time: "0:00 — 0:45" },
      { t: "First pour", d: "Pour to 60% total water in steady spirals from center outward.", time: "0:45 — 1:30" },
      { t: "Second pour", d: "Top up to full water weight. Avoid the filter walls.", time: "1:30 — 2:15" },
      { t: "Drawdown", d: "Let bed flatten. Swirl gently if channeling.", time: "2:15 — 3:00" },
    ],
    tip: "Lighter roasts: bump temp to 97°C and grind one notch finer for fuller extraction.",
  },
  {
    id: "aeropress",
    name: "Aeropress",
    short: "Aeropress",
    icon: "aero",
    yieldMl: 220,
    base: { ratio: 14, temp: 88, dose: 15, water: 210, grind: "Medium", clicks: 18, time: "1:30" },
    steps: [
      { t: "Add coffee", d: "Inverted method. Add grounds to chamber.", prep: true },
      { t: "Saturate", d: "Pour all water. Stir 5× gently with paddle.", time: "0:10 — 0:30" },
      { t: "Steep", d: "Cap with rinsed paper filter. Let rest.", time: "0:30 — 1:00" },
      { t: "Press", d: "Flip onto cup. Press steady, 30 seconds.", time: "1:00 — 1:30" },
    ],
    tip: "For a fruit-forward cup, drop temp to 82°C and steep 2:00.",
  },
  {
    id: "french",
    name: "French Press",
    short: "French Press",
    icon: "press",
    yieldMl: 500,
    base: { ratio: 15, temp: 94, dose: 33, water: 495, grind: "Coarse", clicks: 30, time: "4:00" },
    steps: [
      { t: "Saturate", d: "Add grounds. Pour all water. Start timer.", time: "0:00" },
      { t: "Crust", d: "Wait 4 minutes. Don't disturb.", time: "0:00 — 4:00" },
      { t: "Break", d: "Stir crust 3× with spoon, then skim foam.", time: "4:00 — 4:30" },
      { t: "Plunge", d: "Press slowly. Decant immediately to avoid over-extract.", time: "4:30 — 5:00" },
    ],
    tip: "Decant fully into a server. Coffee left on grounds keeps extracting.",
  },
  {
    id: "espresso",
    name: "Espresso",
    short: "Espresso",
    icon: "esp",
    yieldMl: 36,
    base: { ratio: 2, temp: 93, dose: 18, water: 36, grind: "Fine", clicks: 8, time: "0:28" },
    steps: [
      { t: "Dose", d: "18g into basket. Distribute and tamp level, ~30 lbs.", prep: true },
      { t: "Lock + start", d: "Lock portafilter. Start shot. First drips at 8-12s.", time: "0:00 — 0:12" },
      { t: "Pull", d: "Aim for 36g out in 25-30s. Watch for blonding.", time: "0:12 — 0:28" },
      { t: "Cut + taste", d: "Cut at target weight. Sip neat before milk.", time: "0:28" },
    ],
    tip: "Sour & fast? Grind finer. Bitter & slow? Coarser. Adjust 1 click at a time.",
  },
  {
    id: "chemex",
    name: "Chemex",
    short: "Chemex",
    icon: "chemex",
    yieldMl: 600,
    base: { ratio: 17, temp: 96, dose: 36, water: 612, grind: "Medium-coarse", clicks: 25, time: "4:30" },
    steps: [
      { t: "Rinse filter", d: "Rinse 3-fold paper, discard water. Add coffee.", time: "0:00" },
      { t: "Bloom", d: "Pour 80g water. Swirl. Let degas.", time: "0:00 — 0:45" },
      { t: "Main pour", d: "Pour in 3 stages, keeping bed level.", time: "0:45 — 3:15" },
      { t: "Drawdown", d: "Final draw should finish around 4:30.", time: "3:15 — 4:30" },
    ],
    tip: "Chemex shines with light, washed African coffees. Lean clean and floral.",
  },
  {
    id: "moka",
    name: "Moka Pot",
    short: "Moka",
    icon: "moka",
    yieldMl: 200,
    base: { ratio: 7, temp: 100, dose: 22, water: 154, grind: "Fine-medium", clicks: 14, time: "5:00" },
    steps: [
      { t: "Pre-heat water", d: "Fill base with hot water to valve. Saves time on stove.", prep: true },
      { t: "Fill basket", d: "Add grounds, level — do not tamp. Assemble.", prep: true },
      { t: "Low heat", d: "Place on low-medium. Lid open.", time: "1:00 — 4:00" },
      { t: "Cool down", d: "When sputtering starts, remove from heat. Wrap base in cool towel.", time: "4:00 — 5:00" },
    ],
    tip: "Lid open while brewing — watch the gold-brown stream turn pale, then pull off.",
  },
  {
    id: "cold",
    name: "Cold Brew",
    short: "Cold Brew",
    icon: "cold",
    yieldMl: 1000,
    base: { ratio: 8, temp: 20, dose: 125, water: 1000, grind: "Extra coarse", clicks: 36, time: "16:00:00" },
    steps: [
      { t: "Combine", d: "Coffee + cold filtered water in a sealed jar.", prep: true },
      { t: "Stir", d: "Gently submerge all grounds. Cap.", prep: true },
      { t: "Steep cold", d: "Refrigerate 14-18h. 16h is the sweet spot.", time: "16:00:00" },
      { t: "Filter", d: "Strain through paper or cloth. Dilute 1:1 to taste.", time: "16:30:00" },
    ],
    tip: "Concentrate keeps 2 weeks fridged. Dilute with cold water, milk, or tonic.",
  },
];

export function recommend(coffee) {
  const r = coffee.roast || "medium";
  const proc = (coffee.process || "").toLowerCase();
  if (r === "light") return proc.includes("natural") || proc.includes("anaerob") ? "v60" : "chemex";
  if (r === "medium-light" || r === "medium") return "v60";
  if (r === "medium-dark") return "aeropress";
  if (r === "dark") return "french";
  return "v60";
}

export function adjustRecipe(method, coffee) {
  const adj = JSON.parse(JSON.stringify(method.base));
  const r = coffee.roast || "medium";
  if (r === "light") {
    adj.temp = Math.min(99, adj.temp + 1);
    adj.grind = adj.grind + " (slightly finer)";
    adj.clicks = Math.max(4, adj.clicks - 2);
  }
  if (r === "dark") {
    adj.clicks = adj.clicks + 2;
    adj.temp = Math.max(80, adj.temp - 3);
  }
  // Decaf beans are softer & more porous — they extract faster than regular
  // beans at the same setting. Compensate with a slightly coarser grind and
  // a touch cooler water so we don't over-extract bitter / hollow shots.
  // Cold brew is unaffected (temp irrelevant, time dominates).
  if (coffee.decaf && method.id !== "cold") {
    adj.clicks = adj.clicks + 2;
    adj.temp = Math.max(80, adj.temp - 2);
    adj.grind = adj.grind + " (decaf — coarser)";
  }
  // Age + storage adjustment. Cold brew is unaffected because the long
  // contact time washes out small staling differences.
  if (method.id !== "cold") {
    const ageAdj = ageAdjustment(coffee);
    if (ageAdj.clicks || ageAdj.temp) {
      adj.clicks = adj.clicks + ageAdj.clicks;
      adj.temp = Math.min(99, Math.max(80, adj.temp + ageAdj.temp));
      adj.grind = adj.grind + ` (${ageAdj.label})`;
    }
  }
  return adj;
}

// ─── Bean age + storage ──────────────────────────────────────────────────
// Storage method changes how fast a coffee stales. Multipliers are
// rule-of-thumb based on the well-known "freezer pauses aging" finding:
//   room    1.00 — baseline
//   vacuum  0.65 — slow but not stopped (oxygen still leaches in over time)
//   fridge  0.80 — slows oxidation a little but moisture & smells hurt
//   freezer 0.05 — effectively paused (sealed)
const STORAGE_MULTIPLIER = { room: 1.0, vacuum: 0.65, fridge: 0.8, freezer: 0.05 };

export function effectiveAgeDays(coffee) {
  if (!coffee?.roastDate) return null;
  const roast = new Date(coffee.roastDate);
  if (Number.isNaN(roast.getTime())) return null;
  const now = Date.now();
  const totalDays = (now - roast.getTime()) / 86400000;
  if (totalDays < 0) return 0;
  const storage = coffee.storage || "room";

  // Two-phase model when the user told us when the bag went into the freezer.
  if (storage === "freezer" && coffee.frozenSince) {
    const frozen = new Date(coffee.frozenSince);
    if (!Number.isNaN(frozen.getTime())) {
      const beforeFreeze = Math.max(0, (frozen.getTime() - roast.getTime()) / 86400000);
      const inFreezer    = Math.max(0, (now - frozen.getTime()) / 86400000);
      return beforeFreeze + inFreezer * STORAGE_MULTIPLIER.freezer;
    }
  }
  return totalDays * (STORAGE_MULTIPLIER[storage] ?? 1);
}

// Returns { clicks, temp, label } describing the age-driven nudge.
// `clicks` is in the Comandante 6–36 sense — positive = coarser, negative = finer.
// Detail.jsx remaps that to the user's grinder via snapClicks.
export function ageAdjustment(coffee) {
  const age = effectiveAgeDays(coffee);
  if (age == null) return { clicks: 0, temp: 0, label: "" };
  if (age < 4)   return { clicks: +1, temp:  0, label: "fresh — coarser" };
  if (age < 14)  return { clicks:  0, temp:  0, label: "" };       // sweet spot
  if (age < 30)  return { clicks: -1, temp: +1, label: "past peak — finer" };
  return            { clicks: -2, temp: +2, label: "stale — much finer + hotter" };
}

// Display helper for the bag-info panel + AI prompt.
export function ageSummary(coffee) {
  const days = effectiveAgeDays(coffee);
  if (days == null) return null;
  const rounded = Math.max(0, Math.round(days));
  let band;
  if (days < 4)       band = "Resting";
  else if (days < 14) band = "Sweet spot";
  else if (days < 30) band = "Past peak";
  else                band = "Stale";
  return { days: rounded, band };
}

export const BEAN_CATALOG = [
  { name: "Kayon Mountain", roaster: "Onyx Coffee Lab", origin: "Yirgacheffe, Ethiopia", process: "Washed", roast: "light", variety: "Heirloom", elevation: "1,950 m", notes: "jasmine, bergamot, white peach, honey" },
  { name: "Hambela Hararsu", roaster: "George Howell", origin: "Guji, Ethiopia", process: "Natural", roast: "light", variety: "74158", elevation: "2,100 m", notes: "blueberry, lavender, milk chocolate" },
  { name: "Finca La Esperanza", roaster: "Sey Coffee", origin: "Huila, Colombia", process: "Anaerobic Natural", roast: "medium-light", variety: "Pink Bourbon", elevation: "1,720 m", notes: "raspberry jam, cocoa nib, rose" },
  { name: "El Diviso", roaster: "Black & White", origin: "Huila, Colombia", process: "Honey", roast: "medium-light", variety: "Pink Bourbon", elevation: "1,800 m", notes: "strawberry, lychee, cane sugar" },
  { name: "Camp Blend Nº 4", roaster: "Trail & Tin Co.", origin: "Brazil + Guatemala", process: "Pulped Natural", roast: "medium-dark", variety: "Yellow Catuai · Bourbon", elevation: "1,400 m", notes: "dark chocolate, almond, brown sugar" },
  { name: "Decaf Dolcetto", roaster: "Counter Culture", origin: "Antioquia, Colombia", process: "EA Decaf", roast: "medium", variety: "Caturra", elevation: "1,650 m", notes: "milk chocolate, walnut, cherry" },
  { name: "Kii AA", roaster: "Heart Coffee", origin: "Nyeri, Kenya", process: "Washed", roast: "light", variety: "SL28 · SL34", elevation: "1,750 m", notes: "blackcurrant, grapefruit, brown sugar" },
];

export function searchBeans(q) {
  if (!q || q.length < 2) return [];
  const Q = q.toLowerCase();
  return BEAN_CATALOG.filter((b) =>
    b.name.toLowerCase().includes(Q) ||
    b.roaster.toLowerCase().includes(Q) ||
    b.origin.toLowerCase().includes(Q)
  ).slice(0, 4);
}

export const SAMPLE_COFFEES = [
  {
    id: "c1",
    name: "Kayon Mountain",
    roaster: "Onyx Coffee Lab",
    origin: "Yirgacheffe, Ethiopia",
    process: "Washed",
    roast: "light",
    notes: ["jasmine", "bergamot", "white peach", "honey"],
    elevation: "1,950 m",
    variety: "Heirloom",
    roastDate: "2026-04-22",
    bagSize: "250g",
    method: "v60",
    accent: "oklch(0.55 0.13 60)",
    stamp: "Single Origin · Est. 2026",
    favorite: true,
  },
  {
    id: "c2",
    name: "Finca La Esperanza",
    roaster: "Sey Coffee",
    origin: "Huila, Colombia",
    process: "Anaerobic Natural",
    roast: "medium-light",
    notes: ["raspberry jam", "cocoa nib", "rose"],
    elevation: "1,720 m",
    variety: "Pink Bourbon",
    roastDate: "2026-04-29",
    bagSize: "340g",
    method: "v60",
    accent: "oklch(0.45 0.05 155)",
    stamp: "Anaerobic · Lot 04",
    favorite: false,
  },
  {
    id: "c3",
    name: "Camp Blend Nº 4",
    roaster: "Trail & Tin Co.",
    origin: "Brazil + Guatemala",
    process: "Pulped Natural blend",
    roast: "medium-dark",
    notes: ["dark chocolate", "toasted almond", "brown sugar"],
    elevation: "1,400 m",
    variety: "Yellow Catuai · Bourbon",
    roastDate: "2026-04-18",
    bagSize: "454g",
    method: "aeropress",
    accent: "oklch(0.55 0.08 60)",
    stamp: "House Blend · Camp Series",
    favorite: false,
  },
  {
    id: "c4",
    name: "Hambela Hararsu",
    roaster: "George Howell",
    origin: "Guji, Ethiopia",
    process: "Natural",
    roast: "light",
    notes: ["blueberry", "lavender", "milk chocolate"],
    elevation: "2,100 m",
    variety: "74158",
    roastDate: "2026-05-01",
    bagSize: "200g",
    method: "chemex",
    accent: "oklch(0.45 0.05 155)",
    stamp: "Single Origin · Lot 12",
    favorite: false,
  },
];

export const ACCENTS = [
  "oklch(0.45 0.05 155)",
  "oklch(0.55 0.13 60)",
  "oklch(0.55 0.08 60)",
  "oklch(0.62 0.14 75)",
  "oklch(0.45 0.1 28)",
];

// ─── Grinder profiles ───────────────────────────────────────────────────
// Each grinder has its own click range / step / unit. The Detail dial
// reads these to size the slider; the AI prompt sends the range so the
// model returns numbers in the right scale.
//
// `coarsePerStep` is the qualitative direction: for almost everyone,
// LOWER number = FINER, HIGHER = COARSER. The Niche/some Mahlkönigs are
// the same. We keep this consistent across all entries.
//
// To detect a grinder from a free-text gear field we lowercase + match
// substrings. The fallback is the generic 0–10 scale.
// `goodFor` is the list of brew methods this grinder can actually pull off.
// We're permissive by default — most premium grinders cover the full range
// (espresso through cold brew) when set to the right particle size. The
// only realistic exclusions are grinders whose burr geometry physically
// can't reach the size required by a method:
//   - Fellow Ode (V1) ships with brew-only burrs — no espresso burrs sold.
//     Even at the finest setting it doesn't choke a 9-bar shot.
//   - Baratza Encore stock burrs are filter-tuned. Espresso is possible
//     in theory (lots of YouTubers have shown it) but unreliable in
//     practice; we flag it as not-recommended.
//
// Everything else gets the full set. Niche, Acaia Orbit (SSP), Comandante,
// 1Zpresso, EK43, DF64 — all of these have well-documented use across the
// whole brew spectrum, including cold brew at their coarse end.
const ALL_METHODS = ["espresso", "moka", "v60", "aeropress", "chemex", "french", "cold"];

export const GRINDERS = [
  { id: "comandante",     match: ["comandante", "c40"],                   label: "Comandante C40",        min: 6,  max: 36,  step: 1,   unit: "clicks",   defaultClicks: 22,  goodFor: ALL_METHODS },
  { id: "1zpresso-jx",    match: ["1zpresso jx", "jx-pro", "jxpro"],      label: "1Zpresso JX-Pro",       min: 30, max: 200, step: 1,   unit: "clicks",   defaultClicks: 90,  goodFor: ALL_METHODS },
  { id: "1zpresso-zp6",   match: ["1zpresso zp6", "zp6"],                 label: "1Zpresso ZP6",          min: 0,  max: 90,  step: 1,   unit: "clicks",   defaultClicks: 35,  goodFor: ALL_METHODS },
  { id: "1zpresso-q2",    match: ["1zpresso q2", "q2"],                   label: "1Zpresso Q2",           min: 0,  max: 36,  step: 1,   unit: "clicks",   defaultClicks: 14,  goodFor: ALL_METHODS },
  { id: "1zpresso-kplus", match: ["1zpresso k-plus", "k-plus", "kplus"],  label: "1Zpresso K-Plus",       min: 0,  max: 90,  step: 1,   unit: "clicks",   defaultClicks: 40,  goodFor: ALL_METHODS },
  { id: "1zpresso-kpro",  match: ["1zpresso k-pro", "kpro", "k-pro"],     label: "1Zpresso K-Pro",        min: 0,  max: 90,  step: 1,   unit: "clicks",   defaultClicks: 40,  goodFor: ALL_METHODS },
  { id: "1zpresso-kmax",  match: ["1zpresso k-max", "kmax", "k-max"],     label: "1Zpresso K-Max",        min: 0,  max: 90,  step: 1,   unit: "clicks",   defaultClicks: 40,  goodFor: ALL_METHODS },
  { id: "kingrinder-k6",  match: ["kingrinder k6", "k6"],                 label: "Kingrinder K6",         min: 0,  max: 90,  step: 1,   unit: "clicks",   defaultClicks: 50,  goodFor: ALL_METHODS },
  { id: "kingrinder-k4",  match: ["kingrinder k4", "k4"],                 label: "Kingrinder K4",         min: 0,  max: 90,  step: 1,   unit: "clicks",   defaultClicks: 45,  goodFor: ALL_METHODS },
  { id: "timemore-c2",    match: ["timemore c2", "c2"],                   label: "Timemore C2",           min: 0,  max: 30,  step: 1,   unit: "clicks",   defaultClicks: 15,  goodFor: ALL_METHODS },
  { id: "niche",          match: ["niche zero", "niche-zero", "niche"],   label: "Niche Zero",            min: 0,  max: 50,  step: 1,   unit: "notches",  defaultClicks: 22,  goodFor: ALL_METHODS },
  { id: "df64",           match: ["df64", "df 64", "g-iota", "giota"],    label: "DF64",                  min: 0,  max: 80,  step: 1,   unit: "notches",  defaultClicks: 30,  goodFor: ALL_METHODS },
  { id: "df54",           match: ["df54", "df 54"],                       label: "DF54",                  min: 0,  max: 80,  step: 1,   unit: "notches",  defaultClicks: 30,  goodFor: ALL_METHODS },
  { id: "df83",           match: ["df83", "df 83"],                       label: "DF83",                  min: 0,  max: 80,  step: 1,   unit: "notches",  defaultClicks: 30,  goodFor: ALL_METHODS },
  { id: "ek43",           match: ["ek43", "ek 43"],                       label: "Mahlkönig EK43",        min: 0,  max: 11,  step: 0.1, unit: "",         defaultClicks: 5,   goodFor: ALL_METHODS },
  { id: "ek43s",          match: ["ek43s", "ek 43s"],                     label: "Mahlkönig EK43s",       min: 0,  max: 11,  step: 0.1, unit: "",         defaultClicks: 5,   goodFor: ALL_METHODS },
  { id: "x54",            match: ["x54", "mahlkonig x54", "mahlkönig x54"], label: "Mahlkönig X54",       min: 0,  max: 13,  step: 0.1, unit: "",         defaultClicks: 6,   goodFor: ALL_METHODS },
  { id: "acaia-orbit",    match: ["acaia orbit", "ssp v3", "ssp mp", "ssp hu", "ssp"], label: "Acaia Orbit (SSP)", min: 0, max: 10, step: 0.1, unit: "", defaultClicks: 1.5, goodFor: ALL_METHODS },
  { id: "weber-key",      match: ["weber key", "weber eg-1"],             label: "Weber Key",             min: 0,  max: 10,  step: 0.1, unit: "",         defaultClicks: 3,   goodFor: ALL_METHODS },
  { id: "fellow-ode2",    match: ["fellow ode 2", "ode 2", "ode gen 2"],  label: "Fellow Ode Gen 2",      min: 1,  max: 11,  step: 1,   unit: "settings", defaultClicks: 5,   goodFor: ["v60", "aeropress", "chemex", "moka", "french", "cold"] },
  { id: "fellow-ode",     match: ["fellow ode", "ode"],                   label: "Fellow Ode (Gen 1)",    min: 1,  max: 11,  step: 1,   unit: "settings", defaultClicks: 5,   goodFor: ["v60", "aeropress", "chemex", "french", "cold"] },
  { id: "baratza-encore", match: ["baratza encore", "encore"],            label: "Baratza Encore",        min: 1,  max: 40,  step: 1,   unit: "settings", defaultClicks: 18,  goodFor: ["v60", "aeropress", "chemex", "moka", "french", "cold"] },
  { id: "eureka-mignon",  match: ["eureka mignon", "mignon"],             label: "Eureka Mignon",         min: 0,  max: 60,  step: 1,   unit: "settings", defaultClicks: 25,  goodFor: ALL_METHODS },
];

const GENERIC_GRINDER = {
  id: "generic", match: [], label: "Grinder",
  min: 0, max: 10, step: 0.5, unit: "setting", defaultClicks: 5,
  // Generic grinders default to "we don't know" — UI treats this as no
  // capability constraint, no warning shown. Users can override via the
  // custom scale form in GearView.
  goodFor: null,
};

export function detectGrinder(name) {
  if (!name) return GRINDERS[0]; // default Comandante
  const n = String(name).toLowerCase();
  for (const g of GRINDERS) {
    if (g.match.some((m) => n.includes(m))) return g;
  }
  return { ...GENERIC_GRINDER, label: name };
}

// Resolve the active grinder profile from a `gear` JSONB. Honors:
//   gear.grinderCustom = { min, max, step, unit, goodFor }  ← user override
// before falling back to `gear.grinder` (string) → detectGrinder.
//
// gear.grinder is still the source of truth for the LABEL — custom is the
// sidecar with the numeric scale. That way "Acme MZ-12" still shows as
// "Acme MZ-12" even when the user has pinned a custom scale.
export function resolveGrinder(gear) {
  const fromName = detectGrinder(gear?.grinder);
  const custom = gear?.grinderCustom;
  if (custom && (Number.isFinite(custom.min) || Number.isFinite(custom.max))) {
    return {
      ...fromName,
      label: gear?.grinder || fromName.label,
      min: Number.isFinite(custom.min) ? custom.min : fromName.min,
      max: Number.isFinite(custom.max) ? custom.max : fromName.max,
      step: Number.isFinite(custom.step) && custom.step > 0 ? custom.step : fromName.step,
      unit: custom.unit ?? fromName.unit,
      goodFor: Array.isArray(custom.goodFor) ? custom.goodFor : fromName.goodFor,
    };
  }
  return fromName;
}

// Returns null if the grinder is well-suited to the brew method, otherwise
// a short human warning. `goodFor: null` (generic / unknown grinders) skips
// the check so we don't nag users who haven't told us what they own.
//
// Most grinders are flagged as capable of every method (premium grinders
// generally cover the full range when set to the right particle size).
// The exclusions we DO flag are real burr-geometry limits — typically
// filter-burr grinders that can't choke an espresso machine.
export function grinderCapability(grinder, method) {
  if (!grinder?.goodFor) return null;
  if (grinder.goodFor.includes(method?.id)) return null;
  // Specifically about espresso — that's what filter-burr grinders can't
  // physically do. Other exclusions are rare; keep the wording generic for
  // those.
  if (method?.id === "espresso") {
    return `Heads up — your ${grinder.label} ships with filter burrs and won't grind fine enough for proper espresso pressure. You can dial below, but expect very fast / gushing shots.`;
  }
  return `Heads up — your ${grinder.label} isn't built for ${method?.short || method?.name}. Most users who own one stick to: ${grinder.goodFor.join(", ")}.`;
}

// Map a grinder's clicks to a fineness ratio 0..1 (0 = finest, 1 = coarsest).
// Then back to a per-method "ideal" clicks so we can detect way-out-of-range
// dials and warn the user.
export function clicksToFineness(grinder, clicks) {
  const span = grinder.max - grinder.min;
  if (span <= 0) return 0.5;
  return Math.min(1, Math.max(0, (clicks - grinder.min) / span));
}
export function finenessToClicks(grinder, f01) {
  return grinder.min + Math.max(0, Math.min(1, f01)) * (grinder.max - grinder.min);
}

// Quantize a value to a step without float-math ghosts. The naive
// `Math.round(v / 0.1) * 0.1` produces 5.000000001 because 0.1 isn't
// representable in binary floating point. We scale to integer space using
// the step's decimal places, round there, and scale back.
export function quantize(value, step) {
  if (!step || step <= 0) return value;
  if (step >= 1) return Math.round(value);
  // Count decimal places in the step (handles 0.1, 0.05, 0.01, etc.).
  const stepStr = String(step);
  const decimals = stepStr.includes(".") ? stepStr.split(".")[1].length : 0;
  const factor = Math.pow(10, decimals);
  // toFixed → parseFloat collapses the residual binary ghost (e.g.
  // 4.9999999996 → "5.0" → 5).
  return parseFloat((Math.round(value * factor / Math.round(step * factor)) * step).toFixed(decimals));
}

// Snap a click value to the grinder's scale, clamping to its range.
export function snapClicks(grinder, value) {
  const clamped = Math.max(grinder.min, Math.min(grinder.max, value));
  return quantize(clamped, grinder.step);
}

// Format a click value for display using the grinder's precision.
// Defensive: re-quantize before formatting in case the value sneaked in
// already-ghosted (e.g. an old saved brew note from before snapClicks
// landed in localStorage). value.toFixed(n) on a binary-ghost number
// rounds to the right n decimals, so this is belt-and-suspenders safe.
export function formatClicks(grinder, value) {
  if (!Number.isFinite(value)) return "—";
  if (grinder.step >= 1) return String(Math.round(value));
  const stepStr = String(grinder.step);
  const decimals = stepStr.includes(".") ? stepStr.split(".")[1].length : 0;
  return Number(value).toFixed(decimals);
}

// What range of fineness (0..1, 0=finest) is sane for each method.
// Anything outside the band gets a soft "you sure?" warning in the UI.
export const METHOD_FINENESS_BAND = {
  espresso: [0.05, 0.30],
  moka:     [0.20, 0.45],
  v60:      [0.45, 0.75],
  chemex:   [0.55, 0.80],
  aeropress:[0.40, 0.75],
  french:   [0.75, 0.95],
  cold:     [0.85, 1.00],
};

export const METHOD_TEMP_BAND = {
  espresso: [88, 96],
  moka:     [95, 100],
  v60:      [90, 99],
  chemex:   [92, 99],
  aeropress:[80, 95],
  french:   [88, 96],
  cold:     [4,  25],
};

// Temperature dial range. Cold brew uses a fridge/room range (0–30°C);
// everything else uses the standard hot-brew range (80–99°C). The slider
// uses these to size its scale per method, so users can actually move
// the dial to where it makes sense for cold brew.
export function methodTempRange(method) {
  if (method?.id === "cold") return { min: 0, max: 30, mid: 15, step: 1 };
  return { min: 80, max: 99, mid: 89, step: 1 };
}

// Returns null if the dial is sane, otherwise a short human-readable warning
// explaining the suspected mismatch.
export function dialWarning({ method, grinder, clicks, temp }) {
  const m = method?.id || "v60";
  const fineness = clicksToFineness(grinder, clicks);
  const grindBand = METHOD_FINENESS_BAND[m];
  const tempBand = METHOD_TEMP_BAND[m];
  const issues = [];
  if (grindBand) {
    if (fineness < grindBand[0]) issues.push(`That grind is way too fine for ${method.short} — expect bitter & slow.`);
    else if (fineness > grindBand[1]) issues.push(`That grind is way too coarse for ${method.short} — expect sour & weak.`);
  }
  if (tempBand) {
    if (temp < tempBand[0]) issues.push(`Water at ${temp}°C is colder than ${method.short}'s usual ${tempBand[0]}–${tempBand[1]}°C — under-extracted.`);
    else if (temp > tempBand[1]) issues.push(`Water at ${temp}°C is hotter than ${method.short}'s usual ${tempBand[0]}–${tempBand[1]}°C — risk of scorching.`);
  }
  return issues.length ? issues.join(" ") : null;
}
