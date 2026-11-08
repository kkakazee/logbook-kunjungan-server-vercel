-- =========================================================
-- Skema database Logbook Kunjungan Jarkom (MySQL 8 / Aiven)
--
-- Cara paling mudah: jalankan `npm run db:migrasi` — script itu membuat
-- tabel yang belum ada dan menambahkan kolom baru pada database lama,
-- tanpa menghapus data. File ini disediakan sebagai referensi / untuk
-- import manual ke database KOSONG.
--
-- Admin utama pertama dibuat dengan `npm run admin:buat` (bukan lewat
-- INSERT manual dengan hash yang tersimpan di repo).
-- =========================================================

SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- ---------------------------------------------------------
-- admin
--   id_admin   : 3 digit ("001"), di-generate backend, slot kosong dipakai ulang
--   role       : 'utama'  → kelola akun admin, hanya melihat kunjungan
--                'petugas'→ menerima/menolak kunjungan
--   sesi_versi : naik setiap ganti password → semua sesi lama batal
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin` (
  `id_admin`     VARCHAR(3)   NOT NULL,
  `username`     VARCHAR(50)  NOT NULL,
  `password`     VARCHAR(255) NOT NULL,             -- hash bcrypt
  `nama_petugas` VARCHAR(255) NOT NULL,
  `role`         VARCHAR(20)  NOT NULL DEFAULT 'petugas',
  `sesi_versi`   INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_admin`),
  UNIQUE KEY `uq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- pengunjung — satu baris = satu kunjungan (bisa rombongan)
--   kode_akses_hash : SHA-256 dari kode akses tamu (6 karakter)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pengunjung` (
  `id_pengunjung`           VARCHAR(13)  NOT NULL,  -- contoh: 09022026-001
  `unit_kerja_instansi`     VARCHAR(255) NOT NULL,
  `keperluan`               TEXT         NOT NULL,
  `status`                  VARCHAR(30)  NOT NULL DEFAULT 'Menunggu Persetujuan',
  `nama_petugas_verifikasi` VARCHAR(255) NULL DEFAULT NULL,
  `waktu_masuk`             DATETIME     NOT NULL,
  `waktu_keluar`            DATETIME     NULL DEFAULT NULL,
  `alasan_ditolak`          TEXT         NULL,
  `kode_akses_hash`         CHAR(64)     NULL DEFAULT NULL,
  PRIMARY KEY (`id_pengunjung`),
  KEY `idx_waktu_masuk` (`waktu_masuk`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- pengunjung_nama — nama-nama tamu dalam satu kunjungan
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pengunjung_nama` (
  `id_nama`       INT          NOT NULL AUTO_INCREMENT,
  `id_pengunjung` VARCHAR(13)  NOT NULL,
  `nama`          VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id_nama`),
  KEY `idx_id_pengunjung` (`id_pengunjung`),
  CONSTRAINT `fk_pengunjung_nama_pengunjung`
    FOREIGN KEY (`id_pengunjung`) REFERENCES `pengunjung` (`id_pengunjung`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- nomor_kunjungan — nomor urut per tanggal (DDMMYYYY)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `nomor_kunjungan` (
  `tanggal` VARCHAR(8) NOT NULL,
  `nomor`   INT        NOT NULL DEFAULT 0,
  PRIMARY KEY (`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- rate_limit — penghitung percobaan (login, form tamu) lintas instance
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rate_limit` (
  `kunci`      VARCHAR(191) NOT NULL,
  `jumlah`     INT          NOT NULL DEFAULT 0,
  `reset_pada` DATETIME     NOT NULL,
  PRIMARY KEY (`kunci`),
  KEY `idx_reset_pada` (`reset_pada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
