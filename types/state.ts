export interface UserMediaState {
  mediaId: string;
  liked: boolean;
  favourite: boolean;
  progressSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  completed: boolean;
  playCount: number;
  firstPlayedAt?: string;
  lastWatchedAt?: string;
  updatedAt: string;
}

export interface QueuedWrite {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  attempts: number;
  createdAt: string;
}
