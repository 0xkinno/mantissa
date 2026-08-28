const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
let req;
try {
  req = createRequire(path.join(process.cwd(), "package.json"));
  req.resolve("playwright");
} catch {
  req = createRequire("C:/Users/hp/Downloads/veto video/demo/package.json");
}
const { chromium } = req("playwright");
const FALLBACK_EXE = "C:\\Users\\hp\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe";
async function launch() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    return await chromium.launch({ executablePath: FALLBACK_EXE, headless: true });
  }
}
const BASE = process.argv[2] || "http://localhost:3000";
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 });
  const landingTitle = (await page.title()).trim();
  const landingH1 = (await page.locator("h1").first().textContent().catch(() => "") || "").trim();
  await page.screenshot({ path: path.join(process.cwd(), ".tools", "shot-landing.png") });
  console.log("landing  | title:", landingTitle, "| h1:", landingH1.slice(0, 60));

  let bodyPrivate = "";
  for (const p of ["/yield", "/private", "/proof", "/compliance"]) {
    await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(600);
    const body = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
    const ok = body.length > 20 && !/404/.test(body);
    await page.screenshot({ path: path.join(process.cwd(), ".tools", "shot-" + p.slice(1) + ".png") });
    console.log((ok ? "ok  " : "FAIL") + " route", p, "|", body.slice(0, 90));
    if (p === "/private") bodyPrivate = await page.locator("body").innerText().catch(() => "");
  }

  const hasCards = /Forge/.test(bodyPrivate) && /Reservoir/.test(bodyPrivate) && /Prism/.test(bodyPrivate);
  console.log((hasCards ? "ok  " : "FAIL") + " /private shows Forge + Reservoir + Prism strategy cards");
  console.log("note: the 'Via MantissaRouter V2 / Via Endur anonymizer (direct)' toggle is wallet-gated (requires a connected Wallet API 0.10+ account) and cannot be exercised in a headless browser without a real wallet session.");
  console.log("console/page errors:", errors.length ? errors.slice(0, 5).join(" || ") : "none");
  await browser.close();
})().catch((e) => { console.error("HARNESS FAIL", e.message); process.exit(1); });
