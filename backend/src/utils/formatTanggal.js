// utils/formatTanggal.js
// Fungsi kecil untuk mengubah DATETIME dari MySQL jadi bentuk yang
// dibutuhkan frontend: versi tampilan (Indonesia, "DD/MM/YYYY, HH.mm WIB")
// dan versi ISO (dipakai frontend untuk sort/filter tanggal).
//
// Semua waktu disimpan di database dalam UTC, lalu SELALU dikonversi ke
// WIB (Asia/Jakarta, UTC+7) di sini — tidak bergantung pada timezone
// server tempat backend dijalankan (server cloud biasanya UTC).

const ZONA_WAKTU = "Asia/Jakarta";
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000; // Indonesia tidak memakai DST

function formatTampilan(tanggal) {
  if (!tanggal) return null;
  return (
    new Date(tanggal).toLocaleString("id-ID", {
      timeZone: ZONA_WAKTU,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB"
  );
}

// Menghasilkan ISO 8601 dengan offset WIB, contoh:
// "2026-11-04T22:14:05.000+07:00"
// Masih bisa di-parse langsung oleh new Date(), dan .slice(0, 10)
// menghasilkan tanggal versi WIB (bukan tanggal UTC) sehingga filter
// "Hari Ini" di frontend tepat walau jam 00.00–07.00 WIB.
function keFormatIso(tanggal) {
  if (!tanggal) return null;
  const waktu = new Date(tanggal).getTime();
  const iso = new Date(waktu + OFFSET_WIB_MS).toISOString(); // "...Z"
  return iso.slice(0, -1) + "+07:00";
}

// Tanggal hari ini (atau tanggal tertentu) versi WIB dalam bentuk
// { dd, mm, yyyy } — dipakai untuk membuat ID kunjungan.
function bagianTanggalWib(tanggal = new Date()) {
  const iso = keFormatIso(tanggal); // "YYYY-MM-DDT..."
  return {
    yyyy: iso.slice(0, 4),
    mm: iso.slice(5, 7),
    dd: iso.slice(8, 10),
  };
}

module.exports = { formatTampilan, keFormatIso, bagianTanggalWib, ZONA_WAKTU };
