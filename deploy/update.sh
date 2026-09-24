#!/usr/bin/env bash
#
# Deploy or re-deploy the application. Run as root on the server after the
# source has been copied to /srv/rms/src (see DEPLOYMENT.md).
#
# Safe to run repeatedly. Uploads and .env are never touched.

set -euo pipefail

SRC=/srv/rms/src
APP=/srv/rms/backend
WEB=/var/www/rms

if [ ! -d "$SRC/rmc-web/backend" ]; then
  echo "Expected the source at $SRC. Copy it up first." >&2
  exit 1
fi

echo "==> Backend"
# --delete keeps removed files from lingering, but uploads/ and .env live in the
# deployed directory only and must survive every deploy.
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude 'uploads' \
  --exclude '.env' \
  "$SRC/rmc-web/backend/" "$APP/"

cd "$APP"
npm ci --omit=dev
mkdir -p "$APP/uploads"
chown -R rms:rms /srv/rms

echo "==> Frontend"
cd "$SRC/rmc-web/frontend"
npm ci
# Relative, because nginx serves the app and the API from the same origin.
REACT_APP_API_URL=/api npm run build
rsync -a --delete build/ "$WEB/"
chown -R www-data:www-data "$WEB"

echo "==> Restart"
systemctl restart rms-api
sleep 2
systemctl --no-pager --lines=15 status rms-api || true

echo
echo "Deployed."
