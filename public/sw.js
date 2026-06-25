/* おたより帳 — リマインダー用 Service Worker v3
 * 通知タップのみ担当。fetch は横取りしない（横取りすると通信エラー時に白画面になる）
 */
const SW_VERSION = "v3";

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
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
