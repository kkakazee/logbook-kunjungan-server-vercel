// storage.js — pemanggilan API data kunjungan (/api/pengunjung).
//
// Tamu hanya bisa melihat/mengubah kunjungannya sendiri dengan
// "kode akses" 6 karakter yang diterima saat mendaftar. Nomor + kode akses
// kunjungan aktif disimpan di localStorage browser tamu sebagai kenyamanan.

import api, { pesanError } from "./client";
import { ambilLokasiTerakhir } from "./lokasi";

// GET /api/pengunjung — semua data kunjungan (admin)
export async function muatDataTamu() {
  const res = await api.get("/pengunjung");
  return res.data;
}

// GET /api/pengunjung/versi — penanda perubahan data (admin, untuk polling)
export async function ambilVersiData() {
  const res = await api.get("/pengunjung/versi");
  return res.data.versi;
}

// POST /api/pengunjung — tamu mendaftar. Hasil berisi id + kodeAkses.
export async function kirimKunjungan({ namaTamu, unitKerja, keperluan }) {
  try {
    const res = await api.post("/pengunjung", {
      namaTamu,
      unitKerja,
      keperluan,
      lokasi: ambilLokasiTerakhir(),
    });
    return res.data;
  } catch (err) {
    throw new Error(pesanError(err, "Gagal mengirim data kunjungan."), { cause: err });
  }
}

// POST /api/pengunjung/:id/cek — tamu cek status kunjungannya sendiri
export async function cekStatusKunjungan(id, kodeAkses) {
  try {
    const res = await api.post(`/pengunjung/${encodeURIComponent(id)}/cek`, { kodeAkses });
    return res.data;
  } catch (err) {
    const e = new Error(pesanError(err, "Nomor kunjungan tidak ditemukan."));
    e.status = err?.response?.status;
    throw e;
  }
}

// PATCH /api/pengunjung/:id/status — petugas menerima/menolak
export async function ubahStatusKunjungan(id, status, alasanDitolak = null) {
  try {
    const res = await api.patch(`/pengunjung/${encodeURIComponent(id)}/status`, {
      status,
      alasanDitolak,
    });
    return res.data;
  } catch (err) {
    throw new Error(pesanError(err, "Gagal mengubah status."), { cause: err });
  }
}

// POST /api/pengunjung/:id/keluar — tamu konfirmasi keluar
export async function catatKunjunganKeluar(id, kodeAkses) {
  try {
    const res = await api.post(`/pengunjung/${encodeURIComponent(id)}/keluar`, {
      kodeAkses,
      lokasi: ambilLokasiTerakhir(),
    });
    return res.data;
  } catch (err) {
    throw new Error(pesanError(err, "Gagal mencatat kepulangan."), { cause: err });
  }
}

// POST /api/pengunjung/:id/keluar-petugas — petugas mencatat tamu keluar
export async function catatKeluarOlehPetugas(id) {
  try {
    const res = await api.post(`/pengunjung/${encodeURIComponent(id)}/keluar-petugas`);
    return res.data;
  } catch (err) {
    throw new Error(pesanError(err, "Gagal mencatat tamu keluar."), { cause: err });
  }
}

// ===== Kunjungan aktif di browser ini (localStorage) =====
const KUNCI_KUNJUNGAN = "bbmkg_kunjungan_aktif";

function bacaStorage() {
  try {
    const data = JSON.parse(localStorage.getItem(KUNCI_KUNJUNGAN) || "null");
    if (data && typeof data.id === "string" && typeof data.kode === "string") return data;
  } catch {
    /* abaikan data rusak */
  }
  return null;
}

// Mengembalikan { id, kode } atau null
export function ambilKunjunganTersimpan() {
  return bacaStorage();
}

export function simpanKunjungan(id, kode) {
  try {
    localStorage.setItem(KUNCI_KUNJUNGAN, JSON.stringify({ id, kode }));
  } catch {
    /* mode privat / storage penuh — tidak fatal */
  }
}

export function hapusKunjunganTersimpan() {
  try {
    localStorage.removeItem(KUNCI_KUNJUNGAN);
    localStorage.removeItem("bbmkg_id_terakhir"); // sisa versi lama
  } catch {
    /* abaikan */
  }
}
