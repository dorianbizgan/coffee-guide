// End-to-end smoke run on iPhone 16 Pro Max emulation. Walks the full
// happy path: guest sign-in → dashboard → start a timer on a card →
// open detail → confirm timer survived → change method → favorite →
// search → open Log-a-coffee modal → add a coffee → confirm card.
// At every step we check the page didn't overflow horizontally.
const { chromium } = require("playwright");

const URL = process.env.E2E_URL || "http://127.0.0.1:5173/";
// Use $CHROME to point at a system chromium for sandboxed envs; otherwise
// Playwright launches its bundled browser (run `npx playwright install` once).
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

(async () => {
  const launchOpts = CHROME ? { executablePath: CHROME } : {};
  const browser = await chromium.launch(launchOpts);
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") pageErrors.push("[console] " + msg.text());
  });

  async function audit(step) {
    const r = await page.evaluate((TARGET) => {
      const vw = window.innerWidth;
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const offenders = [];
      document.querySelectorAll("*").forEach((el) => {
        const rr = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (rr.right > TARGET + 1 && cs.overflowX === "visible" && rr.width > 0) {
          // walk up: ignore if any ancestor has overflow-x !== visible
          let p = el.parentElement;
          let clipped = false;
          while (p) {
            const pcs = getComputedStyle(p);
            if (pcs.overflowX === "hidden" || pcs.overflowX === "auto" || pcs.overflowX === "scroll") {
              clipped = true;
              break;
            }
            p = p.parentElement;
          }
          if (!clipped) {
            offenders.push({
              tag: el.tagName,
              cls: (el.className || "").toString().slice(0, 60),
              right: Math.round(rr.right),
              w: Math.round(rr.width),
            });
          }
        }
      });
      return { vw, docW, bodyW, offenders: offenders.slice(0, 6) };
    }, 440);
    const overflow = r.docW > r.vw + 1 || r.bodyW > r.vw + 1 || r.offenders.length > 0;
    record(
      `[${step}] no horizontal overflow`,
      !overflow,
      `vw=${r.vw} docW=${r.docW} bodyW=${r.bodyW}` +
        (r.offenders.length ? ` offenders=${JSON.stringify(r.offenders)}` : ""),
    );
  }

  // === Landing → Guest mode ===
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await audit("landing");

  const guest = page.getByRole("button", { name: /Continue as guest/i });
  if (await guest.count()) {
    await guest.first().click();
    await page.waitForTimeout(700);
  }
  await page.waitForSelector("article.card", { timeout: 6000 });
  await audit("dashboard");
  const cardsAtStart = await page.locator("article.card").count();
  record("dashboard seeded with sample coffees", cardsAtStart >= 1, `${cardsAtStart} cards`);

  // === Circular timer visible on dashboard ===
  const ctimerCount = await page.locator(".ctimer").count();
  record(".ctimer rings rendered on dashboard cards", ctimerCount >= cardsAtStart, `${ctimerCount} rings`);

  const firstRing = page.locator(".ctimer-ring").first();
  const ringBox = await firstRing.boundingBox();
  record(
    "first .ctimer-ring has nonzero size",
    !!(ringBox && ringBox.width > 40 && ringBox.height > 40),
    JSON.stringify(ringBox),
  );
  record(
    "first .ctimer-ring within viewport (right <= 440)",
    !!(ringBox && ringBox.x + ringBox.width <= 441),
    `right=${ringBox ? Math.round(ringBox.x + ringBox.width) : "?"}`,
  );

  // === Start timer on first card ===
  // First, snapshot the initial caption — should read "Start brewing"
  const captionBefore = (await firstRing.locator(".ctimer-step").textContent()) || "";
  record(
    "ring caption before start says 'Start brewing'",
    /start brewing/i.test(captionBefore),
    `caption="${captionBefore}"`,
  );

  await firstRing.click();
  await page.waitForTimeout(1300);
  let timerText = (await firstRing.locator(".ctimer-num").textContent()) || "";
  record(
    "timer ticks after start (text not 0:00)",
    /^0:0[1-9]|^0:[1-5]\d/.test(timerText),
    `text="${timerText}"`,
  );

  // Step caption: should now be the active brewing step name
  // (e.g. "Bloom" for V60). Verify it's NOT the "Start brewing" hint.
  const captionRunning = (await firstRing.locator(".ctimer-step").textContent()) || "";
  record(
    "ring caption shows the active brewing step when running",
    captionRunning.length > 0 && !/start brewing/i.test(captionRunning),
    `caption="${captionRunning}"`,
  );

  // Caption must fit inside the ring (no horizontal overflow). Compare
  // the caption's box width to the ring's box width.
  const captionFits = await page.evaluate(() => {
    const step = document.querySelector(".ctimer-step");
    const ring = document.querySelector(".ctimer-ring");
    if (!step || !ring) return false;
    const sr = step.getBoundingClientRect();
    const rr = ring.getBoundingClientRect();
    return sr.left >= rr.left && sr.right <= rr.right;
  });
  record("ring caption stays inside the ring's bounding box", captionFits);

  // === Open detail of the same card — timer should keep ticking ===
  // The ring stops propagation, so click on the card name instead
  await page.locator("article.card").first().locator(".card-name").click();
  await page.waitForTimeout(700);
  await audit("detail");

  // LinearTimer in detail should show the same elapsed time (non-zero)
  const linearNum = page.locator(".timer-clock .t-num").first();
  if (await linearNum.count()) {
    const t = (await linearNum.textContent()) || "";
    record("detail linear timer shows running time", !/^0:00$/.test(t), `text="${t}"`);
  } else {
    record("detail linear timer present", false, "(.timer-clock .t-num not found)");
  }

  // Take a screenshot of detail
  await page.screenshot({ path: "/tmp/e2e-detail.png", fullPage: false });
  await page.screenshot({ path: "/tmp/e2e-detail-full.png", fullPage: true });

  // === Brewnote chip toggle (visual feedback) ===
  // The "Overall" tag chips and the "Flavors you tasted" chips both
  // toggle a class on click. Without the .chip.on CSS rule the click
  // had no visual effect — verify the background actually changes.
  await page.evaluate(() => document.querySelector(".brewnote")?.scrollIntoView({ behavior: "instant", block: "start" }));
  await page.waitForTimeout(150);
  const overallChip = page.locator(".bn-section").first().locator(".chip").nth(2);
  const overallBefore = await overallChip.evaluate((el) => getComputedStyle(el).backgroundColor);
  await overallChip.click();
  await page.waitForTimeout(150);
  const overallAfter = await overallChip.evaluate((el) => getComputedStyle(el).backgroundColor);
  record(
    "Overall tag chip's background visibly changes on click",
    overallBefore !== overallAfter,
    `${overallBefore} → ${overallAfter}`,
  );

  const flavorChip = page.locator(".chip.flavor").first();
  if (await flavorChip.count()) {
    const fBefore = await flavorChip.evaluate((el) => getComputedStyle(el).backgroundColor);
    await flavorChip.click();
    await page.waitForTimeout(150);
    const fAfter = await flavorChip.evaluate((el) => getComputedStyle(el).backgroundColor);
    record(
      "Flavor chip's background visibly changes on click",
      fBefore !== fAfter,
      `${fBefore} → ${fAfter}`,
    );
  }

  // === Dial-override persistence ===
  // (a) Drag the temp slider, (b) navigate away, (c) come back, (d) verify
  // the dial still shows the changed value.
  // Identify the first slider (temperature in detail) and set a custom value.
  // Note: React 16+ wraps inputs with _valueTracker, so naively assigning
  // `.value` won't trigger onChange. Use the native setter via the
  // prototype descriptor so React notices the diff.
  const tempSlider = page.locator(".dial .slider").first();
  if (await tempSlider.count()) {
    await tempSlider.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(el, "85");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.waitForTimeout(500); // wait for the 350ms debounced write
    const persisted = await page.evaluate(() => {
      const k = Object.keys(localStorage).find((x) => x.startsWith("cb_dial_"));
      if (!k) return null;
      try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
    });
    record(
      "dial change writes localStorage override",
      persisted && persisted.temp === 85,
      `persisted=${JSON.stringify(persisted)}`,
    );

    // Go back to dashboard
    const back1 = page.getByRole("button", { name: /Back to shelf|Back|←/i }).first();
    if (await back1.count()) {
      await back1.click();
      await page.waitForTimeout(400);
    }
    // Re-open same coffee
    await page.locator("article.card").first().locator(".card-name").click();
    await page.waitForTimeout(500);

    const hydratedTemp = await page.evaluate(() => {
      const s = document.querySelector(".dial .slider");
      return s ? parseInt(s.value, 10) : null;
    });
    record(
      "dial override hydrates on re-entering detail",
      hydratedTemp === 85,
      `slider value=${hydratedTemp}`,
    );
  } else {
    record("dial slider present in detail", false);
  }

  // === Change brew method via the detail-page tabs ===
  const methodTabs = page.locator(".method-tab");
  const tabCount = await methodTabs.count();
  if (tabCount >= 2) {
    await methodTabs.nth(1).click();
    await page.waitForTimeout(400);
    record("can switch brew method from detail tabs", true);
  } else {
    record("can switch brew method from detail tabs", false, `only ${tabCount} tabs`);
  }
  // After switching methods, the dial should NOT carry over the temp=85
  // from the previous method (overrides are scoped per-method).
  const tempAfterSwitch = await page.evaluate(() => {
    const s = document.querySelector(".dial .slider");
    return s ? parseInt(s.value, 10) : null;
  });
  record(
    "switching method gives a fresh dial (per-method overrides)",
    tempAfterSwitch !== 85 && tempAfterSwitch != null,
    `slider value=${tempAfterSwitch}`,
  );
  await audit("detail-after-method-switch");

  // === Back to dashboard ===
  const back = page.getByRole("button", { name: /Back to shelf|Back|←/i }).first();
  if (await back.count()) {
    await back.click();
  } else {
    // fallback: click the Crema logo
    await page.locator(".nav, header").first().click({ position: { x: 30, y: 30 } });
  }
  await page.waitForTimeout(500);
  await page.waitForSelector("article.card", { timeout: 5000 });
  await audit("back-to-dashboard");

  // === Favorite toggling ===
  // Seed data has Kayon Mountain pre-favorited, so we test toggle semantics
  // (flip state, then flip back) rather than asserting a specific state.
  const star = page.locator("article.card .card-fav").first();
  const before = await star.evaluate((b) => b.classList.contains("is-fav"));
  await star.click();
  await page.waitForTimeout(300);
  const after = await star.evaluate((b) => b.classList.contains("is-fav"));
  record("can toggle favorite on a card", before !== after, `${before} → ${after}`);

  // Make sure at least ONE card is favorited so the Favorites filter is exercised
  if (!after) {
    await star.click();  // toggle back to favorite
    await page.waitForTimeout(200);
  }

  // Filter chip: Favorites should show >= 1 card
  await page.locator(".chip", { hasText: /Favorites/i }).first().click();
  await page.waitForTimeout(300);
  const favCount = await page.locator("article.card").count();
  record("favorites filter shows starred card", favCount >= 1, `${favCount} cards`);

  // Back to All
  await page.locator(".chip", { hasText: /All beans/i }).first().click();
  await page.waitForTimeout(300);

  // === Change brew method via card pill dropdown ===
  const methodBadge = page.locator("article.card .method-badge-btn").first();
  await methodBadge.click();
  await page.waitForTimeout(200);
  const methodMenu = page.locator(".method-menu");
  if (await methodMenu.count()) {
    await methodMenu.locator(".method-menu-item").nth(1).click();
    await page.waitForTimeout(300);
    record("can switch brew method from card dropdown", true);
  } else {
    record("can switch brew method from card dropdown", false, "menu didn't open");
  }
  await audit("card-method-changed");

  // === Search ===
  const searchInput = page.locator(".dash-search input, input[placeholder*='Search']").first();
  await searchInput.fill("Kayon");
  await page.waitForTimeout(400);
  const searchResult = await page.locator("article.card").count();
  record("search filters the grid", searchResult <= cardsAtStart, `${searchResult} cards after search`);
  await searchInput.fill("");
  await page.waitForTimeout(200);

  // === Open Log-a-coffee modal ===
  const addBtn = page.getByRole("button", { name: /Log a coffee|Log a new coffee/i }).first();
  await addBtn.click();
  await page.waitForTimeout(600);
  await audit("add-modal");
  await page.screenshot({ path: "/tmp/e2e-modal.png", fullPage: false });

  const modal = page.locator(".modal, [role='dialog']").first();
  record("add-coffee modal opens", await modal.count() > 0);

  // Fill in name, roaster, origin
  const setField = async (label, value) => {
    const input = page.locator(
      `input[placeholder*='${label}' i], input[name*='${label.toLowerCase()}' i], label:has-text('${label}') + input, label:has-text('${label}') input`
    ).first();
    if (await input.count()) {
      await input.fill(value);
      return true;
    }
    return false;
  };

  // Multi-step wizard: each step has a Continue button until the final
  // step which has Save / Add / Log it. We loop, filling text inputs and
  // clicking Continue, until we find a finish button or run out of steps.
  const testName = "Test Bean " + Date.now();
  let stepsDone = 0;
  for (let step = 0; step < 6; step++) {
    // Fill any visible text inputs (skip already-filled ones)
    const inputs = page.locator(".modal input[type='text'], .modal input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='range'])");
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const inp = inputs.nth(i);
      const v = await inp.inputValue().catch(() => "");
      if (v) continue;
      if (i === 0 && step === 0) await inp.fill(testName);
      else if (i === 1 && step === 0) await inp.fill("Test Roaster");
      else if (i === 2 && step === 0) await inp.fill("Test Origin");
    }
    const finishBtn = page.locator(
      ".modal button:has-text('Save'), .modal button:has-text('Add to shelf'), .modal button:has-text('Log it'), .modal button:has-text('Finish'), .modal button:has-text('Done'), .modal button:has-text('Create')"
    ).first();
    if (await finishBtn.count()) {
      await finishBtn.click();
      stepsDone = step + 1;
      break;
    }
    const continueBtn = page.locator(".modal button:has-text('Continue'), .modal button:has-text('Next')").first();
    if (await continueBtn.count()) {
      await continueBtn.click();
      await page.waitForTimeout(400);
      stepsDone = step + 1;
    } else {
      break;
    }
  }
  await page.waitForTimeout(800);
  // The wizard auto-navigates into the new coffee's detail view on save.
  // Confirm by: (a) modal is closed, (b) we're on a detail page, then
  // go Back to the shelf and verify the card count grew.
  const postWizardState = await page.evaluate(() => ({
    modalOpen: !!document.querySelector(".modal"),
    onDetail: !!document.querySelector(".detail"),
    detailH1: (document.querySelector(".detail-name") || {}).textContent || "",
  }));
  record("wizard closes modal on finish", !postWizardState.modalOpen);
  record("wizard navigates into new coffee's detail", postWizardState.onDetail);

  // Back to dashboard
  const backBtn = page.getByRole("button", { name: /Back to shelf|Back|←/i }).first();
  if (await backBtn.count()) {
    await backBtn.click();
    await page.waitForTimeout(500);
  }
  const cardsAfter = await page.locator("article.card").count();
  record(
    "adding a coffee increases card count",
    cardsAfter > cardsAtStart,
    `${cardsAtStart} → ${cardsAfter} (wizard steps: ${stepsDone})`,
  );

  // === Final dashboard screenshot ===
  await audit("final-dashboard");
  await page.screenshot({ path: "/tmp/e2e-final.png", fullPage: false });
  await page.screenshot({ path: "/tmp/e2e-final-full.png", fullPage: true });

  // === Page errors === (filter out benign guest-mode network noise:
  // Supabase auth blocked by self-signed cert + favicon 404s aren't bugs)
  const realErrors = pageErrors.filter(
    (e) => !/ERR_CERT_AUTHORITY_INVALID|status of 404|Failed to load resource/.test(e),
  );
  record("no console / page errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));

  await browser.close();

  // Summary
  const passes = results.filter((r) => r.ok).length;
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${passes} pass, ${fails} fail ===`);
  if (fails) {
    console.log("Failures:");
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}  ${r.info}`));
    process.exit(1);
  }
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
});
