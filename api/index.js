// Entry point Vercel Serverless Function.
// Semua request /api/* diarahkan ke sini oleh vercel.json, lalu ditangani
// oleh aplikasi Express yang sama dengan yang dipakai saat development.
module.exports = require("../backend/src/app");
