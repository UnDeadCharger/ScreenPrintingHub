#!/usr/bin/env bash
# Run on the server: restore the database and photos from a backup made by scripts/backup.sh.
#   scripts/restore.sh                 newest database dump
#   scripts/restore.sh <dump-file>     a specific one
# The database is REPLACED by the dump: orders created after it was taken are lost.
# Photos are only added; existing ones are left alone.
set -euo pipefail
cd "$(dirname "$0")/.."

DEST="${SPH_BACKUP_DIR:-$HOME/backups/screen-printing-hub}"
dump="${1:-$(ls -1t "$DEST"/db/db-*.archive.gz 2>/dev/null | head -1)}"
[ -f "$dump" ] || { echo "No database dump found in $DEST/db" >&2; exit 1; }
gzip -t "$dump"

echo "This replaces the whole database with: $dump"
read -r -p "Type 'restore' to continue: " answer
[ "$answer" = "restore" ] || { echo "Cancelled"; exit 1; }

docker compose exec -T mongo sh -c \
  'mongorestore --quiet --archive --gzip --drop --authenticationDatabase admin -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD"' \
  < "$dump"
if [ -n "$(ls -A "$DEST/uploads" 2>/dev/null)" ]; then
  tar -cf - -C "$DEST/uploads" . | docker compose exec -T app tar -xf - -C /data/uploads --skip-old-files
fi
echo "Restored $(basename "$dump") and the photo mirror"
