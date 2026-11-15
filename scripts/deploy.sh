#!/usr/bin/env bash
# Run on the server: back up, deploy the latest main and wait until the app answers.
# From the Mac: ssh argama ~/repo/screen-printing-hub/scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Everything is inside a function so bash has read the whole script before `git pull` can
# replace this file underneath it.
main() {
  if ! git diff --quiet HEAD; then
    echo "Local changes on the server; refusing to deploy. See: git status" >&2
    exit 1
  fi

  # A restore point from just before the new version. A failed backup stops the deploy.
  # Skipped only when the app is not running yet (the very first deploy).
  if [ -n "$(docker compose ps -q mongo 2>/dev/null)" ]; then
    scripts/backup.sh
  else
    echo "App is not running; skipping the pre-deploy backup"
  fi

  git pull --ff-only
  docker compose up -d --build
  docker image prune -f

  # Checked from inside the container: works whatever HOST/API_PORT are, and needs no curl on the host.
  for _ in $(seq 30); do
    if docker compose exec -T app node -e \
      "fetch('http://127.0.0.1:3000/api/orders').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))" \
      2>/dev/null; then
      echo "Deployed $(git rev-parse --short HEAD)"
      exit 0
    fi
    sleep 2
  done
  echo "App did not answer within 60s. See: docker compose logs app" >&2
  exit 1
}
main "$@"
