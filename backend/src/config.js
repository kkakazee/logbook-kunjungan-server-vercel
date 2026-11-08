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

// "trust proxy" Express: Vercel/Render = 1 hop. Untuk PC/NAS di belakang
// Cloudflare Tunnel / Tailscale Funnel yang berjalan di mesin yang sama,
// pakai TRUST_PROXY=loopback.
function bacaTrustProxy() {
  const v = (env.TRUST_PROXY || "").trim();
  if (!v) return produksi ? 1 : false;
  if (v === "false") return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v; // contoh: "loopback"
}

module.exports = {
  produksi,
  port: Number(env.PORT) || 3001,
  // HOST=127.0.0.1 → aplikasi hanya bisa diakses lewat tunnel di PC itu
  host: env.HOST || undefined,
  trustProxy: bacaTrustProxy(),
  // Header IP asli dari tunnel, misal "cf-connecting-ip" (Cloudflare).
  // Hanya dipercaya jika request datang dari mesin yang sama (127.0.0.1).
  ipHeader: (env.IP_HEADER || "").trim().toLowerCase() || null,
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
    // DB_SSL=false untuk MySQL lokal di mesin yang sama (127.0.0.1)
    ssl: env.DB_SSL !== "false",
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
