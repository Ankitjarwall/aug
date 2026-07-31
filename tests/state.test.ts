import { describe, expect, it, vi } from "vitest";
import { continueWatching, createVisitorId, enqueue, isCompleted, mapCategory, myList, shouldSaveProgress, tokenExpired } from "@/lib/state";
import { sampleData } from "@/lib/sample-data";
import type { UserMediaState } from "@/types/state";

const state = (mediaId: string, overrides: Partial<UserMediaState> = {}): UserMediaState => ({
  mediaId, liked: false, favourite: false, progressSeconds: 30, durationSeconds: 100, progressPercent: 30,
  completed: false, playCount: 1, lastWatchedAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z", ...overrides,
});

describe("visitor and playback state", () => {
  it("creates anonymous IDs", () => expect(createVisitorId()).toMatch(/^visitor_[\w-]{20,}$/));
  it("calculates completion near the end", () => { expect(isCompleted(95, 100)).toBe(true); expect(isCompleted(60, 100)).toBe(false); });
  it("throttles small progress updates", () => { expect(shouldSaveProgress(10, 12, 5000)).toBe(false); expect(shouldSaveProgress(10, 21, 5000)).toBe(true); expect(shouldSaveProgress(10, 12, 15000)).toBe(true); });
  it("filters and sorts Continue Watching", () => {
    const result = continueWatching(sampleData.media, [state("memory-1"), state("memory-2", { completed: true }), state("memory-3", { progressPercent: 1 })]);
    expect(result.map(({ media }) => media.id)).toEqual(["memory-1"]);
  });
  it("filters and sorts My List", () => expect(myList(sampleData.media, [state("memory-1", { favourite: false }), state("memory-2", { favourite: true })]).map((item) => item.id)).toEqual(["memory-2"]));
  it("maps category items in media order", () => expect(mapCategory(sampleData.categories[0], sampleData.media).map((item) => item.id)).toEqual(["memory-1", "memory-2", "memory-3", "memory-4", "memory-5", "memory-6", "memory-7", "memory-8", "memory-9", "memory-10"]));
  it("queues failed writes without mutating the source", () => { vi.setSystemTime(new Date("2026-01-01")); const queue = enqueue([], { action: "saveState", payload: { mediaId: "memory-1" } }); expect(queue).toHaveLength(1); expect(queue[0]).toMatchObject({ action: "saveState", attempts: 0 }); });
  it("treats soon-expiring tokens as expired", () => expect(tokenExpired(Date.now() + 20000)).toBe(true));
});
