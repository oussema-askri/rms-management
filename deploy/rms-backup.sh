#!/usr/bin/env bash
#
# Nightly backup of the database and the uploaded files.
#
# Running MongoDB on the VM means nothing else is taking these backups. What is
# stored here is payroll, invoices and CIN scans, so losing the disk without a
# copy is the one failure this application cannot absorb.
#
# Install:  sudo cp rms-backup.sh /usr/local/bin/ && sudo chmod +x /usr/local/bin/rms-backup.sh
# Schedule: sudo crontab -e   ->   15 2 * * * /usr/local/bin/rms-backup.sh >> /var/log/rms-backup.log 2>&1

set -euo pipefail

BACKUP_ROOT=/srv/rms/backups
UPLOADS_DIR=/srv/rms/backend/uploads
ENV_FILE=/srv/rms/backend/.env
KEEP_DAYS=14

# The database requires authentication, so mongodump needs the connection
# string. Read it from the app's own .env rather than duplicating the password
# here -- a second copy is a second thing to rotate and forget.
if [ ! -r "$ENV_FILE" ]; then
  echo "cannot read $ENV_FILE" >&2
  exit 1
fi
MONGO_URI=$(grep '^MONGO_URI=' "$ENV_FILE" | cut -d= -f2-)
if [ -z "$MONGO_URI" ]; then
  echo "MONGO_URI not found in $ENV_FILE" >&2
  exit 1
fi

stamp=$(date +%Y-%m-%d_%H%M)
dest="$BACKUP_ROOT/$stamp"
mkdir -p "$dest"

mongodump --uri="$MONGO_URI" --archive="$dest/db.archive" --gzip --quiet
tar -czf "$dest/uploads.tar.gz" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"

# Rotate anything older than KEEP_DAYS.
find "$BACKUP_ROOT" -maxdepth 1 -type d -name '20*' -mtime +"$KEEP_DAYS" -exec rm -rf {} +

echo "$(date -Is) backup written to $dest ($(du -sh "$dest" | cut -f1))"

# NOTE: this writes to the same disk as the data it is protecting. It covers an
# accidental deletion or a bad migration, but not the loss of the server. Copy
# $BACKUP_ROOT off the box as well -- a Hetzner Storage Box is about EUR 3/month
# for 1TB and can be mounted over SSHFS or written to with rsync.
