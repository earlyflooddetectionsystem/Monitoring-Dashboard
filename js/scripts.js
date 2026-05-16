// ===================== FIREBASE SETUP =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, onValue, push, set, query, limitToLast } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// Config Firebase
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

// Variabel global untuk menampung angka air terakhir untuk dicatat per jam
let tinggiAirSekarang = 0;

// ===================== AMBIL DATA TINGGI AIR =====================
function ambilDataTinggiAir() {
  const tinggiAirRef = ref(db, "water_level"); 

  onValue(tinggiAirRef, (snapshot) => {
    const angkaElement = document.getElementById("jarak-angka");
    const kategoriElement = document.getElementById("status-kategori");

    if (snapshot.exists()) {
      const rawJarak = snapshot.val();
      const jarak = Math.round(Number(rawJarak));
      
      // Simpan ke variabel global agar bisa diambil oleh fungsi pencatat jam-jaman
      tinggiAirSekarang = jarak;

      let kategori = "";
      let warna = "";

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
  // Ambil waktu sekarang (Format Jam:Menit)
  const sekarang = new Date();
  const jamFormat = sekarang.toLocaleString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).replace('.', ':'); // Hasil: "14:00"

  const historiRef = ref(db, "histori");
  const dataBaruRef = push(historiRef);
  
  // Kirim data ke node /histori di Firebase
  set(dataBaruRef, {
    waktu: jamFormat,
    tinggi: tinggiAirSekarang
  }).then(() => {
    console.log("Histori jam-jaman berhasil dicatat:", jamFormat, "-", tinggiAirSekarang, "cm");
  });
}

// Jalankan pencatatan setiap 1 jam sekali (3600000 ms)
setInterval(catatHistoriTiapJam, 3600000);


// ===================== CHARTS (BACA DARI FIREBASE /histori) =====================
let areaChart;

function tampilkanGrafikHistori() {
  // Kita ambil 10 data histori terakhir saja dari Firebase biar grafik ga kepenuhan
  const historiRef = query(ref(db, "histori"), limitToLast(10));

  onValue(historiRef, (snapshot) => {
    const labelWaktu = [];
    const seriesTinggiAir = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const item = childSnapshot.val();
        labelWaktu.push(item.waktu);     // Masuk ke Sumbu X (Waktu)
        seriesTinggiAir.push(item.tinggi); // Masuk ke Sumbu Y (Angka cm)
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
      colors: ["#246dec"], // Warna Biru Air
      dataLabels: {
        enabled: true, // Munculin angka di titik grafiknya biar jelas pas discreenshot
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

// Jalankan fungsi grafik
tampilkanGrafikHistori();
