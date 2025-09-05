// SIDEBAR TOGGLE
let sidebarOpen = false;
const sidebar = document.getElementById("sidebar");

function openSidebar() {
  if (!sidebarOpen) {
    sidebar.classList.add("sidebar-responsive");
    sidebarOpen = true;
  }
}

function closeSidebar() {
  if (sidebarOpen) {
    sidebar.classList.remove("sidebar-responsive");
    sidebarOpen = false;
  }
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

// ===================== AMBIL DATA TINGGI AIR =====================
function ambilDataTinggiAir() {
  const tinggiAirRef = ref(db, "water_level"); // sesuaikan path di Firebase

  onValue(tinggiAirRef, (snapshot) => {
    if (snapshot.exists()) {
      let tinggiAir = snapshot.val();

      // kalau numeric convert ke string
      if (typeof tinggiAir === "number") {
        tinggiAir = tinggiAir + " cm";
      }

      document.querySelectorAll(".card span.font-weight-bold")[3].textContent =
        tinggiAir;
    } else {
      console.log("Data tinggi air belum ada.");
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
