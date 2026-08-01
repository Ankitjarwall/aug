import type { BootstrapData, Category, Hero, MediaItem, Profile } from "@/types/content";

export interface ProfileContent {
  profile: Profile;
  hero: Hero;
  categories: Category[];
  media: MediaItem[];
}

export function availableProfiles(data: BootstrapData): Profile[] {
  const configured = (data.profiles ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 5);
  return configured;
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