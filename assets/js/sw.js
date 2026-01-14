// sw.js
self.addEventListener("install", (event) => {
  self.skipWaiting();
  console.log("Service Worker: Installed");
});

self.addEventListener("push", (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "assets/icons/icon-192x192.png",
    badge: "assets/icons/badge-72x72.png", // Ikon kecil di status bar
    vibrate: [200, 100, 200],
    data: { url: "/" },
    actions: [{ action: "close", title: "Matikan Alarm" }],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Listener saat notifikasi diklik
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Buka aplikasi saat notifikasi diklik
  event.waitUntil(clients.openWindow("/"));
});
