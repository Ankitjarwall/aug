import type { BootstrapData, MediaItem } from "@/types/content";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const hero = `${basePath}/demo/romantic-hero.png`;
const scenes = ["#7d1821", "#19354c", "#70452e", "#285044", "#44263f", "#614d24"];

function item(index: number, title: string, category: string): MediaItem {
  return {
    id: `memory-${index + 1}`, title, shortTitle: title, description: `A chapter from ${category.toLowerCase()}, kept close forever.`,
    longDescription: `A favourite moment in the story of Ankit and you. Replace this sample with your own memory, photo, date, and message in the Media sheet.`,
    mediaType: index === 11 ? "credits" : "image", thumbnailUrl: hero, backdropUrl: hero, mobileBackdropUrl: hero,
    videoUrl: "", previewVideoUrl: "", posterUrl: hero, durationSeconds: 0, displayDuration: "A treasured moment", year: "2026",
    relationshipDate: "", maturityLabel: "LOVE", tags: [category, "Ankit", "you"], location: "Our world", featured: index === 0,
    allowLike: true, allowFavourite: true, endingCreditsId: index === 11 ? "main-credits" : "", sortOrder: index + 1,
  };
}

const categoryNames = ["Our Story", "Beautiful Memories", "Adventures Together", "Date Nights", "Funny Moments", "Forever and Always"];
const titles = ["The Day It Began", "That Beautiful Smile", "Our Favourite Evening", "A Road Taken Together", "A Table for Two", "Laughing Until Midnight", "Sunsets and Promises", "The Little Things", "Miles of Memories", "Home Is You", "All Our Tomorrows", "To Be Continued"];
const media = titles.map((title, index) => item(index, title, categoryNames[Math.floor(index / 2)]));

export const sampleData: BootstrapData = {
  settings: {
    siteTitle: "Ankit & you", partnerOneName: "Ankit", partnerTwoName: "you",
    defaultTagline: "Every love story is beautiful, but ours is my favourite.", logoText: "OUR STORY", profileName: "Ankit & you",
    profileAvatarUrl: hero, introEnabled: true, introDurationMs: 4000, introDisplayMode: "always", introAudioUrl: "",
    showNavigation: true, showSearch: true, showMyList: true, showContinueWatching: true, showCredits: true,
    creditsMediaId: "memory-12", footerText: "Made with love, for us.", themePrimaryColor: "#e50914", themeBackgroundColor: "#141414",
  },
  navigation: [
    { id: "home", label: "Home", targetType: "section", targetValue: "home", sortOrder: 1 },
    { id: "story", label: "Our Story", targetType: "category", targetValue: "our-story", sortOrder: 2 },
    { id: "memories", label: "Memories", targetType: "category", targetValue: "beautiful-memories", sortOrder: 3 },
    { id: "my-list", label: "My List", targetType: "section", targetValue: "my-list", sortOrder: 4 },
  ],
  hero: {
    id: "main-hero", title: "The Story of Ankit & you", subtitle: "A Love Story", eyebrow: "A LOVE STORY",
    description: "From unexpected beginnings to unforgettable memories, this is the story of two people who found home in each other.",
    bannerUrl: hero, mobileBannerUrl: hero, titleLogoUrl: "", previewVideoUrl: "", mediaId: "memory-1",
    playButtonText: "Play", infoButtonText: "More Info", metadataText: "2026 · A Lifetime Series · Romance",
  },
  categories: categoryNames.map((title, index) => ({
    id: title.toLowerCase().replaceAll(" ", "-"), title, subtitle: "", description: "", sortOrder: index + 1,
    cardAspectRatio: "16:9", mediaIds: [media[index * 2].id, media[index * 2 + 1].id],
  })),
  media,
  credits: [
    ["Directed by", "God"], ["Cast", "Ankit and you"], ["Story by", "Our Memories"], ["Produced by", "Love, Patience and Support"],
    ["Location", "Wherever We Are Together"], ["Soundtrack", "Our Favourite Songs"], ["Special Thanks", "Family and Friends"], ["Final Message", "To be continued forever..."],
  ].map(([role, name], index) => ({ id: `credit-${index + 1}`, groupId: "main-credits", sectionTitle: "", role, name, message: "", imageUrl: index === 0 ? hero : "", sortOrder: index + 1 })),
  contentVersion: "demo-1", generatedAt: new Date(0).toISOString(),
};

export { scenes };
