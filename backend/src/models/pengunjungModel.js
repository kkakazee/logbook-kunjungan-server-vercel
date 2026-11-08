// models/pengunjungModel.js
// Layer Model (huruf M di MVC): semua query SQL mentah ke tabel
// pengunjung/pengunjung_nama ada DI SINI SAJA. Controller tidak menulis SQL
// sama sekali — cukup panggil fungsi-fungsi di file ini.

const pool = require("../database");
const { buatIdKunjungan } = require("../utils/buatIdKunjungan");
const { formatTampilan, keFormatIso } = require("../utils/formatTanggal");
const { hashKode } = require("../utils/kodeAkses");

const QUERY_DASAR = `
  SELECT
    p.id_pengunjung AS id,
    p.unit_kerja_instansi AS unitKerja,
    p.keperluan AS keperluan,
    p.status AS status,
    p.waktu_masuk AS waktuMasukMentah,
    p.waktu_keluar AS waktuKeluarMentah,
    p.nama_petugas_verifikasi AS namaPetugasVerifikasi,
    p.alasan_ditolak AS alasanDitolak,
    GROUP_CONCAT(n.nama ORDER BY n.id_nama SEPARATOR '||') AS namaMentah
  FROM pengunjung p
  LEFT JOIN pengunjung_nama n ON n.id_pengunjung = p.id_pengunjung
`;

function petakanBaris(baris) {
  return {
    id: baris.id,
    namaTamu: baris.namaMentah
      ? baris.namaMentah.split("||")
      : [],
    unitKerja: baris.unitKerja,
    keperluan: baris.keperluan,
    status: baris.status,

    // Nama petugas yang melakukan verifikasi
    namaPetugasVerifikasi: baris.namaPetugasVerifikasi || null,

    // Alasan penolakan, NULL jika tidak ada alasan
    alasanDitolak: baris.alasanDitolak || null,

    waktuMasukIso: keFormatIso(baris.waktuMasukMentah),
    waktuMasuk: formatTampilan(baris.waktuMasukMentah),

    waktuKeluarIso: keFormatIso(baris.waktuKeluarMentah),
    waktuKeluar: formatTampilan(baris.waktuKeluarMentah),
  };
}

async function cariById(id) {
  const [baris] = await pool.query(
    `${QUERY_DASAR}
     WHERE p.id_pengunjung = ?
     GROUP BY p.id_pengunjung`,
    [id]
  );

  if (baris.length === 0) {
    return null;
  }

  return petakanBaris(baris[0]);
}

async function ambilSemua() {
  const [baris] = await pool.query(
    `${QUERY_DASAR}
     GROUP BY p.id_pengunjung
     ORDER BY p.waktu_masuk DESC`
  );

  return baris.map(petakanBaris);
}

async function buat({ namaTamu, unitKerja, keperluan, kodeAkses }) {
  const id = await buatIdKunjungan(pool);

  const koneksi = await pool.getConnection();

  try {
    await koneksi.beginTransaction();

    await koneksi.query(
      `INSERT INTO pengunjung
       (
         id_pengunjung,
         unit_kerja_instansi,
         keperluan,
         status,
         waktu_masuk,
         kode_akses_hash
       )
       VALUES (?, ?, ?, 'Menunggu Persetujuan', UTC_TIMESTAMP(), ?)`,
      [id, unitKerja, keperluan, hashKode(kodeAkses)]
    );

    // Satu query untuk semua nama (lebih cepat daripada INSERT satu per satu)
    await koneksi.query(
      `INSERT INTO pengunjung_nama (id_pengunjung, nama) VALUES ?`,
      [namaTamu.map((nama) => [id, nama])]
    );

    await koneksi.commit();
  } catch (err) {
    await koneksi.rollback();
    throw err;
  } finally {
    koneksi.release();
  }

  return cariById(id);
}



// Mengubah status sekaligus menyimpan nama petugas yang memverifikasi.
// Hanya berlaku untuk kunjungan yang masih "Menunggu Persetujuan", supaya
// kunjungan yang sudah selesai/ditolak tidak bisa diubah ulang.
async function ubahStatus(id, status, namaPetugas, alasanDitolak = null) {
  const [hasil] = await pool.query(
    `UPDATE pengunjung
     SET
       status = ?,
       nama_petugas_verifikasi = ?,
       alasan_ditolak = ?
     WHERE id_pengunjung = ? AND status = 'Menunggu Persetujuan'`,
    [status, namaPetugas, alasanDitolak, id]
  );

  return hasil.affectedRows > 0;
}

async function ambilStatus(id) {
  const [baris] = await pool.query(
    `SELECT status
     FROM pengunjung
     WHERE id_pengunjung = ?`,
    [id]
  );

  return baris.length ? baris[0].status : null;
}

async function catatKeluar(id) {
  await pool.query(
    `UPDATE pengunjung
     SET
       status = 'Kunjungan Selesai',
       waktu_keluar = UTC_TIMESTAMP()
     WHERE id_pengunjung = ? AND status = 'Diterima'`,
    [id]
  );
}

async function ambilHashKode(id) {
  const [baris] = await pool.query(
    `SELECT kode_akses_hash FROM pengunjung WHERE id_pengunjung = ?`,
    [id]
  );
  return baris.length ? baris[0].kode_akses_hash : null;
}

// Penanda ringan untuk mendeteksi perubahan data (dipakai polling admin
// sebagai pengganti Socket.IO yang tidak didukung Vercel).
async function ambilVersi() {
  const [baris] = await pool.query(
    `SELECT COUNT(*) AS n,
            COALESCE(SUM(CRC32(CONCAT_WS('|', id_pengunjung, status,
                     IFNULL(waktu_keluar, '')))), 0) AS h
     FROM pengunjung`
  );
  return `${baris[0].n}-${baris[0].h}`;
}

module.exports = {
  cariById,
  ambilHashKode,
  ambilVersi,
  ambilSemua,
  buat,
  ubahStatus,
  ambilStatus,
  catatKeluar,
};
