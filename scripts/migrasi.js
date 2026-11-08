// scripts/migrasi.js
// Menyiapkan / memperbarui struktur database TANPA menghapus data.
//   npm run db:migrasi
// Aman dijalankan berulang kali (idempoten).

const fs = require("fs");
const path = require("path");
const pool = require("../backend/src/database");

async function kolomAda(tabel, kolom) {
  const [b] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tabel, kolom]
  );
  return b.length > 0;
}

async function indeksAda(tabel, indeks) {
  const [b] = await pool.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tabel, indeks]
  );
  return b.length > 0;
}

async function main() {
  const sql = fs
    .readFileSync(path.join(__dirname, "../database/skema.sql"), "utf8")
    .split("\n")
    .filter((baris) => !baris.trim().startsWith("--"))
    .join("\n");

  const perintah = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("CREATE TABLE"));

  for (const p of perintah) {
    const nama = p.match(/`(\w+)`/)[1];
    await pool.query(p);
    console.log(`✓ tabel ${nama}`);
  }

  // ----- Perubahan untuk database versi lama -----
  if (!(await kolomAda("admin", "sesi_versi"))) {
    await pool.query(`ALTER TABLE admin ADD COLUMN sesi_versi INT NOT NULL DEFAULT 0`);
    console.log("✓ kolom admin.sesi_versi ditambahkan");
  }
  if (!(await kolomAda("pengunjung", "kode_akses_hash"))) {
    await pool.query(
      `ALTER TABLE pengunjung ADD COLUMN kode_akses_hash CHAR(64) NULL DEFAULT NULL`
    );
    console.log("✓ kolom pengunjung.kode_akses_hash ditambahkan");
  }
  if (!(await indeksAda("pengunjung", "idx_waktu_masuk"))) {
    await pool.query(`ALTER TABLE pengunjung ADD KEY idx_waktu_masuk (waktu_masuk)`);
    console.log("✓ indeks pengunjung.idx_waktu_masuk ditambahkan");
  }

  const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM admin WHERE role = 'utama'`);
  console.log(`\nMigrasi selesai. Jumlah admin utama: ${n}`);
  if (n === 0) {
    console.log('Buat admin utama dengan: npm run admin:buat -- <username> "<Nama Lengkap>" --utama');
  }
}

main()
  .catch((err) => {
    console.error("Migrasi gagal:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
