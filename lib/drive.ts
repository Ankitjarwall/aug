export interface DriveReference { id: string; resourceKey?: string }

export function parseDriveReference(value: string): DriveReference | null {
  const input = value.trim();
  if (!input) return null;
  if (/^[\w-]{20,}$/.test(input)) return { id: input };
  try {
    const url = new URL(input);
    const id = url.pathname.match(/\/d\/([\w-]+)/)?.[1] ?? url.searchParams.get("id") ?? "";
    if (!id) return null;
    const resourceKey = url.searchParams.get("resourcekey") ?? url.searchParams.get("resourceKey") ?? undefined;
    return { id, resourceKey };
  } catch {
    return null;
  }
}

export function buildDriveUrls(value: string) {
  const ref = parseDriveReference(value);
  if (!ref) return { original: value, image: value, video: value, preview: value, open: value };
  const key = ref.resourceKey ? `&resourcekey=${encodeURIComponent(ref.resourceKey)}` : "";
  return {
    original: value,
    image: `https://drive.google.com/thumbnail?id=${ref.id}&sz=w1600${key}`,
    video: `https://drive.usercontent.google.com/download?id=${ref.id}&export=download&confirm=t${key}`,
    preview: `https://drive.google.com/file/d/${ref.id}/preview${ref.resourceKey ? `?resourcekey=${encodeURIComponent(ref.resourceKey)}` : ""}`,
    open: `https://drive.google.com/file/d/${ref.id}/view${ref.resourceKey ? `?resourcekey=${encodeURIComponent(ref.resourceKey)}` : ""}`,
  };
}
