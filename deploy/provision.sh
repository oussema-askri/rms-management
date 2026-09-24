#!/usr/bin/env bash
#
# One-time provisioning for a fresh Ubuntu 24.04 VM.
# Run as root on the new server:  bash provision.sh
#
# Installs Node 24, MongoDB 8, nginx and certbot, creates the service user and
# the directory layout, and closes the firewall down to SSH plus HTTP/HTTPS.
# It does NOT deploy the application -- run update.sh for that.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root." >&2
  exit 1
fi

echo "==> Base packages"
apt-get update
apt-get install -y curl gnupg ca-certificates ufw git

echo "==> Node 24 (matches the version the project was developed on)"
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs

echo "==> MongoDB 8"
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
  | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
  > /etc/apt/sources.list.d/mongodb-org-8.0.list
apt-get update
apt-get install -y mongodb-org
systemctl enable --now mongod

# The stock config already binds to 127.0.0.1 only. Assert it, because a
# MongoDB reachable from the internet with no password is scanned and wiped
# within hours, and this database holds payroll and invoices.
if grep -qE '^\s*bindIp:\s*127\.0\.0\.1\s*$' /etc/mongod.conf; then
  echo "    bindIp is 127.0.0.1 -- good"
else
  echo "    WARNING: check bindIp in /etc/mongod.conf, it must be 127.0.0.1" >&2
fi

echo "==> nginx + certbot"
apt-get install -y nginx certbot python3-certbot-nginx
mkdir -p /var/www/certbot

echo "==> Service user and directories"
id -u rms >/dev/null 2>&1 || useradd --system --create-home --home-dir /srv/rms --shell /usr/sbin/nologin rms
mkdir -p /srv/rms/backend /srv/rms/backups /var/www/rms
chown -R rms:rms /srv/rms
chown -R www-data:www-data /var/www/rms

echo "==> Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo
echo "Provisioning done. Next:"
echo "  1. Point your domain's A record at this server's IP."
echo "  2. Copy the application up and run update.sh."
echo "  3. sudo certbot --nginx -d your.domain"
