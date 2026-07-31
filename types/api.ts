export interface ApiMeta {
  apiVersion: string;
  generatedAt: string;
  contentVersion: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  meta: ApiMeta;
  error: ApiErrorBody | null;
}
