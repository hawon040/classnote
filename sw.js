/* 수업노트 PWA 서비스워커
   - HTML(문서): 네트워크 우선 → 항상 최신, 오프라인이면 캐시
   - 그 외(아이콘/manifest 등): 캐시 우선 */
const CACHE = "subeomnote-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const isDoc = req.mode === "navigate" || req.destination === "document";
  if (isDoc) {
    // 네트워크 우선: 최신 HTML 우선, 실패하면(오프라인) 캐시
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(h => h || caches.match("./index.html")))
    );
    return;
  }
  // 그 외 정적 자원: 캐시 우선
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      try {
        const u = new URL(req.url);
        if (u.origin === location.origin && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
      } catch (_) {}
      return res;
    }))
  );
});
