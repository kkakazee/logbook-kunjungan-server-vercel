// models/adminModel.js — semua query tabel `admin`.
const pool = require("../database");

const KOLOM = "id_admin, username, password, nama_petugas, role, sesi_versi";

async function cariByUsername(username) {
  const [baris] = await pool.query(`SELECT ${KOLOM} FROM admin WHERE username = ?`, [username]);
  return baris[0] || null;
}

async function cariById(id) {
  const [baris] = await pool.query(`SELECT ${KOLOM} FROM admin WHERE id_admin = ?`, [id]);
  return baris[0] || null;
}

// Ganti password sekaligus menaikkan sesi_versi → semua token lama batal.
async function updatePassword(id, passwordHashBaru) {
  const [hasil] = await pool.query(
    `UPDATE admin SET password = ?, sesi_versi = sesi_versi + 1 WHERE id_admin = ?`,
    [passwordHashBaru, id]
  );
  return hasil.affectedRows > 0;
}

// Cari id_admin 3 digit terkecil yang belum dipakai — kalau 002 pernah
// dihapus, admin baru berikutnya akan dapat "002" lagi.
async function cariIdBerikutnya() {
  const [baris] = await pool.query(`SELECT id_admin FROM admin ORDER BY id_admin ASC`);
  const idTerpakai = new Set(baris.map((b) => b.id_admin));
  let n = 1;
  while (idTerpakai.has(String(n).padStart(3, "0"))) n++;
  if (n > 999) throw new Error("Slot id_admin sudah penuh (maks 999).");
  return String(n).padStart(3, "0");
}

// Admin baru dibuat oleh admin utama (role "petugas") atau lewat script
// scripts/buat-admin.js (bisa role "utama").
async function buat({ username, passwordHash, namaPetugas, role = "petugas" }) {
  for (let percobaan = 0; percobaan < 5; percobaan++) {
    const id = await cariIdBerikutnya();
    try {
      await pool.query(
        `INSERT INTO admin (id_admin, username, password, nama_petugas, role)
         VALUES (?, ?, ?, ?, ?)`,
        [id, username, passwordHash, namaPetugas, role]
      );
      return { id, username, namaPetugas, role };
    } catch (err) {
      // Bentrok id (dibuat bersamaan) → coba id berikutnya.
      // Bentrok username → lempar ke pemanggil.
      if (err.code === "ER_DUP_ENTRY" && !String(err.message).includes("username")) continue;
      throw err;
    }
  }
  throw new Error("Gagal generate id_admin, coba lagi.");
}

async function cariSemuaAdmin() {
  const [baris] = await pool.query(
    `SELECT id_admin, username, nama_petugas, role FROM admin ORDER BY id_admin ASC`
  );
  return baris;
}

// Hanya menghapus admin petugas — admin utama tidak bisa terhapus walau
// ada bug di controller.
async function hapusPetugas(id) {
  const [hasil] = await pool.query(
    `DELETE FROM admin WHERE id_admin = ? AND role <> 'utama'`,
    [id]
  );
  return hasil.affectedRows > 0;
}

module.exports = {
  cariByUsername,
  cariById,
  buat,
  updatePassword,
  cariSemuaAdmin,
  hapusPetugas,
};
