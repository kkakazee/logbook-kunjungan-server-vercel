// scripts/impor-backup.js
// Mengimpor file backup .sql (hasil `npm run db:backup` atau backup Aiven)
// ke database yang ada di .env, lalu menjalankan migrasi.
//
//   npm run db:impor -- "D:\backup-database\backup-2026-11-08T02-45-45.sql"
//
// Demi keamanan, impor DITOLAK jika database tujuan sudah berisi data
// kunjungan — tambahkan --timpa untuk tetap menimpa (data lama hilang).

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const mysql = require("mysql2/promise");
const config = require("../backend/src/config");

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const timpa = args.includes("--timpa");

  if (!file || !fs.existsSync(file)) {
    console.log('Pemakaian: npm run db:impor -- "<path file backup .sql>" [--timpa]');
    process.exitCode = 1;
    return;
  }

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    ssl: config.db.ssl
      ? config.db.caCert
        ? { ca: config.db.caCert, rejectUnauthorized: true }
        : { rejectUnauthorized: false }
      : undefined,
    multipleStatements: true,
    timezone: "Z",
  });

  try {
    const [ada] = await conn.query(
      `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengunjung'`
    );
    if (ada.length) {
      const [[{ n }]] = await conn.query("SELECT COUNT(*) n FROM pengunjung");
      if (n > 0 && !timpa) {
        throw new Error(
          `Database tujuan sudah berisi ${n} kunjungan. Impor dibatalkan agar data tidak tertimpa. ` +
            "Tambahkan --timpa jika memang ingin menimpa."
        );
      }
    }

    console.log(`Mengimpor ${path.basename(file)} ke ${config.db.database}@${config.db.host} ...`);
    await conn.query(fs.readFileSync(file, "utf8"));

    for (const t of ["admin", "pengunjung", "pengunjung_nama", "nomor_kunjungan"]) {
      const [[{ n }]] = await conn.query(`SELECT COUNT(*) n FROM \`${t}\``);
      console.log(`  ${t}: ${n} baris`);
    }
  } finally {
    await conn.end();
  }

  console.log("\nMenjalankan migrasi (menambah kolom/tabel baru bila belum ada)...");
  execFileSync(process.execPath, [path.join(__dirname, "migrasi.js")], { stdio: "inherit" });
}

main().catch((err) => {
  console.error("Impor gagal:", err.message);
  process.exitCode = 1;
});
