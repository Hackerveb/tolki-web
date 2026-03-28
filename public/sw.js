// TolKI Service Worker
// Strategy:
//   - Static assets (JS/CSS/fonts/images): cache-first with network fallback
//   - Navigation (HTML pages): network-first with offline fallback
//   - API / LiveKit / Convex / Clerk: network-only (never cache)

const CACHE_NAME = "tolki-v1";
const OFFLINE_URL = "/offline";

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-180.png",
  "/icons/icon.svg",
];

// Never cache requests matching these patterns
const NEVER_CACHE_PATTERNS = [
  /^https?:\/\/[^/]*\.livekit\.cloud/,   // LiveKit WebRTC / API
  /^wss?:\/\//,                           // Any WebSocket
  /\/api\//,                              // App API routes
  /\.convex\.cloud/,                      // Convex backend
  /\.clerk\.dev/,                         // Clerk auth API
  /clerk\.accounts\./,                    // Clerk auth
  /stripe\.com/,                          // Stripe
  /resend\.com/,                          // Email API
];

// Install: pre-cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: routing logic
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Never cache these patterns — pass through to network
  if (NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(request.url))) {
    return;
  }

  // Navigation requests: network-first, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          // Serve the offline page for any uncached navigation
          const offlineResponse = await caches.match(OFFLINE_URL);
          return (
            offlineResponse ||
            new Response("You are offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        })
    );
    return;
  }

  // Static assets (same-origin JS/CSS/fonts/images): cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // External static resources (fonts, CDN): stale-while-revalidate
  if (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
  }
});
