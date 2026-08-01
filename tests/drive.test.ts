import { describe, expect, it } from "vitest";
import { buildDriveUrls, parseDriveReference } from "@/lib/drive";

const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz12";
describe("Google Drive URL handling", () => {
  it.each([
    [`https://drive.google.com/file/d/${id}/view`, id],
    [`https://drive.google.com/open?id=${id}`, id],
    [`https://drive.google.com/uc?export=view&id=${id}`, id],
    [id, id],
  ])("extracts an ID from %s", (input, expected) => expect(parseDriveReference(input)?.id).toBe(expected));

  it("preserves resource keys in generated URLs", () => {
    const urls = buildDriveUrls(`https://drive.google.com/file/d/${id}/view?resourcekey=secret123`);
    expect(urls.image).toContain("resourcekey=secret123");
    expect(urls.video).toBe(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t&resourcekey=secret123`);
    expect(urls.preview).toContain("resourcekey=secret123");
  });

  it("passes direct public URLs through", () => expect(buildDriveUrls("https://example.com/photo.jpg").image).toBe("https://example.com/photo.jpg"));
});
