import { expect, test } from "@playwright/test";
import { sampleData } from "@/lib/sample-data";

test.beforeEach(async ({ page }) => {
  await page.route("**/mock-api**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const data = action === "bootstrap" ? { ...sampleData, sessionToken: "test-token", sessionExpiresAt: Date.now() + 3600000 } : { saved: true };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data, meta: { apiVersion: "1", generatedAt: new Date().toISOString(), contentVersion: "test" }, error: null }) });
  });
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto("/");
});

test("intro can be skipped and dynamic rows render", async ({ page }) => {
  await expect(page.getByRole("status", { name: /opening/i })).toBeVisible();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByRole("heading", { name: "The Story of Ankit & Shimran" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Our Story" })).toBeVisible();
});

test("card opens details and Escape closes it", async ({ page }) => {
  await page.getByRole("button", { name: "Skip intro" }).click();
  await page.getByRole("button", { name: "Open The Day It Began" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("favourite updates My List and play opens the player", async ({ page }) => {
  await page.getByRole("button", { name: "Skip intro" }).click();
  await page.getByRole("button", { name: "Open The Day It Began" }).click();
  await page.getByRole("button", { name: "Add to My List" }).click();
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("heading", { name: "My List" })).toBeVisible();
  await page.getByRole("button", { name: "Open The Day It Began" }).last().click();
  await page.getByRole("dialog").getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".player")).toBeVisible();
});

test("mobile layout has no page overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only assertion");
  await page.getByRole("button", { name: "Skip intro" }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
