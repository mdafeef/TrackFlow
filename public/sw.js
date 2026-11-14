// TrackFlow Progressive Web App Service Worker
// Supports app shell precaching, runtime asset caching, and offline Watchlist & Tracking caching

const STATIC_CACHE_NAME = "trackflow-static-v1";
const WATCHLIST_CACHE_NAME = "trackflow-watchlist-cache-v1";

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: "no-cache" }).then((res) => {
            if (res.ok) {
              return cache.put(url, res);
            }
          })
        )
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== STATIC_CACHE_NAME && name !== WATCHLIST_CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      ),
    ])
  );
});

// Helper to build a synthetic GET cache key for watchlist & tracking items
function getTrackCacheRequest(trackingNumber) {
  const clean = String(trackingNumber || "")
    .trim()
    .toUpperCase();
  return new Request(
    `${self.location.origin}/__sw_cache/track/${encodeURIComponent(clean)}`,
    { method: "GET" }
  );
}

function getWatchlistSnapshotRequest() {
  return new Request(`${self.location.origin}/__sw_cache/watchlist/items`, {
    method: "GET",
  });
}

// Listen for client messages to sync watchlist items and tracking payloads into offline Cache Storage
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SYNC_WATCHLIST_CACHE" && Array.isArray(data.items)) {
    event.waitUntil(
      caches.open(WATCHLIST_CACHE_NAME).then((cache) => {
        const snapshotPayload = JSON.stringify({
          items: data.items,
          syncedAt: new Date().toISOString(),
        });
        return cache.put(
          getWatchlistSnapshotRequest(),
          new Response(snapshotPayload, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      })
    );
  }

  if (
    data.type === "CACHE_TRACKING_RESULT" &&
    data.trackingNumber &&
    data.payload
  ) {
    event.waitUntil(
      caches.open(WATCHLIST_CACHE_NAME).then((cache) => {
        const body = JSON.stringify({
          success: true,
          offlineCached: true,
          cachedAt: new Date().toISOString(),
          data: data.payload,
        });
        return cache.put(
          getTrackCacheRequest(data.trackingNumber),
          new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      })
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept GET requests so POST /api/track body streams are never locked
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. Intercept synthetic GET /__sw_cache/watchlist/items or /__sw_cache/track/*
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/__sw_cache/")
  ) {
    event.respondWith(
      caches.open(WATCHLIST_CACHE_NAME).then(async (cache) => {
        const matched = await cache.match(request);
        if (matched) return matched;
        return new Response(JSON.stringify({ found: false }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  // 3. Google Fonts & static assets: Cache-First with network fallback
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com" ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          fetch(request)
            .then((res) => {
              if (res && res.ok) cache.put(request, res.clone());
            })
            .catch(() => {});
          return cached;
        }
        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.ok) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 4. Page Navigations: Network-First with cached app shell fallback for offline mode
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put("/", networkRes.clone());
          }
          return networkRes;
        } catch {
          const cache = await caches.open(STATIC_CACHE_NAME);
          const cachedPage =
            (await cache.match(request)) || (await cache.match("/"));
          if (cachedPage) return cachedPage;
          return Response.error();
        }
      })()
    );
  }
});
