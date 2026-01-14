if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("../../assets/js/sw.js")
    .then(() => console.log("Service Worker Registered"))
    .catch((err) => console.error("SW Registration Failed", err));
}

const dbName = "JadwalDB";
const dbVersion = 1;
let db;

const request = indexedDB.open(dbName, dbVersion);

if ("Notification" in window) {
  Notification.requestPermission();
}

// 2. Setup Suara Alarm
const alarmAudio = new Audio("assets/audio/alarm.mp3"); // Pastikan file ada di folder ini
alarmAudio.loop = true;
// --- Inisialisasi Modal Alarm (Taruh di bagian atas bareng variabel lain) ---
const modalAlarmElement = document.getElementById("modalAlarm");
const modalAlarm = new bootstrap.Modal(modalAlarmElement);
const btnStopAlarm = document.getElementById("btnStopAlarm");

// --- Update Fungsi triggerAlarm ---
async function triggerAlarm(matkul, ruang) {
  // Update isi teks modal
  document.getElementById("alarmMatkul").innerText = matkul;
  document.getElementById("alarmRuang").innerText = `Ruangan: ${ruang}`;

  // 1. Notifikasi Visual (Web Notification)
  if (Notification.permission === "granted") {
    new Notification("Waktunya Kuliah!", {
      body: `${matkul} di ruang ${ruang} akan mulai sebentar lagi!`,
      icon: "assets/icons/icon-192x192.png",
    });
  }

  console.log("Mencoba memutar alarm meme...");

  try {
    // 2. Putar Suara
    await alarmAudio.play();
    console.log("Musik berhasil diputar!");

    // 3. Tampilkan Modal Bootstrap
    modalAlarm.show();
  } catch (error) {
    console.error("Gagal putar musik karena autoplay policy:", error);
    // Tetap munculkan modal meski suara gagal biar user tau ada jadwal
    modalAlarm.show();
  }
}

// --- Listener untuk Tombol Matikan Alarm ---
btnStopAlarm.addEventListener("click", () => {
  alarmAudio.pause();
  alarmAudio.currentTime = 0; // Reset ke awal
  modalAlarm.hide();
});
// 4. Mesin Pengecek Jadwal (Jalan tiap 1 menit)
setInterval(async () => {
  const hariIni = [
    "MINGGU",
    "SENIN",
    "SELASA",
    "RABU",
    "KAMIS",
    "JUMAT",
    "SABTU",
  ][new Date().getDay()];
  const jamSekarang = new Date()
    .toLocaleTimeString("id-ID", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(".", ":");

  const transaction = db.transaction(["jadwal_store"], "readonly");
  const store = transaction.objectStore("jadwal_store");
  const request = store.getAll();

  request.onsuccess = () => {
    const semuaJadwal = request.result;
    semuaJadwal.forEach((item) => {
      if (item.hari === hariIni && item.isAlarmActive) {
        // Hitung selisih waktu
        const [hMulai, mMulai] = item.jamMulai.split(":");
        const [hNow, mNow] = jamSekarang.split(":");

        const totalMenitMulai = parseInt(hMulai) * 60 + parseInt(mMulai);
        const totalMenitSekarang = parseInt(hNow) * 60 + parseInt(mNow);
        const selisih = totalMenitMulai - totalMenitSekarang;

        // Jika selisih pas dengan settingan reminder (misal 15 menit)
        if (selisih === parseInt(item.reminderMinutes)) {
          triggerAlarm(item.matkul, item.ruang);
          // Matikan alarm sementara biar gak bunyi terus di menit yang sama
          item.isAlarmActive = false;
        }
      }
    });
  };
}, 60000); // Cek tiap 60 detik

request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("jadwal_store")) {
    const store = db.createObjectStore("jadwal_store", {
      keyPath: "id",
      autoIncrement: true,
    });
    store.createIndex("by_semester", "semester", { unique: false });
    store.createIndex("by_hari", "hari", { unique: false });
  }
  if (!db.objectStoreNames.contains("settings_store")) {
    db.createObjectStore("settings_store");
  }
};

request.onsuccess = (e) => {
  db = e.target.result;
  loadCustomMusic();
  initApp();
};

function initApp() {
  const manualForm = document.getElementById("formManual");
  if (manualForm) {
    manualForm.addEventListener("submit", handleFormSubmit);
  }

  const filterSemester = document.getElementById("filterSemester");
  const filterHari = document.getElementById("filterHari");

  if (filterSemester)
    filterSemester.addEventListener("change", () => renderSchedules());
  if (filterHari)
    filterHari.addEventListener("change", () => renderSchedules());

  if (document.getElementById("scheduleListView")) {
    renderSchedules();
  }

  const modalManual = document.getElementById("modalManual");
  if (modalManual) {
    modalManual.addEventListener("hidden.bs.modal", resetForm);
  }
}

// --- FUNGSI LOAD MUSIK SAAT STARTUP ---
function loadCustomMusic() {
  const transaction = db.transaction(["settings_store"], "readonly");
  const store = transaction.objectStore("settings_store");
  const getRequest = store.get("alarm_sound");

  getRequest.onsuccess = () => {
    if (getRequest.result) {
      // Jika ada file musik di DB, ganti src alarmAudio
      const blob = getRequest.result;
      const musicURL = URL.createObjectURL(blob);
      alarmAudio.src = musicURL;
      console.log("Musik kustom berhasil dimuat.");
    }
  };
}

// --- FUNGSI SIMPAN MUSIK BARU ---
document.getElementById("inputMusic")?.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const transaction = db.transaction(["settings_store"], "readwrite");
  const store = transaction.objectStore("settings_store");

  // Simpan file blob ke IndexedDB dengan key "alarm_sound"
  const putRequest = store.put(file, "alarm_sound");

  putRequest.onsuccess = () => {
    // Update URL audio yang sedang jalan
    const musicURL = URL.createObjectURL(file);
    alarmAudio.src = musicURL;
    alert("Musik alarm berhasil diganti!");
  };
});

// --- FUNGSI PREVIEW (Tes dengerin) ---
window.previewMusic = function () {
  alarmAudio
    .play()
    .then(() => {
      setTimeout(() => {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
      }, 5000); // Putar 5 detik aja buat tes
    })
    .catch((err) => alert("Klik di layar dulu atau pilih file musik!"));
};

function handleFormSubmit(e) {
  e.preventDefault();

  const inputIdEl = document.getElementById("inputId");
  const idValue = inputIdEl ? inputIdEl.value : null;

  const reminderEl = document.getElementById("reminderMinutes");
  const reminderValue = reminderEl ? parseInt(reminderEl.value) : 15;

  const scheduleData = {
    matkul: document.getElementById("inputMatkul").value,
    hari: document.getElementById("inputHari").value,
    semester: parseInt(document.getElementById("inputSemester").value),
    jamMulai: document.getElementById("inputJamMulai").value,
    jamSelesai: document.getElementById("inputJamSelesai").value,
    ruang: document.getElementById("inputRuang").value,
    // --- WAJIB ADA INI BIAR MASUK KE DB ---
    reminderMinutes: reminderValue,
    isAlarmActive: true,
    updatedAt: new Date().toISOString(),
  };

  if (idValue && idValue !== "") {
    scheduleData.id = parseInt(idValue);
  }

  saveToDatabase(scheduleData);
}
function saveToDatabase(data) {
  const transaction = db.transaction(["jadwal_store"], "readwrite");
  const store = transaction.objectStore("jadwal_store");

  const requestAction = data.id ? store.put(data) : store.add(data);

  requestAction.onsuccess = () => {
    const modalElement = document.getElementById("modalManual");
    const modalInstance =
      bootstrap.Modal.getInstance(modalElement) ||
      new bootstrap.Modal(modalElement);
    modalInstance.hide();
    renderSchedules(true);
  };

  transaction.onerror = (e) => {
    console.error("Database Error:", e.target.error);
  };
}

function renderSchedules(rebuildFilter = false) {
  const listView = document.getElementById("scheduleListView");
  const emptyView = document.getElementById("emptyView");
  const semesterSection = document.getElementById("semesterSection");
  const filterSemester = document.getElementById("filterSemester");
  const filterHari = document.getElementById("filterHari");

  const transaction = db.transaction(["jadwal_store"], "readonly");
  const store = transaction.objectStore("jadwal_store");
  const getAllRequest = store.getAll();

  getAllRequest.onsuccess = () => {
    const schedules = getAllRequest.result;

    if (schedules.length > 0) {
      emptyView.classList.add("d-none");
      semesterSection.classList.remove("d-none");

      const uniqueSemesters = [
        ...new Set(schedules.map((s) => s.semester)),
      ].sort((a, b) => a - b);

      if (rebuildFilter || filterSemester.options.length <= 1) {
        const currentFilter = filterSemester.value;
        filterSemester.innerHTML = '<option value="all">Semua</option>';
        uniqueSemesters.forEach((sem) => {
          const opt = document.createElement("option");
          opt.value = sem;
          opt.textContent = `Smstr ${sem}`;
          if (sem.toString() === currentFilter) opt.selected = true;
          filterSemester.appendChild(opt);
        });
      }

      const selectedSemester = filterSemester.value;
      const selectedHari = filterHari.value;

      const filteredSchedules = schedules.filter((s) => {
        const matchSemester =
          selectedSemester === "all" ||
          s.semester.toString() === selectedSemester;
        const matchHari = selectedHari === "all" || s.hari === selectedHari;
        return matchSemester && matchHari;
      });

      listView.innerHTML = "";
      filteredSchedules.forEach((item) => {
        listView.innerHTML += `
    <div class="card card-custom mb-3 shadow-sm border-0">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <h6 class="fw-bold text-primary mb-1">${item.matkul}</h6>
                <span class="badge bg-light text-primary border">Smstr ${
                  item.semester
                }</span>
            </div>
            <div class="small text-muted mb-2">
                <i class="bi bi-clock me-1"></i> ${item.hari}, ${
          item.jamMulai
        } - ${item.jamSelesai}
            </div>
            <div class="small fw-bold mb-3">
                <i class="bi bi-geo-alt me-1"></i> ${item.ruang}
            </div>
            <div class="small text-muted mb-2">
                <i class="bi bi-alarm me-1"></i> Pengingat: ${
                  item.reminderMinutes
                } menit sebelum
            </div>
            
            <div class="d-flex border-top pt-2">
                <button class="btn btn-sm btn-link text-primary p-0 me-3 text-decoration-none" onclick="openEditModal(${
                  item.id
                })">
                    <i class="bi bi-pencil-square"></i> Edit
                </button>
                <button class="btn btn-sm btn-link text-danger p-0 text-decoration-none" onclick="deleteSchedule(${
                  item.id
                })">
                    <i class="bi bi-trash"></i> Hapus
                </button>
            </div>

            <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-light">
                <span class="small fw-bold ${
                  item.isAlarmActive ? "text-success" : "text-muted"
                }">
                    <i class="bi ${
                      item.isAlarmActive ? "bi-bell-fill" : "bi-bell-slash"
                    }"></i> 
                    Alarm: ${item.isAlarmActive ? "Aktif" : "Mati"}
                </span>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" 
                        id="switch-${item.id}" ${
          item.isAlarmActive ? "checked" : ""
        } 
                        style="cursor: pointer;"
                        onclick="toggleAlarm(${item.id})">
                </div>
            </div>
            
        </div>
    </div>
`;
      });
    } else {
      emptyView.classList.remove("d-none");
      semesterSection.classList.add("d-none");
      listView.innerHTML = "";
    }
  };
}

window.toggleAlarm = function (id) {
  const transaction = db.transaction(["jadwal_store"], "readwrite");
  const store = transaction.objectStore("jadwal_store");

  const getRequest = store.get(id);

  getRequest.onsuccess = () => {
    const data = getRequest.result;
    // Balikkan status
    data.isAlarmActive = !data.isAlarmActive;

    const updateRequest = store.put(data);

    updateRequest.onsuccess = () => {
      console.log(`Status alarm ${data.matkul} diubah.`);
      // Render ulang biar teks deskripsi "Aktif/Mati" langsung berubah
      renderSchedules();
    };
  };
};
window.deleteSchedule = function (id) {
  if (confirm("Hapus jadwal ini?")) {
    const transaction = db.transaction(["jadwal_store"], "readwrite");
    const store = transaction.objectStore("jadwal_store");
    const requestDelete = store.delete(parseInt(id));

    requestDelete.onsuccess = () => {
      renderSchedules(true);
    };
  }
};

function openEditModal(id) {
  const transaction = db.transaction(["jadwal_store"], "readonly");
  const store = transaction.objectStore("jadwal_store");

  store.get(parseInt(id)).onsuccess = (e) => {
    const data = e.target.result;
    if (!data) return;

    document.getElementById("inputId").value = data.id;
    document.getElementById("inputMatkul").value = data.matkul;
    document.getElementById("inputHari").value = data.hari;
    document.getElementById("inputSemester").value = data.semester;
    document.getElementById("inputJamMulai").value = data.jamMulai;
    document.getElementById("inputJamSelesai").value = data.jamSelesai;
    document.getElementById("inputRuang").value = data.ruang;

    const reminderEl = document.getElementById("reminderMinutes");
    if (reminderEl) {
      reminderEl.value = data.reminderMinutes || 15;
    }

    document.getElementById("modalManualLabel").innerText =
      "Edit Jadwal Kuliah";
    const modal = new bootstrap.Modal(document.getElementById("modalManual"));
    modal.show();
  };
}

function resetForm() {
  document.getElementById("formManual").reset();
  const inputId = document.getElementById("inputId");
  if (inputId) inputId.value = "";

  const reminderEl = document.getElementById("reminderMinutes");
  if (reminderEl) reminderEl.value = "15";

  document.getElementById("modalManualLabel").innerText =
    "Tambah Jadwal Manual";
}
document.getElementById("fileOCR").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    const preview = document.getElementById("scanPreview");
    preview.innerHTML = `<img src="${reader.result}" class="img-fluid rounded" style="max-height: 200px;">`;
    document.getElementById("btnStartOCR").classList.remove("d-none");
  };
  reader.readAsDataURL(file);
});

document.getElementById("btnStartOCR").addEventListener("click", async () => {
  const imgElement = document.querySelector("#scanPreview img");
  const progressBar = document.getElementById("ocrProgress");
  const progressInner = progressBar.querySelector(".progress-bar");
  const btn = document.getElementById("btnStartOCR");

  btn.disabled = true;
  btn.innerText = "Memproses...";
  progressBar.classList.remove("d-none");

  try {
    const worker = await Tesseract.createWorker("ind", 1, {
      // Coba hapus titik di depan slash-nya
      workerPath: "assets/js/worker.min.js",
      corePath: "assets/js/tesseract-core-simd.wasm.js",
      langPath: "assets/lang",
      logger: (m) => console.log(m),
    });

    const {
      data: { text },
    } = await worker.recognize(imgElement.src);
    await worker.terminate();

    parseTextToForm(text);
  } catch (err) {
    console.error("OCR Error:", err);
    alert(
      "Gagal membaca gambar. Pastikan file Tesseract di folder assets sudah benar."
    );
  } finally {
    btn.disabled = false;
    btn.innerText = "Mulai Ekstrak Teks";
    progressBar.classList.add("d-none");
  }
});
function parseTextToForm(rawText) {
  console.log(
    "%c --- DEBUGGING OCR V9: DEEP SCAN MODE --- ",
    "background: #000; color: #0f0; font-weight: bold;"
  );

  // Pecah jadi baris dan bersihkan spasi
  const lines = rawText
    .split("\n")
    .map((l) => l.toUpperCase().trim())
    .filter((l) => l.length > 0);
  console.table(lines); // Ini akan nampilin daftar baris di console biar kamu bisa liat urutannya

  const hariList = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
  let savedCount = 0;

  const isLecturer = (text) => {
    const titles = [
      "S.KOM",
      "M.KOM",
      "DR.",
      "ST.",
      "M.CS",
      "S.PD",
      "M.PD",
      "S.T",
      "M.T",
    ];
    return titles.some((t) => text.includes(t)) || text.includes(",");
  };

  lines.forEach((line, index) => {
    if (line.includes("JAM:")) {
      console.group(`Analisis Jadwal: Baris ${index}`);
      try {
        let foundHari = hariList.find((h) => line.includes(h)) || "SENIN";
        const times = line.match(/(\d{2}[.:]\d{2})/g);
        let jamMulai = times ? times[0].replace(".", ":") : "07:30";
        let jamSelesai = times ? times[1].replace(".", ":") : "09:10";

        let matkul = "Mata Kuliah";
        const matkulMatch = line.match(
          /(PSIS?\w+)\s*[-—]?\s*(.*?)(?=\s0[1-8]\s)/
        );
        if (matkulMatch) {
          matkul = `${matkulMatch[1]} - ${matkulMatch[2]
            .replace(/[-—]/g, "")
            .trim()}`;
        }

        let ruang = "R. KELAS";
        const patternMatch = line.match(
          /\s[A-Z]\s+(.*?)\s+(?:SENIN|SELASA|RABU|KAMIS|JUMAT)/
        );
        let baseRuang = patternMatch ? patternMatch[1].trim() : "";

        if (baseRuang.includes("LAB") || line.includes("LAB")) {
          ruang = "LAB.";
          for (let i = -2; i <= 4; i++) {
            let nearLine = lines[index + i] || "";
            if (nearLine.includes("INTERNET")) {
              ruang = "LAB. INTERNET";
              break;
            }
            if (nearLine.includes("APLIKASI")) {
              ruang = "LAB. APLIKASI";
              break;
            }
            if (nearLine.includes("KOMPUTER")) {
              ruang = "LAB. KOMPUTER";
              break;
            }
          }
        } else if (
          baseRuang.match(/[J3I17]-?[17]{1,2}/) ||
          line.match(/[J3I17]-?[17]{1,2}/)
        ) {
          ruang = "J-17";
        } else if (baseRuang !== "") {
          ruang = baseRuang;
        }

        console.log(`Hasil Akhir -> Matkul: ${matkul} | Ruang: ${ruang}`);

        const scheduleData = {
          matkul: matkul,
          hari: foundHari,
          semester: line.match(/\s(0[1-8])\s/)
            ? parseInt(line.match(/\s(0[1-8])\s/)[1])
            : 5,
          jamMulai: jamMulai,
          jamSelesai: jamSelesai,
          ruang: ruang,
          isAlarmActive: true,
          reminderMinutes: 15,
          updatedAt: new Date().toISOString(),
        };

        saveToDatabaseSilent(scheduleData);
        savedCount++;
      } catch (err) {
        console.error("Gagal parsing:", err);
      }
      console.groupEnd();
    }
  });

  const modalScan = bootstrap.Modal.getInstance(
    document.getElementById("modalScan")
  );
  if (modalScan) modalScan.hide();
  renderSchedules(true);
  alert(
    `Berhasil! ${savedCount} Jadwal diimpor. Cek Console (F12) jika ada yang kurang pas.`
  );
}
function saveToDatabaseSilent(data) {
  const transaction = db.transaction(["jadwal_store"], "readwrite");
  const store = transaction.objectStore("jadwal_store");
  store.add(data);
}
