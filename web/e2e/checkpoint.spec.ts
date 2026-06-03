import { expect, test } from "@playwright/test";

test("signup, create a mission, start a tiny move, leave a checkpoint, and return to Today", async ({ page }) => {
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
  await page.getByRole("link", { name: "Finish anomaly detection direction" }).click();

  await expect(page.getByRole("heading", { name: "Tiny moves" })).toBeVisible();
  await page.getByLabel("Tiny move").fill("Touch anomaly notes for two minutes");
  await page.getByLabel("Action").fill("Open notes.md and mark the first uncertain claim");
  await page.getByRole("button", { name: "Create tiny move" }).click();
  await expect(page.getByText("Touch anomaly notes for two minutes")).toBeVisible();

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "State first" })).toBeVisible();
  await page.getByRole("button", { name: /Avoiding/ }).click();
  await expect(page.getByRole("heading", { name: "One tiny move" })).toBeVisible();
  await expect(page.getByText("Open notes.md and mark the first uncertain claim")).toBeVisible();
  await expect(page.getByText("From Finish anomaly detection direction")).toBeVisible();
  await page.getByRole("button", { name: "Start this move" }).click();
  await expect(page.getByText("You broke avoidance. Momentum restored.")).toBeVisible();
  await expect(page.getByText("Session active. Checkpointing will save the stop point.")).toBeVisible();

  await page.goto("/today/checkpoint");
  await page.getByLabel("What changed?").fill("Compared contribution angles");
  await page.getByLabel("What did you decide?").fill("Keep the narrow novelty frame");
  await page.getByLabel("Where did you stop?").fill("Two claims drafted");
  await page.getByLabel("Next physical action").fill("Reject the weakest claim");
  await page.getByLabel("What should you not rethink?").fill("Do not revisit tooling");
  await page.getByRole("button", { name: "Save checkpoint" }).click();

  await expect(page.getByRole("heading", { name: "State first" })).toBeVisible();
  await page.getByRole("button", { name: /Locked in/ }).click();
  await expect(page.getByText("Two claims drafted")).toBeVisible();
  await expect(page.getByText("Touch anomaly notes for two minutes")).toBeVisible();
  await expect(page.getByText("Do not revisit tooling")).toBeVisible();
  await expect(page.getByText("Session active. Checkpointing will save the stop point.")).toHaveCount(0);
});
