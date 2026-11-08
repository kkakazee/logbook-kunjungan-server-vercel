// server.js — menjalankan aplikasi sebagai server Node biasa.
// Dipakai untuk development lokal (`npm run dev`) dan hosting non-serverless
// seperti Render, Railway, Koyeb, atau VPS (`npm run build && npm start`).
// Di Vercel file ini TIDAK dipakai — lihat api/index.js.

const path = require("path");
const fs = require("fs");
const express = require("express");
const app = require("./app");
const config = require("./config");

const distPath = path.join(__dirname, "../../frontend/dist");

if (fs.existsSync(distPath)) {
  const CSP =
    "default-src 'self'; script-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; " +
    "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; " +
    "frame-ancestors 'none'";

  app.use((req, res, next) => {
    res.set({
      "Content-Security-Policy": CSP,
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(self), camera=(), microphone=(), payment=()",
    });
    next();
  });

  app.use(express.static(distPath, { index: false, maxAge: "1h" }));

  // Fallback SPA: semua rute non-API dikembalikan ke index.html React
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(config.port, config.host, () => {
  console.log(`Server jalan di http://${config.host || "localhost"}:${config.port}`);
});
