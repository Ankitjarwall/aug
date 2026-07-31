"use client";

import { Copy, ExternalLink, RefreshCw, X } from "lucide-react";
import type { MediaIssue } from "@/types/content";

export function MediaIssuesModal({ issues, onClose }: { issues: MediaIssue[]; onClose: () => void }) {
  const problemList = issues.map((issue) => `${issue.contentTitle} | ${issue.sheetName} row ${issue.rowNumber} | ${issue.fieldName} | ${issue.fileId} | ${issue.reason}`).join("\n");
  return <div className="modal-backdrop"><div className="permission-modal issues-modal" role="alertdialog" aria-modal="true" aria-labelledby="issues-title">
    <button className="round-button close-button" onClick={onClose} aria-label="Continue with available content"><X /></button>
    <p className="error-code">MEDIA CHECK</p><h2 id="issues-title">Some photos or videos cannot be displayed</h2>
    <div className="issue-list">{issues.map((issue, index) => <article key={`${issue.sheetName}-${issue.rowNumber}-${issue.fieldName}-${index}`}>
      <strong>{issue.contentTitle || "Untitled content"}</strong><p>{issue.fileName || issue.fileId || "Unknown file"}</p>
      <small>{issue.sheetName} · row {issue.rowNumber} · {issue.fieldName}</small><p>{issue.reason}</p>
      {issue.openUrl && <a href={issue.openUrl} target="_blank" rel="noreferrer"><ExternalLink /> Open in Google Drive</a>}
    </article>)}</div>
    <ol><li>Open each file in Google Drive and select Share.</li><li>Under General access, choose Anyone with the link.</li><li>Set access to Viewer, save, then check again.</li></ol>
    <div className="permission-actions"><button className="button button--dark" onClick={() => void navigator.clipboard.writeText(problemList)}><Copy />Copy problem list</button><button className="button button--dark" onClick={onClose}>Continue</button><button className="button button--light" onClick={() => location.reload()}><RefreshCw />Check again</button></div>
  </div></div>;
}
