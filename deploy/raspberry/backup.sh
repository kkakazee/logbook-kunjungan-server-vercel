#!/usr/bin/env bash
# Backup database Logbook (dipanggil cron setiap malam).
# Hasil: $LOGBOOK_DATA_DIR/backup/backup-*.sql dan *.json (30 terakhir disimpan)
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p logs
echo "=== $(date '+%F %T') ===" >> logs/backup.log
docker compose exec -T app node scripts/backup.js /backup >> logs/backup.log 2>&1
