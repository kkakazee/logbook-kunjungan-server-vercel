#!/usr/bin/env bash
# Backup database Logbook (dipanggil cron setiap malam).
# Hasil: $LOGBOOK_DATA_DIR/backup/backup-*.sql dan *.json
# Rotasi otomatis: 7 harian + 4 mingguan + 12 bulanan (lihat scripts/backup.js)
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p logs
echo "=== $(date '+%F %T') ===" >> logs/backup.log
docker compose exec -T app node scripts/backup.js /backup >> logs/backup.log 2>&1

# Batasi ukuran log: simpan 1000 baris terakhir saja
tail -n 1000 logs/backup.log > logs/backup.log.tmp && mv logs/backup.log.tmp logs/backup.log
