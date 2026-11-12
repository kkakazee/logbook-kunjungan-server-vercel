<div align="center">

# 📒 Logbook Kunjungan Tamu — Ruang Jarkom BBMKG Wilayah II

Buku tamu digital untuk mencatat, memverifikasi, dan memantau kunjungan ke Ruangan Jaringan Komunikasi (Jarkom) Balai Besar MKG Wilayah II — pengganti buku tamu kertas.

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)

</div>

---

## Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Fitur](#fitur)
- [Alur Kunjungan](#alur-kunjungan)
- [Teknologi](#teknologi)
- [Mulai Cepat (Lokal)](#mulai-cepat-lokal)
- [Konfigurasi `.env`](#konfigurasi-env)
- [Deployment](#deployment)
- [Perintah yang Tersedia](#perintah-yang-tersedia)
- [Struktur Proyek](#struktur-proyek)
- [Halaman & Routing](#halaman--routing)
- [Endpoint API](#endpoint-api)
- [Database](#database)
- [Keamanan](#keamanan)
- [Catatan Teknis](#catatan-teknis)
- [Tim Pengembang](#tim-pengembang)

---

## Gambaran Umum

Aplikasi terdiri dari dua bagian dalam **satu project**:

| Bagian | Untuk siapa | Fungsi |
|---|---|---|
| **Halaman publik** | Tamu | Isi form masuk, pantau status, konfirmasi keluar |
| **Panel admin** | Petugas Jarkom | Terima/tolak kunjungan, pantau tamu, riwayat & ekspor Excel, kelola akun petugas |

Frontend React di-build menjadi file statis, sedangkan backend Express berjalan sebagai **Vercel Serverless Function** (atau sebagai server Node biasa di PC/Raspberry Pi).

---

## Fitur

### 👤 Untuk Tamu
- **Form Masuk** — nama, unit kerja/instansi, dan keperluan; mendukung **kunjungan rombongan** (banyak nama dalam satu nomor kunjungan).
- **Nomor kunjungan otomatis** berformat `DDMMYYYY-NNN` (mis. `18092026-001`) + **kode akses 6 karakter** untuk cek status dan konfirmasi keluar.
- **Status realtime** — halaman status diperbarui otomatis saat petugas menerima/menolak; alasan penolakan ikut ditampilkan.
- **Form Keluar** untuk menandai kunjungan selesai.
- **Lanjutkan kunjungan aktif** — nomor & kode akses disimpan di browser (`localStorage`), sehingga tamu yang membuka ulang halaman diarahkan kembali ke kunjungannya yang masih berjalan.
- **Verifikasi lokasi (opsional)** — form hanya bisa dikirim dari radius tertentu di sekitar kantor; dicek di browser **dan** di server.

### 🛡️ Untuk Petugas (Admin)
- **Dashboard** ringkasan kunjungan dengan grafik.
- **Tamu Menunggu** — kunjungan hari ini + kunjungan hari sebelumnya yang belum diverifikasi; **terima** atau **tolak** (alasan opsional).
- **Tamu Hari Ini** — semua kunjungan tanggal berjalan, lengkap dengan waktu masuk & keluar.
- **Riwayat Tamu** — filter rentang tanggal / bulan & tahun, urutkan, pagination (10–500 atau semua), dan **unduh Excel**.
- **Detail kunjungan** dalam modal, tanpa pindah halaman.
- **Catat keluar oleh petugas** bila tamu kehilangan kode aksesnya.
- **Profil** — ganti password & logout.
- Data diperbarui otomatis (polling) tanpa perlu refresh.

### 🔑 Peran Admin

| Kemampuan | Admin Utama (`utama`) | Admin Petugas (`petugas`) |
|---|:---:|:---:|
| Melihat data & detail kunjungan | ✅ | ✅ |
| Menerima / menolak kunjungan | — | ✅ |
| Melihat daftar admin | ✅ | — |
| Menambah / menghapus Admin Petugas | ✅ | — |
| Ganti password sendiri | ✅ | ✅ |

- Akun Admin Petugas dibuat langsung oleh Admin Utama — **tidak ada pendaftaran publik**.
- Admin Utama ditentukan oleh `role = "utama"` dan **tidak dapat dihapus**.
- ID admin berformat 3 digit (`001`, `002`, …); ID yang kosong dapat dipakai ulang.

---

## Alur Kunjungan

```text
 Tamu mengisi Form Masuk
           │
           ▼
 ┌──────────────────────┐
 │ Menunggu Persetujuan │
 └──────────┬───────────┘
      ┌─────┴──────┐
      ▼            ▼
 ┌─────────┐  ┌─────────┐
 │Diterima │  │ Ditolak │ ← alasan opsional
 └────┬────┘  └─────────┘
      ▼
 Tamu berkunjung → Form Keluar
      ▼
 ┌───────────────────┐
 │ Kunjungan Selesai │
 └───────────────────┘
```

| Status | Keterangan |
|---|---|
| `Menunggu Persetujuan` | Kunjungan baru, belum diverifikasi petugas |
| `Diterima` | Disetujui petugas, tamu boleh masuk |
| `Ditolak` | Ditolak petugas (dapat disertai `alasan_ditolak`) |
| `Kunjungan Selesai` | Tamu sudah konfirmasi keluar |

---

## Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | React 19, Vite, React Router, Axios, Recharts, React Datepicker, SheetJS (`xlsx`) |
| Backend | Node.js 20+, Express 4 (pola MVC), Helmet |
| Database | MySQL 8 — Aiven (cloud) atau MySQL lokal |
| Autentikasi | JWT di cookie `httpOnly` + bcrypt |
| Realtime | Polling ringan (kompatibel serverless) |
| Hosting | Vercel · Raspberry Pi (Docker) · PC Windows · Render/Railway/VPS |
| Akses domain | Cloudflare Tunnel (untuk server sendiri) |

---

## Mulai Cepat (Lokal)

Prasyarat: **Node.js 20+** dan database **MySQL** (lokal atau Aiven).

```bash
# 1. Install dependensi backend + frontend sekaligus
npm install

# 2. Siapkan konfigurasi, lalu isi data database & JWT_SECRET
cp .env.example .env

# 3. Buat / perbarui tabel database
npm run db:migrasi

# 4. Buat akun Admin Utama (password acak akan ditampilkan)
npm run admin:buat -- admin "Admin Utama" --utama

# 5. Jalankan API (port 3001) + frontend (port 5173)
npm run dev
```

Buka **http://localhost:5173/form-masuk** untuk halaman tamu dan **http://localhost:5173/login** untuk admin.

---

## Konfigurasi `.env`

Daftar lengkap ada di [`.env.example`](.env.example). Yang utama:

| Variabel | Wajib | Keterangan |
|---|:---:|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | ✅ | Koneksi MySQL |
| `DB_CA_CERT` / `DB_CA_CERT_PATH` | Aiven | Sertifikat CA agar koneksi TLS terverifikasi |
| `DB_SSL=false` | — | Untuk MySQL lokal di mesin yang sama |
| `JWT_SECRET` | ✅ | Kunci sesi login, minimal 32 karakter acak |
| `LOKASI_LAT`, `LOKASI_LNG`, `LOKASI_RADIUS_METER` | — | Titik & radius verifikasi lokasi |
| `LOKASI_AKTIF`, `VITE_LOKASI_AKTIF` | — | Isi `false` untuk mematikan cek lokasi sementara |
| `ALLOWED_ORIGINS` | — | Origin tambahan yang boleh memanggil API |

Buat `JWT_SECRET` acak dengan:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> ⚠️ File `.env` **tidak boleh** di-commit. Di Vercel, isi lewat *Project → Settings → Environment Variables*.

---

## Deployment

| Target | Database | Panduan |
|---|---|---|
| **Vercel** (gratis, serverless) | Aiven MySQL | [DEPLOY.md](DEPLOY.md) |
| **Raspberry Pi / Linux** dengan Docker | MySQL 8.4 dalam container | [deploy/raspberry/PANDUAN-RASPBERRY.md](deploy/raspberry/PANDUAN-RASPBERRY.md) |
| **PC Windows** yang menyala 24 jam | MySQL lokal | [deploy/windows/PANDUAN-PC-WINDOWS.md](deploy/windows/PANDUAN-PC-WINDOWS.md) |
| Render / Railway / VPS | MySQL apa saja | [DEPLOY.md](DEPLOY.md#4-alternatif-hosting-render--railway--vps) |

Panduan Raspberry Pi dan PC Windows sudah mencakup **Cloudflare Tunnel** ke domain sendiri serta **backup harian otomatis**.

---

## Perintah yang Tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan API + frontend bersamaan (mode pengembangan) |
| `npm run build` | Build frontend ke `frontend/dist` |
| `npm start` | Jalankan server produksi (Node biasa) |
| `npm run db:migrasi` | Buat/perbarui tabel tanpa menghapus data |
| `npm run db:backup -- <folder>` | Backup semua tabel ke `.sql` + `.json` |
| `npm run db:impor -- <file.sql>` | Impor backup lalu migrasi (ditolak bila DB sudah berisi data, kecuali `--timpa`) |
| `npm run admin:buat -- <user> "<Nama>" [--utama]` | Buat akun admin dengan password acak |

---

## Struktur Proyek

```text
.
├── api/index.js              # entry point Vercel Serverless Function
├── backend/src/
│   ├── app.js                # aplikasi Express
│   ├── server.js             # server Node biasa (lokal / VPS / Raspberry Pi)
│   ├── config.js             # validasi environment variable
│   ├── database.js           # pool koneksi MySQL (TLS)
│   ├── controllers/          # logika request & response
│   ├── middleware/           # autentikasi, anti-CSRF, error handler
│   ├── models/               # query database
│   ├── routes/               # definisi endpoint API
│   └── utils/                # kode akses, lokasi, validasi, tanggal, rate limit
├── frontend/                 # React + Vite
│   └── src/{pages,components,api,context,hooks}
├── database/skema.sql        # skema tabel
├── scripts/                  # migrasi, buat admin, backup & impor
├── deploy/
│   ├── raspberry/            # panduan + skrip backup Raspberry Pi
│   └── windows/              # panduan + skrip autostart PC Windows
├── Dockerfile · docker-compose.yml
├── vercel.json               # routing + security headers
├── .env.example
└── DEPLOY.md
```

---

## Halaman & Routing

**Publik**

| Path | Fungsi |
|---|---|
| `/form-masuk` | Form pencatatan kunjungan |
| `/form-keluar` | Konfirmasi tamu keluar |
| `/status/:id` | Status kunjungan |
| `/login` | Login admin |

**Admin** (wajib login)

| Path | Fungsi |
|---|---|
| `/admin` | Dashboard |
| `/admin/admin-tamu-menunggu` | Kunjungan menunggu verifikasi |
| `/admin/admin-tamu-hari-ini` | Kunjungan hari ini |
| `/admin/admin-riwayat-tamu` | Riwayat & ekspor Excel |
| `/admin/admin-list-petugas-admin` | Kelola Admin Petugas *(khusus Admin Utama)* |

---

## Endpoint API

### `/api/pengunjung`

| Method | Path | Akses | Fungsi |
|---|---|---|---|
| `POST` | `/` | Publik | Buat kunjungan baru (mengembalikan `kodeAkses`) |
| `POST` | `/:id/cek` | Publik + kode akses | Lihat status kunjungan sendiri |
| `POST` | `/:id/keluar` | Publik + kode akses | Catat tamu keluar |
| `GET` | `/` | Admin | Semua data kunjungan |
| `GET` | `/versi` | Admin | Penanda perubahan data (untuk polling) |
| `PATCH` | `/:id/status` | Admin Petugas | Terima / tolak kunjungan |
| `POST` | `/:id/keluar-petugas` | Admin Petugas | Catat keluar bila tamu kehilangan kode akses |

### `/api/admin`

| Method | Path | Akses | Fungsi |
|---|---|---|---|
| `POST` | `/login` | Publik | Login (set cookie `httpOnly`) |
| `POST` | `/logout` | Publik | Hapus cookie sesi |
| `GET` | `/saya` | Admin | Data sesi admin |
| `PATCH` | `/ganti-password` | Admin | Ganti password sendiri |
| `GET` | `/semua` | Admin Utama | Daftar semua admin |
| `POST` | `/tambah` | Admin Utama | Tambah Admin Petugas |
| `DELETE` | `/:id` | Admin Utama | Hapus Admin Petugas |

Nama petugas verifikasi diambil otomatis dari sesi login.

---

## Database

Skema lengkap: [`database/skema.sql`](database/skema.sql). Jalankan `npm run db:migrasi` untuk membuat/memperbarui tabel.

| Tabel | Isi |
|---|---|
| `admin` | Akun panel admin — `id_admin`, `username`, `password` (hash bcrypt), `nama_petugas`, `role` |
| `pengunjung` | Data kunjungan — instansi, keperluan, status, petugas verifikasi, waktu masuk/keluar, alasan ditolak |
| `pengunjung_nama` | Nama-nama tamu per kunjungan (mendukung rombongan) |
| `nomor_kunjungan` | Penghitung nomor urut harian untuk format `DDMMYYYY-NNN` |

---

## Keamanan

- Password admin di-hash **bcrypt** (cost 12); minimal 8 karakter berisi huruf + angka.
- Sesi admin: **JWT di cookie `httpOnly` + `Secure` + `SameSite=Strict`**, divalidasi ulang ke database setiap request; ganti password membatalkan semua sesi lama.
- Tamu hanya dapat melihat/mengakhiri kunjungannya sendiri dengan **kode akses**.
- **Rate limit** untuk login dan form tamu (disimpan di database).
- **Anti-CSRF** (cek `Origin`), CORS same-origin, security headers (CSP, HSTS, X-Frame-Options).
- Koneksi database **TLS terverifikasi** (`DB_CA_CERT`).
- Validasi & batas panjang input di backend; pesan error tidak membocorkan detail internal.
- Verifikasi lokasi dicek juga di server (catatan: koordinat berasal dari perangkat tamu dan masih bisa dipalsukan — fitur ini mempersulit, bukan menjamin).

Detail hasil audit keamanan: [DEPLOY.md → Perubahan keamanan](DEPLOY.md#perubahan-keamanan-hasil-audit).

> Untuk deployment di jaringan internal, sebaiknya akses panel admin juga dibatasi di level jaringan/web server, selain autentikasi aplikasi.

---

## Catatan Teknis

- **Zona waktu:** penentuan "hari ini" memakai `Asia/Jakarta` (WIB), tidak bergantung pada zona waktu browser. Waktu masuk/keluar dicatat oleh backend.
- **Realtime tanpa WebSocket:** karena Vercel serverless tidak mendukung WebSocket, panel admin memeriksa `GET /api/pengunjung/versi` setiap **5 detik** (hanya saat tab aktif) dan halaman status tamu memeriksa statusnya setiap **8 detik** selama kunjungan masih aktif.
- **Ekspor Excel** (halaman Riwayat Tamu) berisi: nomor kunjungan, nama tamu, instansi, keperluan, status, waktu masuk & keluar, petugas verifikasi, dan alasan ditolak.
- **Halaman developer** bersifat statis (HTML/CSS, di luar React) dan diletakkan di `frontend/public/developer-info-page/`; tautannya ada di footer halaman publik.

---

## Tim Pengembang
Dibuat oleh **Tim Magang Tahun 2026 di Unit Jaringan Komunikasi BBMKG Wilayah II**.
Dikembangkan oleh **Tim Jaringan Komunikasi BBMKG Wilayah II — 2026**.
