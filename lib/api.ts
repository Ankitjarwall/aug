import type { ApiResponse } from "@/types/api";
import type { BootstrapData } from "@/types/content";
import type { UserMediaState } from "@/types/state";

export class ConfigurationError extends Error {}
export class NetworkError extends Error {}
export class ApiError extends Error { constructor(message: string, readonly code: string) { super(message); } }
export class MediaPermissionError extends Error {}
export class MediaPlaybackError extends Error {}
export class DataValidationError extends Error {}
export class RateLimitError extends ApiError {}

const API_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL?.trim() ?? "";
let sessionToken = "";

export function parseApiResponse<T>(value: unknown): ApiResponse<T> {
  if (!value || typeof value !== "object" || !("ok" in value) || !("meta" in value)) throw new DataValidationError("The content service returned an invalid response.");
  return value as ApiResponse<T>;
}

async function request<T>(action: string, options?: { method?: "GET" | "POST"; body?: Record<string, unknown> }): Promise<T> {
  if (!API_URL) throw new ConfigurationError("NEXT_PUBLIC_APPS_SCRIPT_URL is not configured.");
  const method = options?.method ?? "GET";
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  if (method === "GET") Object.entries(options?.body ?? {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method, signal: controller.signal,
      headers: method === "POST" ? { "Content-Type": "text/plain;charset=utf-8" } : undefined,
      body: method === "POST" ? JSON.stringify({ action, sessionToken, ...options?.body }) : undefined,
    });
    if (!response.ok) throw new NetworkError(`The content service returned HTTP ${response.status}.`);
    const payload = parseApiResponse<T>(await response.json());
    if (!payload.ok || payload.data === null) {
      if (payload.error?.code === "RATE_LIMITED") throw new RateLimitError(payload.error.message, payload.error.code);
      throw new ApiError(payload.error?.message ?? "The content service rejected the request.", payload.error?.code ?? "API_ERROR");
    }
    return payload.data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new NetworkError("The content service timed out.");
    throw error;
  } finally { clearTimeout(timeout); }
}

export const api = {
  bootstrap: async (visitorId?: string) => {
    const data = await request<BootstrapData>("bootstrap", visitorId ? { body: { visitorId } } : undefined);
    sessionToken = data.sessionToken ?? "";
    return data;
  },
  state: (visitorId: string) => request<UserMediaState[]>("state", { body: { visitorId } }),
  post: <T>(action: string, visitorId: string, payload: Record<string, unknown>) => request<T>(action, { method: "POST", body: { visitorId, payload } }),
};

export const hasApiConfiguration = Boolean(API_URL);
