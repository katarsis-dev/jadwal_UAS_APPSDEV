let db;
const request = indexedDB.open("JadwalDB", 1);

request.onsuccess = (e) => {
  db = e.target.result;
  generateScheduleQR();
};

// --- BAGIAN 1: GENERATE QR ---
async function generateScheduleQR() {
  const transaction = db.transaction(["jadwal_store"], "readonly");
  const store = transaction.objectStore("jadwal_store");
  const getAll = store.getAll();

  getAll.onsuccess = () => {
    const schedules = getAll.result;
    if (schedules.length === 0) return;

    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = "";

    const cleanData = schedules.map(({ id, ...rest }) => rest);
    const qrString = JSON.stringify(cleanData);

    new QRCode(qrContainer, {
      text: qrString,
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.L,
    });
  };
}

// --- BAGIAN 2: SCAN QR ---
const html5QrCode = new Html5Qrcode("reader");

const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };

const onScanSuccess = (decodedText) => {
  // Hentikan kamera setelah berhasil scan
  html5QrCode.stop().then(() => {
    try {
      const importedData = JSON.parse(decodedText);

      if (Array.isArray(importedData)) {
        saveImportedData(importedData);
      } else {
        alert("Format QR Code tidak valid!");
      }
    } catch (err) {
      alert("Gagal membaca data QR!");
    }
  });
};

function saveImportedData(dataList) {
  const transaction = db.transaction(["jadwal_store"], "readwrite");
  const store = transaction.objectStore("jadwal_store");

  dataList.forEach((item) => {
    item.updatedAt = new Date().toISOString();
    item.isAlarmActive = true;
    store.add(item);
  });

  transaction.oncomplete = () => {
    alert(`Berhasil mengimpor ${dataList.length} jadwal!`);
    window.location.href = "index.html";
  };
}

// Jalankan Kamera saat tab "Terima Data" diklik
document
  .getElementById("pills-receive-tab")
  .addEventListener("shown.bs.tab", () => {
    html5QrCode.start({ facingMode: "environment" }, qrConfig, onScanSuccess);
  });

// Matikan kamera jika pindah tab
document
  .getElementById("pills-share-tab")
  .addEventListener("shown.bs.tab", () => {
    if (html5QrCode.isScanning) {
      html5QrCode.stop();
    }
    generateScheduleQR(); // Refresh QR
  });
