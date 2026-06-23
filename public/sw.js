/* おたより帳 — リマインダー用 Service Worker v2
 * 通知タップのみ担当。ページ読み込みは常にネットワークへ（更新時の不具合防止）
 */
const SW_VERSION = "v2";

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.length > 0) {
        return list[0].focus();
      }
      return self.clients.openWindow("/");
    })
  );
});

self.addEventListener("install", () => {
  // skipWaiting しない — 更新中のリロードでページが壊れないよう待機
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      Response.error()
    )
  );
});
