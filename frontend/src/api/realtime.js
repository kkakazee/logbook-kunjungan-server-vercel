// api/realtime.js — pengganti Socket.IO untuk halaman admin.
//
// Vercel (serverless) tidak mendukung koneksi WebSocket yang terus hidup,
// jadi perubahan data dideteksi dengan polling ringan ke /pengunjung/versi.
// Jika versi berubah, semua listener dipanggil dan halaman memuat ulang data.
//
// API-nya dibuat mirip socket.io (on/off) supaya halaman cukup mengganti import.

import { ambilVersiData } from "./storage";

const INTERVAL_MS = 5000;
const listener = new Map(); // event -> Set(handler)
let timer = null;
let versiTerakhir = null;
let sedangCek = false;

function jumlahListener() {
  let n = 0;
  for (const set of listener.values()) n += set.size;
  return n;
}

async function cek() {
  if (sedangCek || document.hidden) return;
  sedangCek = true;
  try {
    const versi = await ambilVersiData();
    if (versiTerakhir !== null && versi !== versiTerakhir) {
      // Satu handler bisa terdaftar di beberapa event — panggil sekali saja
      const unik = new Set();
      for (const set of listener.values()) set.forEach((h) => unik.add(h));
      unik.forEach((h) => h());
    }
    versiTerakhir = versi;
  } catch {
    /* jaringan putus sementara — coba lagi di putaran berikutnya */
  } finally {
    sedangCek = false;
  }
}

function tanganiVisibilitas() {
  if (!document.hidden) cek();
}

function mulai() {
  if (timer) return;
  versiTerakhir = null;
  cek();
  timer = setInterval(cek, INTERVAL_MS);
  document.addEventListener("visibilitychange", tanganiVisibilitas);
}

function berhenti() {
  clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", tanganiVisibilitas);
}

const realtime = {
  on(event, handler) {
    if (!listener.has(event)) listener.set(event, new Set());
    listener.get(event).add(handler);
    mulai();
  },
  off(event, handler) {
    listener.get(event)?.delete(handler);
    if (jumlahListener() === 0) berhenti();
  },
};

export default realtime;
