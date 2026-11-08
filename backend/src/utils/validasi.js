// utils/validasi.js — helper validasi input kecil.

const POLA_ID_KUNJUNGAN = /^\d{8}-\d{3,4}$/;
const POLA_ID_ADMIN = /^\d{3}$/;
const POLA_USERNAME = /^[a-zA-Z0-9._-]{3,50}$/;

// Ambil string, buang spasi di ujung & karakter kontrol, batasi panjang.
// Mengembalikan "" jika bukan string.
function teks(nilai, maks) {
  if (typeof nilai !== "string") return "";
  return nilai
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maks + 1); // +1 supaya pemanggil bisa mendeteksi "terlalu panjang"
}

function idKunjunganValid(id) {
  return typeof id === "string" && POLA_ID_KUNJUNGAN.test(id);
}

function idAdminValid(id) {
  return typeof id === "string" && POLA_ID_ADMIN.test(id);
}

function usernameValid(u) {
  return typeof u === "string" && POLA_USERNAME.test(u);
}

// Password: 8–72 karakter (bcrypt hanya memakai 72 byte pertama),
// minimal mengandung huruf dan angka.
function cekPassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) return "Password minimal 8 karakter.";
  if (Buffer.byteLength(pw, "utf8") > 72) return "Password maksimal 72 karakter.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "Password harus mengandung huruf dan angka.";
  }
  return null;
}

module.exports = { teks, idKunjunganValid, idAdminValid, usernameValid, cekPassword };
