import { expect, test, type Page } from "@playwright/test";
import { sampleData } from "@/lib/sample-data";

async function selectCurrentProfile(page: Page) {
  await page.locator(".profile-card").first().click();
  await expect(page.locator(".profile-gate")).toBeHidden();
}

test.beforeEach(async ({ page }, testInfo) => {
  await page.route("**/mock-api**", async (route) => {
    const profile = { id: "profile-main", title: sampleData.settings.profileName, avatarUrl: sampleData.settings.profileAvatarUrl, heroId: sampleData.hero.id, categoryIds: sampleData.categories.map((category) => category.id), sortOrder: 1 };
    const media = testInfo.title === "final credits visual" ? sampleData.media.map((item, index) => index ? item : { ...item, mediaType: "credits" as const }) : sampleData.media;
    const data = { ...sampleData, hero: sampleData.hero, heroes: [sampleData.hero], profiles: [profile], media };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data, meta: {}, error: null }) });
  });
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
});

test("final profile chooser visual", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Who's watching?" })).toBeVisible();
  await expect(page.locator(".profile-card")).toHaveCount(1);
  await page.screenshot({ path: `test-results/profile-${testInfo.project.name}.png`, fullPage: true });
});
test("final desktop visual", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await selectCurrentProfile(page);
  await expect(page.locator(".site")).toHaveClass(/site--visible/);
  await expect(page.getByRole("heading", { name: "The Story of Ankit & Shimran" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/final-desktop.png", fullPage: true });
});

test("final mobile visual", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await selectCurrentProfile(page);
  await expect(page.locator(".site")).toHaveClass(/site--visible/);
  await expect(page.getByRole("heading", { name: "The Story of Ankit & Shimran" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/final-mobile.png", fullPage: true });
});
test("final credits visual", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await selectCurrentProfile(page);
  await expect(page.locator(".site")).toHaveClass(/site--visible/);
  await page.locator(".hero-actions").getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Ending credits" })).toBeVisible();
  await page.addStyleTag({ content: ".credits-roll { animation: none !important; transform: translateY(-55vh); } .credits-progress { animation: none !important; }" });
  await page.screenshot({ path: "test-results/final-credits.png" });
});
