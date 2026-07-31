import { describe, expect, it } from "vitest";
import { availableProfiles, profileContent } from "@/lib/profiles";
import { sampleData } from "@/lib/sample-data";
import type { Profile } from "@/types/content";

describe("profile catalog", () => {
  it("provides three distinct Sheet-style sample profiles", () => {
    const profiles = availableProfiles(sampleData);
    expect(profiles.map((profile) => profile.title)).toEqual(["In 2020 We", "Currently We", "In Future We"]);
    expect(new Set(profiles.map((profile) => profile.id)).size).toBe(3);
    expect(new Set(profiles.map((profile) => profile.avatarUrl)).size).toBe(3);
    for (const profile of profiles) {
      const view = profileContent(sampleData, profile.id);
      expect(view?.hero.id).toBe(profile.heroId);
      expect(view?.categories.map((category) => category.id)).toEqual(profile.categoryIds);
      expect(view?.media.length).toBeGreaterThan(0);
    }
  });

  it("sorts and caps configured profiles at five", () => {
    const profiles: Profile[] = Array.from({ length: 6 }, (_, index) => ({
      id: `profile-${index + 1}`, title: `Profile ${index + 1}`, avatarUrl: `image-${index + 1}`,
      heroId: sampleData.hero.id, categoryIds: [sampleData.categories[0].id], sortOrder: 6 - index,
    }));
    expect(availableProfiles({ ...sampleData, profiles }).map((profile) => profile.sortOrder)).toEqual([1, 2, 3, 4, 5]);
  });

  it("creates one backward-compatible profile for legacy cached data", () => {
    const profiles = availableProfiles({ ...sampleData, profiles: undefined, heroes: undefined });
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({ id: "legacy-profile", heroId: sampleData.hero.id });
    expect(profiles[0].categoryIds).toEqual(sampleData.categories.map((category) => category.id));
  });
});