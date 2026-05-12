// Headless iPhone 16 Pro Max test of the dashboard + detail views.
// Reports: viewport width, body.scrollWidth, any horizontal-overflow element,
// and whether the .ctimer ring is visible / has nonzero size.
const { chromium } = require("playwright");

const URL = process.env.E2E_URL || "http://127.0.0.1:5173/";
const CHROME = process.env.CHROME || undefined;

// iPhone 16 Pro Max: 6.9", 1320×2868 physical → 440×956 logical, DPR 3
const PHONE = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("[CONSOLE ERR]", msg.text());
  });
  page.on("pageerror", (err) => console.log("[PAGE ERR]", err.message));

  await page.goto(URL, { waitUntil: "networkidle" });

  // Demo-mode bypass: hit Try the demo if a sign-in screen is up.
  try {
    const demo = page.getByRole("button", { name: /Try the demo|Demo/i });
    if (await demo.count()) await demo.first().click({ timeout: 2000 });
  } catch {}
  try {
    const guest = page.getByRole("button", { name: /guest|continue.*device/i });
    if (await guest.count()) await guest.first().click({ timeout: 2000 });
  } catch {}
  await page.waitForTimeout(800);

  const audit = async (label) => {
    const r = await page.evaluate(() => {
      const vw = window.innerWidth;
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const offenders = [];
      const all = document.querySelectorAll("*");
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > 0 && r.width < vw * 3) {
          offenders.push({
            tag: el.tagName,
            cls: (el.className || "").toString().slice(0, 80),
            right: Math.round(r.right),
            w: Math.round(r.width),
          });
        }
      }
      // Dedup roughly
      const seen = new Set();
      const dedup = [];
      for (const o of offenders) {
        const k = `${o.tag}|${o.cls}|${o.right}|${o.w}`;
        if (seen.has(k)) continue;
        seen.add(k);
        dedup.push(o);
        if (dedup.length >= 25) break;
      }
      // Check .ctimer presence
      const ctimers = Array.from(document.querySelectorAll(".ctimer")).map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
          left: Math.round(r.left),
          display: cs.display,
          visibility: cs.visibility,
          ctimerSizeVar: cs.getPropertyValue("--ctimer-size").trim(),
        };
      });
      return { vw, docW, bodyW, offenders: dedup, ctimers, ctimerCount: ctimers.length };
    });
    console.log(`\n=== ${label} ===`);
    console.log("viewport:", r.vw, " documentElement.scrollWidth:", r.docW, " body.scrollWidth:", r.bodyW);
    console.log("OVERFLOW:", r.docW > r.vw ? "YES" : "no");
    if (r.offenders.length) {
      console.log("offending elements:");
      for (const o of r.offenders) console.log(" ", JSON.stringify(o));
    }
    console.log(`.ctimer count: ${r.ctimerCount}`);
    for (const t of r.ctimers.slice(0, 4)) console.log("  ctimer:", JSON.stringify(t));
    return r;
  };

  await audit("DASHBOARD");
  await page.screenshot({ path: "/tmp/iphone16pm-dashboard.png", fullPage: false });
  await page.screenshot({ path: "/tmp/iphone16pm-dashboard-full.png", fullPage: true });

  // Open first coffee card
  const card = page.locator("article.card").first();
  if (await card.count()) {
    await card.click({ timeout: 4000 });
    await page.waitForTimeout(700);
    await audit("DETAIL");
    await page.screenshot({ path: "/tmp/iphone16pm-detail.png", fullPage: false });
    await page.screenshot({ path: "/tmp/iphone16pm-detail-full.png", fullPage: true });
  } else {
    console.log("(no article.card found — still on landing?)");
  }

  await browser.close();
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
