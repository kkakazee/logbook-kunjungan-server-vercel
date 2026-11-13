# Tutorial: Logbook Jarkom di Raspberry Pi → https://logbook-tamu.jkbw2.my.id

Untuk **Raspberry Pi 4B (8 GB), Ubuntu 22.04 64-bit, Docker**, dikerjakan
lewat **SSH**. Aplikasi, database MySQL 8.4, dan Cloudflare Tunnel berjalan
sebagai 3 container Docker yang menyala otomatis setiap Raspberry hidup.

```text
 HP tamu / admin ──HTTPS──► Cloudflare ──tunnel──► Raspberry Pi (Docker)
                                                    ├─ cloudflared
                                                    ├─ app   (Logbook, :3001)
                                                    └─ db    (MySQL 8.4, tidak terbuka)
 Data MySQL & backup → disk USB 931 GB
```

- Tidak perlu IP publik / port forwarding router.
- HTTPS otomatis dari Cloudflare.
- Database tidak bisa diakses dari luar Docker.

Perkiraan waktu: ±45 menit (build pertama di Raspberry ±10 menit).

---

## 1. Siapkan disk USB untuk data

Data MySQL lebih awet di disk USB daripada microSD.

```bash
lsblk -f /dev/sda
```

Lihat kolom **FSTYPE** dan **MOUNTPOINTS** partisi disk (mis. `sda1`):

- **ext4 dan sudah ter-mount** (mis. `/mnt/data`) → pakai folder di dalamnya,
  contoh `/mnt/data/logbook`. Lanjut ke langkah 2.
- **ntfs / exfat / vfat** → MySQL tidak bisa menyimpan data dengan aman di
  format ini. **Jangan format** jika disk berisi data penting — sebagai
  gantinya pakai folder di microSD, contoh `/home/tariyandy/logbook-data`,
  dan cukup salin backup ke disk USB (lihat bagian 9).
- **ext4 tapi belum ter-mount** → mount permanen:
  ```bash
  sudo mkdir -p /mnt/data
  UUID=$(sudo blkid -s UUID -o value /dev/sda1); echo $UUID
  echo "UUID=$UUID /mnt/data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
  sudo mount -a && df -h /mnt/data
  ```

Buat folder data (ganti path sesuai pilihan di atas):

```bash
DATA=/mnt/data/logbook
sudo mkdir -p $DATA/mysql $DATA/backup
sudo chown 1000:1000 $DATA/backup     # agar container aplikasi bisa menulis backup
```

## 2. Pastikan Docker siap

```bash
docker compose version
```

- Jika muncul `Docker Compose version v2...` → lanjut.
- Jika error: `sudo apt update && sudo apt install -y docker-compose-plugin`

Agar Docker menyala otomatis saat boot dan bisa dipakai tanpa `sudo`:

```bash
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

Lalu **logout SSH dan login lagi** (agar grup `docker` berlaku).

## 3. Ambil kode aplikasi

```bash
sudo apt install -y git
cd ~
git clone https://github.com/kkakazee/logbook-kunjungan-server-vercel.git logbook
cd ~/logbook
```

## 4. Buat file `.env`

```bash
cp deploy/raspberry/env.contoh .env
```

Buat 3 nilai acak (tampil di layar, salin masing-masing):

```bash
echo "DB_PASSWORD=$(openssl rand -hex 16)"
echo "DB_ROOT_PASSWORD=$(openssl rand -hex 16)"
echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n/+=')"
```

Edit `.env`:

```bash
nano .env
```

- Ganti `LOGBOOK_DATA_DIR` dengan folder dari langkah 1 (mis. `/mnt/data/logbook`)
- Ganti `GANTI_PASSWORD_DB`, `GANTI_PASSWORD_ROOT`, `GANTI_KUNCI_ACAK`
  dengan 3 nilai di atas
- Simpan: **Ctrl+O**, Enter, keluar: **Ctrl+X**

Amankan file:

```bash
chmod 600 .env
```

> Simpan salinan `.env` di tempat aman (password manager). Tanpa
> `DB_ROOT_PASSWORD` & `DB_PASSWORD`, database sulit dipulihkan.

## 5. Jalankan database & aplikasi

```bash
cd ~/logbook
docker compose up -d --build
```

Build pertama di Raspberry ±5–10 menit. Cek status:

```bash
docker compose ps
```

`db` dan `app` harus **Up (healthy)** (tunggu ±1 menit setelah build).
Cek aplikasi:

```bash
curl -s http://127.0.0.1:3001/api/ping
```

Harus tampil `{"ok":true}`.

## 6. Impor data lama (backup Aiven)

**Dari komputer Windows** yang menyimpan file backup, buka PowerShell
(ganti IP Raspberry):

```powershell
scp "D:\Apps Code\bw2\Logbook ruang jarkom fix\backup-database\backup-2026-11-08T02-45-45.sql" tariyandy@IP-RASPBERRY:~/
```

**Di Raspberry** (SSH):

```bash
DATA=$(grep ^LOGBOOK_DATA_DIR ~/logbook/.env | cut -d= -f2)
sudo mv ~/backup-2026-11-08T02-45-45.sql $DATA/backup/
sudo chown 1000:1000 $DATA/backup/*.sql
cd ~/logbook
docker compose exec app node scripts/impor-backup.js /backup/backup-2026-11-08T02-45-45.sql
```

Harus tampil jumlah baris tiap tabel lalu
`Migrasi selesai. Jumlah admin utama: 1`. Semua akun admin lama bisa login
dengan password yang sama.

> Mulai dari database kosong? Ganti perintah terakhir dengan:
> ```bash
> docker compose exec app node scripts/migrasi.js
> docker compose exec app node scripts/buat-admin.js admin "Admin Utama" --utama
> ```

## 7. Coba dari laptop sebelum dipasang ke domain

Dari laptop, buat terowongan SSH (biarkan jendelanya terbuka):

```bash
ssh -L 3001:127.0.0.1:3001 tariyandy@IP-RASPBERRY
```

Lalu buka **http://localhost:3001** di browser laptop → Form Masuk tampil,
dan login admin di **http://localhost:3001/login** berhasil.

> Login lewat `http://` hanya berfungsi untuk `localhost`. Setelah domain
> aktif, selalu gunakan `https://`.

## 8. Hubungkan ke domain dengan Cloudflare Tunnel

Login ke **https://dash.cloudflare.com** dengan akun pemilik `jkbw2.my.id`.

### 8.1 Hapus record DNS lama

Saat ini `logbook-tamu.jkbw2.my.id` masih mengarah ke layanan lama
(Railway, sudah mati — "Application not found").

1. Domain **jkbw2.my.id** → **DNS → Records**
2. Baris dengan Name **logbook-tamu** → **Edit → Delete**.
   Hanya baris itu — jangan hapus record lain.

### 8.2 Buat tunnel & ambil token

1. **Networking → Tunnels** (di sebagian akun: **Zero Trust → Networks →
   Tunnels**). Jika diminta memilih paket Zero Trust, pilih **Free**.
2. **Create a tunnel** → **Cloudflared** → nama: `raspi-logbook-jarkom`
   → **Save / Create tunnel**.
3. Pada *Choose your environment* pilih **Docker**.
4. Akan tampil perintah seperti:
   ```text
   docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token eyJhIjoi......
   ```
   **Jangan jalankan perintah itu.** Cukup salin bagian token panjang
   setelah `--token ` (diawali `eyJ`). Token ini rahasia.

### 8.3 Masukkan token & nyalakan tunnel

```bash
cd ~/logbook
nano .env
```

- Isi `TUNNEL_TOKEN=` dengan token tadi
- Hapus tanda `#` di depan `COMPOSE_PROFILES=tunnel`
- Simpan & keluar

```bash
docker compose up -d
docker compose ps
```

Sekarang ada 3 container: `db`, `app`, `cloudflared`. Di dashboard
Cloudflare, status tunnel berubah menjadi **Healthy / Connected** →
klik **Next / Continue**.

### 8.4 Arahkan domain ke aplikasi

Pada tunnel `raspi-logbook-jarkom`, tab **Routes** → **Add route** →
**Published application** (tampilan lama: tab **Public Hostname** →
*Add a public hostname*):

| Kolom | Isi |
| --- | --- |
| Subdomain | `logbook-tamu` |
| Domain | `jkbw2.my.id` |
| Path | *(kosong)* |
| Service URL | `http://app:3001` (tampilan lama: Type **HTTP**, URL **app:3001**) |

> `app` adalah nama container aplikasi di jaringan Docker — **bukan**
> `localhost`.

Klik **Save / Add route**.

### 8.5 Pengaturan keamanan domain (sekali saja)

Domain **jkbw2.my.id** → **SSL/TLS → Edge Certificates**:
- **Always Use HTTPS**: On
- **Minimum TLS Version**: TLS 1.2

### 8.6 Buka

Tunggu 1–2 menit → **https://logbook-tamu.jkbw2.my.id**

## 9. Backup otomatis setiap malam

```bash
chmod +x ~/logbook/deploy/raspberry/backup.sh
~/logbook/deploy/raspberry/backup.sh && tail -8 ~/logbook/logs/backup.log
```

Jika berhasil, pasang jadwal jam 23:00:

```bash
(crontab -l 2>/dev/null; echo "0 23 * * * $HOME/logbook/deploy/raspberry/backup.sh") | crontab -
crontab -l
```

Backup tersimpan di `LOGBOOK_DATA_DIR/backup` dan dirotasi otomatis agar
tidak menumpuk:

| Tingkat | Disimpan | Keterangan |
|---|---|---|
| Harian | 7 terakhir | backup tiap malam selama seminggu |
| Mingguan | 4 terakhir | backup terakhir tiap minggu (±1 bulan) |
| Bulanan | 12 terakhir | backup terakhir tiap bulan (±1 tahun) |

Total maksimal ±23 backup; yang lain terhapus sendiri setiap kali backup
berjalan. Log `logs/backup.log` dibatasi 1000 baris terakhir.

Rotasi hanya menyentuh file bernama `backup-*.sql` / `backup-*.json`. Backup yang
ingin disimpan permanen (mis. data awal dari Aiven) cukup diganti namanya,
contoh `arsip-aiven-2026-11-08.sql`.

Ingin jumlah lain? Tambahkan ke `.env`, mis. `BACKUP_HARIAN=14`, lalu
`docker compose up -d`.
**Sangat disarankan** juga menyalin backup ke luar Raspberry secara
berkala, mis. dari laptop Windows:

```powershell
scp -r tariyandy@IP-RASPBERRY:/mnt/data/logbook/backup "D:\Backup Logbook"
```

## 10. Pengujian akhir

- [ ] HP dengan **data seluler** buka https://logbook-tamu.jkbw2.my.id → Form Masuk tampil.
- [ ] Isi Form Masuk → muncul nomor & **kode akses**.
- [ ] Login petugas di perangkat lain (`/login`) → tamu muncul di *Tamu Menunggu* ±5 detik → **Terima**.
- [ ] Status tamu berubah sendiri jadi *Diterima* (±8 detik) → **Form Keluar** berhasil.
- [ ] Data lama (Oktober 2026) tampil di *Riwayat Tamu*.
- [ ] **IP terbaca benar**: login admin dengan password salah 1×, lalu di Raspberry:
      ```bash
      docker compose logs app | grep "login gagal" | tail -1
      ```
      `ip=` harus berisi **IP HP Anda**, bukan `172.x.x.x` atau `127.0.0.1`.
- [ ] `sudo reboot` → tunggu 3 menit → situs bisa dibuka lagi.
- [ ] Besok pagi: ada file baru di folder backup.

## 11. Aktifkan cek lokasi (opsional)

Edit `.env`: ubah `LOKASI_AKTIF=true` dan `VITE_LOKASI_AKTIF=true`, lalu:

```bash
cd ~/logbook && docker compose up -d --build
```

## 12. QR code & matikan Aiven

| Ditempel di | Alamat |
| --- | --- |
| Pintu masuk | `https://logbook-tamu.jkbw2.my.id/form-masuk` |
| Pintu keluar | `https://logbook-tamu.jkbw2.my.id/form-keluar` |
| Petugas | `https://logbook-tamu.jkbw2.my.id/login` |

Setelah bagian 10 lolos semua: console.aiven.io → service `mysql-tamujkbw2`
→ **Power off** → (jika tidak dipakai lagi) **Delete service** dan hapus
metode pembayaran.

## 13. Perawatan & pemecahan masalah

```bash
cd ~/logbook
docker compose ps                     # status container
docker compose logs -f app            # log aplikasi (Ctrl+C keluar)
docker compose logs --tail 50 cloudflared
docker compose restart app            # restart aplikasi
```

**Memperbarui aplikasi:**

```bash
cd ~/logbook
git pull
docker compose up -d --build
docker compose exec app node scripts/migrasi.js
```

**Memulihkan dari backup** (mengganti seluruh data saat ini):

```bash
docker compose exec app node scripts/impor-backup.js /backup/backup-YYYY-MM-DDTHH-MM-SS.sql --timpa
```

| Yang tampil | Artinya | Perbaikan |
| --- | --- | --- |
| **Error 1033** | Tunnel tidak tersambung (Raspberry mati / internet putus / container cloudflared berhenti) | `docker compose ps`; `docker compose logs --tail 50 cloudflared`; pastikan `COMPOSE_PROFILES=tunnel` aktif di `.env` |
| **502 Bad Gateway** | Tunnel jalan, aplikasi tidak terjangkau | Service URL harus `http://app:3001` (8.4); `docker compose logs --tail 50 app` |
| "Terjadi kesalahan pada server" | Database bermasalah | `docker compose logs --tail 50 db`; cek disk penuh: `df -h` |
| "Application not found" (Railway) | DNS lama belum dihapus | Ulangi 8.1 lalu 8.4 |
| `app` terus restart, log berisi `JWT_SECRET` / `DB_PASSWORD` | `.env` belum lengkap | Lengkapi `.env`, `docker compose up -d` |
