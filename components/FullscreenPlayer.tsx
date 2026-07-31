"use client";

import { Maximize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buildDriveUrls } from "@/lib/drive";
import { completionPercent, isCompleted, shouldSaveProgress } from "@/lib/state";
import type { MediaItem } from "@/types/content";
import type { UserMediaState } from "@/types/state";

function format(seconds: number) { const safe = Number.isFinite(seconds) ? seconds : 0; return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, "0")}`; }

export function FullscreenPlayer({ media, state, onClose, onProgress, onCredits, onPermissionError }: {
  media: MediaItem; state?: UserMediaState; onClose: () => void; onProgress: (changes: Partial<UserMediaState>) => void; onCredits: () => void; onPermissionError: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const lastSave = useRef({ time: state?.progressSeconds ?? 0, at: Date.now() });
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(false), [time, setTime] = useState(state?.progressSeconds ?? 0), [duration, setDuration] = useState(media.durationSeconds || 0), [driveFallback, setDriveFallback] = useState(false);
  const urls = buildDriveUrls(media.videoUrl);
  const source = media.videoUrl ? urls.video : "";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === " " || event.key.toLowerCase() === "k") { event.preventDefault(); toggle(); }
      if (event.key === "ArrowLeft" && video.current) video.current.currentTime -= 10;
      if (event.key === "ArrowRight" && video.current) video.current.currentTime += 10;
    };
    addEventListener("keydown", handler);
    return () => { document.body.style.overflow = ""; removeEventListener("keydown", handler); };
  });

  function toggle() { const node = video.current; if (!node) return; if (node.paused) void node.play(); else node.pause(); }
  function save(force = false) {
    const node = video.current; if (!node) return;
    if (force || shouldSaveProgress(lastSave.current.time, node.currentTime, Date.now() - lastSave.current.at)) {
      const percent = completionPercent(node.currentTime, node.duration);
      onProgress({ progressSeconds: node.currentTime, durationSeconds: node.duration, progressPercent: percent, completed: isCompleted(node.currentTime, node.duration), lastWatchedAt: new Date().toISOString() });
      lastSave.current = { time: node.currentTime, at: Date.now() };
    }
  }

  if (media.mediaType === "credits") { onCredits(); return null; }
  if (!source) return <div className="player" ref={shell}><img className="photo-player" src={media.backdropUrl || media.thumbnailUrl} alt={media.title} /><button className="round-button player-close" onClick={onClose} aria-label="Close"><X /></button><div className="photo-caption"><h2>{media.title}</h2><p>{media.description}</p></div></div>;
  if (driveFallback) return <div className="player"><iframe className="drive-preview" src={urls.preview} title={`${media.title} Google Drive preview`} allow="autoplay; fullscreen" /><button className="round-button player-close" onClick={onClose} aria-label="Close"><X /></button><button className="permission-link" onClick={onPermissionError}>Playback help</button></div>;

  return (
    <div className="player" ref={shell}>
      <video ref={video} src={source} poster={media.posterUrl || media.backdropUrl} autoPlay playsInline muted={muted}
        onLoadedMetadata={(event) => { const node = event.currentTarget; setDuration(node.duration); if (state?.progressSeconds) node.currentTime = state.progressSeconds; }}
        onTimeUpdate={(event) => { setTime(event.currentTarget.currentTime); save(); }} onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); save(true); }}
        onEnded={() => { save(true); if (media.endingCreditsId) onCredits(); else onClose(); }} onError={() => setDriveFallback(true)} />
      <div className="player-top"><button className="round-button" onClick={onClose} aria-label="Close player"><X /></button><h2>{media.title}</h2></div>
      <div className="player-controls">
        <input type="range" min="0" max={duration || 1} step="0.1" value={time} aria-label="Playback position" onChange={(event) => { if (video.current) video.current.currentTime = Number(event.target.value); }} />
        <div className="control-row">
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
          <button onClick={() => { if (video.current) video.current.currentTime -= 10; }} aria-label="Back 10 seconds"><RotateCcw /></button>
          <button onClick={() => { if (video.current) video.current.currentTime += 10; }} aria-label="Forward 10 seconds"><RotateCw /></button>
          <button onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX /> : <Volume2 />}</button>
          <span>{format(time)} / {format(duration)}</span><b>{media.title}</b>
          <button onClick={() => void shell.current?.requestFullscreen()} aria-label="Enter full screen"><Maximize /></button>
        </div>
      </div>
    </div>
  );
}
