// SIDEBAR TOGGLE
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
  pushButton.addEventListener('click', function() 
  {
    buttonValue = !buttonValue; // Toggle the boolean value
    const indicator = document.getElementById('indicator');
    if (indicator) {
      // Change the icon based on buttonValue
      if (buttonValue) 
      {
        indicator.textContent = 'notifications'; // Change icon to "notifications"
      }
      else 
      {
        indicator.textContent = 'notifications_active'; // Change icon back to "notifications_active"
      }
    }
  });
}

// ===================== FETCH DATA BMKG =====================
const api_url =
  "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.73.01.1002";

// ambil data dari API
async function ambilDataCuaca() {
  try {
    const res = await fetch(api_url);
    if (!res.ok) throw new Error("Gagal ambil data API");
    const data = await res.json();

    // contoh: ambil prakiraan pertama hari pertama
    const prakiraan = data.data[0].cuaca[0][0];

    // lokasi
    const kec = data.lokasi.kecamatan || "N/A";
    const kota = data.lokasi.kotkab || "N/A";
    document.getElementById(
      "lokasi-info"
    ).textContent = `${kec}, ${kota}`;

    const suhu = prakiraan.t || "N/A";
    const kelembapan = prakiraan.hu || "N/A";
    const kecepatanAngin = prakiraan.ws || "N/A";
    const arahAngin = prakiraan.wd || "N/A";
    const desc = prakiraan.weather_desc || "N/A";
    const img = prakiraan.image ? prakiraan.image.replace(/ /g, "%20") : "";

    // update ke card dashboard
    document.querySelectorAll(".card span.font-weight-bold")[0].textContent =
      desc;
    document.querySelectorAll(".card span.font-weight-bold")[1].textContent =
      suhu + " °C";
    document.querySelectorAll(".card span.font-weight-bold")[2].textContent =
      kelembapan + " %";

    // opsional: update chart
    updateCharts(data.data[0].cuaca[0]);
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

ambilDataCuaca();

// ===================== FIREBASE SETUP =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

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

// ===================== KONFIGURASI TELEGRAM =====================
const TELEGRAM_TOKEN = '8329480424:AAELtBm4TyNYGeL_a0RaLzZL9KhKcm1pJuM';
const TELEGRAM_CHAT_ID = '@earlyflooddetectionsystem';

let dataTinggiSekarang = 0;
let statusSekarang = "MEMUAT...";

async function kirimKeTelegram(pesan) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: pesan,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error("Gagal kirim Telegram:", err);
  }
}

// Interval 15 menit (15 * 60 * 1000)
setInterval(() => {
  const laporan = `*📊 LAPORAN BERKALA TINGGI AIR*\n\n` +
                  `📍 Status: *${statusSekarang}*\n` +
                  `📏 Tinggi: *${dataTinggiSekarang} cm*\n` +
                  `⏰ Waktu: ${new Date().toLocaleString('id-ID')}`;
  kirimKeTelegram(laporan);
}, 10000);


// ===================== AMBIL DATA TINGGI AIR =====================
function ambilDataTinggiAir() {
  const tinggiAirRef = ref(db, "water_level"); 

  onValue(tinggiAirRef, (snapshot) => {
    const angkaElement = document.getElementById("jarak-angka");
    const kategoriElement = document.getElementById("status-kategori");

    if (snapshot.exists()) {
      const rawJarak = snapshot.val();
      const jarak = Math.round(Number(rawJarak));
      
      // Simpan ke variabel global untuk digunakan fungsi Telegram
      dataTinggiSekarang = jarak;

      let kategori = "";
      let warna = "";

      if (jarak > 18) {
        kategori = "AMAN";
        warna = "#2ecc71"; 
      } else if (jarak <= 18 && jarak > 8) {
        kategori = "WASPADA";
        warna = "#f1c40f"; 
      } else {
        kategori = "BAHAYA";
        warna = "#e74c3c"; 
      }

      statusSekarang = kategori; // Update status global

      if (angkaElement) angkaElement.textContent = jarak + " cm";
      if (kategoriElement) {
        kategoriElement.textContent = kategori;
        kategoriElement.style.color = warna;
      }
      
      // Update juga di card index ke-3 jika ada (berdasarkan kode lama kamu)
      const cardWater = document.querySelectorAll(".card span.font-weight-bold")[3];
      if(cardWater) cardWater.textContent = jarak + " cm";

    }
  });
}

ambilDataTinggiAir();


// ===================== CHARTS =====================

// AREA CHART (dinamis update)
let areaChart;
function updateCharts(prakiraanHariIni) {
  const labels = prakiraanHariIni.map((p) => p.local_datetime.split(" ")[1]);
  const suhuSeries = prakiraanHariIni.map((p) => parseFloat(p.t));
  const kelembapanSeries = prakiraanHariIni.map((p) => parseFloat(p.hu));

  const areaChartOptions = {
    series: [
      {
        name: "Suhu (°C)",
        data: suhuSeries,
      },
      {
        name: "Kelembapan (%)",
        data: kelembapanSeries,
      },
    ],
    chart: {
      height: 350,
      type: "area",
      toolbar: {
        show: false,
      },
    },
    colors: ["#4f35a1", "#246dec"],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
    },
    labels: labels,
    markers: {
      size: 0,
    },
    yaxis: [
      {
        title: {
          text: "Suhu (°C)",
        },
      },
      {
        opposite: true,
        title: {
          text: "Kelembapan (%)",
        },
      },
    ],
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
}