// utils/rateLimit.js
// Penghitung percobaan per kunci (misal "login-ip:1.2.3.4") yang disimpan
// di tabel `rate_limit`. Jendela waktu tetap (fixed window).

const pool = require("../database");

async function tambahHitungan(kunci, detik) {
  const k = String(kunci).slice(0, 191);

  await pool.query(
    `INSERT INTO rate_limit (kunci, jumlah, reset_pada)
     VALUES (?, 1, UTC_TIMESTAMP() + INTERVAL ? SECOND)
     ON DUPLICATE KEY UPDATE
       jumlah     = IF(reset_pada <= UTC_TIMESTAMP(), 1, jumlah + 1),
       reset_pada = IF(reset_pada <= UTC_TIMESTAMP(),
                       UTC_TIMESTAMP() + INTERVAL ? SECOND, reset_pada)`,
    [k, detik, detik]
  );

  const [baris] = await pool.query(
    `SELECT jumlah, GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), reset_pada), 1) AS sisa
     FROM rate_limit WHERE kunci = ?`,
    [k]
  );

  // Bersih-bersih baris kedaluwarsa sesekali (±1% request)
  if (Math.random() < 0.01) {
    pool
      .query(`DELETE FROM rate_limit WHERE reset_pada < UTC_TIMESTAMP() - INTERVAL 1 DAY`)
      .catch(() => {});
  }

  return { jumlah: baris[0]?.jumlah ?? 1, sisaDetik: baris[0]?.sisa ?? detik };
}

async function resetHitungan(kunci) {
  await pool.query(`DELETE FROM rate_limit WHERE kunci = ?`, [String(kunci).slice(0, 191)]);
}

module.exports = { tambahHitungan, resetHitungan };
