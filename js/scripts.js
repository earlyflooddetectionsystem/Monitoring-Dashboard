// ===================== SIDEBAR TOGGLE =====================
let sidebarOpen = false;
const sidebar = document.getElementById("sidebar");
let buttonValue = false;

window.openSidebar = function () {
  if (!sidebarOpen) {
    sidebar.classList.add("sidebar-responsive");
    sidebarOpen = true;
  }
}

window.closeSidebar = function () {
  if (sidebarOpen) {
    sidebar.classList.remove("sidebar-responsive");
    sidebarOpen = false;
  }
}

const pushButton = document.getElementById('push-button');
if (pushButton) {
  pushButton.addEventListener('click', function() {
    buttonValue = !buttonValue; // Toggle the boolean value
    const indicator = document.getElementById('indicator');
    if (indicator) {
      // Change the icon based on buttonValue
      if (buttonValue) {
        indicator.textContent = 'notifications'; // Change icon to "notifications"
      } else {
        indicator.textContent = 'notifications_active'; // Change icon back to "notifications_active"
      }
    }
  });
}

// ===================== TAMPILKAN LOKASI PERMANEN =====================
function tampilkanLokasi() {
  const lokasiElement = document.getElementById("lokasi-info");
  if (lokasiElement) {
    // Silakan ganti teks ini sesuai lokasi penempatan alat PKM lo
    lokasiElement.textContent = "Kec. Kramat Jati, Kota Jakarta Timur"; 
  }
}
tampilkanLokasi();


// ===================== FIREBASE SETUP =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, onValue, push, set, query, limitToLast } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// Config Firebase asli dari project lo
const firebaseConfig = {
  apiKey: "AIzaSyCn8IOK4iEDOCkvJDAWLU3qeuU8RkkuEJU",
  authDomain: "early-flood-detection-system-1.firebaseapp.com",
  databaseURL: "https://early-flood-detection-system-1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "early-flood-detection-system-1",
  storageBucket: "early-flood-detection-system-1.appspot.com",
  messagingSenderId: "737076359595",
  appId: "1:737076359595:web:55b7baabddc56f61b4a2ee"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Variabel penampung nilai air real-time saat ini untuk di-push per jam
let tinggiAirSekarang = 0;


// ===================== AMBIL DATA TINGGI AIR REAL-TIME =====================
function ambilDataTinggiAir() {
  const tinggiAirRef = ref(db, "water_level"); 

  onValue(tinggiAirRef, (snapshot) => {
    const angkaElement = document.getElementById("jarak-angka");
    const kategoriElement = document.getElementById("status-kategori");

    if (snapshot.exists()) {
      const rawJarak = snapshot.val();
      const jarak = Math.round(Number(rawJarak));
      
      // Simpan ke variabel global agar fungsi interval jam-jaman bisa baca nilai terbaru
      tinggiAirSekarang = jarak;

      let kategori = "";
      let warna = "";

      // Logika threshold baru yang lo tentukan tadi
      if (jarak > 200) {
        kategori = "AMAN";
        warna = "#2ecc71"; 
      } else if (jarak <= 200 && jarak > 190) {
        kategori = "WASPADA";
        warna = "#f1c40f"; 
      } else {
        kategori = "BAHAYA";
        warna = "#e74c3c"; 
      }

      if (angkaElement) angkaElement.textContent = jarak + " cm";
      if (kategoriElement) {
        kategoriElement.textContent = kategori;
        kategoriElement.style.color = warna;
      }
    }
  });
}

ambilDataTinggiAir();


// ===================== LOGIKA PENCATATAN HISTORI (TIAP 1 JAM) =====================
function catatHistoriTiapJam() {
  const sekarang = new Date();
  const jamFormat = sekarang.toLocaleString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).replace('.', ':'); // Hasil format rapi: "14:00"

  const historiRef = ref(db, "histori");
  const dataBaruRef = push(historiRef);
  
  // Push data terbaru ke node /histori di Firebase
  set(dataBaruRef, {
    waktu: jamFormat,
    tinggi: tinggiAirSekarang
  }).then(() => {
    console.log("Log jam-jaman berhasil disimpan:", jamFormat, "->", tinggiAirSekarang, "cm");
  });
}

// Menjalankan fungsi pencatatan otomatis setiap 1 jam sekali (3600000 milidetik)
setInterval(catatHistoriTiapJam, 3600000);


// ===================== CHARTS (BACA DARI NODE /histori) =====================
let areaChart;

function tampilkanGrafikHistori() {
  // Hanya ambil 10 data history terakhir dari Firebase biar grafik gak kepenuhan dan rapi
  const historiRef = query(ref(db, "histori"), limitToLast(10));

  onValue(historiRef, (snapshot) => {
    const labelWaktu = [];
    const seriesTinggiAir = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const item = childSnapshot.val();
        labelWaktu.push(item.waktu);     // Dimasukkan ke sumbu X grafik (Jam)
        seriesTinggiAir.push(item.tinggi); // Dimasukkan ke sumbu Y grafik (Ketinggian Air)
      });
    }

    const areaChartOptions = {
      series: [
        {
          name: "Tinggi Air (cm)",
          data: seriesTinggiAir,
        }
      ],
      chart: {
        height: 350,
        type: "area",
        toolbar: {
          show: false,
        },
      },
      colors: ["#246dec"], // Warna biru air royal
      dataLabels: {
        enabled: true, // Memunculkan angka di tiap titik grafik, membantu banget buat screenshot laporan PKM
      },
      stroke: {
        curve: "smooth",
      },
      labels: labelWaktu,
      markers: {
        size: 5,
      },
      yaxis: {
        title: {
          text: "Ketinggian (cm)",
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
      },
    };

    // Render baru jika belum ada chart, atau panggil updateOptions jika data di Firebase berubah
    if (!areaChart) {
      areaChart = new ApexCharts(
        document.querySelector("#area-chart"),
        areaChartOptions
      );
      areaChart.render();
    } else {
      areaChart.updateOptions(areaChartOptions);
    }
  });
}

// Aktifkan pemantauan grafik histori
tampilkanGrafikHistori();
