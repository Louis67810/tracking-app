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

await page.locator(".work-card").filter({ hasText: "Calendrier" }).click();
await page.waitForURL("**/travail/calendrier");
checks.calendar = {
  day: await page.locator(".day-pill").textContent(),
  taskCount: await page.locator(".calendar-task").count(),
  freeCount: await page.locator(".free-block").count(),
  workNavActive: await page.locator('a[href="/travail"]').evaluate((node) => node.classList.contains("active"))
};

await page.locator(".calendar-add").click();
await page.locator(".task-composer").waitFor({ state: "visible" });
await page.locator('.composer-field input[placeholder="Tâche"]').fill("Test création");
await page.locator(".color-swatch").nth(2).click();
await page.locator(".create-task-button").click();
await page.locator(".task-composer").waitFor({ state: "detached" });
await page.waitForTimeout(350);
checks.calendar.afterCreate = {
  taskCount: await page.locator(".calendar-task").count(),
  hasCreatedTask: (await page.locator(".calendar-task").evaluateAll((nodes) => nodes.map((node) => node.innerText))).some((text) =>
    text.includes("Test création")
  )
};

await page.locator(".calendar-scroll").evaluate((node) => {
  document.activeElement?.blur();
  node.scrollTop = 0;
});
await page.waitForTimeout(100);
await page.screenshot({ path: "calendar-page-verify.png", fullPage: true });

const firstGrip = page.locator(".task-grip").first();
const beforeDragTop = await page.locator(".calendar-task").first().evaluate((node) => getComputedStyle(node).top);
const gripBox = await firstGrip.boundingBox();
if (gripBox) {
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2 + 52, { steps: 8 });
  await page.mouse.up();
}
const afterDragTop = await page.locator(".calendar-task").first().evaluate((node) => getComputedStyle(node).top);
checks.calendar.dragMoved = beforeDragTop !== afterDragTop;

await page.locator(".calendar-back").click();
await page.waitForURL("**/travail");
checks.backToWork = await page.locator("h1").textContent();

await page.locator('a[href="/accueil"]').click();
await page.waitForURL("**/accueil");
checks.afterNav = await page
  .locator(".nav-item")
  .evaluateAll((nodes) => nodes.map((node) => ({ text: node.innerText.trim(), active: node.classList.contains("active") })));

await page.screenshot({ path: "empty-page-verify.png", fullPage: true });
await browser.close();

console.log(JSON.stringify(checks, null, 2));
