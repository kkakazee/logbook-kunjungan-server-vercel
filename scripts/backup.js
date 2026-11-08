// scripts/backup.js
// Backup seluruh tabel database ke file .sql (bisa diimpor ulang) dan .json.
//   npm run db:backup                 → simpan ke folder ./backup
//   npm run db:backup -- D:\Backup    → simpan ke folder lain
// Hanya MEMBACA database. Menyimpan 30 backup terakhir, yang lebih lama dihapus.

const fs = require("fs");
const path = require("path");
const pool = require("../backend/src/database");

const SIMPAN_MAKS = 30;
const OUT = path.resolve(process.argv[2] || path.join(__dirname, "../backup"));

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

    // Rotasi: hapus backup lama, simpan SIMPAN_MAKS terakhir
    const lama = fs
      .readdirSync(OUT)
      .filter((f) => /^backup-.*\.(sql|json)$/.test(f))
      .sort()
      .reverse()
      .slice(SIMPAN_MAKS * 2);
    for (const f of lama) fs.unlinkSync(path.join(OUT, f));
    if (lama.length) console.log(`Menghapus ${lama.length} file backup lama.`);
  } finally {
    conn.release();
  }
}

main()
  .catch((err) => {
    console.error("Backup gagal:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
