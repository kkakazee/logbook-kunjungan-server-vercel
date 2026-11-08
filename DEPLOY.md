# Panduan Deploy — Vercel + Aiven MySQL

Aplikasi ini sekarang berbentuk **satu project**: frontend React (static) dan
backend Express yang berjalan sebagai **Vercel Serverless Function** di
`api/index.js`. Database tetap memakai **MySQL di Aiven**.

```text
repo/
├── api/index.js            ← entry point Vercel (memanggil backend/src/app.js)
├── backend/src/            ← Express API (MVC)
│   ├── app.js              ← aplikasi Express (tanpa listen)
│   ├── server.js           ← server biasa untuk lokal / Render / VPS
│   ├── config.js           ← validasi environment variable
│   └── ...
├── frontend/               ← React + Vite (hasil build: frontend/dist)
├── database/skema.sql      ← skema tabel
├── scripts/migrasi.js      ← npm run db:migrasi
├── scripts/buat-admin.js   ← npm run admin:buat
├── vercel.json             ← routing + security headers
└── .env.example            ← daftar environment variable
```

---

## 1. Siapkan database Aiven

1. Buka **console.aiven.io → service MySQL → Overview**.
2. Catat **Host, Port, User, Password, Database name** (biasanya `defaultdb`).
3. Unduh **CA certificate** (tombol *Download* di bagian *CA certificate*) →
   file `ca.pem`. Isinya dipakai untuk `DB_CA_CERT` supaya koneksi
   terverifikasi (anti-MITM).

## 2. Jalankan migrasi & buat admin (sekali, dari komputer Anda)

```bash
npm install
```

Salin `.env.example` menjadi `.env`, isi data Aiven + `JWT_SECRET`.
Buat `JWT_SECRET` dengan:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Lalu:

```bash
npm run db:migrasi
```

Migrasi aman untuk database lama — hanya **menambah** tabel `rate_limit`,
kolom `admin.sesi_versi`, dan `pengunjung.kode_akses_hash`. Tidak ada data
yang dihapus.

Jika belum punya admin utama (atau admin lama memakai password dari
`admin.sql` yang dulu ada di repo — **wajib direset**):

```bash
npm run admin:buat -- admin "Admin Utama" --utama
```

```bash
npm run admin:buat -- admin --reset
```

Password acak akan tampil sekali di terminal. Login, lalu ganti lewat menu profil.

## 3. Deploy ke Vercel

1. Push folder `repo/` ke **repository GitHub baru** (jangan repo lama).
2. Di **vercel.com → Add New → Project**, import repository tersebut.
   Framework Preset: **Other**. Root Directory: folder yang berisi
   `vercel.json`. Build/Output sudah diatur oleh `vercel.json`.
3. **Settings → Environment Variables** (Production & Preview):

   | Nama | Isi |
   | --- | --- |
   | `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | dari Aiven |
   | `DB_CA_CERT` | seluruh isi `ca.pem` (boleh multi-baris) |
   | `JWT_SECRET` | string acak ≥ 32 karakter (beda dari lokal) |
   | `LOKASI_LAT` `LOKASI_LNG` `LOKASI_RADIUS_METER` | koordinat kantor (opsional, mengaktifkan cek lokasi di server) |

4. **Deploy**. Cek `https://<domain>.vercel.app/api/ping` → `{"ok":true}`.

> **Region**: di *Settings → Functions → Region*, pilih region yang dekat
> dengan region service Aiven (misal Singapore `sin1`) agar query cepat.

### Aiven: batasi IP (opsional)
Vercel tidak punya IP statis di paket gratis, jadi *IP allowlist* Aiven
harus tetap `0.0.0.0/0`. Keamanan koneksi bergantung pada password kuat +
TLS terverifikasi (`DB_CA_CERT`).

## 4. Alternatif hosting (Render / Railway / VPS)

Project yang sama bisa dijalankan sebagai server Node biasa:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Isi environment variable yang sama, ditambah `NODE_ENV=production`.

## 5. Development lokal

```bash
npm install
```

```bash
npm run dev
```

API di `http://localhost:3001`, frontend di `http://localhost:5173`
(otomatis diteruskan ke API lewat proxy Vite).

---

## Perubahan keamanan (hasil audit)

| # | Celah sebelumnya | Perbaikan |
| --- | --- | --- |
| 1 | **Data tamu bisa dibaca siapa saja** — `GET /api/pengunjung/:id` publik dan nomor `DDMMYYYY-NNN` mudah ditebak (nama, instansi, keperluan bocor). | Setiap kunjungan mendapat **kode akses 6 karakter** acak (disimpan sebagai hash SHA-256). Cek status & konfirmasi keluar wajib menyertakan kode. |
| 2 | **Siapa pun bisa "mengeluarkan" tamu lain** lewat `POST /:id/keluar`. | Wajib kode akses + rate limit. |
| 3 | **Socket.IO menyiarkan semua data kunjungan ke semua pengunjung web** (termasuk publik) & tidak jalan di Vercel. | Socket.IO dihapus. Admin memakai polling `/api/pengunjung/versi` (wajib login); tamu hanya polling statusnya sendiri. |
| 4 | **Password admin default** (hash di `backend/admin.sql`) ada di repo publik. | File dihapus; admin dibuat lewat `npm run admin:buat` dengan password acak. **Reset admin lama.** |
| 5 | Tidak ada **pembatasan percobaan login** (brute force). | Rate limit per IP (20/15 menit) + kunci per username (5 gagal/15 menit), tersimpan di DB sehingga berlaku lintas instance serverless. |
| 6 | **JWT di localStorage** (bisa dicuri jika ada XSS). | JWT di **cookie httpOnly, Secure, SameSite=Strict** (`__Host-` prefix). Logout menghapus cookie di server. |
| 7 | Token tetap berlaku setelah **admin dihapus / ganti password**, role diambil dari token. | Setiap request mengambil admin terbaru dari DB; `sesi_versi` naik saat ganti password → semua sesi lama batal. |
| 8 | Koneksi DB `rejectUnauthorized: false` (rawan MITM). | Verifikasi sertifikat dengan `DB_CA_CERT` dari Aiven. |
| 9 | `cors()` mengizinkan semua origin. | CORS hanya same-origin (+ `ALLOWED_ORIGINS`), dan request POST/PATCH/DELETE dari origin lain ditolak (anti-CSRF). |
| 10 | Tanpa security headers. | Helmet + CSP ketat, HSTS, X-Frame-Options DENY, `Cache-Control: no-store` untuk API. |
| 11 | Input tanpa batas panjang (bisa spam / DoS). | Batas body 20 KB, maks 30 nama, batas panjang tiap field, validasi format ID. |
| 12 | Status kunjungan yang sudah selesai/ditolak **bisa diubah ulang**. | Hanya kunjungan `Menunggu Persetujuan` yang bisa diterima/ditolak (juga dicek di SQL). |
| 13 | Cek lokasi GPS hanya di frontend (bisa dilewati via API). | Server juga memeriksa radius (jika `LOKASI_LAT/LNG` diisi). *Catatan: GPS tetap bisa dipalsukan.* |
| 14 | Username bisa ditebak dari selisih waktu respons login. | bcrypt tetap dijalankan dengan hash palsu bila username tidak ada. |
| 15 | Password minimal 6 karakter. | Minimal 8 karakter, wajib huruf + angka; bcrypt cost 12 (`bcryptjs`, tanpa native build). |
| 16 | Error/stack trace bisa bocor. | Error handler terpusat, pesan generik ke klien. |
