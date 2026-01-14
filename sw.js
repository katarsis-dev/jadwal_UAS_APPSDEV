const CACHE_NAME = "jadwal-pwa-v3"; // Naikkan versi karena ada perubahan file

// Daftar file yang WAJIB disimpan sesuai direktori terbaru kamu
const urlsToCache = [
  "./",
  "./index.html",
  "./scan.html",
  "./manifest.json",
  "./assets/audio/alarm.mp3", // File baru dari screenshot terbaru
  "./assets/css/bootstrap.min.css",
  "./assets/css/bootstrap-icons.css",
  "./assets/css/style.css",
  "./assets/fonts/bootstrap-icons.woff2",
  "./assets/fonts/bootstrap-icons.woff",
  "./assets/icons/icon-192x192.png", // Perubahan nama file
  "./assets/icons/icon-512x512.png", // Perubahan nama file
  "./assets/js/index.js",
  "./assets/js/barcode-logic.js",
  "./assets/js/bootstrap.bundle.min.js",
  "./assets/js/html5-qrcode.min.js",
  "./assets/js/qrcode.min.js",
  "./assets/js/tesseract.min.js",
  "./assets/js/worker.min.js",
  "./assets/js/tesseract-core-simd.wasm.js",
  "./assets/lang/ind.traineddata.gz",
];

// 1. Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching all assets based on directory...");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// 2. Aktivasi & Pembersihan Cache Lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Deleting old cache version...");
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Strategi Fetch: Cache First, then Network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 4. Logika Push Notification (Disesuaikan dengan ikon baru)
self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : { title: "Notif Jadwal", body: "Waktunya kuliah!" };

  const options = {
    body: data.body,
    icon: "assets/icons/icon-192x192.png", // Pakai ikon yang ada di direktori
    vibrate: [200, 100, 200],
    actions: [{ action: "close", title: "Matikan Alarm" }],
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 5. Listener saat notifikasi diklik
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("./index.html"));
});
