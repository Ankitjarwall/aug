export type MediaType = "video" | "image" | "gallery" | "credits";

export interface Settings {
  siteTitle: string;
  partnerOneName: string;
  partnerTwoName: string;
  defaultTagline: string;
  logoText: string;
  profileName: string;
  profileAvatarUrl: string;
  introEnabled: boolean;
  introDurationMs: number;
  introDisplayMode: "always" | "once_per_session" | "once_per_device" | "disabled";
  introAudioUrl: string;
  showNavigation: boolean;
  showSearch: boolean;
  showMyList: boolean;
  showContinueWatching: boolean;
  showCredits: boolean;
  creditsMediaId: string;
  footerText: string;
  themePrimaryColor: string;
  themeBackgroundColor: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  targetType: "section" | "category" | "media" | "external";
  targetValue: string;
  sortOrder: number;
}

export interface Hero {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  description: string;
  bannerUrl: string;
  mobileBannerUrl: string;
  titleLogoUrl: string;
  previewVideoUrl: string;
  mediaId: string;
  playButtonText: string;
  infoButtonText: string;
  metadataText: string;
}

export interface Category {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  sortOrder: number;
  cardAspectRatio: string;
  mediaIds: string[];
}

export interface MediaItem {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  longDescription: string;
  mediaType: MediaType;
  thumbnailUrl: string;
  backdropUrl: string;
  mobileBackdropUrl: string;
  videoUrl: string;
  previewVideoUrl: string;
  posterUrl: string;
  durationSeconds: number;
  displayDuration: string;
  year: string;
  relationshipDate: string;
  maturityLabel: string;
  tags: string[];
  location: string;
  featured: boolean;
  allowLike: boolean;
  allowFavourite: boolean;
  endingCreditsId: string;
  sortOrder: number;
  sourceSheetRow?: number;
  driveFileId?: string;
  driveFileName?: string;
}

export interface Credit {
  id: string;
  groupId: string;
  sectionTitle: string;
  role: string;
  name: string;
  message: string;
  imageUrl: string;
  sortOrder: number;
}

export interface BootstrapData {
  settings: Settings;
  navigation: NavigationItem[];
  hero: Hero;
  categories: Category[];
  media: MediaItem[];
  credits: Credit[];
  contentVersion: string;
  generatedAt: string;
  userState?: import("./state").UserMediaState[];
  mediaIssues?: MediaIssue[];
  sessionToken?: string;
  sessionExpiresAt?: number;
}

export interface MediaIssue {
  contentTitle: string;
  fileName: string;
  sheetName: string;
  rowNumber: number;
  fieldName: string;
  fileId: string;
  reason: string;
  openUrl: string;
}
