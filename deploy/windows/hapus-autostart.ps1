# deploy/windows/hapus-autostart.ps1
# Menghentikan & menghapus tugas Logbook dari Task Scheduler.
# Jalankan di PowerShell sebagai Administrator:
#   powershell -ExecutionPolicy Bypass -File deploy\windows\hapus-autostart.ps1

$ErrorActionPreference = "Continue"
foreach ($nama in @("Logbook Jarkom - Server", "Logbook Jarkom - Backup")) {
  if (Get-ScheduledTask -TaskName $nama -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $nama -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $nama -Confirm:$false
    Write-Host "[OK] '$nama' dihapus." -ForegroundColor Green
  }
}
# Hentikan proses server yang mungkin masih berjalan dari tugas tadi
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*backend\src\server.js*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host "[OK] Proses server (PID $($_.ProcessId)) dihentikan." }
