"use client";

import { X } from "lucide-react";
import type { Credit } from "@/types/content";

export function EndingCredits({ credits, fallbackImage, onClose }: { credits: Credit[]; fallbackImage: string; onClose: () => void }) {
  const image = credits.find((credit) => credit.imageUrl)?.imageUrl || fallbackImage;
  return <div className="credits-screen" role="dialog" aria-modal="true" aria-label="Ending credits">
    <button className="round-button credits-close" onClick={onClose} aria-label="Exit credits"><X /></button>
    <div className="credits-photo"><img src={image} alt="Ankit and you" /></div>
    <div className="credits-window"><div className="credits-roll">
      <p className="credits-kicker">ANKIT & you</p>
      {credits.map((credit) => <div className="credit" key={credit.id}>{credit.sectionTitle && <h2>{credit.sectionTitle}</h2>}<span>{credit.role}</span><strong>{credit.name}</strong>{credit.message && <p>{credit.message}</p>}</div>)}
      <p className="credits-final">To be continued...</p>
    </div></div>
    <span className="credits-progress" />
  </div>;
}
