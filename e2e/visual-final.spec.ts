import { expect, test } from "@playwright/test";

test("final desktop visual", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".site")).toHaveClass(/site--visible/);
  await expect(page.getByRole("heading", { name: "The Story of Ankit & Shimran" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/final-desktop.png", fullPage: true });
});

test("final mobile visual", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".site")).toHaveClass(/site--visible/);
  await expect(page.getByRole("heading", { name: "The Story of Ankit & Shimran" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/final-mobile.png", fullPage: true });
});
test("final credits visual", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".site")).toHaveClass(/site--visible/);
  await page.getByRole("button", { name: "Open The Day It Began" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Play", exact: true }).click();
  const player = page.locator(".player");
  await expect(player).toHaveAttribute("data-phase", "intro");
  await player.evaluate((root) => {
    [...root.querySelectorAll("button")].find((button) => button.textContent === "Skip intro")?.click();
  });
  await expect(player).toHaveAttribute("data-phase", "content");
  await player.locator("video").dispatchEvent("ended");
  await expect(page.getByRole("dialog", { name: "Ending credits" })).toBeVisible();
  await page.addStyleTag({ content: ".credits-roll { animation: none !important; transform: translateY(-55vh); } .credits-progress { animation: none !important; }" });
  await page.screenshot({ path: "test-results/final-credits.png" });
});
