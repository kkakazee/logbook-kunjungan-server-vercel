// utils/lokasi.js
// Verifikasi lokasi di sisi server. Sebelumnya pembatasan radius hanya ada
// di frontend (ProteksiLokasi.jsx) sehingga bisa dilewati dengan memanggil
// API langsung. Catatan: koordinat tetap berasal dari perangkat tamu dan
// bisa dipalsukan (fake GPS) — ini mempersulit, bukan menjamin.

const config = require("../config");

function hitungJarakMeter(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Mengembalikan null jika lolos, atau pesan error jika tidak.
function periksaLokasi(lokasi) {
  if (!config.lokasi) return null; // fitur dimatikan

  const lat = Number(lokasi?.lat);
  const lng = Number(lokasi?.lng);
  const akurasi = Math.max(0, Number(lokasi?.akurasi) || 0);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return "Lokasi perangkat dibutuhkan. Izinkan akses lokasi lalu muat ulang halaman.";
  }

  const jarak = hitungJarakMeter(lat, lng, config.lokasi.lat, config.lokasi.lng);
  // Beri toleransi sesuai akurasi GPS, maksimal 100 m.
  const batas = config.lokasi.radius + Math.min(akurasi, 100);

  if (jarak > batas) {
    return `Posisi Anda terdeteksi ${Math.round(jarak)} m dari area Jarkom BBMKG.`;
  }
  return null;
}

module.exports = { periksaLokasi, hitungJarakMeter };
