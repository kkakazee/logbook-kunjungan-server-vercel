// controllers/pengunjungController.js
// Terima request, validasi input, panggil Model, kirim response.
// Tidak ada query SQL di sini — semuanya di models/pengunjungModel.js.

const PengunjungModel = require("../models/pengunjungModel");
const { buatKodeAkses, kodeCocok } = require("../utils/kodeAkses");
const { periksaLokasi } = require("../utils/lokasi");
const { teks, idKunjunganValid } = require("../utils/validasi");

const MAKS_NAMA = 30;
const MAKS_PANJANG_NAMA = 100;
const MAKS_UNIT_KERJA = 150;
const MAKS_KEPERLUAN = 1000;
const MAKS_ALASAN = 500;

const TIDAK_DITEMUKAN = { error: "Nomor kunjungan atau kode akses tidak cocok." };

// Data yang boleh dilihat tamu pemilik kunjungan.
function untukTamu(k) {
  return {
    id: k.id,
    namaTamu: k.namaTamu,
    status: k.status,
    namaPetugasVerifikasi: k.namaPetugasVerifikasi,
    alasanDitolak: k.alasanDitolak,
    waktuMasuk: k.waktuMasuk,
    waktuKeluar: k.waktuKeluar,
  };
}

// Cek id + kode akses tamu. Mengembalikan kunjungan atau null.
// Pesan error sengaja sama untuk "id tidak ada" dan "kode salah" supaya
// nomor kunjungan tidak bisa dienumerasi.
async function ambilMilikTamu(req) {
  const { id } = req.params;
  const kode = req.body?.kodeAkses;
  if (!idKunjunganValid(id) || typeof kode !== "string") return null;

  const hash = await PengunjungModel.ambilHashKode(id);
  if (!kodeCocok(kode, hash)) return null;
  return PengunjungModel.cariById(id);
}

// POST /api/pengunjung — tamu mendaftar masuk
async function tambahKunjungan(req, res, next) {
  try {
    const body = req.body || {};

    const errLokasi = periksaLokasi(body.lokasi);
    if (errLokasi) return res.status(403).json({ error: errLokasi });

    if (!Array.isArray(body.namaTamu)) {
      return res.status(400).json({ error: "Isi minimal 1 nama tamu." });
    }
    const namaBersih = body.namaTamu
      .slice(0, MAKS_NAMA + 1)
      .map((n) => teks(n, MAKS_PANJANG_NAMA))
      .filter(Boolean);
    const unitKerja = teks(body.unitKerja, MAKS_UNIT_KERJA);
    const keperluan = teks(body.keperluan, MAKS_KEPERLUAN);

    if (namaBersih.length === 0) {
      return res.status(400).json({ error: "Isi minimal 1 nama tamu." });
    }
    if (namaBersih.length > MAKS_NAMA) {
      return res.status(400).json({ error: `Maksimal ${MAKS_NAMA} nama dalam satu kunjungan.` });
    }
    if (namaBersih.some((n) => n.length > MAKS_PANJANG_NAMA)) {
      return res.status(400).json({ error: `Nama maksimal ${MAKS_PANJANG_NAMA} karakter.` });
    }
    if (!unitKerja || unitKerja.length > MAKS_UNIT_KERJA) {
      return res
        .status(400)
        .json({ error: `Unit kerja/instansi wajib diisi (maks ${MAKS_UNIT_KERJA} karakter).` });
    }
    if (!keperluan || keperluan.length > MAKS_KEPERLUAN) {
      return res
        .status(400)
        .json({ error: `Keperluan wajib diisi (maks ${MAKS_KEPERLUAN} karakter).` });
    }

    const kodeAkses = buatKodeAkses();
    const kunjungan = await PengunjungModel.buat({
      namaTamu: namaBersih,
      unitKerja,
      keperluan,
      kodeAkses,
    });

    // kodeAkses HANYA dikirim sekali ini, ke pembuat kunjungan.
    res.status(201).json({ ...untukTamu(kunjungan), kodeAkses });
  } catch (err) {
    next(err);
  }
}

// GET /api/pengunjung — semua data (admin)
async function ambilSemuaKunjungan(req, res, next) {
  try {
    res.json(await PengunjungModel.ambilSemua());
  } catch (err) {
    next(err);
  }
}

// GET /api/pengunjung/versi — penanda perubahan data untuk polling (admin)
async function ambilVersiData(req, res, next) {
  try {
    res.json({ versi: await PengunjungModel.ambilVersi() });
  } catch (err) {
    next(err);
  }
}

// POST /api/pengunjung/:id/cek — tamu cek status (wajib kode akses)
async function ambilKunjungan(req, res, next) {
  try {
    const kunjungan = await ambilMilikTamu(req);
    if (!kunjungan) return res.status(404).json(TIDAK_DITEMUKAN);
    res.json(untukTamu(kunjungan));
  } catch (err) {
    next(err);
  }
}

// PATCH /api/pengunjung/:id/status — petugas menerima/menolak
async function ubahStatusKunjungan(req, res, next) {
  try {
    const { id } = req.params;
    const { status, alasanDitolak } = req.body || {};

    if (!idKunjunganValid(id)) {
      return res.status(404).json({ error: "Nomor kunjungan tidak ditemukan." });
    }
    if (!["Diterima", "Ditolak"].includes(status)) {
      return res.status(400).json({ error: "Status tidak valid." });
    }

    let alasan = null;
    if (status === "Ditolak" && alasanDitolak != null) {
      alasan = teks(alasanDitolak, MAKS_ALASAN) || null;
      if (alasan && alasan.length > MAKS_ALASAN) {
        return res.status(400).json({ error: `Alasan maksimal ${MAKS_ALASAN} karakter.` });
      }
    }

    const statusSaatIni = await PengunjungModel.ambilStatus(id);
    if (statusSaatIni === null) {
      return res.status(404).json({ error: "Nomor kunjungan tidak ditemukan." });
    }
    if (statusSaatIni !== "Menunggu Persetujuan") {
      return res
        .status(409)
        .json({ error: `Kunjungan ini sudah diproses (status: ${statusSaatIni}).` });
    }

    const berhasil = await PengunjungModel.ubahStatus(id, status, req.admin.namaPetugas, alasan);
    if (!berhasil) {
      return res.status(409).json({ error: "Kunjungan ini baru saja diproses petugas lain." });
    }

    res.json(await PengunjungModel.cariById(id));
  } catch (err) {
    next(err);
  }
}

// POST /api/pengunjung/:id/keluar — tamu konfirmasi keluar (wajib kode akses)
async function catatKunjunganKeluar(req, res, next) {
  try {
    const errLokasi = periksaLokasi(req.body?.lokasi);
    if (errLokasi) return res.status(403).json({ error: errLokasi });

    const kunjungan = await ambilMilikTamu(req);
    if (!kunjungan) return res.status(404).json(TIDAK_DITEMUKAN);

    if (kunjungan.status !== "Diterima") {
      return res
        .status(400)
        .json({ error: "Tamu belum memiliki akses masuk yang disetujui." });
    }

    await PengunjungModel.catatKeluar(kunjungan.id);
    res.json(untukTamu(await PengunjungModel.cariById(kunjungan.id)));
  } catch (err) {
    next(err);
  }
}

// POST /api/pengunjung/:id/keluar-petugas — petugas mencatat tamu keluar
// (dipakai jika tamu kehilangan kode akses / pindah browser).
async function catatKeluarOlehPetugas(req, res, next) {
  try {
    const { id } = req.params;
    if (!idKunjunganValid(id)) {
      return res.status(404).json({ error: "Nomor kunjungan tidak ditemukan." });
    }
    const status = await PengunjungModel.ambilStatus(id);
    if (status === null) {
      return res.status(404).json({ error: "Nomor kunjungan tidak ditemukan." });
    }
    if (status !== "Diterima") {
      return res
        .status(409)
        .json({ error: `Hanya tamu berstatus Diterima yang bisa dicatat keluar (status: ${status}).` });
    }
    await PengunjungModel.catatKeluar(id);
    console.info(`[keluar oleh petugas] ${id} oleh ${req.admin.username}`);
    res.json(await PengunjungModel.cariById(id));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  catatKeluarOlehPetugas,
  tambahKunjungan,
  ambilSemuaKunjungan,
  ambilVersiData,
  ambilKunjungan,
  ubahStatusKunjungan,
  catatKunjunganKeluar,
};
