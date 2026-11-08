// middleware/autentikasi.js
// Melindungi endpoint yang hanya boleh diakses admin yang sudah login.
//
// Token JWT dibaca dari cookie httpOnly. Isi token hanya {id, sv}; data
// admin (nama, role) SELALU diambil ulang dari database setiap request,
// sehingga:
//   - admin yang sudah dihapus langsung kehilangan akses,
//   - perubahan role langsung berlaku,
//   - setelah ganti password, semua sesi lama otomatis tidak berlaku
//     (kolom sesi_versi dinaikkan).

const jwt = require("jsonwebtoken");
const config = require("../config");
const AdminModel = require("../models/adminModel");
const { bacaCookie, hapusCookieSesi } = require("../utils/cookie");

function buatToken(admin) {
  return jwt.sign({ sv: admin.sesi_versi }, config.jwtSecret, {
    algorithm: "HS256",
    subject: admin.id_admin,
    expiresIn: `${config.sesiJam}h`,
  });
}

async function verifikasiToken(req, res, next) {
  const token = bacaCookie(req);
  if (!token) {
    return res.status(401).json({ error: "Anda harus login terlebih dahulu." });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
  } catch {
    hapusCookieSesi(res);
    return res.status(401).json({ error: "Sesi habis atau tidak valid, silakan login lagi." });
  }

  try {
    const admin = await AdminModel.cariById(payload.sub);
    if (!admin || admin.sesi_versi !== payload.sv) {
      hapusCookieSesi(res);
      return res.status(401).json({ error: "Sesi tidak berlaku lagi, silakan login ulang." });
    }
    req.admin = {
      id: admin.id_admin,
      username: admin.username,
      namaPetugas: admin.nama_petugas,
      role: admin.role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

function hanyaUtama(req, res, next) {
  if (req.admin?.role !== "utama") {
    return res.status(403).json({ error: "Hanya admin utama yang berwenang untuk ini." });
  }
  next();
}

function tolakUtama(req, res, next) {
  if (req.admin?.role === "utama") {
    return res
      .status(403)
      .json({ error: "Admin utama tidak berwenang memverifikasi kunjungan tamu." });
  }
  next();
}

module.exports = { buatToken, verifikasiToken, hanyaUtama, tolakUtama };
