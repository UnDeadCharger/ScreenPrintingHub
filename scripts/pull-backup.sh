#!/usr/bin/env bash
# Run on the Mac: copy the server's backup folder here, so a second copy exists off the server.
# Only files this side lacks are fetched (dumps and photos never change once written), and nothing
# is ever deleted here, so dumps the server has rotated away stay. Needs only ssh and tar.
#   scripts/pull-backup.sh [ssh-host]      default host: argama (an alias in ~/.ssh/config, or user@host)
set -euo pipefail

HOST="${1:-${SPH_SERVER:-argama}}"
REMOTE='backups/screen-printing-hub'
DEST="${SPH_LOCAL_BACKUP_DIR:-$HOME/Backups/screen-printing-hub}"
mkdir -p "$DEST"

missing="$(mktemp)"
trap 'rm -f "$missing"' EXIT
ssh "$HOST" "cd $REMOTE && find db uploads -type f ! -name '*.partial'" | while read -r file; do
  [ -e "$DEST/$file" ] || echo "$file"
done > "$missing"
if [ -s "$missing" ]; then
  ssh "$HOST" "tar -cf - -C $REMOTE -T -" < "$missing" | tar -xf - -C "$DEST"
fi
echo "Fetched $(wc -l < "$missing" | tr -d ' ') new file(s) into $DEST"
