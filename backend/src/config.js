// config.js
// Satu-satunya tempat membaca environment variable. Nilai yang wajib ada
// divalidasi di sini supaya aplikasi gagal dengan pesan jelas, bukan
// diam-diam berjalan dengan konfigurasi tidak aman.

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const env = process.env;
const produksi = env.NODE_ENV === "production" || !!env.VERCEL;

function wajib(nama) {
  const nilai = env[nama];
  if (!nilai || !String(nilai).trim()) {
    throw new Error(`Environment variable ${nama} belum diisi. Lihat .env.example.`);
  }
  return nilai;
}

function bacaCaCert() {
  if (env.DB_CA_CERT && env.DB_CA_CERT.trim()) {
    // Mendukung format satu baris dengan "\n" literal (umum di file .env)
    return env.DB_CA_CERT.replace(/\\n/g, "\n");
  }
  if (env.DB_CA_CERT_PATH) {
    return fs.readFileSync(path.resolve(env.DB_CA_CERT_PATH), "utf8");
  }
  return null;
}

const jwtSecret = wajib("JWT_SECRET");
if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET terlalu pendek. Gunakan minimal 32 karakter acak.");
}

function angka(nilai) {
  const n = Number(nilai);
  return Number.isFinite(n) ? n : null;
}

const lokasiLat = angka(env.LOKASI_LAT);
const lokasiLng = angka(env.LOKASI_LNG);

module.exports = {
  produksi,
  port: Number(env.PORT) || 3001,
  jwtSecret,
  sesiJam: 8,
  allowedOrigins: (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  db: {
    host: wajib("DB_HOST"),
    port: Number(env.DB_PORT) || 3306,
    user: wajib("DB_USER"),
    password: wajib("DB_PASSWORD"),
    database: wajib("DB_NAME"),
    caCert: bacaCaCert(),
  },
  // LOKASI_AKTIF=false mematikan cek lokasi sementara (uji coba dari luar kantor)
  lokasi:
    env.LOKASI_AKTIF !== "false" &&
    lokasiLat !== null && lokasiLng !== null && env.LOKASI_LAT && env.LOKASI_LNG
      ? {
          lat: lokasiLat,
          lng: lokasiLng,
          radius: angka(env.LOKASI_RADIUS_METER) || 200,
        }
      : null,
};
