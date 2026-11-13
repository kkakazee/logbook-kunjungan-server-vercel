// scripts/backup.js
// Backup seluruh tabel database ke file .sql (bisa diimpor ulang) dan .json.
//   npm run db:backup                 → simpan ke folder ./backup
//   npm run db:backup -- D:\Backup    → simpan ke folder lain
// Hanya MEMBACA database.
//
// Rotasi backup bertingkat (agar tidak menumpuk tapi tetap bisa mundur jauh):
//   - 7 backup harian terakhir           (BACKUP_HARIAN, default 7)
//   - 1 per minggu untuk 4 minggu         (BACKUP_MINGGUAN, default 4)
//   - 1 per bulan untuk 12 bulan          (BACKUP_BULANAN, default 12)
// Total maksimal ±23 backup (.sql + .json). Yang lain dihapus otomatis.

const fs = require("fs");
const path = require("path");
const pool = require("../backend/src/database");

function angkaEnv(nama, bawaan) {
  const n = parseInt(process.env[nama], 10);
  return Number.isInteger(n) && n >= 0 ? n : bawaan;
}

const SIMPAN_HARIAN = angkaEnv("BACKUP_HARIAN", 7);
const SIMPAN_MINGGUAN = angkaEnv("BACKUP_MINGGUAN", 4);
const SIMPAN_BULANAN = angkaEnv("BACKUP_BULANAN", 12);
const OUT = path.resolve(process.argv[2] || path.join(__dirname, "../backup"));

// Tanggal WIB "YYYY-MM-DD" dari stempel nama file (stempel ditulis dalam UTC)
function tanggalWib(stamp) {
  const [tgl, jam] = stamp.split("T");
  const utc = new Date(`${tgl}T${jam.slice(0, 8).replace(/-/g, ":")}Z`);
  return new Date(utc.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

// Kunci minggu: tanggal hari Senin di minggu tersebut
function kunciMinggu(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`);
  const mundur = (d.getUTCDay() + 6) % 7; // Senin = 0
  return new Date(d.getTime() - mundur * 86400000).toISOString().slice(0, 10);
}

// Menentukan stempel backup mana yang disimpan. `stempel` sudah urut terbaru dulu.
// Untuk tiap tingkat: ambil backup TERBARU dari tiap hari/minggu/bulan,
// sebanyak N hari/minggu/bulan terakhir.
function pilihYangDisimpan(stempel, { harian, mingguan, bulanan }) {
  const simpan = new Set();
  const tingkat = [
    [harian, (ymd) => ymd],
    [mingguan, kunciMinggu],
    [bulanan, (ymd) => ymd.slice(0, 7)],
  ];
  for (const [jumlah, kunci] of tingkat) {
    const sudah = new Set();
    for (const s of stempel) {
      if (sudah.size >= jumlah) break;
      const k = kunci(tanggalWib(s));
      if (!sudah.has(k)) {
        sudah.add(k);
        simpan.add(s);
      }
    }
  }
  return simpan;
}

function literal(v) {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
  if (typeof v === "number") return String(v);
  return pool.escape(String(v));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const conn = await pool.getConnection();
  try {
    // Beberapa layanan (mis. Aiven) memakai sql_mode ANSI → nama tabel ditulis
    // dengan "kutip ganda". Kosongkan untuk sesi ini agar file .sql portabel.
    await conn.query("SET SESSION sql_mode = ''");

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const [tabel] = await conn.query(
      `SELECT TABLE_NAME t FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`
    );

    const json = {};
    let sql =
      `-- Backup Logbook Jarkom ${stamp} (UTC)\n` +
      `SET NAMES utf8mb4;\nSET time_zone = '+00:00';\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const { t } of tabel) {
      const [[buat]] = await conn.query(`SHOW CREATE TABLE \`${t}\``);
      const [baris] = await conn.query(`SELECT * FROM \`${t}\``);
      json[t] = baris;
      sql += `DROP TABLE IF EXISTS \`${t}\`;\n${buat["Create Table"]};\n`;
      if (baris.length) {
        const kolom = Object.keys(baris[0]).map((k) => `\`${k}\``).join(", ");
        for (const b of baris) {
          sql += `INSERT INTO \`${t}\` (${kolom}) VALUES (${Object.values(b).map(literal).join(", ")});\n`;
        }
      }
      sql += "\n";
      console.log(`  ${t}: ${baris.length} baris`);
    }
    sql += "SET FOREIGN_KEY_CHECKS = 1;\n";

    const dasar = path.join(OUT, `backup-${stamp}`);
    fs.writeFileSync(`${dasar}.sql`, sql);
    fs.writeFileSync(`${dasar}.json`, JSON.stringify(json, null, 2));
    console.log(`Backup tersimpan: ${dasar}.sql`);

    rotasi();
  } finally {
    conn.release();
  }
}

// Rotasi: hapus backup di luar jatah harian/mingguan/bulanan
function rotasi() {
  const POLA = /^backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.(sql|json)$/;
  const file = fs.readdirSync(OUT).filter((f) => POLA.test(f));
  const stempel = [...new Set(file.map((f) => f.match(POLA)[1]))].sort().reverse();
  const simpan = pilihYangDisimpan(stempel, {
    harian: SIMPAN_HARIAN,
    mingguan: SIMPAN_MINGGUAN,
    bulanan: SIMPAN_BULANAN,
  });
  const hapus = file.filter((f) => !simpan.has(f.match(POLA)[1]));
  for (const f of hapus) fs.unlinkSync(path.join(OUT, f));
  console.log(
    `Rotasi: ${simpan.size} backup disimpan` +
      (hapus.length ? `, ${hapus.length} file lama dihapus.` : ".")
  );
}

if (require.main !== module) {
  // Dipakai oleh pengujian: require("./backup.js") tidak menjalankan backup
  module.exports = { pilihYangDisimpan, tanggalWib, kunciMinggu };
  return;
}

main()
  .catch((err) => {
    console.error("Backup gagal:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
