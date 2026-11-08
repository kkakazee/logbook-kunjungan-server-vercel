// middleware/keamanan.js
// Middleware keamanan umum: pembatasan origin (anti-CSRF), rate limit,
// dan penanganan error terpusat.

const config = require("../config");
const { tambahHitungan } = require("../utils/rateLimit");

// ---------------------------------------------------------------------------
// Anti-CSRF: request yang mengubah data (POST/PATCH/PUT/DELETE) hanya boleh
// datang dari halaman di domain yang sama (atau ALLOWED_ORIGINS).
// Cookie sesi juga memakai SameSite=Strict, jadi ini lapisan kedua.
// ---------------------------------------------------------------------------
const METODE_AMAN = new Set(["GET", "HEAD", "OPTIONS"]);

function hostDariOrigin(origin) {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

function cekOrigin(req, res, next) {
  const origin = req.get("origin");

  if (origin) {
    const diizinkan =
      hostDariOrigin(origin) === req.get("host") ||
      config.allowedOrigins.includes(origin);

    if (!diizinkan) {
      return res.status(403).json({ error: "Origin tidak diizinkan." });
    }

    // CORS hanya untuk origin tambahan yang terdaftar
    if (config.allowedOrigins.includes(origin)) {
      res.set({
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE",
        Vary: "Origin",
      });
      if (req.method === "OPTIONS") return res.sendStatus(204);
    }
  } else if (!METODE_AMAN.has(req.method)) {
    // Browser modern selalu mengirim Origin pada POST/PATCH/DELETE fetch/XHR.
    // Tanpa Origin, pastikan minimal datang dari situs yang sama.
    const site = req.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") {
      return res.status(403).json({ error: "Permintaan lintas situs ditolak." });
    }
  }

  next();
}

// ---------------------------------------------------------------------------
// Rate limit berbasis database — tetap berlaku walau di Vercel setiap
// request bisa ditangani instance serverless yang berbeda.
// ---------------------------------------------------------------------------
function ipKlien(req) {
  // Di Vercel, header x-real-ip diisi oleh edge Vercel (tidak bisa dipalsukan
  // klien). Di tempat lain pakai req.ip (mengikuti setting "trust proxy").
  if (process.env.VERCEL && req.get("x-real-ip")) return req.get("x-real-ip");
  // Tunnel (Cloudflare) di mesin/jaringan Docker yang sama: header IP asli
  // hanya dipercaya bila koneksi datang dari alamat yang diizinkan oleh
  // TRUST_PROXY (mis. "loopback" atau "loopback,uniquelocal" untuk Docker),
  // agar tidak bisa dipalsukan oleh klien yang terhubung langsung.
  const dariProxy =
    typeof req.app.get("trust proxy fn") === "function" &&
    config.trustProxy !== 1 &&
    req.app.get("trust proxy fn")(req.socket.remoteAddress, 0);
  if (config.ipHeader && dariProxy && req.get(config.ipHeader)) {
    return req.get(config.ipHeader).split(",")[0].trim();
  }
  return req.ip || "tanpa-ip";
}

function batasiRate({ nama, maks, detik, kunci = ipKlien }) {
  return async function (req, res, next) {
    try {
      const k = `${nama}:${kunci(req)}`;
      const { jumlah, sisaDetik } = await tambahHitungan(k, detik);
      if (jumlah > maks) {
        res.set("Retry-After", String(sisaDetik));
        return res.status(429).json({
          error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(sisaDetik / 60)} menit.`,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ---------------------------------------------------------------------------
// Error handler terpusat — jangan pernah bocorkan stack trace / pesan SQL.
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
function tanganiError(err, req, res, next) {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Data yang dikirim terlalu besar." });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Format data tidak valid." });
  }
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan pada server." });
}

module.exports = { cekOrigin, batasiRate, ipKlien, tanganiError };
