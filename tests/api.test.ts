import { describe, expect, it } from "vitest";
import { DataValidationError, parseApiResponse } from "@/lib/api";

describe("API response parsing", () => {
  it("accepts an envelope", () => expect(parseApiResponse({ ok: true, data: {}, meta: {}, error: null }).ok).toBe(true));
  it("rejects malformed payloads", () => expect(() => parseApiResponse({ data: {} })).toThrow(DataValidationError));
});
