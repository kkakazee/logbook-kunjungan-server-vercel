// api/lokasi.js — menyimpan koordinat GPS terakhir yang sudah diverifikasi
// oleh <ProteksiLokasi>, untuk ikut dikirim ke server (server juga
// memeriksa radius, tidak hanya frontend).

let lokasiTerakhir = null;

export function simpanLokasi(coords) {
  lokasiTerakhir = {
    lat: coords.latitude,
    lng: coords.longitude,
    akurasi: Math.round(coords.accuracy || 0),
  };
}

export function ambilLokasiTerakhir() {
  return lokasiTerakhir;
}
