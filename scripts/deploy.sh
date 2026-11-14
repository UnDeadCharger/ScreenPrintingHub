#!/usr/bin/env bash
# Run on the server: deploy the latest main and wait until the app answers.
# From the Mac: ssh argama ~/repo/screen-printing-hub/scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if ! git diff --quiet HEAD; then
  echo "Local changes on the server; refusing to deploy. See: git status" >&2
  exit 1
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
