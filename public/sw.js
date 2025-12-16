const CACHE_NAME = "3cushion-cache-v1";

// 설치 단계 - 기본 파일 캐싱
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/manifest.json",
        "/icons/icon-192.png",
        "/icons/icon-512.png"
      ]);
    })
  );
  self.skipWaiting();
});

// 활성화 단계
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// fetch 가로채기 — 이것이 있어야 PWA 설치 버튼 조건 충족!
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
