import { test, expect } from "@playwright/test";

test("desktop: plan, lock, discuss, simulate proofs, persist, preserve original app", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/coach");
  await expect(
    page.getByRole("heading", { name: "Une chose à la fois." }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Focus — mon coach de travail");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/focus.webmanifest",
  );
  await page.locator("#task-0").fill("Rédiger ma proposition client");
  await page
    .locator("#proof-0")
    .fill("Le texte final complet de la proposition avec les trois offres.");
  await page.screenshot({
    path: "artifacts/coach-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Verrouiller ma journée" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Je m’engage" }).click();
  await expect(
    page.getByRole("heading", { name: "Le contrat du jour" }),
  ).toBeVisible();
  await expect(page.locator("#task-0")).toHaveCount(0);
  await page.getByRole("button", { name: "Envoyer ma preuve" }).first().click();
  await expect(page.locator("select")).toHaveValue("task-1");
  await page
    .locator("#coach-message")
    .fill(
      "Voici mon travail final avec les trois offres, les prix et le calendrier de livraison.",
    );
  await page.getByRole("button", { name: "Envoyer au coach" }).click();
  await expect(page.locator(".fc-message.assistant").last()).toContainText(
    "aucune IA",
  );
  await page
    .getByRole("button", { name: "Ma journée", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Autorisation fermée", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simuler la validation" })
    .first()
    .click();
  await expect(
    page.getByText("Autorisation fermée", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simuler la validation" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Le travail est fait. Profite de ta soirée.",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Journée validée", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Connexion", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Créer une clé iPhone" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Retour à Tracking" }).click();
  await expect(page).toHaveURL(/\/accueil$/);
  await expect(page.locator("body")).not.toHaveClass(/coach-open/);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator(".home-work-cards")).toBeVisible();
  await page.getByRole("link", { name: "Coach", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Le contrat du jour" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile: navigation, validation, modal cancellation, no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/coach");
  await page.screenshot({ path: "artifacts/coach-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator("#proof-0").fill("");
  await expect(
    page.getByRole("button", { name: "Verrouiller ma journée" }),
  ).toBeDisabled();
  await page.locator("#proof-0").fill("Capture complète du livrable terminé.");
  await page.getByRole("button", { name: "Verrouiller ma journée" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Ajouter une priorité" }).click();
  await expect(page.locator(".fc-task")).toHaveCount(3);
  await page.getByRole("button", { name: "Supprimer la priorité 3" }).click();
  await page
    .getByRole("button", { name: "Mon coach", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: "Envoyer au coach" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Les règles", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Ferme. Jamais injuste." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Connexion", exact: true })
    .last()
    .click();
  await page.getByRole("checkbox").first().check();
  await page.reload();
  await page
    .getByRole("button", { name: "Connexion", exact: true })
    .last()
    .click();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("HTTP API returns configuration and denies real authorization before setup", async ({
  request,
}) => {
  const health = await request.get("/api/coach");
  expect(health.ok()).toBe(true);
  expect(await health.json()).toEqual({
    database: false,
    ai: false,
    account: false,
  });
  const response = await request.post("/api/coach", {
    data: { action: "device-status", token: "x".repeat(43) },
  });
  expect(response.status()).toBe(503);
  expect((await response.json()).allowed).toBe(false);
});
