const CACHE = "gift-static-v4";
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["./", "./demo/romantic-hero.png", "./netflix-intro.mp4", "./song.m4a", "./manifest.webmanifest"]))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      return (await caches.match(event.request)) || Response.error();
    }
  })());
});
