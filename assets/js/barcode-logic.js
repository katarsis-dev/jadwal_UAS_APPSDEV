let db;
const request = indexedDB.open("JadwalDB", 1);

request.onsuccess = (e) => {
  db = e.target.result;
  generateScheduleQR();
};

async function generateScheduleQR() {
  const transaction = db.transaction(["jadwal_store"], "readonly");
  const store = transaction.objectStore("jadwal_store");
  const getAll = store.getAll();

  getAll.onsuccess = () => {
    const schedules = getAll.result;
    if (schedules.length === 0) {
      document.getElementById("qrcode").innerHTML =
        '<p class="text-muted">Belum ada jadwal.</p>';
      return;
    }

    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = "";

    const optimizedData = schedules.map((item) => [
      item.matkul,
      item.hari,
      item.semester,
      item.jamMulai,
      item.jamSelesai,
      item.ruang,
    ]);

    const qrString = JSON.stringify(optimizedData);
    console.log("Data QR (Terkornpresi):", qrString);

    new QRCode(qrContainer, {
      text: qrString,
      width: 280,
      height: 280,
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
        alert("Berhasil Mendapatkan Data!");
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
