import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 2,
  isMobile: true
});

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") {
    errors.push(msg.text());
  }
});
page.on("pageerror", (error) => errors.push(error.message));

const ports = [5173, 5174];
let appUrl = null;

for (const port of ports) {
  const candidate = `http://127.0.0.1:${port}/travail`;
  try {
    const response = await fetch(candidate);
    if (response.ok) {
      appUrl = candidate;
      break;
    }
  } catch {}
}

if (!appUrl) {
  throw new Error("No Vite dev server found on ports 5173 or 5174");
}

await page.goto(appUrl, { waitUntil: "networkidle" });

const checks = {
  title: await page.locator("h1").textContent(),
  cards: await page.locator(".work-card").evaluateAll((nodes) => nodes.map((node) => node.innerText.trim())),
  navItems: await page
    .locator(".nav-item")
    .evaluateAll((nodes) => nodes.map((node) => ({ text: node.innerText.trim(), active: node.classList.contains("active") }))),
  overlayCount: await page.locator(".vite-error-overlay, #webpack-dev-server-client-overlay, [data-nextjs-dialog]").count(),
  bodyTextLength: (await page.locator("body").innerText()).trim().length,
  errors
};

await page.screenshot({ path: "work-page-verify.png", fullPage: true });

await page.locator('a[href="/accueil"]').click();
await page.waitForURL("**/accueil");
checks.afterNav = await page
  .locator(".nav-item")
  .evaluateAll((nodes) => nodes.map((node) => ({ text: node.innerText.trim(), active: node.classList.contains("active") })));

await page.screenshot({ path: "empty-page-verify.png", fullPage: true });
await browser.close();

console.log(JSON.stringify(checks, null, 2));
