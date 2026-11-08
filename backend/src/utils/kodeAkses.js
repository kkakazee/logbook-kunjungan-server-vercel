// utils/kodeAkses.js
// Kode akses tamu: 6 karakter acak yang hanya diketahui tamu pemilik
// kunjungan. Dibutuhkan untuk melihat status & konfirmasi keluar, sehingga
// orang lain tidak bisa menebak nomor kunjungan (DDMMYYYY-NNN mudah ditebak)
// lalu membaca data atau "mengeluarkan" tamu lain.
//
// Yang disimpan di database hanya hash SHA-256-nya.

const crypto = require("crypto");

// Tanpa karakter yang mirip (0/O, 1/I/L) agar mudah dibaca dari screenshot
const ALFABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PANJANG = 6;

function buatKodeAkses() {
  let kode = "";
  for (let i = 0; i < PANJANG; i++) {
    kode += ALFABET[crypto.randomInt(ALFABET.length)];
  }
  return kode;
}

function normalisasiKode(kode) {
  return String(kode || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}

function hashKode(kode) {
  return crypto.createHash("sha256").update(normalisasiKode(kode)).digest("hex");
}

function kodeCocok(kode, hashTersimpan) {
  if (!hashTersimpan || !kode) return false;
  const a = Buffer.from(hashKode(kode), "hex");
  const b = Buffer.from(String(hashTersimpan), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { buatKodeAkses, hashKode, kodeCocok, normalisasiKode };
