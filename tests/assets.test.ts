import { afterEach, describe, expect, it, vi } from "vitest";

describe("static asset URLs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("includes the deployment base path for background music", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/aug");
    vi.resetModules();
    const { backgroundSongUrl } = await import("@/lib/assets");
    expect(backgroundSongUrl).toBe("/aug/song.m4a");
  });
});