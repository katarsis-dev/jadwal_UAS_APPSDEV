const CACHE_NAME = "jadwal-pwa-v1";

// Daftar file yang WAJIB disimpan biar bisa dibuka tanpa internet
const urlsToCache = [
  "./",
  "./index.html",
  "./scan.html",
  "./manifest.json",
  "./assets/css/bootstrap.min.css",
  "./assets/css/bootstrap-icons.css",
  "./assets/css/style.css",
  "./assets/css/fonts/bootstrap-icons.woff2",
  "./assets/css/fonts/bootstrap-icons.woff",
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

// 1. Install Service Worker & Simpan semua asset ke Cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching all assets...");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// 2. Aktivasi & Hapus cache lama kalau ada update versi
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Deleting old cache...");
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Strategi Fetch: Ambil dari Cache dulu, kalau gak ada baru ke Internet
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : { title: "Notif", body: "Waktunya!" };
  const options = {
    body: data.body,
    icon: "assets/icons/logo.png",
    vibrate: [200, 100, 200],
    actions: [{ action: "close", title: "Matikan Alarm" }],
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("./index.html"));
});
