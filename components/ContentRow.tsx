"use client";

import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useRef } from "react";
import type { MediaItem } from "@/types/content";
import type { UserMediaState } from "@/types/state";

export function ContentRow({ id, title, items, states, onOpen }: { id: string; title: string; items: MediaItem[]; states: Map<string, UserMediaState>; onOpen: (media: MediaItem) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const ranked = id === "top-10-today";
  if (!items.length) return null;
  const move = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .82, behavior: "smooth" });
  return (
    <section id={id} className={`content-row ${ranked ? "top10-row" : ""}`} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      <div className="rail-wrap">
        <button className="rail-arrow rail-arrow--left" onClick={() => move(-1)} aria-label={`Scroll ${title} left`}><ChevronLeft /></button>
        <div className="rail" ref={rail}>
          {items.map((media, index) => {
            const state = states.get(media.id);
            return <button className={`media-card ${ranked ? "top10-card" : ""}`} key={media.id} onClick={() => onOpen(media)} aria-label={`Open ${media.title}`}>
              {ranked && <span className="top10-rank" aria-hidden="true">{index + 1}</span>}
              <img src={media.thumbnailUrl || media.backdropUrl} alt={media.title} loading="lazy" />
              <span className="card-overlay"><Play fill="currentColor" /><b>{media.shortTitle || media.title}</b></span>
              {!!state?.progressPercent && <span className="card-progress"><i style={{ width: `${state.progressPercent}%` }} /></span>}
            </button>;
          })}
        </div>
        <button className="rail-arrow rail-arrow--right" onClick={() => move(1)} aria-label={`Scroll ${title} right`}><ChevronRight /></button>
      </div>
    </section>
  );
}
