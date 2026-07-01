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

await page.locator('a[href="/focus"]').click();
await page.waitForURL("**/focus");
checks.focus = {
  title: await page.locator(".focus-title").textContent(),
  initialDuration: await page.locator(".focus-time-value").textContent(),
  focusNavActive: await page.locator('a[href="/focus"]').evaluate((node) => node.classList.contains("active")),
  playlistCount: await page.locator(".focus-playlist-card").count()
};
await page.locator(".focus-adjust-right").click();
checks.focus.afterPlus = await page.locator(".focus-time-value").textContent();
await page.locator(".focus-adjust-left").click();
checks.focus.afterMinus = await page.locator(".focus-time-value").textContent();
await page.locator(".focus-playlist-card").first().click();
checks.focus.playlistActive = await page.locator(".focus-playlist-card.is-active").count();
await page.locator(".focus-primary").click();
await page.waitForTimeout(1100);
checks.focus.timerRunning = {
  value: await page.locator(".focus-session-clock").textContent(),
  overlayVisible: await page.locator(".focus-session-overlay").isVisible()
};
await page.locator(".focus-session-overlay").click({ position: { x: 220, y: 260 } });
await page.locator(".focus-session-close").click();
await page.locator(".early-exit-sheet").waitFor({ state: "visible" });
const exitHold = page.locator(".early-exit-hold");
const exitHoldBox = await exitHold.boundingBox();
if (exitHoldBox) {
  await page.mouse.move(exitHoldBox.x + exitHoldBox.width / 2, exitHoldBox.y + exitHoldBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2050);
  await page.mouse.up();
}
await page.locator(".focus-session-overlay").waitFor({ state: "detached" });
await page.locator(".focus-secondary").click();
await page.waitForTimeout(1100);
checks.focus.freeRunning = {
  value: await page.locator(".focus-session-clock").textContent(),
  overlayVisible: await page.locator(".focus-session-overlay").isVisible()
};
await page.screenshot({ path: "focus-page-verify.png", fullPage: true });
await page.goto(appUrl, { waitUntil: "networkidle" });

await page.locator(".work-card").filter({ hasText: "Tes objectifs" }).click();
await page.waitForURL("**/travail/objectifs");
checks.objectives = {
  title: await page.locator(".objectives-title").textContent(),
  cards: await page.locator(".objective-card").count(),
  progressBars: await page.locator(".progress-track").count(),
  linkedTasks: await page.locator(".objective-task").count(),
  addButtonsBeforeLongPress: await page.locator(".objective-add-row button, .add-linked-task").count()
};
const objectivePlus = page.locator(".objectives-page .calendar-add");
await page.mouse.move(220, 430);
await page.mouse.down();
await page.waitForTimeout(2100);
await page.mouse.up();
checks.objectives.addMode = {
  plusSelected: await objectivePlus.evaluate((node) => node.classList.contains("is-add-mode")),
  addButtonsAfterLongPress: await page.locator(".objective-add-row button, .add-linked-task").count()
};
await page.locator(".calendar-add").click();
await page.locator(".objectives-composer").waitFor({ state: "visible" });
await page.locator(".objectives-composer .composer-field input").first().fill("Objectif test");
await page.locator(".objectives-composer .color-swatch").nth(4).click();
await page.locator(".objectives-composer .create-task-button").click();
await page.locator(".objectives-composer").waitFor({ state: "detached" });
await page.waitForTimeout(250);
checks.objectives.afterCreate = {
  cards: await page.locator(".objective-card").count(),
  hasCreatedObjective: (await page.locator(".objective-card").evaluateAll((nodes) => nodes.map((node) => node.innerText))).some((text) =>
    text.includes("Objectif test")
  )
};
await page.screenshot({ path: "objectives-page-verify.png", fullPage: true });
await page.locator(".calendar-back").click();
await page.waitForURL("**/travail");

await page.locator(".work-card").filter({ hasText: "Tes tâches" }).click();
await page.waitForURL("**/travail/taches");
checks.tasks = {
  title: await page.locator(".tasks-title").textContent(),
  day: await page.locator(".tasks-page .day-pill").textContent(),
  rowCount: await page.locator(".task-row").count(),
  workNavActive: await page.locator('a[href="/travail"]').evaluate((node) => node.classList.contains("active")),
  objectiveLabels: await page.locator(".task-actions-pill").evaluateAll((nodes) => nodes.map((node) => node.innerText.trim())),
  objectiveButtonCount: await page.locator(".task-actions-pill button").count()
};

await page.locator(".calendar-add").click();
await page.locator(".tasks-composer").waitFor({ state: "visible" });
await page.locator(".tasks-composer .composer-field input").first().fill("Test tâche");
await page.locator(".tasks-composer .color-swatch").nth(1).click();
await page.locator(".tasks-composer .create-task-button").click();
await page.locator(".tasks-composer").waitFor({ state: "detached" });
await page.waitForTimeout(250);
checks.tasks.afterCreate = {
  rowCount: await page.locator(".task-row").count(),
  hasCreatedTask: (await page.locator(".task-row").evaluateAll((nodes) => nodes.map((node) => node.innerText))).some((text) =>
    text.includes("Test tâche")
  )
};

const createdTaskRow = page.locator(".task-row").filter({ hasText: "Test tâche" }).first();
await createdTaskRow.locator(".task-check").click();
checks.tasks.afterCheck = {
  completed: await createdTaskRow.evaluate((node) => node.classList.contains("is-complete")),
  opacity: await createdTaskRow.evaluate((node) => getComputedStyle(node).opacity)
};
await page.screenshot({ path: "tasks-page-verify.png", fullPage: true });

await page.locator(".calendar-back").click();
await page.waitForURL("**/travail");

await page.locator(".work-card").filter({ hasText: "Calendrier" }).click();
await page.waitForURL("**/travail/calendrier");
checks.calendar = {
  day: await page.locator(".day-pill").textContent(),
  taskCount: await page.locator(".calendar-task").count(),
  freeCount: await page.locator(".free-block").count(),
  workNavActive: await page.locator('a[href="/travail"]').evaluate((node) => node.classList.contains("active")),
  hasTaskFromTasks: (await page.locator(".calendar-task").evaluateAll((nodes) => nodes.map((node) => node.innerText))).some((text) =>
    text.includes("Test tâche")
  )
};

const firstTaskForSwipe = page.locator(".calendar-task").first();
const firstSwipeBox = await firstTaskForSwipe.boundingBox();
if (firstSwipeBox) {
  await page.mouse.move(firstSwipeBox.x + 52, firstSwipeBox.y + firstSwipeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(firstSwipeBox.x + 168, firstSwipeBox.y + firstSwipeBox.height / 2, { steps: 8 });
  await page.mouse.up();
}
checks.calendar.swipeActions = {
  opened: await page.locator(".task-swipe-shell.is-swiped").count(),
  labels: await page.locator(".task-swipe-shell.is-swiped .swipe-actions button").evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim())
  )
};
await page.locator(".calendar-board").click({ position: { x: 340, y: 620 } });
await page.waitForTimeout(150);
checks.calendar.swipeActions.closed = (await page.locator(".task-swipe-shell.is-swiped").count()) === 0;

await page.locator(".calendar-add").click();
await page.locator(".task-composer").waitFor({ state: "visible" });
await page.locator(".composer-field input").first().fill("Test creation");
await page.locator(".color-swatch").nth(2).click();
await page.locator(".create-task-button").click();
await page.locator(".task-composer").waitFor({ state: "detached" });
await page.waitForTimeout(350);
checks.calendar.afterCreate = {
  taskCount: await page.locator(".calendar-task").count(),
  freeCount: await page.locator(".free-block").count(),
  hasCreatedTask: (await page.locator(".calendar-task").evaluateAll((nodes) => nodes.map((node) => node.innerText))).some((text) =>
    text.includes("Test creation")
  )
};

await page.locator(".calendar-scroll").evaluate((node) => {
  document.activeElement?.blur();
  node.scrollTop = 0;
});
await page.waitForTimeout(100);
await page.screenshot({ path: "calendar-page-verify.png", fullPage: true });

const createdTask = page.locator(".calendar-task").filter({ hasText: "Test creation" }).first();
await createdTask.scrollIntoViewIfNeeded();
const createdBox = await createdTask.boundingBox();
if (createdBox) {
  await page.mouse.move(createdBox.x + createdBox.width / 2, createdBox.y + createdBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
}
await page.locator(".quick-task-menu").waitFor({ state: "visible" });
await page.locator(".quick-task-menu input").first().fill("Rapide");
await page.locator(".quick-duration-row input").first().fill("2");
await page.locator(".quick-duration-row input").nth(1).fill("15");
checks.calendar.quickMenu = {
  visible: await page.locator(".quick-task-menu").isVisible(),
  renamed: (await page.locator(".calendar-task").evaluateAll((nodes) => nodes.map((node) => node.innerText))).some((text) =>
    text.includes("Rapide")
  )
};
await page.locator(".quick-delete").click();
checks.calendar.afterQuickDelete = {
  taskCount: await page.locator(".calendar-task").count(),
  removed: (await page.locator(".calendar-task").evaluateAll((nodes) => nodes.map((node) => node.innerText))).every((text) =>
    !text.includes("Rapide")
  )
};

const firstGrip = page.locator(".task-grip").first();
const beforeDragTop = await page.locator(".task-swipe-shell").first().evaluate((node) => getComputedStyle(node).top);
const gripBox = await firstGrip.boundingBox();
if (gripBox) {
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2 + 52, { steps: 8 });
  await page.mouse.up();
}
const afterDragTop = await page.locator(".task-swipe-shell").first().evaluate((node) => getComputedStyle(node).top);
checks.calendar.dragMoved = beforeDragTop !== afterDragTop;

await page.locator(".calendar-back").click();
await page.waitForURL("**/travail");
checks.backToWork = await page.locator("h1").textContent();

await page.locator('a[href="/recap"]').click();
await page.waitForURL("**/recap");
await page.evaluate(() => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("daily-recap-")) localStorage.removeItem(key);
  }
});
await page.reload({ waitUntil: "networkidle" });
checks.recap = {
  title: await page.locator(".recap-title").textContent(),
  moodCount: await page.locator(".mood-card").count(),
  recapNavActive: await page.locator('a[href="/recap"]').evaluate((node) => node.classList.contains("active"))
};
await page.locator(".mood-card").nth(3).click();
await page.locator(".recap-continue").click();
checks.recap.habitsTitle = await page.locator(".recap-title").textContent();
await page.locator(".habit-card").nth(0).locator(".habit-choice.yes").click();
await page.locator(".habit-card").nth(0).locator(".quantity-stepper button").nth(1).click();
await page.locator(".habit-card").nth(1).locator(".habit-choice.no").click();
await page.locator(".habit-card").nth(2).locator(".habit-choice.yes").click();
await page.locator(".habit-card").nth(3).locator(".habit-choice.yes").click();
checks.recap.answeredHabits = await page.locator(".habit-choice.is-selected").count();
await page.locator(".recap-continue").click();
checks.recap.summaryCards = await page.locator(".summary-card").count();
await page.locator(".recap-notes").fill("Note de test");
await page.locator(".recap-continue").click();
await page.locator(".recap-done-card").waitFor({ state: "visible" });
checks.recap.done = {
  title: await page.locator(".recap-title").textContent(),
  stored: await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("daily-recap-")).length)
};
await page.screenshot({ path: "recap-page-verify.png", fullPage: true });

await page.locator('a[href="/accueil"]').click();
await page.waitForURL("**/accueil");
checks.afterNav = await page
  .locator(".nav-item")
  .evaluateAll((nodes) => nodes.map((node) => ({ text: node.innerText.trim(), active: node.classList.contains("active") })));

await page.screenshot({ path: "empty-page-verify.png", fullPage: true });
await browser.close();

console.log(JSON.stringify(checks, null, 2));
