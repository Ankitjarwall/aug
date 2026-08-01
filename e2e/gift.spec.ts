import { expect, test, type Page } from "@playwright/test";
import { sampleData } from "@/lib/sample-data";

async function finishOpeningIntro(page: Page) {
  const intro = page.locator(".intro-video");
  await expect(intro).toBeVisible();
  await intro.dispatchEvent("ended");
  await expect(page.locator(".intro")).toBeHidden();
}
async function selectProfile(page: Page, title = "Currently We") {
  await expect(page.getByRole("heading", { name: "Who's watching?" })).toBeVisible();
  await page.getByRole("button", { name: title, exact: true }).click();
  await expect(page.locator(".profile-gate")).toBeHidden();
}

test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.startsWith("opening intro fills")) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/mock-api**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const media = sampleData.media.map((item, index) => index === 0 ? { ...item, mediaType: "video" as const, videoUrl: "/netflix-intro.mp4?content=1", endingCreditsId: "" } : item);
    const data = action === "bootstrap" ? { ...sampleData, media, sessionToken: "test-token", sessionExpiresAt: Date.now() + 3600000 } : { saved: true };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data, meta: { apiVersion: "1", generatedAt: new Date().toISOString(), contentVersion: "test" }, error: null }) });
  });
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto("/");
  if (!testInfo.title.startsWith("opening intro fills") && !testInfo.title.startsWith("profiles ")) await selectProfile(page);
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
  await expect(page.getByRole("heading", { name: "Who's watching?" })).toBeVisible();
  await selectProfile(page);
  await expect(page.getByRole("heading", { name: "The Story of Ankit & Shimran" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top 10 Shows Today" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("desktop catalog starts below the hero actions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop-only assertion");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.reload();
  await selectProfile(page);
  const actions = await page.locator(".hero-actions").boundingBox();
  const firstHeading = await page.locator(".content-row h2").first().boundingBox();
  expect(actions).not.toBeNull();
  expect(firstHeading).not.toBeNull();
  expect(firstHeading!.y).toBeGreaterThan(actions!.y + actions!.height + 20);
});

test("Top 10 and every selected profile category render ten items", async ({ page }) => {
  const topTen = page.locator("#top-10-today");
  await expect(topTen.getByRole("heading", { name: "Top 10 Shows Today" })).toBeVisible();
  await expect(topTen.locator(".media-card")).toHaveCount(10);
  expect(await topTen.locator(".top10-rank").allTextContents()).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);

  for (const id of ["beautiful-memories", "adventures-together", "date-nights", "little-things"]) {
    await expect(page.locator(`#${id} .media-card`)).toHaveCount(10);
  }
});
test("profiles select distinct Sheet-managed catalogs", async ({ page }, testInfo) => {
  const chooser = page.locator(".profile-gate");
  await expect(chooser).toBeVisible();
  await expect(chooser.locator(".profile-card")).toHaveCount(3);
  if (testInfo.project.name === "mobile") {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }

  await selectProfile(page, "In 2020 We");
  await expect(page.getByRole("heading", { name: "Where Our Story Began" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Our Story", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top 10 Shows Today" })).toHaveCount(0);

  await page.getByRole("button", { name: "Switch profile" }).click();
  await selectProfile(page, "Currently We");
  await expect(page.getByRole("heading", { name: "The Story of Ankit & Shimran" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top 10 Shows Today" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Our Story", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Switch profile" }).click();
  await selectProfile(page, "In Future We");
  await expect(page.getByRole("heading", { name: "All Our Tomorrows" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Forever and Always" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top 10 Shows Today" })).toHaveCount(0);
});
test("card opens details and Escape closes it", async ({ page }) => {
  await page.getByRole("button", { name: "Open The Day It Began" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const backdrop = await page.locator(".details-backdrop").boundingBox();
  const shade = await page.locator(".details-shade").boundingBox();
  expect(shade!.y + shade!.height).toBeGreaterThanOrEqual(backdrop!.y + backdrop!.height - 1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("favourite updates My List and play opens the player", async ({ page }) => {
  await page.getByRole("button", { name: "Open The Day It Began" }).first().click();
  await page.getByRole("button", { name: "Add to My List" }).click();
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("heading", { name: "My List" })).toBeVisible();
  await page.getByRole("button", { name: "Open The Day It Began" }).last().click();
  await page.getByRole("dialog").getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".player")).toBeVisible();
});

test("opening intro fills then hands off to looping background music", async ({ page }) => {
  const music = page.locator("[data-background-music]");
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
  await expect(music).toHaveAttribute("src", /song[.]m4a$/);
  expect(await music.evaluate((node: HTMLAudioElement) => node.loop)).toBe(true);
  await music.evaluate((node: HTMLAudioElement) => {
    node.dataset.playCalls = "0";
    node.dataset.pauseCalls = "0";
    node.play = () => { node.dataset.playCalls = String(Number(node.dataset.playCalls) + 1); return Promise.resolve(); };
    node.pause = () => { node.dataset.pauseCalls = String(Number(node.dataset.pauseCalls) + 1); };
  });

  expect(await music.getAttribute("data-play-calls")).toBe("0");
  await finishOpeningIntro(page);
  await expect.poll(() => music.getAttribute("data-play-calls")).toBe("1");
  await selectProfile(page);
  expect(await music.getAttribute("data-play-calls")).toBe("1");

  await page.getByRole("button", { name: "Open The Day It Began" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(async () => Number(await music.getAttribute("data-pause-calls"))).toBeGreaterThan(0);
  const player = page.locator(".player");
  await player.evaluate((root) => {
    [...root.querySelectorAll("button")].find((button) => button.textContent === "Skip intro")?.click();
  });
  await expect(player).toHaveAttribute("data-phase", "content");
  await player.locator("video").dispatchEvent("ended");
  await expect(page.getByRole("dialog", { name: "Ending credits" })).toBeVisible();
  await expect.poll(() => music.getAttribute("data-play-calls")).toBe("2");
});
test("video plays an audible intro before uploaded content", async ({ page }) => {
  await page.getByRole("button", { name: "Open The Day It Began" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Play", exact: true }).click();
  const player = page.locator(".player");
  await expect(player).toHaveAttribute("data-phase", "intro");
  const video = player.locator("video");
  await video.evaluate((node: HTMLVideoElement) => {
    node.dataset.playCalls = "0";
    node.play = () => { node.dataset.playCalls = String(Number(node.dataset.playCalls) + 1); return Promise.resolve(); };
  });
  const introState = await player.evaluate((root) => {
    const video = root.querySelector("video")!;
    const skip = [...root.querySelectorAll("button")].find((button) => button.textContent === "Skip intro");
    const state = { muted: video.muted, src: video.getAttribute("src"), objectFit: getComputedStyle(video).objectFit, hasSkip: Boolean(skip) };
    skip?.click();
    return state;
  });
  expect(introState).toMatchObject({ muted: false, src: expect.stringMatching(/netflix-intro\.mp4$/), objectFit: "cover", hasSkip: true });
  await expect(player).toHaveAttribute("data-phase", "content");
  const contentVideo = player.locator("video");
  await expect(contentVideo).toHaveAttribute("src", /netflix-intro[.]mp4[?]content=1$/);
  await contentVideo.dispatchEvent("canplay");
  await expect.poll(async () => Number(await contentVideo.getAttribute("data-play-calls"))).toBeGreaterThan(0);
  await contentVideo.dispatchEvent("ended");
  const credits = page.getByRole("dialog", { name: "Ending credits" });
  await expect(credits).toBeVisible();
  await expect(credits).toContainText("Ankit & Shimran");
  await expect(credits).toContainText("My Girlfriend, Shimran");
});

test("mobile layout has no page overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only assertion");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
