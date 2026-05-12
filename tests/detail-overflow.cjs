// Find which detail-view element is forcing the page wider than 440px
// (iPhone 16 Pro Max). On mobile Chromium, when content > device-width,
// the layout viewport expands → window.innerWidth grows from 440 to ~725.
// So we measure against the original target (440), not the inflated vw.
const { chromium } = require("playwright");
const TARGET = 440;
const CHROME = process.env.CHROME || undefined;
const PHONE = {
  viewport: { width: TARGET, height: 956 },
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
  page.on("pageerror", (e) => console.log("[PAGE ERR]", e.message));
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // Landing page → "Continue as guest"
  const guest = page.getByRole("button", { name: /Continue as guest/i });
  if (await guest.count()) await guest.first().click();
  await page.waitForTimeout(800);

  await page.waitForSelector("article.card", { timeout: 6000 });
  console.log("cards:", await page.locator("article.card").count());

  await page.locator("article.card").first().click();
  await page.waitForTimeout(800);

  const r = await page.evaluate((TARGET) => {
    const vw = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    const offenders = [];
    document.querySelectorAll("*").forEach((el) => {
      const rr = el.getBoundingClientRect();
      const w = rr.width;
      const sw = el.scrollWidth;
      if (w > TARGET + 1 || sw > TARGET + 1) {
        const cs = getComputedStyle(el);
        offenders.push({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 80),
          w: Math.round(w),
          sw,
          minW: cs.minWidth,
          width: cs.width,
          display: cs.display,
          gridTemplate: cs.gridTemplateColumns,
          overflowX: cs.overflowX,
          parent: el.parentElement
            ? `${el.parentElement.tagName}.${(el.parentElement.className || "").toString().slice(0, 30)}`
            : "",
        });
      }
    });
    offenders.sort((a, b) => Math.max(b.w, b.sw) - Math.max(a.w, a.sw));
    return { vw, docW, offenders: offenders.slice(0, 40) };
  }, TARGET);
  console.log(`viewport: ${r.vw}  docW: ${r.docW}  target: ${TARGET}`);
  console.log(`offenders > ${TARGET}px (sorted by max width desc):`);
  for (const o of r.offenders) {
    console.log(
      `  ${o.tag}.${o.cls.slice(0, 56)}  w=${o.w}  sW=${o.sw}  minW=${o.minW}  width=${o.width}  cols=${(o.gridTemplate || "").slice(0, 30)}  ovx=${o.overflowX}  parent=${o.parent}`,
    );
  }
  await browser.close();
})();
