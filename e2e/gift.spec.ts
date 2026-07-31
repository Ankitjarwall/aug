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

test("intro can be skipped and dynamic rows render", async ({ page }, testInfo) => {
  await expect(page.getByRole("status", { name: /opening/i })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
  if (testInfo.project.name === "chromium") {
    await page.mouse.wheel(0, 800);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  }
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByRole("heading", { name: "The Story of Ankit & you" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Our Story" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("desktop catalog starts below the hero actions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop-only assertion");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.reload();
  await page.getByRole("button", { name: "Skip intro" }).click();
  const actions = await page.locator(".hero-actions").boundingBox();
  const firstHeading = await page.locator(".content-row h2").first().boundingBox();
  expect(actions).not.toBeNull();
  expect(firstHeading).not.toBeNull();
  expect(firstHeading!.y).toBeGreaterThan(actions!.y + actions!.height + 20);
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
