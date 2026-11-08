// app.js — membangun aplikasi Express TANPA memanggil listen(), supaya
// bisa dipakai di dua tempat:
//   - api/index.js       → Vercel Serverless Function
//   - backend/src/server.js → server Node biasa (lokal, Render, Railway, VPS)

const express = require("express");
const helmet = require("helmet");
const config = require("./config");
const { cekOrigin, tanganiError } = require("./middleware/keamanan");
const routerPengunjung = require("./routes/pengunjungRoute");
const routerAdmin = require("./routes/adminRoute");

const app = express();

app.disable("x-powered-by");
// Di belakang proxy Vercel/Render, IP asli ada di X-Forwarded-For.
app.set("trust proxy", config.produksi ? 1 : false);

app.use(
  helmet({
    // CSP untuk halaman React diatur di vercel.json / server.js;
    // respons API hanya JSON jadi cukup kebijakan paling ketat.
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
  })
);

app.use("/api", (req, res, next) => {
  // Data kunjungan bersifat pribadi — jangan disimpan oleh cache/CDN.
  res.set("Cache-Control", "no-store");
  next();
});

app.use("/api", cekOrigin);
app.use(express.json({ limit: "20kb" }));

app.get("/api/ping", (req, res) => res.json({ ok: true }));
app.use("/api/pengunjung", routerPengunjung);
app.use("/api/admin", routerAdmin);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
});

app.use(tanganiError);

module.exports = app;
