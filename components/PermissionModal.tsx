"use client";

import { ExternalLink, RefreshCw, X } from "lucide-react";
import { buildDriveUrls } from "@/lib/drive";
import type { MediaItem } from "@/types/content";

export function PermissionModal({ media, onClose, onRetry }: { media: MediaItem; onClose: () => void; onRetry: () => void }) {
  const urls = buildDriveUrls(media.videoUrl || media.backdropUrl);
  return <div className="modal-backdrop"><div className="permission-modal" role="alertdialog" aria-modal="true" aria-labelledby="permission-title">
    <button className="round-button close-button" onClick={onClose} aria-label="Close"><X /></button>
    <p className="error-code">MEDIA ACCESS NEEDED</p><h2 id="permission-title">We can’t open “{media.driveFileName || media.title}” yet.</h2>
    <p>Media sheet row: {media.sourceSheetRow ?? "unknown"} · Drive file: {media.driveFileId || "not detected"}</p>
    <ol><li>Open the file in Google Drive.</li><li>Select Share.</li><li>Under General access, choose Anyone with the link.</li><li>Set access to Viewer and save.</li></ol>
    <div className="permission-actions"><a className="button button--dark" href={urls.open} target="_blank" rel="noreferrer"><ExternalLink />Open in Drive</a><button className="button button--light" onClick={onRetry}><RefreshCw />Check again</button></div>
  </div></div>;
}
