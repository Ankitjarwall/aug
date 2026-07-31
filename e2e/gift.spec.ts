import { expect, test, type Page } from "@playwright/test";
import { sampleData } from "@/lib/sample-data";

async function finishOpeningIntro(page: Page) {
  const intro = page.locator(".intro-video");
  await expect(intro).toBeVisible();
  await intro.dispatchEvent("ended");
  await expect(page.locator(".intro")).toBeHidden();
}
test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.startsWith("opening intro fills")) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/mock-api**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const media = sampleData.media.map((item, index) => index === 0 ? { ...item, mediaType: "video" as const, videoUrl: "/netflix-intro.mp4?content=1" } : item);
    const data = action === "bootstrap" ? { ...sampleData, media, sessionToken: "test-token", sessionExpiresAt: Date.now() + 3600000 } : { saved: true };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data, meta: { apiVersion: "1", generatedAt: new Date().toISOString(), contentVersion: "test" }, error: null }) });
  });
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto("/");
});

test("opening intro fills the viewport without a skip action", async ({ page }, testInfo) => {
  await expect(page.getByRole("status", { name: /opening/i })).toBeVisible();
  const openingVideo = page.locator(".intro-video");
  await expect(openingVideo).toBeVisible();
  expect(await openingVideo.evaluate((node: HTMLVideoElement) => node.muted)).toBe(true);
  await expect(openingVideo).toHaveAttribute("src", /netflix-intro\.mp4$/);
  expect(await openingVideo.evaluate((node) => getComputedStyle(node).objectFit)).toBe("cover");
  const viewport = page.viewportSize()!;
  const bounds = await openingVideo.boundingBox();
  expect(bounds).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
  await expect(page.getByRole("button", { name: "Skip intro" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
  if (testInfo.project.name === "chromium") {
    await page.mouse.wheel(0, 800);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  }
  await finishOpeningIntro(page);
  await expect(page.getByRole("heading", { name: "The Story of Ankit & you" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Our Story" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("desktop catalog starts below the hero actions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop-only assertion");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.reload();
  const actions = await page.locator(".hero-actions").boundingBox();
  const firstHeading = await page.locator(".content-row h2").first().boundingBox();
  expect(actions).not.toBeNull();
  expect(firstHeading).not.toBeNull();
  expect(firstHeading!.y).toBeGreaterThan(actions!.y + actions!.height + 20);
});

test("card opens details and Escape closes it", async ({ page }) => {
  await page.getByRole("button", { name: "Open The Day It Began" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("favourite updates My List and play opens the player", async ({ page }) => {
  await page.getByRole("button", { name: "Open The Day It Began" }).click();
  await page.getByRole("button", { name: "Add to My List" }).click();
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("heading", { name: "My List" })).toBeVisible();
  await page.getByRole("button", { name: "Open The Day It Began" }).last().click();
  await page.getByRole("dialog").getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".player")).toBeVisible();
});

test("video plays an audible intro before uploaded content", async ({ page }) => {
  await page.getByRole("button", { name: "Open The Day It Began" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Play", exact: true }).click();
  const player = page.locator(".player");
  await expect(player).toHaveAttribute("data-phase", "intro");
  const introState = await player.evaluate((root) => {
    const video = root.querySelector("video")!;
    const skip = [...root.querySelectorAll("button")].find((button) => button.textContent === "Skip intro");
    const state = { muted: video.muted, src: video.getAttribute("src"), objectFit: getComputedStyle(video).objectFit, hasSkip: Boolean(skip) };
    skip?.click();
    return state;
  });
  expect(introState).toMatchObject({ muted: false, src: expect.stringMatching(/netflix-intro\.mp4$/), objectFit: "cover", hasSkip: true });
  await expect(player).toHaveAttribute("data-phase", "content");
  await expect(player.locator("video")).toHaveAttribute("src", /netflix-intro\.mp4\?content=1$/);
});

test("mobile layout has no page overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only assertion");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
