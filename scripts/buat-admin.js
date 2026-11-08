// scripts/buat-admin.js
// Membuat akun admin baru ATAU mereset password admin yang sudah ada.
// Password dibuat acak & kuat, ditampilkan SEKALI di terminal.
//
//   npm run admin:buat -- <username> "<Nama Lengkap>" [--utama]
//   npm run admin:buat -- <username> --reset
//
// Contoh membuat admin utama pertama:
//   npm run admin:buat -- admin "Admin Utama" --utama

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../backend/src/database");
const AdminModel = require("../backend/src/models/adminModel");
const { usernameValid } = require("../backend/src/utils/validasi");

function passwordAcak() {
  // 16 karakter, dijamin ada huruf & angka
  const huruf = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const angka = "23456789";
  const semua = huruf + angka;
  let pw = huruf[crypto.randomInt(huruf.length)] + angka[crypto.randomInt(angka.length)];
  while (pw.length < 16) pw += semua[crypto.randomInt(semua.length)];
  return pw
    .split("")
    .sort(() => crypto.randomInt(3) - 1)
    .join("");
}

async function main() {
  const args = process.argv.slice(2);
  const flag = new Set(args.filter((a) => a.startsWith("--")));
  const [username, nama] = args.filter((a) => !a.startsWith("--"));

  if (!username || !usernameValid(username) || (!flag.has("--reset") && !nama)) {
    console.log('Pemakaian:\n  npm run admin:buat -- <username> "<Nama Lengkap>" [--utama]');
    console.log("  npm run admin:buat -- <username> --reset");
    process.exitCode = 1;
    return;
  }

  const password = passwordAcak();
  const hash = await bcrypt.hash(password, 12);
  const ada = await AdminModel.cariByUsername(username);

  if (flag.has("--reset")) {
    if (!ada) throw new Error(`Username "${username}" tidak ditemukan.`);
    await AdminModel.updatePassword(ada.id_admin, hash);
    console.log(`\n✓ Password "${username}" direset (semua sesi lama dikeluarkan).`);
  } else {
    if (ada) throw new Error(`Username "${username}" sudah ada. Pakai --reset untuk reset password.`);
    const role = flag.has("--utama") ? "utama" : "petugas";
    const admin = await AdminModel.buat({ username, passwordHash: hash, namaPetugas: nama, role });
    console.log(`\n✓ Admin dibuat: id=${admin.id} username=${username} role=${role}`);
  }

  console.log(`  Password: ${password}`);
  console.log("  Simpan password ini sekarang, lalu segera ganti lewat menu profil setelah login.\n");
}

main()
  .catch((err) => {
    console.error("Gagal:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
