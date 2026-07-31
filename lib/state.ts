import type { Category, MediaItem } from "@/types/content";
import type { QueuedWrite, UserMediaState } from "@/types/state";

export const VISITOR_KEY = "gift-visitor-id";
export const STATE_KEY = "gift-media-state";
export const QUEUE_KEY = "gift-state-queue";

export function createVisitorId(): string {
  return `visitor_${crypto.randomUUID()}`;
}

export function completionPercent(progress: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(100, Math.max(0, (progress / duration) * 100));
}

export function isCompleted(progress: number, duration: number): boolean {
  return duration > 0 && (completionPercent(progress, duration) >= 95 || duration - progress <= 30);
}

export function shouldSaveProgress(previous: number, current: number, elapsedMs: number): boolean {
  return Math.abs(current - previous) >= 10 || elapsedMs >= 15000;
}

export function continueWatching(media: MediaItem[], states: UserMediaState[]) {
  const byId = new Map(media.map((item) => [item.id, item]));
  return states
    .filter((state) => state.progressPercent > 2 && !state.completed && byId.has(state.mediaId))
    .sort((a, b) => (b.lastWatchedAt ?? "").localeCompare(a.lastWatchedAt ?? ""))
    .map((state) => ({ media: byId.get(state.mediaId)!, state }));
}

export function myList(media: MediaItem[], states: UserMediaState[]) {
  const byId = new Map(media.map((item) => [item.id, item]));
  return states.filter((state) => state.favourite && byId.has(state.mediaId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((state) => byId.get(state.mediaId)!);
}

export function mapCategory(category: Category, media: MediaItem[]): MediaItem[] {
  const ids = new Set(category.mediaIds);
  return media.filter((item) => ids.has(item.id)).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function enqueue(queue: QueuedWrite[], write: Omit<QueuedWrite, "id" | "attempts" | "createdAt">): QueuedWrite[] {
  return [...queue, { ...write, id: crypto.randomUUID(), attempts: 0, createdAt: new Date().toISOString() }];
}

export function tokenExpired(expiresAt: number, now = Date.now()): boolean {
  return expiresAt <= now + 30000;
}
