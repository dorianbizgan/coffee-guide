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

// Pick the brew method we'll default to for a freshly-added coffee.
// Caller-supplied `intendedMethod` (e.g. AI's web-lookup result) wins outright;
// otherwise we fall back to roast/process heuristics. The roast-level rules
// also now treat espresso blends and dark roasts as ESPRESSO, since
// dark/medium-dark single-origins and most blends are designed for espresso —
// the previous default of "v60 for medium / french for dark" was sending
// blends like Olympia Big Truck to the wrong tab.
export function recommend(coffee) {
  const intended = (coffee.intendedMethod || "").toLowerCase().trim();
  if (intended && /^(espresso|v60|aeropress|french|chemex|moka|cold)$/.test(intended)) return intended;
  const r = coffee.roast || "medium";
  const proc = (coffee.process || "").toLowerCase();
  const name = ((coffee.name || "") + " " + (coffee.roaster || "")).toLowerCase();
  // Heuristic: anything called a "blend" (or matching well-known espresso-blend
  // names) defaults to espresso, regardless of roast level.
  if (/\bblend|big\s*truck|hair\s*bender|hologram|pillow\s*fight|southern\s*weather|monarch\b/.test(name)) return "espresso";
  if (r === "dark" || r === "medium-dark") return "espresso";
  if (r === "light") return proc.includes("natural") || proc.includes("anaerob") ? "v60" : "chemex";
  if (r === "medium-light" || r === "medium") return "v60";
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
