"use client";

import { Info, Play } from "lucide-react";
import type { Hero, MediaItem } from "@/types/content";

export function HeroBanner({ hero, media, onPlay, onInfo }: { hero: Hero; media?: MediaItem; onPlay: () => void; onInfo: () => void }) {
  return (
    <section id="home" className="hero" aria-label={hero.title}>
      <picture><source media="(max-width: 640px)" srcSet={hero.mobileBannerUrl || hero.bannerUrl} /><img className="hero-image" src={hero.bannerUrl} alt="" /></picture>
      <div className="hero-shade" />
      <div className="hero-copy">
        <p className="hero-eyebrow"><span>N</span> {hero.eyebrow}</p>
        <h1>{hero.title}</h1>
        <p className="hero-subtitle">{hero.subtitle}</p>
        <p className="hero-meta">{hero.metadataText}</p>
        <p className="hero-description">{hero.description}</p>
        <div className="hero-actions">
          <button className="button button--light" onClick={onPlay} disabled={!media}><Play fill="currentColor" />{hero.playButtonText}</button>
          <button className="button button--dark" onClick={onInfo} disabled={!media}><Info />{hero.infoButtonText}</button>
        </div>
      </div>
    </section>
  );
}
