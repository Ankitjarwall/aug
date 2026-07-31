"use client";

import { Check, Heart, Play, Plus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { MediaItem } from "@/types/content";
import type { UserMediaState } from "@/types/state";

export function MediaDetailsModal({ media, state, onClose, onPlay, onLike, onFavourite }: {
  media: MediaItem; state?: UserMediaState; onClose: () => void; onPlay: () => void; onLike: () => void; onFavourite: () => void;
}) {
  const modal = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && modal.current) {
        const focusable = [...modal.current.querySelectorAll<HTMLElement>("button, [href], input")];
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.body.style.overflow = "hidden";
    addEventListener("keydown", handler);
    modal.current?.querySelector<HTMLElement>("button")?.focus();
    return () => { document.body.style.overflow = ""; removeEventListener("keydown", handler); previous?.focus(); };
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title" ref={modal}>
        <img className="details-backdrop" src={media.backdropUrl || media.thumbnailUrl} alt="" />
        <div className="details-shade" />
        <button className="round-button close-button" aria-label="Close details" onClick={onClose}><X /></button>
        <div className="details-copy">
          <h2 id="details-title">{media.title}</h2>
          <div className="details-actions">
            <button className="button button--light" onClick={onPlay}><Play fill="currentColor" />{state?.progressSeconds ? "Resume" : "Play"}</button>
            {media.allowFavourite && <button className="round-button" onClick={onFavourite} aria-label={state?.favourite ? "Remove from My List" : "Add to My List"}>{state?.favourite ? <Check /> : <Plus />}</button>}
            {media.allowLike && <button className={`round-button ${state?.liked ? "is-active" : ""}`} onClick={onLike} aria-label={state?.liked ? "Unlike" : "Like"}><Heart fill={state?.liked ? "currentColor" : "none"} /></button>}
          </div>
          <div className="details-grid"><div><p className="details-meta"><b>{media.year}</b> {media.maturityLabel} {media.displayDuration}</p><p>{media.longDescription || media.description}</p></div><aside><p><span>Location:</span> {media.location}</p><p><span>Tags:</span> {media.tags.join(", ")}</p></aside></div>
        </div>
      </div>
    </div>
  );
}
