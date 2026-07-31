"use client";

import { useMemo, useState } from "react";
import { ContentRow } from "@/components/ContentRow";
import { EndingCredits } from "@/components/EndingCredits";
import { FullscreenPlayer } from "@/components/FullscreenPlayer";
import { HeroBanner } from "@/components/HeroBanner";
import { MediaDetailsModal } from "@/components/MediaDetailsModal";
import { MediaIssuesModal } from "@/components/MediaIssuesModal";
import { Navbar } from "@/components/Navbar";
import { NetflixIntro } from "@/components/NetflixIntro";
import { PermissionModal } from "@/components/PermissionModal";
import { useGiftData } from "@/hooks/useGiftData";
import { continueWatching, mapCategory, myList } from "@/lib/state";
import type { MediaItem } from "@/types/content";

export function NetflixGift() {
  const { data, states, byMediaId, loading, offline, error, saveState } = useGiftData();
  const [introDone, setIntroDone] = useState(false), [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MediaItem | null>(null), [playing, setPlaying] = useState<MediaItem | null>(null);
  const [credits, setCredits] = useState(false), [permission, setPermission] = useState<MediaItem | null>(null), [issuesDismissed, setIssuesDismissed] = useState(false);
  const heroMedia = data.media.find((item) => item.id === data.hero.mediaId);
  const continueItems = continueWatching(data.media, states).map(({ media }) => media);
  const favourites = myList(data.media, states);
  const results = useMemo(() => {
    const term = query.trim().toLowerCase(); if (!term) return [];
    const categoryByMedia = new Map<string, string[]>();
    data.categories.forEach((category) => category.mediaIds.forEach((id) => categoryByMedia.set(id, [...(categoryByMedia.get(id) ?? []), category.title])));
    return data.media.filter((item) => [item.title, item.shortTitle, item.description, item.location, ...item.tags, ...(categoryByMedia.get(item.id) ?? [])].join(" ").toLowerCase().includes(term));
  }, [data, query]);

  function openPlayer(media: MediaItem) { setSelected(null); if (media.mediaType === "credits") setCredits(true); else setPlaying(media); }
  function toggle(media: MediaItem, field: "liked" | "favourite") { const current = byMediaId.get(media.id); saveState(media.id, { [field]: !current?.[field] }, field === "liked" ? "toggleLike" : "toggleFavourite"); }

  return <>
    {!introDone && <NetflixIntro settings={data.settings} onDone={() => setIntroDone(true)} />}
    <main className={`site ${introDone ? "site--visible" : ""}`} style={{ "--accent": data.settings.themePrimaryColor, "--surface": data.settings.themeBackgroundColor } as React.CSSProperties}>
      <Navbar settings={data.settings} navigation={data.navigation} query={query} onQuery={setQuery} onMyList={() => document.getElementById("my-list")?.scrollIntoView({ behavior: "smooth" })} />
      <HeroBanner hero={data.hero} media={heroMedia} onPlay={() => heroMedia && openPlayer(heroMedia)} onInfo={() => heroMedia && setSelected(heroMedia)} />
      <div className="catalog" aria-busy={loading}>
        {offline && <div className="status-pill" role="status">Offline preview{error ? ` · ${error}` : ""}</div>}
        {query && <ContentRow id="search-results" title={results.length ? `Results for “${query}”` : `No memories found for “${query}”`} items={results} states={byMediaId} onOpen={setSelected} />}
        {!query && <>
          {data.settings.showContinueWatching && <ContentRow id="continue-watching" title="Continue Watching" items={continueItems} states={byMediaId} onOpen={setSelected} />}
          {data.settings.showMyList && <ContentRow id="my-list" title="My List" items={favourites} states={byMediaId} onOpen={setSelected} />}
          {data.categories.map((category) => <ContentRow key={category.id} id={category.id} title={category.title} items={mapCategory(category, data.media)} states={byMediaId} onOpen={setSelected} />)}
        </>}
        <footer>{data.settings.footerText}</footer>
      </div>
    </main>
    {!!data.mediaIssues?.length && !issuesDismissed && <MediaIssuesModal issues={data.mediaIssues} onClose={() => setIssuesDismissed(true)} />}
    {selected && <MediaDetailsModal media={selected} state={byMediaId.get(selected.id)} onClose={() => setSelected(null)} onPlay={() => openPlayer(selected)} onLike={() => toggle(selected, "liked")} onFavourite={() => toggle(selected, "favourite")} />}
    {playing && <FullscreenPlayer media={playing} state={byMediaId.get(playing.id)} onClose={() => setPlaying(null)} onProgress={(changes) => saveState(playing.id, changes, "savePlayback")} onCredits={() => { setPlaying(null); setCredits(true); }} onPermissionError={() => setPermission(playing)} />}
    {credits && <EndingCredits credits={data.credits} fallbackImage={data.hero.bannerUrl} title={`${data.settings.partnerOneName} & ${data.settings.partnerTwoName}`} onClose={() => setCredits(false)} />}
    {permission && <PermissionModal media={permission} onClose={() => setPermission(null)} onRetry={() => { setPermission(null); setPlaying({ ...permission }); }} />}
  </>;
}
