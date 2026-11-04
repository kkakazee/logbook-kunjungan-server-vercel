const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  // Kolom DATETIME disimpan & dibaca sebagai UTC, tidak bergantung pada
  // timezone server Node. Konversi ke WIB dilakukan di utils/formatTanggal.js
  timezone: 'Z',
  ssl: {
    rejectUnauthorized: false // <--- BAGIAN INI WAJIB ADA UNTUK AIVEN
  }
});

module.exports = pool;