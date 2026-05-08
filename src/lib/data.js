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
  return adj;
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
export const GRINDERS = [
  { id: "comandante",   match: ["comandante", "c40"],          label: "Comandante C40",        min: 6,  max: 36, step: 1,   unit: "clicks",   defaultClicks: 22 },
  { id: "1zpresso-jx",  match: ["1zpresso jx", "jx-pro", "jxpro"], label: "1Zpresso JX-Pro",  min: 30, max: 200, step: 1,  unit: "clicks",   defaultClicks: 90 },
  { id: "1zpresso-zp6", match: ["1zpresso zp6", "zp6"],         label: "1Zpresso ZP6",          min: 0,  max: 90, step: 1,   unit: "clicks",   defaultClicks: 35 },
  { id: "1zpresso-q2",  match: ["1zpresso q2", "q2"],           label: "1Zpresso Q2",           min: 0,  max: 36, step: 1,   unit: "clicks",   defaultClicks: 14 },
  { id: "kingrinder-k6",match: ["kingrinder k6", "k6"],         label: "Kingrinder K6",         min: 0,  max: 90, step: 1,   unit: "clicks",   defaultClicks: 50 },
  { id: "niche",        match: ["niche zero", "niche-zero", "niche"], label: "Niche Zero",     min: 0,  max: 50, step: 1,   unit: "notches",  defaultClicks: 22 },
  { id: "df64",         match: ["df64", "df 64"],               label: "DF64",                  min: 0,  max: 80, step: 1,   unit: "notches",  defaultClicks: 30 },
  { id: "ek43",         match: ["ek43", "ek 43"],               label: "Mahlkönig EK43",        min: 0,  max: 11, step: 0.1, unit: "",         defaultClicks: 5 },
  { id: "acaia-orbit",  match: ["acaia orbit", "ssp v3", "ssp"],label: "Acaia Orbit (SSP)",     min: 0,  max: 10, step: 0.1, unit: "",         defaultClicks: 1.5 },
  { id: "fellow-ode",   match: ["fellow ode", "ode"],           label: "Fellow Ode",            min: 1,  max: 11, step: 1,   unit: "settings", defaultClicks: 5 },
  { id: "baratza-encore", match: ["baratza encore", "encore"],  label: "Baratza Encore",        min: 1,  max: 40, step: 1,   unit: "settings", defaultClicks: 18 },
];

const GENERIC_GRINDER = {
  id: "generic", match: [], label: "Grinder",
  min: 0, max: 10, step: 0.5, unit: "setting", defaultClicks: 5,
};

export function detectGrinder(name) {
  if (!name) return GRINDERS[0]; // default Comandante
  const n = String(name).toLowerCase();
  for (const g of GRINDERS) {
    if (g.match.some((m) => n.includes(m))) return g;
  }
  return { ...GENERIC_GRINDER, label: name };
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
export function formatClicks(grinder, value) {
  if (!Number.isFinite(value)) return "—";
  if (grinder.step >= 1) return String(Math.round(value));
  const stepStr = String(grinder.step);
  const decimals = stepStr.includes(".") ? stepStr.split(".")[1].length : 0;
  return value.toFixed(decimals);
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
