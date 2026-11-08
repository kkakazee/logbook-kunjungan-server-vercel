// database.js — pool koneksi MySQL (Aiven).
//
// Di Vercel setiap instance function memakai pool sendiri, jadi jumlah
// koneksi dibatasi kecil supaya tidak menghabiskan kuota koneksi Aiven
// (paket gratis hanya mengizinkan sedikit koneksi bersamaan).

const mysql = require("mysql2/promise");
const config = require("./config");

let ssl;
if (!config.db.ssl) {
  ssl = undefined; // MySQL lokal (127.0.0.1) — lalu lintas tidak keluar dari PC
} else if (config.db.caCert) {
  ssl = { ca: config.db.caCert, rejectUnauthorized: true };
} else {
  ssl = { rejectUnauthorized: false };
}

if (config.db.ssl && !config.db.caCert) {
  console.warn(
    "[PERINGATAN] DB_CA_CERT belum diisi — koneksi ke database terenkripsi " +
      "tetapi sertifikat server TIDAK diverifikasi (rawan MITM). " +
      "Isi DB_CA_CERT dengan CA certificate dari Aiven."
  );
}

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  ssl,
  // Kolom DATETIME disimpan & dibaca sebagai UTC. Konversi ke WIB dilakukan
  // di utils/formatTanggal.js
  timezone: "Z",
  connectionLimit: config.produksi ? 3 : 10,
  maxIdle: 1,
  idleTimeout: 30000,
  enableKeepAlive: true,
  connectTimeout: 10000,
});

// Default GROUP_CONCAT MySQL hanya 1024 karakter — terlalu pendek untuk
// rombongan besar (nama tamu digabung dengan GROUP_CONCAT).
pool.pool.on("connection", (koneksi) => {
  koneksi.query("SET SESSION group_concat_max_len = 65535");
});

module.exports = pool;
