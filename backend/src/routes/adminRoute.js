// routes/adminRoute.js
const express = require("express");
const adminController = require("../controllers/adminController");
const { verifikasiToken, hanyaUtama } = require("../middleware/autentikasi");
const { batasiRate } = require("../middleware/keamanan");

const router = express.Router();

// Publik — dibatasi 20 percobaan / 15 menit per IP
router.post(
  "/login",
  batasiRate({ nama: "login-ip", maks: 20, detik: 15 * 60 }),
  adminController.login
);
router.post("/logout", adminController.logout);

// Wajib login
router.get("/saya", verifikasiToken, adminController.ambilSaya);
router.patch(
  "/ganti-password",
  verifikasiToken,
  batasiRate({ nama: "ganti-pw", maks: 10, detik: 15 * 60, kunci: (req) => req.admin.id }),
  adminController.gantiPassword
);

// Wajib login sebagai Admin Utama
router.get("/semua", verifikasiToken, hanyaUtama, adminController.ambilSemuaAdmin);
router.post("/tambah", verifikasiToken, hanyaUtama, adminController.tambahAdmin);
router.delete("/:id", verifikasiToken, hanyaUtama, adminController.hapusAdmin);

module.exports = router;
