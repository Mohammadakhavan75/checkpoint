import { expect, test } from "@playwright/test";

test("signup, create a mission, leave a checkpoint, and return to Today", async ({ page }) => {
  const email = `alex-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByRole("heading", { name: "Start ritual" })).toBeVisible();
  await page.getByLabel("Mission").fill("Finish anomaly detection direction");
  await page.getByLabel("Next physical action").fill("Open notes.md and write three claims");
  await page.getByRole("button", { name: "Create active mission" }).click();

  await expect(page.getByRole("heading", { name: "State first" })).toBeVisible();
  await page.getByRole("button", { name: /Locked in/ }).click();
  await expect(page.getByText("Finish anomaly detection direction")).toBeVisible();
  await page.getByRole("link", { name: "Leave checkpoint instead" }).click();
  await page.getByLabel("What changed?").fill("Compared contribution angles");
  await page.getByLabel("What did you decide?").fill("Keep the narrow novelty frame");
  await page.getByLabel("Where did you stop?").fill("Two claims drafted");
  await page.getByLabel("Next physical action").fill("Reject the weakest claim");
  await page.getByLabel("What should you not rethink?").fill("Do not revisit tooling");
  await page.getByRole("button", { name: "Save checkpoint" }).click();

  await expect(page.getByRole("heading", { name: "State first" })).toBeVisible();
  await page.getByRole("button", { name: /Locked in/ }).click();
  await expect(page.getByText("Reject the weakest claim")).toBeVisible();
  await expect(page.getByText("Do not revisit tooling")).toBeVisible();
});
