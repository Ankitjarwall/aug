"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, hasApiConfiguration } from "@/lib/api";
import { sampleData } from "@/lib/sample-data";
import { createVisitorId, enqueue, QUEUE_KEY, STATE_KEY, VISITOR_KEY } from "@/lib/state";
import type { BootstrapData } from "@/types/content";
import type { QueuedWrite, UserMediaState } from "@/types/state";

const CONTENT_KEY = "gift-bootstrap-cache";

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; }
}

export function useGiftData() {
  const [data, setData] = useState<BootstrapData>(sampleData);
  const [states, setStates] = useState<UserMediaState[]>([]);
  const [visitorId, setVisitorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = localStorage.getItem(VISITOR_KEY) || createVisitorId();
    localStorage.setItem(VISITOR_KEY, id);
    setVisitorId(id);
    setStates(readJson<UserMediaState[]>(STATE_KEY, []));
    const cached = readJson<BootstrapData | null>(CONTENT_KEY, null);
    if (cached) setData(cached);

    if (!hasApiConfiguration) { setLoading(false); return; }
    api.bootstrap(id).then((fresh) => {
      if (!cached || fresh.generatedAt >= cached.generatedAt) {
        setData(fresh);
        localStorage.setItem(CONTENT_KEY, JSON.stringify(fresh));
      }
      if (fresh.userState?.length) { setStates(fresh.userState); localStorage.setItem(STATE_KEY, JSON.stringify(fresh.userState)); }
      setOffline(false);
    }).catch((reason: unknown) => {
      setOffline(true);
      setError(reason instanceof Error ? reason.message : "Unable to refresh content.");
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/sw.js`);
    const online = () => {
      setOffline(false);
      const queue = readJson<QueuedWrite[]>(QUEUE_KEY, []);
      if (!queue.length) return;
      const id = localStorage.getItem(VISITOR_KEY) ?? "";
      void Promise.allSettled(queue.map((write) => api.post(write.action, id, write.payload))).then((results) => {
        const failed = queue.filter((_, index) => results[index].status === "rejected");
        localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
      });
    };
    const offlineHandler = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineHandler);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offlineHandler); };
  }, []);

  const saveState = useCallback((mediaId: string, changes: Partial<UserMediaState>, action = "saveState") => {
    setStates((current) => {
      const old = current.find((entry) => entry.mediaId === mediaId);
      const next: UserMediaState = {
        mediaId, liked: false, favourite: false, progressSeconds: 0, durationSeconds: 0,
        progressPercent: 0, completed: false, playCount: 0, updatedAt: new Date().toISOString(), ...old, ...changes,
      };
      const updated = [...current.filter((entry) => entry.mediaId !== mediaId), next];
      localStorage.setItem(STATE_KEY, JSON.stringify(updated));
      return updated;
    });
    if (hasApiConfiguration && visitorId) {
      void api.post(action, visitorId, { mediaId, ...changes }).catch((reason: unknown) => {
        console.error("State sync failed", { action, mediaId, reason });
        const queue = enqueue(readJson<QueuedWrite[]>(QUEUE_KEY, []), { action, payload: { mediaId, ...changes } });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        setOffline(true);
      });
    }
  }, [visitorId]);

  const byMediaId = useMemo(() => new Map(states.map((state) => [state.mediaId, state])), [states]);
  return { data, states, byMediaId, visitorId, loading, offline, error, saveState };
}
