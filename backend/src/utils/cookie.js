// utils/cookie.js — baca/tulis cookie sesi admin (httpOnly).
// Token JWT disimpan di cookie httpOnly, BUKAN localStorage, supaya tidak
// bisa dicuri lewat JavaScript bila suatu saat ada celah XSS.

const config = require("../config");

const NAMA_COOKIE = config.produksi ? "__Host-sesi_admin" : "sesi_admin";

function bacaCookie(req, nama = NAMA_COOKIE) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const bagian of header.split(";")) {
    const i = bagian.indexOf("=");
    if (i === -1) continue;
    if (bagian.slice(0, i).trim() === nama) {
      try {
        return decodeURIComponent(bagian.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function opsiCookie() {
  return {
    httpOnly: true,
    secure: config.produksi, // wajib HTTPS di produksi
    sameSite: "strict",
    path: "/", // prefix __Host- mensyaratkan path "/" dan tanpa domain
  };
}

function setCookieSesi(res, token) {
  res.cookie(NAMA_COOKIE, token, {
    ...opsiCookie(),
    maxAge: config.sesiJam * 60 * 60 * 1000,
  });
}

function hapusCookieSesi(res) {
  res.clearCookie(NAMA_COOKIE, opsiCookie());
}

module.exports = { bacaCookie, setCookieSesi, hapusCookieSesi };
