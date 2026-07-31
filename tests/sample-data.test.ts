import { describe, expect, it } from "vitest";
import { sampleData } from "@/lib/sample-data";

describe("sample catalog", () => {
  it("provides a ranked Top 10 and ten items in every category", () => {
    expect(sampleData.categories).toHaveLength(9);
    for (const category of sampleData.categories) {
      expect(category.mediaIds).toHaveLength(10);
      expect(new Set(category.mediaIds).size).toBe(10);
    }
    expect(sampleData.categories[0]).toMatchObject({
      id: "top-10-today",
      title: "Top 10 Shows Today",
      mediaIds: sampleData.media.slice(0, 10).map((item) => item.id),
    });
  });

  it("routes every sample video into the romantic credits", () => {
    const videos = sampleData.media.filter((item) => item.mediaType === "video");
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.every((item) => item.endingCreditsId === "main-credits")).toBe(true);
    expect(sampleData.credits).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "Directed by", name: "My Girlfriend, Shimran" }),
      expect.objectContaining({ role: "Final Message", name: "I Choose You" }),
    ]));
  });
});