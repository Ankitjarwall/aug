"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ContentRow } from "@/components/ContentRow";
import { EndingCredits } from "@/components/EndingCredits";
import { FullscreenPlayer } from "@/components/FullscreenPlayer";
import { HeroBanner } from "@/components/HeroBanner";
import { MediaDetailsModal } from "@/components/MediaDetailsModal";
import { MediaIssuesModal } from "@/components/MediaIssuesModal";
import { Navbar } from "@/components/Navbar";
import { NetflixIntro } from "@/components/NetflixIntro";
import { PermissionModal } from "@/components/PermissionModal";
import { ProfileChooser } from "@/components/ProfileChooser";
import { useGiftData } from "@/hooks/useGiftData";
import { backgroundSongUrl } from "@/lib/assets";
import { availableProfiles, profileContent } from "@/lib/profiles";
import { continueWatching, mapCategory, myList } from "@/lib/state";
import type { MediaItem, Profile } from "@/types/content";

export function NetflixGift() {
  const music = useRef<HTMLAudioElement>(null);
  const { data, states, byMediaId, loading, offline, error, saveState } = useGiftData();
  const [introDone, setIntroDone] = useState(false), [profileId, setProfileId] = useState(""), [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MediaItem | null>(null), [playing, setPlaying] = useState<MediaItem | null>(null);
  const [credits, setCredits] = useState(false), [permission, setPermission] = useState<MediaItem | null>(null), [issuesDismissed, setIssuesDismissed] = useState(false);
  const videoPlaying = playing?.mediaType === "video";
  const profiles = useMemo(() => availableProfiles(data), [data]);
  const view = useMemo(() => profileId ? profileContent(data, profileId) : null, [data, profileId]);
  const activeHero = view?.hero ?? data.hero;
  const visibleMedia = useMemo(() => view?.media ?? [], [view]);
  const heroMedia = visibleMedia.find((item) => item.id === activeHero.mediaId);
  const continueItems = continueWatching(visibleMedia, states).map(({ media }) => media);
  const favourites = myList(visibleMedia, states);
  const visibleCategoryIds = useMemo(() => new Set(view?.categories.map((category) => category.id) ?? []), [view]);
  const navigation = useMemo(() => data.navigation.filter((item) => item.targetType !== "category" || visibleCategoryIds.has(item.targetValue)), [data.navigation, visibleCategoryIds]);
  const results = useMemo(() => {
    const term = query.trim().toLowerCase(); if (!term || !view) return [];
    const categoryByMedia = new Map<string, string[]>();
    view.categories.forEach((category) => category.mediaIds.forEach((id) => categoryByMedia.set(id, [...(categoryByMedia.get(id) ?? []), category.title])));
    return visibleMedia.filter((item) => [item.title, item.shortTitle, item.description, item.location, ...item.tags, ...(categoryByMedia.get(item.id) ?? [])].join(" ").toLowerCase().includes(term));
  }, [query, view, visibleMedia]);

  useEffect(() => {
    const audio = music.current;
    if (!audio) return;
    if (!introDone || videoPlaying) { audio.pause(); return; }
    let cancelled = false;
    function removeRetry() { removeEventListener("pointerdown", start); removeEventListener("keydown", start); }
    function start() {
      if (cancelled) return;
      void audio!.play().then(removeRetry).catch(() => {
        if (!cancelled) {
          addEventListener("pointerdown", start, { once: true });
          addEventListener("keydown", start, { once: true });
        }
      });
    }
    start();
    return () => { cancelled = true; removeRetry(); };
  }, [introDone, videoPlaying]);

  function chooseProfile(profile: Profile) {
    setSelected(null); setPlaying(null); setCredits(false); setPermission(null); setQuery(""); setProfileId(profile.id); scrollTo({ top: 0 });
  }
  function switchProfile() {
    setSelected(null); setPlaying(null); setCredits(false); setPermission(null); setQuery(""); setProfileId(""); scrollTo({ top: 0 });
  }
  function openPlayer(media: MediaItem) { setSelected(null); if (media.mediaType === "credits") setCredits(true); else { if (media.mediaType === "video") music.current?.pause(); setPlaying(media); } }
  function toggle(media: MediaItem, field: "liked" | "favourite") { const current = byMediaId.get(media.id); saveState(media.id, { [field]: !current?.[field] }, field === "liked" ? "toggleLike" : "toggleFavourite"); }

  return <>
    <audio ref={music} src={backgroundSongUrl} loop preload="auto" data-background-music />
    {!introDone && <NetflixIntro settings={data.settings} onDone={() => setIntroDone(true)} />}
    {introDone && !view && <ProfileChooser profiles={profiles} settings={data.settings} fallbackImage={data.hero.bannerUrl} onSelect={chooseProfile} />}
    <main className={`site ${introDone && view ? "site--visible" : ""}`} style={{ "--accent": data.settings.themePrimaryColor, "--surface": data.settings.themeBackgroundColor } as React.CSSProperties}>
      {view && <>
        <Navbar settings={data.settings} navigation={navigation} profile={view.profile} query={query} onQuery={setQuery} onMyList={() => document.getElementById("my-list")?.scrollIntoView({ behavior: "smooth" })} onSwitchProfile={switchProfile} />
        <HeroBanner hero={activeHero} media={heroMedia} onPlay={() => heroMedia && openPlayer(heroMedia)} onInfo={() => heroMedia && setSelected(heroMedia)} />
        <div className="catalog" aria-busy={loading}>
          {offline && <div className="status-pill" role="status">Offline preview{error ? ` - ${error}` : ""}</div>}
          {query && <ContentRow id="search-results" title={results.length ? `Results for "${query}"` : `No memories found for "${query}"`} items={results} states={byMediaId} onOpen={setSelected} />}
          {!query && <>
            {data.settings.showContinueWatching && <ContentRow id="continue-watching" title="Continue Watching" items={continueItems} states={byMediaId} onOpen={setSelected} />}
            {data.settings.showMyList && <ContentRow id="my-list" title="My List" items={favourites} states={byMediaId} onOpen={setSelected} />}
            {view.categories.map((category) => <ContentRow key={category.id} id={category.id} title={category.title} items={mapCategory(category, visibleMedia)} states={byMediaId} onOpen={setSelected} />)}
          </>}
          <footer>{data.settings.footerText}</footer>
        </div>
      </>}
    </main>
    {!!data.mediaIssues?.length && !issuesDismissed && <MediaIssuesModal issues={data.mediaIssues} onClose={() => setIssuesDismissed(true)} />}
    {selected && <MediaDetailsModal media={selected} state={byMediaId.get(selected.id)} onClose={() => setSelected(null)} onPlay={() => openPlayer(selected)} onLike={() => toggle(selected, "liked")} onFavourite={() => toggle(selected, "favourite")} />}
    {playing && <FullscreenPlayer media={playing} state={byMediaId.get(playing.id)} onClose={() => setPlaying(null)} onProgress={(changes) => saveState(playing.id, changes, "savePlayback")} onCredits={() => { setPlaying(null); setCredits(true); }} onPermissionError={() => setPermission(playing)} />}
    {credits && <EndingCredits credits={data.credits} fallbackImage={activeHero.bannerUrl} title={`${data.settings.partnerOneName} & ${data.settings.partnerTwoName}`} onClose={() => setCredits(false)} />}
    {permission && <PermissionModal media={permission} onClose={() => setPermission(null)} onRetry={() => { setPermission(null); setPlaying({ ...permission }); }} />}
  </>;
}