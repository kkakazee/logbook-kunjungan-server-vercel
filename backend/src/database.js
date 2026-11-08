// database.js — pool koneksi MySQL (Aiven).
//
// Di Vercel setiap instance function memakai pool sendiri, jadi jumlah
// koneksi dibatasi kecil supaya tidak menghabiskan kuota koneksi Aiven
// (paket gratis hanya mengizinkan sedikit koneksi bersamaan).

const mysql = require("mysql2/promise");
const config = require("./config");

const ssl = config.db.caCert
  ? { ca: config.db.caCert, rejectUnauthorized: true }
  : { rejectUnauthorized: false };

if (!config.db.caCert) {
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
