"use client";

import { Heart, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { NavigationItem, Profile, Settings } from "@/types/content";

export function Navbar({ settings, navigation, profile, query, onQuery, onMyList, onSwitchProfile }: {
  settings: Settings; navigation: NavigationItem[]; profile: Profile; query: string; onQuery: (value: string) => void; onMyList: () => void; onSwitchProfile: () => void;
}) {
  const [solid, setSolid] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const handler = () => setSolid(scrollY > 40);
    addEventListener("scroll", handler, { passive: true });
    return () => removeEventListener("scroll", handler);
  }, []);

  function navigate(item: NavigationItem) {
    if (item.targetType === "external") { window.open(item.targetValue, "_blank", "noopener,noreferrer"); return; }
    document.getElementById(item.targetValue)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <header className={`navbar ${solid ? "navbar--solid" : ""}`}>
      <button className="wordmark" onClick={() => scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">{settings.logoText}</button>
      {settings.showNavigation && <nav aria-label="Main navigation">{navigation.map((item) => <button key={item.id} onClick={() => navigate(item)}>{item.label}</button>)}</nav>}
      <div className="nav-actions">
        {settings.showSearch && <div className={`search ${searchOpen ? "search--open" : ""}`}>
          <button className="icon-button" aria-label={searchOpen ? "Close search" : "Search"} onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) onQuery(""); }}>{searchOpen ? <X /> : <Search />}</button>
          {searchOpen && <input autoFocus value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Titles, memories, places" aria-label="Search memories" />}
        </div>}
        <button className="icon-button nav-heart" aria-label="Open My List" onClick={onMyList}><Heart /></button>
        <button className="profile-switch" onClick={onSwitchProfile} aria-label="Switch profile" title={profile.title}><img className="avatar" src={profile.avatarUrl || settings.profileAvatarUrl} alt="" /></button>
      </div>
    </header>
  );
}
