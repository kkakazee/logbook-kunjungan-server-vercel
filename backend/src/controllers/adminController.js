// controllers/adminController.js
const bcrypt = require("bcryptjs");
const AdminModel = require("../models/adminModel");
const { buatToken } = require("../middleware/autentikasi");
const { setCookieSesi, hapusCookieSesi } = require("../utils/cookie");
const { tambahHitungan, resetHitungan } = require("../utils/rateLimit");
const { ipKlien } = require("../middleware/keamanan");
const { teks, idAdminValid, usernameValid, cekPassword } = require("../utils/validasi");

const BCRYPT_COST = 12;
// Hash palsu untuk menyamakan waktu respons saat username tidak ada,
// supaya penyerang tidak bisa menebak username lewat selisih waktu.
// Dibuat saat pertama dibutuhkan agar tidak memperlambat cold start.
let hashPalsu = null;
async function ambilHashPalsu() {
  if (!hashPalsu) hashPalsu = await bcrypt.hash("hash-palsu-penyama-waktu", BCRYPT_COST);
  return hashPalsu;
}

const MAKS_GAGAL_PER_USERNAME = 5;
const JENDELA_DETIK = 15 * 60;

function dataPublik(admin) {
  return {
    id: admin.id_admin,
    username: admin.username,
    namaPetugas: admin.nama_petugas,
    role: admin.role,
  };
}

// POST /api/admin/login
async function login(req, res, next) {
  try {
    const username = teks(req.body?.username, 50);
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!username || !password || password.length > 200) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }

    // Kunci akun sementara setelah beberapa kali gagal (per username),
    // di samping rate limit per IP yang dipasang di route.
    const kunciGagal = `login-gagal:${username.toLowerCase()}`;
    const { jumlah, sisaDetik } = await tambahHitungan(kunciGagal, JENDELA_DETIK);
    if (jumlah > MAKS_GAGAL_PER_USERNAME) {
      res.set("Retry-After", String(sisaDetik));
      return res.status(429).json({
        error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(sisaDetik / 60)} menit.`,
      });
    }

    const admin = await AdminModel.cariByUsername(username);
    const cocok = await bcrypt.compare(password, admin ? admin.password : await ambilHashPalsu());

    if (!admin || !cocok) {
      console.warn(`[login gagal] username="${username}" ip=${ipKlien(req)}`);
      return res.status(401).json({ error: "Username atau password salah." });
    }

    await resetHitungan(kunciGagal);

    setCookieSesi(res, buatToken(admin));
    res.json({ admin: dataPublik(admin) });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/logout
function logout(req, res) {
  hapusCookieSesi(res);
  res.json({ message: "Berhasil logout." });
}

// POST /api/admin/tambah — tambah akun admin petugas (HANYA admin utama)
async function tambahAdmin(req, res, next) {
  try {
    const username = teks(req.body?.username, 50);
    const namaPetugas = teks(req.body?.namaPetugas, 100);
    const password = req.body?.password;

    if (!usernameValid(username)) {
      return res.status(400).json({
        error: "Username 3–50 karakter, hanya huruf, angka, titik, minus, atau garis bawah.",
      });
    }
    const errPw = cekPassword(password);
    if (errPw) return res.status(400).json({ error: errPw });
    if (!namaPetugas || namaPetugas.length > 100) {
      return res.status(400).json({ error: "Nama petugas wajib diisi (maks 100 karakter)." });
    }

    if (await AdminModel.cariByUsername(username)) {
      return res.status(409).json({ error: "Username sudah dipakai, pilih username lain." });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const admin = await AdminModel.buat({ username, passwordHash, namaPetugas });

    res.status(201).json(admin);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Username sudah dipakai, pilih username lain." });
    }
    next(err);
  }
}

// GET /api/admin/semua — daftar admin (HANYA admin utama)
async function ambilSemuaAdmin(req, res, next) {
  try {
    res.json(await AdminModel.cariSemuaAdmin());
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/:id — hapus admin petugas (HANYA admin utama)
async function hapusAdmin(req, res, next) {
  try {
    const { id } = req.params;
    if (!idAdminValid(id)) {
      return res.status(404).json({ error: "Admin tidak ditemukan." });
    }

    const target = await AdminModel.cariById(id);
    if (!target) return res.status(404).json({ error: "Admin tidak ditemukan." });
    if (target.role === "utama") {
      return res.status(403).json({ error: "Admin utama tidak dapat dihapus." });
    }

    if (!(await AdminModel.hapusPetugas(id))) {
      return res.status(404).json({ error: "Admin tidak ditemukan." });
    }
    res.json({ message: "Akses admin berhasil dihapus." });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/ganti-password — ganti password sendiri
async function gantiPassword(req, res, next) {
  try {
    const { passwordLama, passwordBaru } = req.body || {};

    const errPw = cekPassword(passwordBaru);
    if (errPw) return res.status(400).json({ error: errPw.replace("Password", "Password baru") });

    const admin = await AdminModel.cariById(req.admin.id);
    if (!admin) return res.status(404).json({ error: "Akun tidak ditemukan." });

    const cocok =
      typeof passwordLama === "string" && (await bcrypt.compare(passwordLama, admin.password));
    if (!cocok) return res.status(400).json({ error: "Password lama salah." });

    if (passwordLama === passwordBaru) {
      return res.status(400).json({ error: "Password baru harus berbeda dari password lama." });
    }

    await AdminModel.updatePassword(admin.id_admin, await bcrypt.hash(passwordBaru, BCRYPT_COST));

    // Semua sesi lama otomatis batal (sesi_versi naik). Terbitkan sesi baru
    // untuk perangkat ini supaya admin tidak langsung ter-logout.
    const adminBaru = await AdminModel.cariById(admin.id_admin);
    setCookieSesi(res, buatToken(adminBaru));

    res.json({ message: "Password berhasil diganti. Sesi di perangkat lain telah dikeluarkan." });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/saya — verifikasi sesi + data admin terbaru
function ambilSaya(req, res) {
  res.json(req.admin);
}

module.exports = {
  login,
  logout,
  tambahAdmin,
  ambilSemuaAdmin,
  hapusAdmin,
  gantiPassword,
  ambilSaya,
};
