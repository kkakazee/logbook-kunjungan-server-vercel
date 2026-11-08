# Panduan: Logbook Jarkom di PC Windows (nyala 24 jam)

Aplikasi **dan** database berjalan di satu PC Windows. Tamu & admin
mengaksesnya dari mana saja lewat **HTTPS** menggunakan tunnel gratis,
tanpa membuka port di router dan tanpa membuka database ke internet.

```text
HP tamu / admin ──HTTPS──► Tailscale Funnel / Cloudflare Tunnel
                                   │  (berjalan di PC yang sama)
                                   ▼
                     PC Windows ── Aplikasi (127.0.0.1:3001)
                                └─ MySQL   (127.0.0.1:3306)
```

Perkiraan waktu: ±1 jam. Kerjakan lewat AnyDesk di PC tersebut.

---

## 0. Persiapan PC

1. **Jangan sleep**: Settings → System → Power → *Screen and sleep* →
   "When plugged in, put my device to sleep after" = **Never**.
2. **Windows Update**: Settings → Windows Update → *Advanced options* →
   *Active hours* → isi jam kerja (mis. 06:00–20:00) supaya restart otomatis
   terjadi di luar jam kerja.
3. **Auto-login tidak diperlukan** — aplikasi berjalan sebelum ada yang login.
4. Disarankan memakai **UPS**.

## 1. Install software

Unduh dari situs resminya, install dengan opsi default kecuali yang disebut:

| Software | Link | Catatan |
| --- | --- | --- |
| **Node.js 22 LTS** | https://nodejs.org | Opsi default |
| **Git for Windows** | https://git-scm.com/download/win | Opsi default |
| **MySQL 8.4 LTS** (MySQL Installer / MSI) | https://dev.mysql.com/downloads/mysql/ | Lihat langkah 2 |

> Pakai **MySQL 8**, bukan MariaDB/XAMPP: file backup dari Aiven memakai
> format MySQL 8 yang belum tentu bisa diimpor ke MariaDB.

## 2. Siapkan MySQL

Saat instalasi MySQL:
- *Config Type*: **Development Computer** / **Server Computer**
- Port: **3306**
- **HAPUS centang "Open Windows Firewall ports for network access"**
  (database tidak boleh bisa diakses dari luar PC)
- Buat password **root** yang kuat, simpan baik-baik
- *Windows Service*: centang **Start the MySQL Server at System Startup**

Setelah terpasang, buka **MySQL 8.4 Command Line Client** (dari Start Menu),
masukkan password root, lalu jalankan (ganti `PasswordKuatDiSini`):

```sql
CREATE DATABASE logbook CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'logbook'@'localhost' IDENTIFIED BY 'PasswordKuatDiSini';
GRANT ALL PRIVILEGES ON logbook.* TO 'logbook'@'localhost';
FLUSH PRIVILEGES;
```

Agar MySQL hanya mendengarkan dari PC itu sendiri, buka file
`C:\ProgramData\MySQL\MySQL Server 8.4\my.ini` (folder ProgramData
tersembunyi — ketik alamatnya di File Explorer), cari bagian `[mysqld]`,
tambahkan baris:

```ini
bind-address=127.0.0.1
```

Simpan, lalu restart service: Start → ketik **Services** → *MySQL84* →
**Restart**.

## 3. Ambil kode aplikasi

Buka **PowerShell**, lalu:

```powershell
cd C:\
git clone https://github.com/kkakazee/logbook-kunjungan-server-vercel.git logbook
cd C:\logbook
npm install
```

## 4. Buat file `.env`

Buat file `C:\logbook\.env` (pakai Notepad, *Save as type: All files*), isi:

```env
# Database lokal
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=logbook
DB_PASSWORD=PasswordKuatDiSini
DB_NAME=logbook
DB_SSL=false

# Buat dengan: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_SECRET=

# Mode produksi di belakang tunnel HTTPS
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
TRUST_PROXY=loopback
# Hanya untuk Cloudflare Tunnel (langkah 8B):
# IP_HEADER=cf-connecting-ip

# Cek lokasi tamu (radius dari kantor). Hapus 2 baris "false" untuk mengaktifkan.
LOKASI_LAT=-6.3026346
LOKASI_LNG=106.75639
LOKASI_RADIUS_METER=200
LOKASI_AKTIF=false
VITE_LOKASI_AKTIF=false
```

## 5. Impor data lama (backup Aiven)

Salin file backup `.sql` ke PC (mis. `C:\logbook-backup\`), lalu:

```powershell
cd C:\logbook
npm run db:impor -- "C:\logbook-backup\backup-2026-11-08T02-45-45.sql"
```

Script ini mengimpor semua tabel lalu otomatis menjalankan migrasi.
Semua akun admin lama tetap bisa login dengan password yang sama.

> Jika memulai dari database kosong (tanpa backup):
> `npm run db:migrasi` lalu `npm run admin:buat -- admin "Admin Utama" --utama`

## 6. Build & uji jalan

```powershell
npm run build
npm start
```

Buka `http://localhost:3001` di browser PC itu — harus muncul Form Masuk,
dan login admin di `http://localhost:3001/login` harus berhasil.
Tekan **Ctrl+C** untuk menghentikan.

## 7. Jalankan otomatis saat PC menyala + backup harian

Buka **PowerShell sebagai Administrator** (klik kanan → *Run as administrator*):

```powershell
cd C:\logbook
powershell -ExecutionPolicy Bypass -File deploy\windows\pasang-autostart.ps1
```

Ini mendaftarkan:
- **Logbook Jarkom - Server** — menyala otomatis saat PC hidup, restart
  sendiri bila berhenti. Log: `C:\logbook\logs\server.log`
- **Logbook Jarkom - Backup** — backup setiap hari jam 23:00 ke
  `C:\logbook\backup` (30 backup terakhir disimpan).

Simpan backup juga ke luar PC (sangat disarankan), misalnya folder yang
tersinkron Google Drive:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\pasang-autostart.ps1 -FolderBackup "G:\My Drive\Backup Logbook"
```

Untuk menghapus tugas: `deploy\windows\hapus-autostart.ps1`.

## 8. Akses dari mana saja (HTTPS)

Pilih **salah satu**.

### 8A. Tailscale Funnel — gratis, tanpa domain (paling mudah)

1. Install **Tailscale** dari https://tailscale.com/download/windows, login
   (akun Google/Microsoft/GitHub).
2. Di PowerShell (Administrator):
   ```powershell
   tailscale funnel --bg 3001
   ```
   Jika diminta, buka link yang muncul untuk mengaktifkan **HTTPS** dan
   **Funnel** di akun Tailscale, lalu ulangi perintahnya.
3. Alamat publik akan tampil, contoh:
   `https://pc-jarkom.tailXXXX.ts.net` — inilah alamat untuk QR tamu.
   Pengaturan ini tetap aktif setelah PC restart.

### 8B. Cloudflare Tunnel — gratis, butuh domain sendiri

Cocok jika ingin alamat seperti `logbook.namadomain.id`.
1. Domain harus sudah dikelola di Cloudflare (gratis).
2. Cloudflare Dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel**
   → pilih *Cloudflared* → Windows → jalankan perintah
   `cloudflared.exe service install <token>` yang diberikan (PowerShell Admin).
3. Tambah **Public Hostname**: `logbook.namadomain.id` → Service
   `HTTP` → `localhost:3001`.
4. Di `.env` aktifkan `IP_HEADER=cf-connecting-ip`, lalu restart tugas server:
   ```powershell
   Stop-ScheduledTask "Logbook Jarkom - Server"; Start-ScheduledTask "Logbook Jarkom - Server"
   ```

## 9. Cek akhir

- [ ] Dari HP memakai **data seluler** (bukan WiFi kantor), buka alamat HTTPS
      → Form Masuk tampil.
- [ ] Daftar sebagai tamu, login petugas dari perangkat lain, setujui → status
      tamu berubah sendiri.
- [ ] Coba login admin dengan password salah sekali, lalu lihat
      `C:\logbook\logs\server.log`: baris `[login gagal] ... ip=` harus berisi
      **IP HP Anda**, bukan `127.0.0.1`. (Jika `127.0.0.1`, kabari pengembang —
      batas percobaan login akan berlaku untuk semua orang sekaligus.)
- [ ] Restart PC → tunggu 2 menit → alamat HTTPS bisa dibuka lagi tanpa login
      Windows.
- [ ] Besok pagi, cek ada file baru di folder backup.
- [ ] Buat QR code dari alamat HTTPS: `/form-masuk` untuk pintu masuk dan
      `/form-keluar` untuk pintu keluar.

## Pembaruan aplikasi

```powershell
cd C:\logbook
git pull
npm install
npm run build
npm run db:migrasi
Stop-ScheduledTask "Logbook Jarkom - Server"; Start-ScheduledTask "Logbook Jarkom - Server"
```

## Memulihkan dari backup

```powershell
cd C:\logbook
npm run db:impor -- "C:\logbook\backup\backup-YYYY-MM-DDTHH-MM-SS.sql" --timpa
```

`--timpa` menghapus data saat ini dan menggantinya dengan isi backup.
