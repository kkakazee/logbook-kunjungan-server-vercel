# Tutorial: Logbook Jarkom di PC Windows → https://logbook-tamu.jkbw2.my.id

Tutorial ini memasang aplikasi Logbook Kunjungan **dan** database-nya di
satu PC Windows yang menyala 24 jam, lalu menghubungkannya ke domain
**https://logbook-tamu.jkbw2.my.id** memakai **Cloudflare Tunnel** (gratis).

```text
 HP tamu / admin (WiFi kantor, 4G, di mana saja)
            │  https://logbook-tamu.jkbw2.my.id
            ▼
   Cloudflare (HTTPS, sertifikat otomatis, perlindungan DDoS)
            │  terowongan terenkripsi (dibuka DARI PC ke Cloudflare)
            ▼
   PC Windows di kantor
     ├─ cloudflared   (Windows Service)
     ├─ Aplikasi      (Node.js, 127.0.0.1:3001, Task Scheduler)
     └─ MySQL 8       (127.0.0.1:3306, Windows Service)
```

Keuntungan cara ini:
- **Tidak perlu IP publik, tidak perlu port forwarding** di router kantor.
- **HTTPS otomatis** (gembok hijau) — fitur GPS di HP juga berfungsi.
- **Database tidak pernah terbuka ke internet**; aplikasi pun hanya bisa
  dijangkau lewat terowongan.

Perkiraan waktu: 1–1,5 jam. Semua langkah dikerjakan di PC tujuan
(lewat AnyDesk), kecuali Bagian 8 yang bisa dari browser mana saja.

---

## Daftar isi

1. [Persiapan PC](#1-persiapan-pc)
2. [Install software](#2-install-software)
3. [Siapkan MySQL](#3-siapkan-mysql)
4. [Ambil kode aplikasi](#4-ambil-kode-aplikasi)
5. [Buat file .env](#5-buat-file-env)
6. [Impor data lama](#6-impor-data-lama)
7. [Build, uji, dan jalankan otomatis](#7-build-uji-dan-jalankan-otomatis)
8. [Hubungkan ke domain dengan Cloudflare Tunnel](#8-hubungkan-ke-domain-dengan-cloudflare-tunnel)
9. [Pengujian akhir](#9-pengujian-akhir)
10. [Aktifkan cek lokasi (opsional)](#10-aktifkan-cek-lokasi-opsional)
11. [Buat QR code & matikan Aiven](#11-buat-qr-code--matikan-aiven)
12. [Perawatan & pemecahan masalah](#12-perawatan--pemecahan-masalah)

---

## 1. Persiapan PC

1. **Jangan pernah sleep**
   Settings → System → Power (& battery) → *Screen, sleep & hibernate* →
   "When plugged in, put my device to sleep after" = **Never**.
2. **Atur jam restart Windows Update**
   Settings → Windows Update → Advanced options → **Active hours** →
   *Manually*, isi mis. **06:00 – 21:00**. Restart otomatis akan terjadi di
   luar jam itu, dan aplikasi menyala sendiri setelahnya.
3. **Cek koneksi keluar ke Cloudflare** (kadang diblok firewall kantor).
   Buka PowerShell, jalankan:
   ```powershell
   Test-NetConnection region1.v2.argotunnel.com -Port 7844
   ```
   `TcpTestSucceeded : True` → aman. Jika `False`, minta bagian IT membuka
   koneksi **keluar** ke port **7844** (TCP & UDP).
4. Sangat disarankan memakai **UPS**.

## 2. Install software

Unduh dari situs resmi, install dengan opsi default kecuali yang disebut.

| Software | Unduh | Catatan |
| --- | --- | --- |
| Node.js 22 LTS | https://nodejs.org | Default |
| Git for Windows | https://git-scm.com/download/win | Default |
| MySQL 8.4 LTS (Windows MSI Installer) | https://dev.mysql.com/downloads/mysql/ | Lihat Bagian 3 |
| cloudflared (64-bit .msi) | https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/#windows | Dipakai di Bagian 8 |

> Pakai **MySQL 8**, bukan MariaDB/XAMPP — file backup dari Aiven berformat
> MySQL 8 dan belum tentu bisa diimpor ke MariaDB.

Setelah semua terpasang, **tutup lalu buka ulang PowerShell** agar perintah
`node`, `npm`, dan `git` dikenali. Cek:

```powershell
node -v
git --version
```

## 3. Siapkan MySQL

### 3.1 Saat instalasi (MySQL Configurator)

- **Config Type**: *Server Computer* (atau *Development Computer*)
- **Port**: `3306`
- **Hapus centang "Open Windows Firewall ports for network access"**
  (database tidak boleh bisa diakses dari luar PC)
- **Root password**: buat yang kuat, simpan di tempat aman
- **Windows Service**: centang *Configure MySQL Server as a Windows Service*
  dan *Start the MySQL Server at System Startup*

### 3.2 Buat database & user khusus aplikasi

Buka **MySQL 8.4 Command Line Client** dari Start Menu, masukkan password
root, lalu jalankan (ganti `PasswordKuatDiSini` dengan password baru yang
kuat — simpan, akan dipakai di Bagian 5):

```sql
CREATE DATABASE logbook CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'logbook'@'localhost' IDENTIFIED BY 'PasswordKuatDiSini';
GRANT ALL PRIVILEGES ON logbook.* TO 'logbook'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3.3 Kunci MySQL hanya untuk PC ini

1. Buka File Explorer, ketik di address bar:
   `C:\ProgramData\MySQL\MySQL Server 8.4\`
2. Buka `my.ini` dengan Notepad **(Run as administrator)**.
3. Di bawah baris `[mysqld]`, tambahkan:
   ```ini
   bind-address=127.0.0.1
   ```
4. Simpan. Restart MySQL: Start → ketik **Services** → cari **MySQL84** →
   klik kanan → **Restart**.

## 4. Ambil kode aplikasi

Buka **PowerShell** (biasa):

```powershell
cd C:\
git clone https://github.com/kkakazee/logbook-kunjungan-server-vercel.git logbook
cd C:\logbook
npm install
```

> Jika repository bersifat *private*, Git akan meminta login GitHub —
> login di jendela browser yang muncul.

## 5. Buat file `.env`

1. Buat kunci rahasia sesi login:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
   Salin hasilnya.
2. Buka Notepad, tempel isi berikut, lalu ganti 2 bagian yang ditandai:

```env
# ===== Database lokal =====
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=logbook
# Ganti dengan password dari Bagian 3.2
DB_PASSWORD=PasswordKuatDiSini
DB_NAME=logbook
DB_SSL=false

# ===== Sesi login =====
# Ganti dengan kunci dari langkah 1
JWT_SECRET=TEMPEL_HASIL_LANGKAH_1_DI_SINI

# ===== Server di belakang Cloudflare Tunnel =====
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
TRUST_PROXY=loopback
IP_HEADER=cf-connecting-ip

# ===== Cek lokasi tamu (dimatikan dulu, lihat Bagian 10) =====
LOKASI_LAT=-6.3026346
LOKASI_LNG=106.75639
LOKASI_RADIUS_METER=200
LOKASI_AKTIF=false
VITE_LOKASI_AKTIF=false
```

3. **File → Save As**:
   - Folder: `C:\logbook`
   - File name: `.env`
   - Save as type: **All files (\*.\*)** ← penting, agar tidak jadi `.env.txt`
   - Encoding: **UTF-8**

> Baris yang diawali `#` adalah catatan dan boleh dibiarkan. Jangan menaruh
> catatan di ujung baris yang sama dengan nilai.

## 6. Impor data lama

1. Salin file backup dari komputer lama, mis.
   `backup-2026-11-08T02-45-45.sql`, ke PC ini di folder
   `C:\logbook-backup\`.
2. Di PowerShell:
   ```powershell
   cd C:\logbook
   npm run db:impor -- "C:\logbook-backup\backup-2026-11-08T02-45-45.sql"
   ```
3. Harus tampil jumlah baris (admin 7, pengunjung 6, dst.) lalu
   `Migrasi selesai. Jumlah admin utama: 1`.

Semua akun admin & petugas lama **tetap bisa login dengan password lama**.

> Mulai dari database kosong (tanpa data lama)? Ganti langkah 2 dengan:
> ```powershell
> npm run db:migrasi
> npm run admin:buat -- admin "Admin Utama" --utama
> ```

## 7. Build, uji, dan jalankan otomatis

### 7.1 Build & uji manual

```powershell
cd C:\logbook
npm run build
npm start
```

Buka **http://localhost:3001** di browser PC itu → Form Masuk harus tampil.
Coba login admin di **http://localhost:3001/login**.
Kembali ke PowerShell, tekan **Ctrl + C** untuk menghentikan.

### 7.2 Jalankan otomatis + backup harian

Buka **PowerShell sebagai Administrator** (klik kanan ikon PowerShell →
*Run as administrator*):

```powershell
cd C:\logbook
powershell -ExecutionPolicy Bypass -File deploy\windows\pasang-autostart.ps1
```

Harus muncul tiga baris `[OK]`, terakhir
`[OK] Server berjalan: http://localhost:3001`.

Yang terpasang:
- **Logbook Jarkom - Server** — menyala saat PC hidup (tanpa perlu login
  Windows), restart otomatis bila berhenti. Log: `C:\logbook\logs\server.log`
- **Logbook Jarkom - Backup** — setiap hari 23:00 ke `C:\logbook\backup`
  (rotasi otomatis: 7 harian + 4 mingguan + 12 bulanan).

Agar backup juga tersimpan di luar PC (disarankan), arahkan ke folder yang
disinkron Google Drive / OneDrive / NAS, contoh:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\pasang-autostart.ps1 -FolderBackup "G:\My Drive\Backup Logbook"
```

## 8. Hubungkan ke domain dengan Cloudflare Tunnel

Domain `jkbw2.my.id` sudah dikelola di Cloudflare, jadi tinggal 4 langkah.
Login ke **https://dash.cloudflare.com** dengan akun pemilik domain.

### 8.1 Hapus record DNS lama `logbook-tamu`

Saat ini `logbook-tamu.jkbw2.my.id` masih mengarah ke layanan lama
(Railway — sudah tidak aktif, menampilkan "Application not found").
Record ini harus dihapus agar tidak bentrok dengan tunnel.

1. Pilih domain **jkbw2.my.id** → menu **DNS** → **Records**.
2. Cari baris dengan *Name* **logbook-tamu** (biasanya tipe CNAME).
3. **Edit → Delete**. Hanya baris `logbook-tamu` — jangan hapus record lain.

### 8.2 Buat tunnel

1. Kembali ke halaman akun, buka **Networking → Tunnels**
   (di sebagian akun berada di **Zero Trust → Networks → Tunnels**).
   Jika diminta memilih paket Zero Trust, pilih **Free** (tidak ditagih).
2. **Create a tunnel** → pilih **Cloudflared**.
3. Nama tunnel: `pc-logbook-jarkom` → **Create / Save tunnel**.
4. Pada *Choose your environment* pilih **Windows**, **64-bit**.
5. Salin perintah yang tampil, bentuknya:
   ```text
   cloudflared.exe service install eyJhIjoi......(token panjang)
   ```
   **Token ini rahasia** — jangan dibagikan.

### 8.3 Pasang tunnel di PC

1. Pastikan **cloudflared .msi** dari Bagian 2 sudah terinstall.
2. Buka **Command Prompt sebagai Administrator** (Start → ketik `cmd` →
   klik kanan → *Run as administrator*).
3. Tempel perintah dari 8.2 langkah 5, tekan Enter.
4. Kembali ke dashboard Cloudflare — dalam ±1 menit status konektor berubah
   menjadi **Connected / Healthy**. Klik **Next / Continue**.

`cloudflared` sekarang berjalan sebagai Windows Service dan menyala sendiri
setiap PC hidup.

### 8.4 Arahkan domain ke aplikasi

Pada tunnel `pc-logbook-jarkom`, buka tab **Routes** → **Add route** →
**Published application** (di tampilan lama: tab **Public Hostname** →
*Add a public hostname*). Isi:

| Kolom | Isi |
| --- | --- |
| Subdomain | `logbook-tamu` |
| Domain | `jkbw2.my.id` |
| Path | *(kosongkan)* |
| Service / Service URL | `http://127.0.0.1:3001` (tampilan lama: Type **HTTP**, URL **127.0.0.1:3001**) |

> Tulis `127.0.0.1`, **bukan** `localhost` — di Windows `localhost` bisa
> diarahkan ke IPv6 sehingga muncul error 502.

Klik **Save / Add route**. Cloudflare otomatis membuat record DNS baru untuk
`logbook-tamu` yang mengarah ke tunnel.

> Jika muncul error "record already exists", ulangi Bagian 8.1.

### 8.5 Pengaturan keamanan domain (sekali saja)

Di domain **jkbw2.my.id**:
- **SSL/TLS → Edge Certificates** → **Always Use HTTPS**: **On**
- **SSL/TLS → Edge Certificates** → **Minimum TLS Version**: **TLS 1.2**

### 8.6 Coba buka

Tunggu 1–2 menit, lalu buka **https://logbook-tamu.jkbw2.my.id** →
Form Masuk harus tampil dengan gembok HTTPS.

## 9. Pengujian akhir

Centang semua sebelum dipakai resmi:

- [ ] Dari HP dengan **data seluler** (WiFi dimatikan) buka
      https://logbook-tamu.jkbw2.my.id → Form Masuk tampil.
- [ ] Isi Form Masuk sebagai tamu → muncul nomor & **kode akses**.
- [ ] Dari perangkat lain buka https://logbook-tamu.jkbw2.my.id/login → login
      petugas → tamu tadi muncul di *Tamu Menunggu* dalam ±5 detik → **Terima**.
- [ ] Halaman status tamu berubah sendiri menjadi *Diterima* (±8 detik).
- [ ] Tamu buka **Form Keluar** → kunjungan selesai.
- [ ] Data lama (Oktober 2026) tampil di *Riwayat Tamu*.
- [ ] **Cek IP terbaca benar**: login admin dengan password salah 1×, lalu di
      PC buka `C:\logbook\logs\server.log`. Baris terakhir
      `[login gagal] ... ip=` harus berisi **IP HP Anda**, bukan `127.0.0.1`.
- [ ] **Restart PC**, jangan login Windows, tunggu 3 menit → situs bisa
      dibuka lagi dari HP.
- [ ] Besok pagi: ada file baru di folder backup.

## 10. Aktifkan cek lokasi (opsional)

Karena sudah HTTPS, GPS di HP tamu berfungsi. Jika ingin form hanya bisa
diisi di sekitar kantor (radius 200 m):

1. Edit `C:\logbook\.env` — **hapus** 2 baris:
   ```env
   LOKASI_AKTIF=false
   VITE_LOKASI_AKTIF=false
   ```
2. PowerShell (Administrator):
   ```powershell
   cd C:\logbook
   npm run build
   Stop-ScheduledTask "Logbook Jarkom - Server"; Start-ScheduledTask "Logbook Jarkom - Server"
   ```

Koordinat kantor ada di `LOKASI_LAT` / `LOKASI_LNG` dan juga di
`frontend\src\components\ProteksiLokasi.jsx` — pastikan keduanya sama.

## 11. Buat QR code & matikan Aiven

**QR code** (buat di situs pembuat QR mana pun, mis. qr-code-generator):

| Ditempel di | Alamat |
| --- | --- |
| Pintu masuk | `https://logbook-tamu.jkbw2.my.id/form-masuk` |
| Pintu keluar | `https://logbook-tamu.jkbw2.my.id/form-keluar` |
| Untuk petugas | `https://logbook-tamu.jkbw2.my.id/login` |

**Aiven**: setelah Bagian 9 lolos semua, buka console.aiven.io → service
`mysql-tamujkbw2` → **Power off**, lalu (jika tidak dipakai lagi) **Delete
service** dan hapus metode pembayaran agar tidak ada tagihan. Data sudah
aman di MySQL PC dan di file backup.

## 12. Perawatan & pemecahan masalah

### Perintah berguna (PowerShell sebagai Administrator)

```powershell
# Restart aplikasi
Stop-ScheduledTask "Logbook Jarkom - Server"; Start-ScheduledTask "Logbook Jarkom - Server"

# Lihat 30 baris log terakhir
Get-Content C:\logbook\logs\server.log -Tail 30

# Backup manual sekarang
cd C:\logbook; npm run db:backup

# Status tunnel
Get-Service cloudflared
```

### Memperbarui aplikasi

```powershell
cd C:\logbook
git pull
npm install
npm run build
npm run db:migrasi
Stop-ScheduledTask "Logbook Jarkom - Server"; Start-ScheduledTask "Logbook Jarkom - Server"
```

### Memulihkan dari backup

```powershell
cd C:\logbook
npm run db:impor -- "C:\logbook\backup\backup-YYYY-MM-DDTHH-MM-SS.sql" --timpa
```

`--timpa` mengganti seluruh data saat ini dengan isi backup.

### Jika situs tidak bisa dibuka

| Yang tampil di browser | Artinya | Cara memperbaiki |
| --- | --- | --- |
| **Error 1033** / "Argo Tunnel error" | Tunnel di PC mati / PC mati / internet PC putus | Pastikan PC menyala & online. `Get-Service cloudflared` harus *Running*; jika tidak: `Start-Service cloudflared` |
| **502 Bad Gateway** | Tunnel jalan, tapi aplikasi mati — atau Service URL berisi `localhost` | Pastikan Service URL `http://127.0.0.1:3001` (Bagian 8.4). Restart aplikasi, lalu cek `logs\server.log` |
| Halaman error "Terjadi kesalahan pada server" | Aplikasi jalan, database bermasalah | Cek service **MySQL84** di *Services* → harus *Running* |
| "Application not found" (Railway) | Record DNS lama belum dihapus | Ulangi Bagian 8.1 lalu 8.4 |
| Login berhasil tapi langsung keluar lagi | Diakses lewat `http://` bukan `https://` | Selalu pakai `https://logbook-tamu.jkbw2.my.id` (aktifkan *Always Use HTTPS*, Bagian 8.5) |

### Mencopot semuanya

```powershell
powershell -ExecutionPolicy Bypass -File C:\logbook\deploy\windows\hapus-autostart.ps1
cloudflared.exe service uninstall
```
