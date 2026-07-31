"use client";

import { useEffect, useState } from "react";
import type { Settings } from "@/types/content";

function shouldShow(settings: Settings) {
  if (!settings.introEnabled || settings.introDisplayMode === "disabled") return false;
  if (settings.introDisplayMode === "once_per_session" && sessionStorage.getItem("gift-intro-seen")) return false;
  if (settings.introDisplayMode === "once_per_device" && localStorage.getItem("gift-intro-seen")) return false;
  return true;
}

export function NetflixIntro({ settings, onDone }: { settings: Settings; onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!shouldShow(settings) || matchMedia("(prefers-reduced-motion: reduce)").matches) { onDone(); return; }
    const rootOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => finish(false), Math.max(1200, settings.introDurationMs));
    return () => {
      clearTimeout(timer);
      document.documentElement.style.overflow = rootOverflow;
      document.body.style.overflow = bodyOverflow;
    };
    // onDone is intentionally controlled by the parent render lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish(skipped: boolean) {
    sessionStorage.setItem("gift-intro-seen", "1");
    if (settings.introDisplayMode === "once_per_device") localStorage.setItem("gift-intro-seen", "1");
    setVisible(false);
    setTimeout(onDone, skipped ? 100 : 420);
  }

  if (!visible) return <div className="intro intro--leaving" aria-hidden="true" />;
  return (
    <div className="intro" role="status" aria-label="Opening Ankit and Shimran's story">
      <div className="intro-lights" aria-hidden="true" />
      <div className="intro-mark" aria-hidden="true"><i /><b /><i /></div>
      <button className="intro-skip" onClick={() => finish(true)}>Skip intro</button>
    </div>
  );
}
