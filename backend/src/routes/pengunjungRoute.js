// routes/pengunjungRoute.js
const express = require("express");
const c = require("../controllers/pengunjungController");
const { verifikasiToken, tolakUtama } = require("../middleware/autentikasi");
const { batasiRate } = require("../middleware/keamanan");

const router = express.Router();

// ----- Wajib login (admin/petugas) -----
// Didaftarkan sebelum "/:id" supaya "/versi" tidak dianggap sebagai id.
router.get("/", verifikasiToken, c.ambilSemuaKunjungan);
router.get("/versi", verifikasiToken, c.ambilVersiData);
router.patch("/:id/status", verifikasiToken, tolakUtama, c.ubahStatusKunjungan);
// Cadangan bila tamu kehilangan kode akses (ganti HP/browser, data terhapus)
router.post("/:id/keluar-petugas", verifikasiToken, tolakUtama, c.catatKeluarOlehPetugas);

// ----- Publik (tamu) — dibatasi per IP -----
router.post(
  "/",
  batasiRate({ nama: "kunjungan-baru", maks: 30, detik: 10 * 60 }),
  c.tambahKunjungan
);
// Batas longgar: halaman status melakukan polling, dan tamu di kantor
// biasanya berbagi satu IP WiFi yang sama.
router.post(
  "/:id/cek",
  batasiRate({ nama: "cek-status", maks: 300, detik: 5 * 60 }),
  c.ambilKunjungan
);
router.post(
  "/:id/keluar",
  batasiRate({ nama: "keluar", maks: 30, detik: 10 * 60 }),
  c.catatKunjunganKeluar
);

module.exports = router;
