# Logbook Kunjungan Tamu Ruangan Jarkom BBMKG2

Aplikasi web untuk mencatat, memantau, dan mengelola kunjungan tamu ke Ruangan Jaringan Komunikasi BBMKG Wilayah II sebagai pengganti buku tamu manual.

Sistem terdiri dari halaman publik yang digunakan tamu untuk melakukan pencatatan kunjungan dan panel admin yang digunakan petugas untuk memverifikasi serta mengelola data kunjungan.


## Daftar Isi

* [Fitur](#fitur)
  * [Untuk Tamu](#untuk-tamu)
  * [Untuk Petugas (Admin)](#untuk-petugas-admin)
  * [Pengelolaan Admin](#pengelolaan-admin)

* [Status Kunjungan](#status-kunjungan)

* [Teknologi](#teknologi)

* [Struktur Folder](#struktur-folder)

* [Instalasi](#instalasi)
  * [Persiapan](#persiapan)
  * [1. Setup Database](#1-setup-database)
  * [2. Setup Backend](#2-setup-backend)
  * [3. Setup Frontend](#3-setup-frontend)
  * [4. Menjalankan Backend dan Frontend Bersamaan](#4-menjalankan-backend-dan-frontend-bersamaan)

* [Routing Frontend](#routing-frontend)
  * [Halaman Publik](#halaman-publik)
  * [Halaman Admin](#halaman-admin)

* [Endpoint API](#endpoint-api)
  * [Pengunjung](#pengunjung)
  * [Admin](#admin)

* [Database](#database)
  * [Tabel admin](#tabel-admin)
  * [Tabel pengunjung](#tabel-pengunjung)
  * [Tabel pengunjung_nama](#tabel-pengunjung_nama)
  * [Tabel nomor_kunjungan](#tabel-nomor_kunjungan)

* [Keamanan](#keamanan)

* [Export Excel](#export-excel)

* [Realtime Update](#realtime-update)

* [Waktu dan Tanggal](#waktu-dan-tanggal)

* [Halaman Developer](#halaman-developer)

* [Deployment](#deployment)

* [Catatan Pengembangan](#catatan-pengembangan)





## Fitur

### Untuk Tamu

* **Form Masuk** — tamu mengisi nama tamu, unit kerja/instansi, dan keperluan. Form mendukung kunjungan rombongan.

* **Nomor Kunjungan Otomatis** — setiap kunjungan mendapatkan nomor unik dengan format `DDMMYYYY-NNN`.

* **Status Kunjungan** — tamu dapat melihat status kunjungannya melalui halaman `/status/:id`.

* **Status Menunggu Persetujuan** — setelah mengirim data, kunjungan menunggu verifikasi petugas.

* **Status Diterima** — apabila kunjungan diterima, tamu dapat melanjutkan ke Form Keluar.

* **Status Ditolak** — apabila kunjungan ditolak, tamu dapat melihat alasan penolakan apabila petugas memberikan alasan.

* **Form Keluar** — tamu melakukan konfirmasi ketika selesai berkunjung.

* **Kode Akses** — setiap kunjungan mendapat kode akses 6 karakter yang dibutuhkan untuk cek status dan konfirmasi keluar.

* **Penyimpanan Nomor Kunjungan** — nomor kunjungan dan kode akses terakhir disimpan pada browser menggunakan `localStorage` untuk membantu mempertahankan akses ke kunjungan yang masih aktif.

* **Pengecekan Kunjungan Aktif** — sistem memeriksa nomor kunjungan yang tersimpan ketika tamu kembali membuka Form Masuk. Jika kunjungan masih berstatus `Menunggu Persetujuan` atau `Diterima`, tamu diarahkan kembali ke proses kunjungan yang masih aktif.

* **Penghapusan Kunjungan Aktif** — nomor kunjungan yang tersimpan akan dihapus apabila kunjungan telah ditolak, selesai, tidak ditemukan, atau tidak lagi dapat digunakan.

* **Pembaruan Status Realtime** — halaman Status Kunjungan dapat menerima perubahan status secara realtime tanpa perlu melakukan refresh manual.





### Untuk Petugas (Admin)

* **Login Admin** — autentikasi menggunakan username dan password.

* **Dashboard** — menampilkan ringkasan data kunjungan.

* **Tamu Menunggu Konfirmasi** — menampilkan seluruh kunjungan hari ini serta kunjungan dari hari sebelumnya yang masih berstatus `Menunggu Persetujuan`.

* **Konfirmasi Kunjungan** — Admin Petugas dapat menerima kunjungan yang masih menunggu persetujuan.

* **Penolakan Kunjungan** — Admin Petugas dapat menolak kunjungan melalui modal konfirmasi.

* **Alasan Penolakan** — ketika menolak kunjungan, petugas dapat memberikan alasan penolakan. Alasan bersifat opsional.

* **Detail Kunjungan** — data kunjungan dapat diklik untuk melihat informasi lengkap melalui modal detail.

* **Tamu Hari Ini** — menampilkan seluruh kunjungan yang tercatat pada tanggal berjalan, termasuk waktu masuk, waktu keluar, dan status.

* **Riwayat Tamu** — menampilkan seluruh data kunjungan yang pernah tercatat.

* **Filter Riwayat** — riwayat dapat difilter berdasarkan rentang tanggal serta pilihan bulan dan tahun.

* **Pengurutan Data** — data riwayat dapat diurutkan dari terbaru ke terlama atau sebaliknya.

* **Pagination** — jumlah data per halaman dapat dipilih: 10, 50, 100, 250, 500, atau seluruh data.

* **Unduh Excel** — data riwayat dapat diekspor ke file Excel, termasuk informasi waktu masuk, waktu keluar, petugas verifikasi, dan alasan penolakan.

* **Waktu Keluar** — waktu keluar tamu ditampilkan pada halaman Tamu Hari Ini dan Riwayat Tamu.

* **Profil Admin** — admin dapat melihat data akunnya, mengganti password, dan melakukan logout.

* **Pembaruan Data Realtime** — halaman admin menerima perubahan data kunjungan melalui polling otomatis tanpa perlu melakukan refresh manual.





### Pengelolaan Admin

Sistem memiliki dua jenis role admin:

* **Admin Utama (`utama`)**

  * Dapat melihat seluruh data kunjungan.

  * Tidak dapat melakukan konfirmasi atau penolakan kunjungan.

  * Dapat melihat daftar seluruh admin.

  * Dapat menambahkan akun Admin Petugas.

  * Dapat menghapus akses Admin Petugas.

  * Tidak dapat menghapus akun Admin Utama.

  * Dapat mengganti password akunnya sendiri.

* **Admin Petugas (`petugas`)**

  * Dapat melakukan konfirmasi kunjungan.

  * Dapat menolak kunjungan dan memberikan alasan penolakan.

  * Dapat melihat data kunjungan.

  * Dapat melihat detail kunjungan.

  * Dapat mengganti password akunnya sendiri.

  * Tidak dapat menambah atau menghapus akun admin lain.

Akun Admin Petugas dibuat langsung oleh Admin Utama dan dapat langsung digunakan untuk login tanpa proses persetujuan tambahan.

Sistem tidak lagi menggunakan mekanisme pendaftaran admin publik atau daftar admin yang menunggu persetujuan.

Admin Utama ditentukan berdasarkan nilai `role = "utama"` dan tidak bergantung pada ID admin tertentu.

ID admin menggunakan format tiga digit seperti:

```text
001
002
003
```

ID yang sudah tidak digunakan dapat digunakan kembali ketika membuat admin baru.





## Status Kunjungan

Sistem menggunakan beberapa status kunjungan:

| Status | Keterangan |
| ---------------------- | --------------------------------------------- |
| `Menunggu Persetujuan` | Kunjungan baru dan belum diverifikasi petugas |
| `Diterima` | Kunjungan telah diterima dan tamu dapat masuk |
| `Ditolak` | Kunjungan ditolak oleh petugas |
| `Kunjungan Selesai` | Tamu telah melakukan konfirmasi keluar |

Untuk kunjungan yang berstatus `Ditolak`, sistem dapat menyimpan `alasan_ditolak`. Alasan tersebut dapat ditampilkan pada detail kunjungan dan halaman status tamu.

Alur umum kunjungan:

```text
Tamu Mengisi Form
       ↓
Menunggu Persetujuan
       ↓
 ┌─────┴─────┐
 ↓           ↓
Diterima    Ditolak
 ↓
Tamu Melakukan Kunjungan
 ↓
Form Keluar
 ↓
Kunjungan Selesai
```





## Teknologi

| Bagian | Teknologi |
| ------------------ | ------------------------------------------------------------------------ |
| Frontend | React.js, Vite, React Router, Axios, Recharts, React Datepicker, SheetJS |
| Backend | Node.js, Express.js |
| Arsitektur Backend | MVC |
| Database | MySQL (Aiven) |
| Autentikasi | JWT (cookie httpOnly) + bcrypt |
| HTTP Client | Axios |
| Export Data | SheetJS (`xlsx`) |
| Realtime | Polling (kompatibel Vercel) |





## Struktur Folder

```text
repo/
├── api/index.js            ← entry point Vercel Serverless Function
├── backend/src/
│   ├── controllers/        ← logika request & response
│   ├── middleware/         ← autentikasi, rate limit, anti-CSRF, error handler
│   ├── models/             ← query database
│   ├── routes/             ← endpoint API
│   ├── utils/              ← kode akses, lokasi, validasi, tanggal, cookie
│   ├── app.js              ← aplikasi Express
│   ├── server.js           ← server lokal / Render / VPS
│   ├── config.js           ← environment variable
│   └── database.js         ← pool MySQL (Aiven, TLS)
├── frontend/               ← React + Vite
├── database/skema.sql      ← skema database
├── scripts/                ← migrasi & pembuatan admin
├── vercel.json
├── .env.example
├── DEPLOY.md               ← panduan deploy + daftar perbaikan keamanan
└── package.json
```



## Instalasi

Lihat **[DEPLOY.md](DEPLOY.md)** untuk langkah lengkap (lokal, Vercel, Aiven).

Ringkas (lokal):

```bash
npm install            # install backend + frontend
cp .env.example .env   # isi data Aiven + JWT_SECRET
npm run db:migrasi     # buat/perbarui tabel
npm run admin:buat -- admin "Admin Utama" --utama
npm run dev            # API :3001 + frontend :5173
```



## Routing Frontend

### Halaman Publik

| Path | Fungsi |
| -------------- | ------------------------------- |
| `/form-masuk` | Form pencatatan kunjungan masuk |
| `/form-keluar` | Form konfirmasi tamu keluar |
| `/status/:id` | Melihat status kunjungan |
| `/login` | Login admin |





### Halaman Admin

Seluruh halaman berikut berada di bawah `/admin` dan membutuhkan autentikasi:

| Path | Fungsi |
| --------------------------------- | ------------------------------------------ |
| `/admin` | Dashboard admin |
| `/admin/admin-tamu-menunggu` | Kunjungan yang menunggu/kunjungan hari ini |
| `/admin/admin-riwayat-tamu` | Riwayat seluruh kunjungan |
| `/admin/admin-tamu-hari-ini` | Kunjungan pada tanggal berjalan |
| `/admin/admin-list-petugas-admin` | Pengelolaan admin petugas oleh Admin Utama |

Akses ke halaman admin dilindungi oleh autentikasi JWT.

Halaman `/admin/admin-list-petugas-admin` hanya dapat diakses oleh Admin Utama.





## Endpoint API

### Pengunjung

Base URL:

```text
/api/pengunjung
```

| Method | Path | Akses | Fungsi |
| ------- | ------------- | ------------- | ---------------------------------- |
| `POST` | `/` | Publik | Membuat kunjungan baru (mengembalikan `kodeAkses`) |
| `POST` | `/:id/cek` | Publik + kode akses | Melihat status kunjungan sendiri |
| `POST` | `/:id/keluar` | Publik + kode akses | Mencatat tamu keluar |
| `GET` | `/` | Admin | Mengambil seluruh data kunjungan |
| `GET` | `/versi` | Admin | Penanda perubahan data (polling) |
| `POST` | `/:id/keluar-petugas` | Admin Petugas | Mencatat tamu keluar (bila tamu kehilangan kode akses) |
| `PATCH` | `/:id/status` | Admin Petugas | Menerima atau menolak kunjungan |

Saat melakukan penolakan, endpoint status dapat menerima alasan penolakan.

Nama petugas verifikasi diambil otomatis dari sesi login/JWT.





### Admin

Base URL:

```text
/api/admin
```

| Method | Path | Akses | Fungsi |
| -------- | ----------------- | ----------- | ------------------------------ |
| `POST` | `/login` | Publik | Login admin (set cookie httpOnly) |
| `POST` | `/logout` | Publik | Hapus cookie sesi |
| `GET` | `/saya` | Admin | Mengambil data sesi admin |
| `PATCH` | `/ganti-password` | Admin | Mengganti password sendiri |
| `GET` | `/semua` | Admin Utama | Mengambil seluruh daftar admin |
| `POST` | `/tambah` | Admin Utama | Membuat Admin Petugas baru |
| `DELETE` | `/:id` | Admin Utama | Menghapus akses Admin Petugas |

Endpoint pengelolaan admin dilindungi oleh autentikasi JWT dan pembatasan role Admin Utama.





## Database

Database utama menggunakan MySQL.

### Tabel `admin`

Menyimpan akun pengguna panel admin.

Kolom utama:

```text
id_admin
username
password
nama_petugas
role
```

Role yang digunakan:

```text
utama
petugas
```

`id_admin` menggunakan format tiga digit seperti:

```text
001
002
003
```

ID dibuat oleh backend dan slot ID yang sudah kosong dapat digunakan kembali.

Password admin disimpan dalam bentuk hash menggunakan bcrypt.





### Tabel `pengunjung`

Menyimpan data utama setiap kunjungan:

```text
id_pengunjung
unit_kerja_instansi
keperluan
status
nama_petugas_verifikasi
waktu_masuk
waktu_keluar
alasan_ditolak
```





### Tabel `pengunjung_nama`

Menyimpan nama tamu yang terhubung dengan suatu kunjungan.

Struktur ini memungkinkan satu nomor kunjungan digunakan untuk beberapa orang dalam satu rombongan.





### Tabel `nomor_kunjungan`

Digunakan untuk menghasilkan nomor kunjungan berdasarkan tanggal dengan format:

```text
DDMMYYYY-NNN
```

Contoh:

```text
18092026-001
18092026-002
18092026-003
```





## Keamanan

Ringkasan (detail & daftar celah yang diperbaiki ada di [DEPLOY.md](DEPLOY.md#perubahan-keamanan-hasil-audit)):

* Password admin di-hash bcrypt (cost 12); minimal 8 karakter, huruf + angka.
* Sesi admin: JWT di cookie **httpOnly + Secure + SameSite=Strict**, divalidasi ulang ke database tiap request; ganti password membatalkan semua sesi lama.
* Tamu hanya bisa melihat/mengakhiri kunjungannya sendiri dengan **kode akses 6 karakter**.
* Rate limit login & form tamu (tersimpan di database).
* Anti-CSRF (cek Origin), CORS same-origin, security headers (CSP, HSTS, X-Frame-Options).
* Koneksi database TLS terverifikasi (`DB_CA_CERT`).
* Validasi & batas panjang input di backend, error handler tanpa bocoran detail.
* Rahasia (`.env`) tidak pernah di-commit — lihat `.env.example`.



## Export Excel

Halaman **Riwayat Tamu** menyediakan fitur **Unduh Excel**.

Data yang diekspor mencakup:

* Nomor Kunjungan

* Nama Tamu

* Unit Kerja / Instansi

* Keperluan

* Status

* Waktu Masuk

* Waktu Keluar

* Petugas Verifikasi

* Alasan Ditolak

Judul laporan Excel:

```text
Riwayat Tamu
```

Package yang digunakan:

```text
xlsx
```

Instalasi package xlsx (di folder frontend):

```bash
npm install xlsx
```





## Realtime Update

Vercel (serverless) tidak mendukung WebSocket, sehingga Socket.IO diganti **polling ringan**:

* Halaman admin memanggil `GET /api/pengunjung/versi` setiap 5 detik (hanya saat tab aktif). Jika versi berubah, data dimuat ulang.
* Halaman status tamu memeriksa statusnya sendiri setiap 8 detik selama kunjungan masih aktif.



## Waktu dan Tanggal

Sistem menggunakan zona waktu Indonesia untuk menentukan tanggal berjalan.

Zona waktu yang digunakan:

```text
Asia/Jakarta
```

Dengan demikian, penentuan data:

```text
Hari Ini
```

mengikuti waktu Indonesia/WIB dan tidak bergantung pada timezone browser.

Waktu masuk dan waktu keluar kunjungan tetap dicatat oleh backend dan database.





## Halaman Developer

Footer halaman publik memiliki link menuju halaman informasi tim pengembang:

```text
Copyright © — Tim Magang Unit Jaringan Komunikasi BBMKG Wilayah II 2026
```

Halaman developer dibuat sebagai halaman statis menggunakan HTML dan CSS, bukan sebagai halaman React.

Tambahkan sendiri untuk halaman developer dengan struktur seperti di bawah ini.

Struktur:

```text
frontend/
└── public/
    └── developer-info-page/
        ├── developer-info-index.html
        ├── style.css
        └── images/
            ├── developer-1.jpg
            ├── developer-2.jpg
            ├── developer-3.jpg
            └── ...
```

Halaman developer berisi:

* Informasi tim pengembang

* Foto anggota tim

* Nama anggota

* Universitas

* Informasi sistem

* Tombol kembali ke aplikasi





## Deployment

Aplikasi siap di-deploy ke **Vercel** (gratis) dengan database **Aiven MySQL**, atau ke Render/Railway/VPS sebagai server Node biasa. Lihat [DEPLOY.md](DEPLOY.md).

Untuk menjalankan aplikasi **dan** database di **PC Windows yang menyala 24 jam** dengan domain **https://logbook-tamu.jkbw2.my.id** (Cloudflare Tunnel, backup harian otomatis), lihat [deploy/windows/PANDUAN-PC-WINDOWS.md](deploy/windows/PANDUAN-PC-WINDOWS.md).

Perintah database:

| Perintah | Fungsi |
| --- | --- |
| `npm run db:migrasi` | Membuat/memperbarui tabel tanpa menghapus data |
| `npm run db:backup -- <folder>` | Backup semua tabel ke `.sql` + `.json` |
| `npm run db:impor -- <file.sql>` | Impor backup lalu migrasi (ditolak bila DB sudah berisi data, kecuali `--timpa`) |
| `npm run admin:buat -- <user> "<Nama>" [--utama]` | Buat admin dengan password acak |



## Catatan Pengembangan

* File `.env` tidak disertakan dalam repository. Salin dari `.env.example` (lokal) atau isi Environment Variables di Vercel.

* Jangan menyimpan password database atau `JWT_SECRET` secara langsung di source code.

* Admin Petugas tidak memiliki proses pendaftaran atau approval publik.

* Admin Petugas hanya dapat dibuat oleh Admin Utama.

* Admin Utama ditentukan berdasarkan `role = "utama"` dan tidak berdasarkan ID tertentu.

* Admin Utama tidak dapat dihapus.

* Alasan penolakan bersifat opsional dan dapat bernilai kosong/null.

* Satu nomor kunjungan dapat digunakan untuk beberapa nama tamu dalam satu rombongan.

* Nomor kunjungan dibuat oleh backend dengan format `DDMMYYYY-NNN`.

* Nomor kunjungan aktif disimpan sementara pada browser menggunakan `localStorage`.

* Kunjungan yang masih berstatus `Menunggu Persetujuan` dari hari sebelumnya tetap ditampilkan pada halaman Tamu Menunggu.

* Halaman Tamu Hari Ini menampilkan seluruh kunjungan pada tanggal berjalan.

* Waktu keluar dicatat ketika tamu melakukan proses keluar.

* Detail kunjungan ditampilkan melalui modal tanpa harus berpindah halaman.

* Perubahan data kunjungan diperbarui otomatis melalui polling (kompatibel Vercel).

* Penentuan tanggal berjalan menggunakan zona waktu `Asia/Jakarta`.

* Halaman informasi developer dibuat sebagai halaman statis terpisah dari aplikasi React.

* Untuk deployment pada jaringan internal, pembatasan akses terhadap panel admin sebaiknya dilakukan pada konfigurasi jaringan atau web server selain tetap menggunakan autentikasi aplikasi.
