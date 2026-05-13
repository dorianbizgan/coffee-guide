// Verifies the grinder-scale system end-to-end.
// Seeds the guest profile with an "Acaia Orbit (Lab Sweet V3)" grinder
// (0-10 scale, step 0.1) before the app boots, then asserts:
//   - The Detail dial slider's min/max/step match the Acaia scale.
//   - The Detail "Grind" sidebar row names the Acaia.
//   - The Dashboard card grind cell shows a 0-10 number (not 22 clicks).
//   - Switching back to a Comandante (via overriding the profile) flips
//     the slider's range back to 6-36.
const { chromium } = require("playwright");

const URL = process.env.E2E_URL || "http://127.0.0.1:5173/";
const CHROME = process.env.CHROME || undefined;
const PHONE = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

const results = [];
function record(name, ok, info = "") {
  results.push({ name, ok, info });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`);
}

async function withGrinder(page, grinderName) {
  await page.evaluate((name) => {
    localStorage.setItem("crema-guest-mode", "1");
    const prof = JSON.parse(localStorage.getItem("crema-guest-profile") || "{}");
    prof.gear = { ...(prof.gear || {}), grinder: name };
    // Remove any stale grinderScale so resolveGrinder uses the preset path.
    delete prof.gear.grinderScale;
    localStorage.setItem("crema-guest-profile", JSON.stringify(prof));
  }, grinderName);
}

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("[PAGE ERR]", e.message));

  await page.goto(URL, { waitUntil: "networkidle" });
  // Seed Acaia BEFORE the app reads the profile, then reload.
  await withGrinder(page, "Acaia Orbit (Lab Sweet V3)");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("article.card", { timeout: 6000 });

  // Dashboard card grind label should show the Acaia name + a 0-10 number
  const dashGrind = await page.evaluate(() => {
    const el = document.querySelector("article.card .card-grind-main");
    if (!el) return null;
    return {
      label: el.querySelector(".l")?.textContent?.trim(),
      value: el.querySelector(".v")?.textContent?.trim(),
    };
  });
  record(
    "dashboard card grind label names the Acaia grinder",
    /Acaia/i.test(dashGrind?.label || ""),
    `label="${dashGrind?.label}"`,
  );
  record(
    "dashboard card grind value is in 0–10 range (decimal)",
    /^\d(\.\d)?\b/.test((dashGrind?.value || "").trim()),
    `value="${dashGrind?.value}"`,
  );

  // Open Detail
  await page.locator("article.card").first().locator(".card-name").click();
  await page.waitForTimeout(500);

  // Slider: second .dial .slider is the grind slider
  const grindSlider = page.locator(".dial .slider").nth(1);
  const sliderProps = await grindSlider.evaluate((el) => ({
    min: parseFloat(el.min),
    max: parseFloat(el.max),
    step: parseFloat(el.step),
    value: parseFloat(el.value),
  }));
  record(
    "grind slider min=0 on Acaia profile",
    sliderProps.min === 0,
    `min=${sliderProps.min}`,
  );
  record(
    "grind slider max=10 on Acaia profile",
    sliderProps.max === 10,
    `max=${sliderProps.max}`,
  );
  record(
    "grind slider step=0.1 on Acaia profile",
    Math.abs(sliderProps.step - 0.1) < 0.001,
    `step=${sliderProps.step}`,
  );
  record(
    "grind slider value within Acaia range",
    sliderProps.value >= 0 && sliderProps.value <= 10,
    `value=${sliderProps.value}`,
  );

  // Detail sidebar Grinder row should say Acaia
  const grinderRow = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".sidebar .gear-row"));
    const r = rows.find((row) => row.querySelector(".k")?.textContent === "Grinder");
    return r ? r.querySelector(".v")?.textContent : null;
  });
  record(
    "sidebar Grinder row shows the Acaia name",
    /Acaia/i.test(grinderRow || ""),
    `value="${grinderRow}"`,
  );

  // Now flip back to Comandante and verify slider range changes
  await withGrinder(page, "Comandante C40");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("article.card");
  await page.locator("article.card").first().locator(".card-name").click();
  await page.waitForTimeout(500);

  const comandanteSlider = await page.locator(".dial .slider").nth(1).evaluate((el) => ({
    min: parseFloat(el.min), max: parseFloat(el.max), step: parseFloat(el.step),
  }));
  record(
    "switching to Comandante flips slider to 6–36 / step 1",
    comandanteSlider.min === 6 && comandanteSlider.max === 36 && comandanteSlider.step === 1,
    JSON.stringify(comandanteSlider),
  );

  await browser.close();
  const passes = results.filter((r) => r.ok).length;
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${passes} pass, ${fails} fail ===`);
  if (fails) process.exit(1);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
