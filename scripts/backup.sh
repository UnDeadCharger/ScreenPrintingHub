#!/usr/bin/env bash
# Run on the server: back up the database and the uploaded photos to a folder outside Docker.
#   db/db-<timestamp>.archive.gz   one mongodump per run; the newest $KEEP are kept
#   uploads/                       a mirror of every photo; only new files are copied each run
# Runs before every deploy (scripts/deploy.sh) and nightly from cron (see the README).
# Restore with scripts/restore.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

DEST="${SPH_BACKUP_DIR:-$HOME/backups/screen-printing-hub}"
KEEP=14
mkdir -p "$DEST/db" "$DEST/uploads"

# Database. Written under a temporary name so a failed dump never looks like a good one.
dump="$DEST/db/db-$(date +%Y%m%d-%H%M%S).archive.gz"
missing="$(mktemp)"
trap 'rm -f "$dump.partial" "$missing"' EXIT
docker compose exec -T mongo sh -c \
  'mongodump --quiet --archive --gzip --db screenprinting --authenticationDatabase admin -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD"' \
  > "$dump.partial"
gzip -t "$dump.partial"
[ "$(wc -c < "$dump.partial")" -gt 100 ] || { echo "Database dump is empty" >&2; exit 1; }
mv "$dump.partial" "$dump"
ls -1t "$DEST"/db/db-*.archive.gz | tail -n +$((KEEP + 1)) | while read -r old; do rm -f "$old"; done

# Photos never change once uploaded, so copying the ones the mirror lacks is a complete backup.
docker compose exec -T app ls /data/uploads | while read -r name; do
  [ -e "$DEST/uploads/$name" ] || echo "$name"
done > "$missing"
if [ -s "$missing" ]; then
  docker compose exec -T app tar -cf - -C /data/uploads -T - < "$missing" | tar -xf - -C "$DEST/uploads"
fi

echo "Backed up to $DEST: $(basename "$dump"), $(wc -l < "$missing" | tr -d ' ') new photo(s), $(ls "$DEST/uploads" | wc -l | tr -d ' ') in total"
