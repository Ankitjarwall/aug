import type { BootstrapData, Category, Hero, MediaItem, Profile } from "@/types/content";

export interface ProfileContent {
  profile: Profile;
  hero: Hero;
  categories: Category[];
  media: MediaItem[];
}

export function availableProfiles(data: BootstrapData): Profile[] {
  const configured = (data.profiles ?? []).filter((profile) => !profile.id.startsWith("sample-")).sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 5);
  if (configured.length) return configured;
  return [{
    id: "legacy-profile",
    title: data.settings.profileName || data.settings.siteTitle,
    avatarUrl: data.settings.profileAvatarUrl || data.hero.bannerUrl,
    heroId: data.hero.id,
    categoryIds: data.categories.map((category) => category.id),
    sortOrder: 1,
  }];
}

export function profileContent(data: BootstrapData, profileId: string): ProfileContent | null {
  const profile = availableProfiles(data).find((entry) => entry.id === profileId);
  if (!profile) return null;
  const heroes = data.heroes?.length ? data.heroes : [data.hero];
  const hero = heroes.find((entry) => entry.id === profile.heroId) ?? data.hero;
  const categoriesById = new Map(data.categories.map((category) => [category.id, category]));
  const categories = profile.categoryIds.map((id) => categoriesById.get(id)).filter((category): category is Category => Boolean(category));
  const mediaIds = new Set(categories.flatMap((category) => category.mediaIds));
  if (hero.mediaId) mediaIds.add(hero.mediaId);
  return { profile, hero, categories, media: data.media.filter((item) => mediaIds.has(item.id)) };
}