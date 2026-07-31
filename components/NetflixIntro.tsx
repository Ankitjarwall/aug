"use client";

import { useEffect, useState } from "react";
import { netflixIntroUrl } from "@/lib/assets";
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
    return () => {
      document.documentElement.style.overflow = rootOverflow;
      document.body.style.overflow = bodyOverflow;
    };
    // onDone is intentionally controlled by the parent render lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    sessionStorage.setItem("gift-intro-seen", "1");
    if (settings.introDisplayMode === "once_per_device") localStorage.setItem("gift-intro-seen", "1");
    setVisible(false);
    setTimeout(onDone, 320);
  }

  if (!visible) return <div className="intro intro--leaving" aria-hidden="true" />;
  return (
    <div className="intro" role="status" aria-label={"Opening " + settings.siteTitle}>
      <video className="intro-video" src={netflixIntroUrl} autoPlay muted playsInline preload="auto" onEnded={finish} onError={finish} />
    </div>
  );
}
