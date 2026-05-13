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

  // === Mobile UI flow ===
  // The "global grinder setting" lives on the Gear page. On iPhone widths
  // the desktop .nav-links bar is display:none, so the hamburger menu is
  // the only path to Gear. Verify that path works and that the chosen
  // grinder propagates into the Detail dial.
  // Start fresh: clear the seeded profile so we can simulate a user who
  // typed their grinder from scratch via the UI.
  await page.evaluate(() => {
    localStorage.removeItem("crema-guest-profile");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("article.card");
  await page.waitForTimeout(300);

  const burgerVisible = await page.locator(".nav-burger").isVisible();
  record("mobile hamburger button is visible on phone widths", burgerVisible);

  await page.locator(".nav-burger").click();
  await page.waitForTimeout(200);
  const menuLabels = await page.locator(".nav-burger-menu .nav-burger-item").allTextContents();
  record(
    "hamburger menu contains Gear/Brew log/Shelf links",
    menuLabels.some((l) => /gear/i.test(l)) &&
      menuLabels.some((l) => /brew log/i.test(l)) &&
      menuLabels.some((l) => /shelf/i.test(l)),
    menuLabels.join(" | "),
  );

  await page.locator(".nav-burger-item", { hasText: /Gear/i }).click();
  await page.waitForTimeout(400);
  const reachedGear = (await page.locator("input[placeholder*='Comandante']").count()) > 0;
  record("hamburger → Gear navigates to the preferences page", reachedGear);

  await page.locator("input[placeholder*='Comandante']").fill("Acaia Orbit (Lab Sweet V3)");
  await page.getByRole("button", { name: /Save preferences/i }).click();
  await page.waitForTimeout(600);

  // Hamburger back to shelf
  await page.locator(".nav-burger").click();
  await page.waitForTimeout(200);
  await page.locator(".nav-burger-item", { hasText: /shelf/i }).click();
  await page.waitForTimeout(400);
  await page.waitForSelector("article.card");

  await page.locator("article.card").first().locator(".card-name").click();
  await page.waitForTimeout(500);
  const finalSlider = await page.locator(".dial .slider").nth(1).evaluate((el) => ({
    min: parseFloat(el.min), max: parseFloat(el.max), step: parseFloat(el.step),
  }));
  record(
    "saving grinder via the mobile hamburger → Gear flow applies on Detail",
    finalSlider.min === 0 && finalSlider.max === 10 && Math.abs(finalSlider.step - 0.1) < 0.001,
    JSON.stringify(finalSlider),
  );

  // === Anchor-based conversion accuracy ===
  // V60's recipe stores 22 (Comandante reference). On Acaia the V60
  // anchor is 6.5, so the dial should land at 6.5 (NOT the linear
  // 5.3 it used to land at).
  await page.evaluate(() => {
    localStorage.removeItem("crema-guest-profile");
    const p = { gear: { grinder: "Acaia Orbit (Lab Sweet V3)" }, aiProvider: "google", tastePreferences: "" };
    localStorage.setItem("crema-guest-profile", JSON.stringify(p));
    // Clear any leftover dial overrides
    Object.keys(localStorage).filter((k) => k.startsWith("cb_dial_")).forEach((k) => localStorage.removeItem(k));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("article.card");
  await page.waitForTimeout(300);
  // Pick a coffee whose default method is V60 AND whose roast doesn't
  // trigger adjustRecipe's click shifts. Sample data:
  //   c0 Kayon Mountain    light       V60   (-2 clicks)
  //   c1 Finca La Esperanza medium-light V60  (no shift)  ← use this
  //   c2 Camp Blend Nº 4   medium-dark Aeropress
  //   c3 Hambela Hararsu   light       V60   (-2 clicks)
  await page.locator("article.card").nth(1).locator(".card-name").click();
  await page.waitForTimeout(400);
  const baseAcaiaV60 = await page.locator(".dial .slider").nth(1).evaluate((el) => parseFloat(el.value));
  record(
    "anchor-based: V60 on Acaia lands at the V60 anchor (6.5), not linear-mapped 5.3",
    Math.abs(baseAcaiaV60 - 6.5) < 0.01,
    `value=${baseAcaiaV60} (was 5.3 under the old linear mapping)`,
  );

  // Also assert: Camp Blend's AeroPress recipe lands at the AeroPress
  // anchor (5.5 on Acaia), proving the conversion uses the right brew-
  // method bracket and not the V60 one.
  // Back out → open Camp Blend.
  await page.locator("button.back-btn, .back-btn").first().click();
  await page.waitForTimeout(400);
  await page.locator("article.card").nth(2).locator(".card-name").click();
  await page.waitForTimeout(400);
  const baseAcaiaAero = await page.locator(".dial .slider").nth(1).evaluate((el) => parseFloat(el.value));
  record(
    "anchor-based: AeroPress recipe on Acaia lands at the AeroPress anchor (5.5)",
    Math.abs(baseAcaiaAero - 5.5) < 0.05,
    `value=${baseAcaiaAero}`,
  );

  // Switch to Espresso method via tabs on the currently-open Camp Blend
  // → should land at Acaia's espresso anchor (2.5).
  const tabs = page.locator(".method-tab");
  const tabCount = await tabs.count();
  let espressoTab = null;
  for (let i = 0; i < tabCount; i++) {
    const t = await tabs.nth(i).textContent();
    if (/Espresso/i.test(t || "")) { espressoTab = tabs.nth(i); break; }
  }
  if (espressoTab) {
    await espressoTab.click();
    await page.waitForTimeout(400);
    const acaiaEsp = await page.locator(".dial .slider").nth(1).evaluate((el) => parseFloat(el.value));
    record(
      "anchor-based: Espresso on Acaia lands near the espresso anchor (~2.5)",
      Math.abs(acaiaEsp - 2.5) < 0.05,
      `value=${acaiaEsp}`,
    );
  }

  // === Migration prompt + flow ===
  // Set a dial override on the currently-open coffee + method, then go
  // to Gear and swap to Comandante. The confirm modal should appear with
  // both options; choose "Update Scale for All Recipes" and verify the
  // override now reflects the new scale.
  await page.locator(".dial .slider").nth(1).evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, "5");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(500);
  const overrideOnAcaia = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("cb_dial_"));
    return k ? JSON.parse(localStorage.getItem(k)) : null;
  });
  record(
    "override saved on Acaia stamps the grinder name",
    overrideOnAcaia?.clicks === 5 && overrideOnAcaia?.grinder === "Acaia Orbit (Lab Sweet V3)",
    JSON.stringify(overrideOnAcaia),
  );

  // Open Gear via hamburger (mobile path)
  await page.locator(".nav-burger").click();
  await page.waitForTimeout(200);
  await page.locator(".nav-burger-item", { hasText: /Gear/i }).click();
  await page.waitForTimeout(400);

  // Change grinder back to Comandante + Save
  const grinderField = page.locator("input[placeholder*='Comandante']").first();
  await grinderField.fill("Comandante C40");
  await page.getByRole("button", { name: /Save preferences/i }).click();
  await page.waitForTimeout(400);

  // Confirm modal should appear
  const modalVisible = await page.locator(".grinder-swap-modal").isVisible();
  record("grinder change prompts the confirm modal", modalVisible);

  const hasUpdateBtn = (await page
    .locator(".grinder-swap-modal button", { hasText: /Update Scale for All Recipes/i })
    .count()) > 0;
  const hasKeepBtn = (await page
    .locator(".grinder-swap-modal button", { hasText: /Keep saved recipes/i })
    .count()) > 0;
  record(
    "modal offers both 'Update Scale' and 'Keep saved recipes' options",
    hasUpdateBtn && hasKeepBtn,
  );

  // Click "Update Scale for All Recipes"
  await page.locator(".grinder-swap-modal button", { hasText: /Update Scale for All Recipes/i }).click();
  await page.waitForTimeout(600);

  // Verify the override was migrated. 5 on Acaia is between espresso (2.5)
  // and v60 (6.5); position is (5-2.5)/(6.5-2.5) = 0.625. On Comandante
  // between espresso (8) and v60 (22): 8 + 0.625 * 14 = 16.75 → snaps to 17.
  // (V60-method override → uses V60 anchor; pct in espresso↔v60 bracket).
  const migrated = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("cb_dial_"));
    return k ? JSON.parse(localStorage.getItem(k)) : null;
  });
  record(
    "after Update Scale: override clicks translated through anchors",
    migrated?.grinder === "Comandante C40" && migrated?.clicks >= 14 && migrated?.clicks <= 20,
    JSON.stringify(migrated),
  );

  await browser.close();
  const passes = results.filter((r) => r.ok).length;
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${passes} pass, ${fails} fail ===`);
  if (fails) process.exit(1);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
