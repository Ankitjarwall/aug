import { expect, test } from "@playwright/test";

test("final desktop visual", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/");
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByRole("heading", { name: "The Story of Ankit & you" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/final-desktop.png", fullPage: true });
});

test("final mobile visual", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/");
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByRole("heading", { name: "The Story of Ankit & you" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/final-mobile.png", fullPage: true });
});
