# deploy/windows/pasang-autostart.ps1
# Mendaftarkan 2 tugas di Windows Task Scheduler:
#   1. "Logbook Jarkom - Server" : menjalankan aplikasi otomatis saat PC menyala
#                                  (sebelum ada yang login), restart otomatis jika mati
#   2. "Logbook Jarkom - Backup" : backup database setiap hari jam 23:00
#
# Jalankan di PowerShell sebagai Administrator:
#   powershell -ExecutionPolicy Bypass -File deploy\windows\pasang-autostart.ps1
# Opsional, folder backup lain (mis. folder Google Drive / NAS):
#   powershell -ExecutionPolicy Bypass -File deploy\windows\pasang-autostart.ps1 -FolderBackup "D:\Backup Logbook"

param(
  [string]$FolderBackup = "",
  [string]$JamBackup = "23:00"
)

$ErrorActionPreference = "Stop"

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  Write-Host "Jalankan PowerShell sebagai Administrator (klik kanan > Run as administrator)." -ForegroundColor Red
  exit 1
}

$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) {
  Write-Host "Node.js tidak ditemukan. Install Node.js LTS dulu, lalu buka ulang PowerShell." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path (Join-Path $Repo ".env"))) {
  Write-Host "File .env belum ada di $Repo. Buat dulu (lihat PANDUAN-PC-WINDOWS.md)." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path (Join-Path $Repo "frontend\dist\index.html"))) {
  Write-Host "Frontend belum di-build. Jalankan: npm run build" -ForegroundColor Red
  exit 1
}
if (-not $FolderBackup) { $FolderBackup = Join-Path $Repo "backup" }

New-Item -ItemType Directory -Force -Path (Join-Path $Repo "logs") | Out-Null
New-Item -ItemType Directory -Force -Path $FolderBackup | Out-Null

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# ---------- 1. Server ----------
$cmdServer = "/c cd /d `"$Repo`" && `"$Node`" backend\src\server.js >> logs\server.log 2>&1"
$aksiServer = New-ScheduledTaskAction -Execute "cmd.exe" -Argument $cmdServer -WorkingDirectory $Repo
$pemicuServer = New-ScheduledTaskTrigger -AtStartup
$aturServer = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName "Logbook Jarkom - Server" -Action $aksiServer -Trigger $pemicuServer `
  -Settings $aturServer -Principal $principal -Force | Out-Null
Write-Host "[OK] Tugas 'Logbook Jarkom - Server' terdaftar." -ForegroundColor Green

# ---------- 2. Backup harian ----------
$cmdBackup = "/c cd /d `"$Repo`" && `"$Node`" scripts\backup.js `"$FolderBackup`" >> logs\backup.log 2>&1"
$aksiBackup = New-ScheduledTaskAction -Execute "cmd.exe" -Argument $cmdBackup -WorkingDirectory $Repo
$pemicuBackup = New-ScheduledTaskTrigger -Daily -At $JamBackup
$aturBackup = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName "Logbook Jarkom - Backup" -Action $aksiBackup -Trigger $pemicuBackup `
  -Settings $aturBackup -Principal $principal -Force | Out-Null
Write-Host "[OK] Tugas 'Logbook Jarkom - Backup' terdaftar (setiap hari $JamBackup -> $FolderBackup)." -ForegroundColor Green

# ---------- Jalankan server sekarang ----------
Stop-ScheduledTask -TaskName "Logbook Jarkom - Server" -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName "Logbook Jarkom - Server"
Start-Sleep -Seconds 4

try {
  $port = 3001
  $baris = Select-String -Path (Join-Path $Repo ".env") -Pattern "^\s*PORT\s*=\s*(\d+)" -ErrorAction SilentlyContinue
  if ($baris) { $port = [int]$baris.Matches[0].Groups[1].Value }
  $r = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/ping" -TimeoutSec 10
  if ($r.ok) { Write-Host "[OK] Server berjalan: http://localhost:$port" -ForegroundColor Green }
} catch {
  Write-Host "[!] Server belum merespons. Cek log: $Repo\logs\server.log" -ForegroundColor Yellow
}
