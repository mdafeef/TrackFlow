"use client";

import { useEffect, useState, useCallback } from "react";
import type { WatchlistItem } from "@/components/WatchlistDrawer";
import type { TrackingResult } from "@/app/api/track/route";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const OFFLINE_RESULTS_STORAGE_KEY = "trackflow_offline_results_cache";
const WATCHLIST_CACHE_NAME = "trackflow-watchlist-cache-v1";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof navigator !== "undefined") {
        setIsOnline(navigator.onLine);
      }
    }, 0);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Register Service Worker (/sw.js)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => {
          setSwReady(true);
        })
        .catch((err) => {
          console.warn("Service worker registration warning:", err);
        });
    }

    // 2. Detect standalone mode & iOS devices asynchronously after hydration
    const timer = setTimeout(() => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true;
      setIsInstalled(isStandalone);

      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
    }, 0);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    swReady,
    install,
  };
}

/**
 * Syncs the current Watchlist items to both Service Worker Cache Storage and localStorage
 * so watchlist items are always available offline.
 */
export async function syncWatchlistToOfflineCache(items: WatchlistItem[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("trackflow_watchlist", JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }

  try {
    if ("caches" in window) {
      const cache = await caches.open(WATCHLIST_CACHE_NAME);
      const snapshotPayload = JSON.stringify({
        items,
        syncedAt: new Date().toISOString(),
      });
      await cache.put(
        new Request(`${window.location.origin}/__sw_cache/watchlist/items`),
        new Response(snapshotPayload, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
  } catch {
    // ignore Cache Storage errors
  }

  try {
    if (
      "serviceWorker" in navigator &&
      navigator.serviceWorker.controller
    ) {
      navigator.serviceWorker.controller.postMessage({
        type: "SYNC_WATCHLIST_CACHE",
        items,
      });
    }
  } catch {
    // ignore postMessage errors
  }
}

/**
 * Loads watchlist items from localStorage or falls back to the Service Worker Cache Storage snapshot.
 */
export async function loadWatchlistFromOfflineCache(): Promise<WatchlistItem[]> {
  if (typeof window === "undefined") return [];

  try {
    const localRaw = localStorage.getItem("trackflow_watchlist");
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fall through to Cache Storage
  }

  try {
    if ("caches" in window) {
      const cache = await caches.open(WATCHLIST_CACHE_NAME);
      const res = await cache.match(
        new Request(`${window.location.origin}/__sw_cache/watchlist/items`)
      );
      if (res && res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items)) {
          return data.items;
        }
      }
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Saves a full TrackingResult payload into offline Cache Storage & localStorage
 * so any tracked or watchlisted shipment can be opened with full details while offline.
 */
export async function cacheTrackingResultOffline(result: TrackingResult) {
  if (typeof window === "undefined" || !result?.trackingNumber) return;

  const cleanKey = result.trackingNumber.trim().toUpperCase();

  try {
    const existingRaw = localStorage.getItem(OFFLINE_RESULTS_STORAGE_KEY);
    const map: Record<string, { data: TrackingResult; cachedAt: string }> =
      existingRaw ? JSON.parse(existingRaw) : {};
    map[cleanKey] = {
      data: result,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(OFFLINE_RESULTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore localStorage quota errors
  }

  try {
    if ("caches" in window) {
      const cache = await caches.open(WATCHLIST_CACHE_NAME);
      const body = JSON.stringify({
        success: true,
        offlineCached: true,
        cachedAt: new Date().toISOString(),
        data: result,
      });
      await cache.put(
        new Request(
          `${window.location.origin}/__sw_cache/track/${encodeURIComponent(cleanKey)}`
        ),
        new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
  } catch {
    // ignore Cache Storage errors
  }

  try {
    if (
      "serviceWorker" in navigator &&
      navigator.serviceWorker.controller
    ) {
      navigator.serviceWorker.controller.postMessage({
        type: "CACHE_TRACKING_RESULT",
        trackingNumber: cleanKey,
        payload: result,
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Retrieves a cached TrackingResult for offline playback when network is unavailable.
 */
export async function getOfflineCachedTrackingResult(
  trackingNumber: string
): Promise<TrackingResult | null> {
  if (typeof window === "undefined" || !trackingNumber) return null;
  const cleanKey = trackingNumber.trim().toUpperCase();

  try {
    if ("caches" in window) {
      const cache = await caches.open(WATCHLIST_CACHE_NAME);
      const res = await cache.match(
        new Request(
          `${window.location.origin}/__sw_cache/track/${encodeURIComponent(cleanKey)}`
        )
      );
      if (res && res.ok) {
        const json = await res.json();
        if (json?.data) return json.data as TrackingResult;
      }
    }
  } catch {
    // fall back to localStorage
  }

  try {
    const existingRaw = localStorage.getItem(OFFLINE_RESULTS_STORAGE_KEY);
    if (existingRaw) {
      const map = JSON.parse(existingRaw);
      if (map[cleanKey]?.data) {
        return map[cleanKey].data as TrackingResult;
      }
    }
  } catch {
    // ignore
  }

  return null;
}
