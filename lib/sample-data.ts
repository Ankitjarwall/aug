import type { BootstrapData, Hero, MediaItem, Profile } from "@/types/content";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const hero = `${basePath}/demo/romantic-hero.png`;
const profileImages = [
  `${basePath}/profiles/profile-2020.jpg`,
  `${basePath}/profiles/profile-current.jpg`,
  `${basePath}/profiles/profile-future.jpg`,
];
const videoIndexes = new Set([0, 6, 9, 12, 18]);
const categoryNames = ["Our Story", "Beautiful Memories", "Adventures Together", "Date Nights", "Funny Moments", "The Little Things", "Milestones", "Forever and Always"];
const titles = [
  "The Day It Began", "Our First Conversation", "That Beautiful Smile", "Our Favourite Evening", "A Picture Worth Keeping",
  "Sunsets and Promises", "A Road Taken Together", "Miles of Memories", "Our Favourite Escape", "A Table for Two",
  "Under the City Lights", "A Celebration to Remember", "Laughing Until Midnight", "Our Best Inside Joke", "Morning Messages",
  "Home Is You", "A Day to Celebrate", "All We Have Achieved", "All Our Tomorrows", "To Be Continued",
];

function item(index: number, title: string): MediaItem {
  const isCredits = index === titles.length - 1;
  const isVideo = videoIndexes.has(index);
  const category = categoryNames[Math.min(Math.floor(index / 3), categoryNames.length - 1)];
  return {
    id: `memory-${index + 1}`, title, shortTitle: title, description: `A chapter from ${category.toLowerCase()}, kept close forever.`,
    longDescription: `A favourite moment in the story of Ankit and Shimran. Replace this sample with your own memory, photo, date, and message in the Media sheet.`,
    mediaType: isCredits ? "credits" : isVideo ? "video" : "image", thumbnailUrl: hero, backdropUrl: hero, mobileBackdropUrl: hero,
    videoUrl: isVideo ? `${basePath}/netflix-intro.mp4?demo-content=${index + 1}` : "", previewVideoUrl: "", posterUrl: hero,
    durationSeconds: isVideo ? 30 : 0, displayDuration: isVideo ? "Sample video" : "A treasured moment", year: "2026",
    relationshipDate: "", maturityLabel: "LOVE", tags: [category, "Ankit", "Shimran"], location: "Our world", featured: index === 0,
    allowLike: true, allowFavourite: true, endingCreditsId: isVideo ? "main-credits" : "", sortOrder: index + 1,
  };
}

const media = titles.map((title, index) => item(index, title));
const playableMedia = media.filter((item) => item.mediaType !== "credits");
const categories = [
  {
    id: "top-10-today", title: "Top 10 Shows Today", subtitle: "Today's most-loved memories", description: "The ten chapters at the top of your story today.",
    sortOrder: 0, cardAspectRatio: "16:9", mediaIds: playableMedia.slice(0, 10).map((item) => item.id),
  },
  ...categoryNames.map((title, categoryIndex) => ({
    id: title.toLowerCase().replaceAll(" ", "-").replace(/^the-/, ""), title, subtitle: "", description: "", sortOrder: categoryIndex + 1,
    cardAspectRatio: "16:9",
    mediaIds: Array.from({ length: 10 }, (_, rank) => playableMedia[(categoryIndex * 2 + rank) % playableMedia.length].id),
  })),
];

const heroes: Hero[] = [
  {
    id: "sample-hero-2020", title: "Where Our Story Began", subtitle: "In 2020 We", eyebrow: "THE FIRST CHAPTER",
    description: "The first conversations, favourite smiles, and little moments that turned 2020 into the beginning of us.",
    bannerUrl: profileImages[0], mobileBannerUrl: profileImages[0], titleLogoUrl: "", previewVideoUrl: "", mediaId: "memory-1",
    playButtonText: "Play", infoButtonText: "More Info", metadataText: "2020 - The Beginning - Romance",
  },
  {
    id: "main-hero", title: "The Story of Ankit & Shimran", subtitle: "A Love Story", eyebrow: "A LOVE STORY",
    description: "From unexpected beginnings to unforgettable memories, this is the story of two people who found home in each other.",
    bannerUrl: hero, mobileBannerUrl: hero, titleLogoUrl: "", previewVideoUrl: "", mediaId: "memory-1",
    playButtonText: "Play", infoButtonText: "More Info", metadataText: "Now - A Lifetime Series - Romance",
  },
  {
    id: "sample-hero-future", title: "All Our Tomorrows", subtitle: "In Future We", eyebrow: "THE STORY CONTINUES",
    description: "A glimpse of the adventures, milestones, quiet mornings, and beautiful future still waiting for us.",
    bannerUrl: profileImages[2], mobileBannerUrl: profileImages[2], titleLogoUrl: "", previewVideoUrl: "", mediaId: "memory-19",
    playButtonText: "Play", infoButtonText: "More Info", metadataText: "Coming Soon - Forever - Romance",
  },
];

const profiles: Profile[] = [
  { id: "sample-profile-2020", title: "In 2020 We", avatarUrl: profileImages[0], heroId: "sample-hero-2020", categoryIds: ["our-story", "beautiful-memories", "date-nights", "funny-moments", "little-things"], sortOrder: 1 },
  { id: "sample-profile-current", title: "Currently We", avatarUrl: profileImages[1], heroId: "main-hero", categoryIds: ["top-10-today", "beautiful-memories", "adventures-together", "date-nights", "little-things"], sortOrder: 2 },
  { id: "sample-profile-future", title: "In Future We", avatarUrl: profileImages[2], heroId: "sample-hero-future", categoryIds: ["adventures-together", "little-things", "milestones", "forever-and-always", "beautiful-memories"], sortOrder: 3 },
];
export const sampleData: BootstrapData = {
  settings: {
    siteTitle: "Ankit & Shimran", partnerOneName: "Ankit", partnerTwoName: "Shimran",
    defaultTagline: "Every love story is beautiful, but ours is my favourite.", logoText: "OUR STORY", profileName: "Ankit & Shimran",
    profileAvatarUrl: hero, introEnabled: true, introDurationMs: 4000, introDisplayMode: "always", introAudioUrl: "",
    showNavigation: true, showSearch: true, showMyList: true, showContinueWatching: true, showCredits: true,
    creditsMediaId: "memory-20", footerText: "Made with love, for us.", themePrimaryColor: "#e50914", themeBackgroundColor: "#141414",
  },
  navigation: [
    { id: "home", label: "Home", targetType: "section", targetValue: "home", sortOrder: 1 },
    { id: "story", label: "Our Story", targetType: "category", targetValue: "our-story", sortOrder: 2 },
    { id: "memories", label: "Memories", targetType: "category", targetValue: "beautiful-memories", sortOrder: 3 },
    { id: "my-list", label: "My List", targetType: "section", targetValue: "my-list", sortOrder: 4 },
  ],
  hero: heroes[1],
  heroes,
  profiles,

  categories,
  media,
  credits: [
    ["A Love Story for the Ages", "Directed by", "My Girlfriend, Shimran", "You are the heart behind every beautiful scene."],
    ["The Leading Lady", "Starring", "Shimran", "The smile that makes every day feel cinematic."],
    ["Her Favourite Person", "Starring", "Ankit", "Lucky enough to share this story with you."],
    ["Written From the Heart", "Written by", "Ankit", "Every word is another way of saying I love you."],
    ["Our Greatest Production", "Produced by", "Love, Trust and Endless Laughter", "Made together, one memory at a time."],
    ["The Perfect Setting", "Location", "Wherever I Am With You", "Every place feels like home beside you."],
    ["Songs That Feel Like Us", "Soundtrack", "Our Favourite Songs", "For every drive, dance and quiet evening."],
    ["For Every Tomorrow", "Dedicated to", "Shimran", "For the life we are still writing together."],
    ["One Last Thing", "Final Message", "I Choose You", "Yesterday, today, and every day after."],
    ["Next Episode", "Coming Soon", "Forever With You", "This love story is only getting started."],
  ].map(([sectionTitle, role, name, message], index) => ({
    id: `credit-${index + 1}`, groupId: "main-credits", sectionTitle, role, name, message, imageUrl: index === 0 ? hero : "", sortOrder: index + 1,
  })),
  contentVersion: "demo-3", generatedAt: new Date(0).toISOString(),
};

export const scenes = ["#7d1821", "#19354c", "#70452e", "#285044", "#44263f", "#614d24"];