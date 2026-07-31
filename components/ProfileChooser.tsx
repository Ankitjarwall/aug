"use client";

import { useEffect } from "react";
import type { Profile, Settings } from "@/types/content";

export function ProfileChooser({ profiles, settings, fallbackImage, onSelect }: {
  profiles: Profile[];
  settings: Settings;
  fallbackImage: string;
  onSelect: (profile: Profile) => void;
}) {
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, []);

  return <section className="profile-gate" aria-labelledby="profile-gate-title">
    <div className="profile-brand">{settings.logoText}</div>
    <div className="profile-gate-content">
      <h1 id="profile-gate-title">Who&apos;s watching?</h1>
      <div className="profile-grid">
        {profiles.slice(0, 5).map((profile) => <button key={profile.id} className="profile-card" data-profile-id={profile.id} onClick={() => onSelect(profile)}>
          <img src={profile.avatarUrl || settings.profileAvatarUrl || fallbackImage} alt="" />
          <span>{profile.title}</span>
        </button>)}
      </div>
    </div>
  </section>;
}