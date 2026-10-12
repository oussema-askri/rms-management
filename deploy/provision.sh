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
# MongoDB refuses to start on Linux kernel 6.19+ (SERVER-121912), which is why
# it publishes no packages for Ubuntu 26.04 (kernel 7.0). Containers share the
# host kernel, so Docker is not a way around this either. Fail here with a
# message that names the real cause rather than halfway through an install that
# ends in a confusing systemd failure.
KERNEL_MAJOR=$(uname -r | cut -d. -f1)
KERNEL_MINOR=$(uname -r | cut -d. -f2)
if [ "$KERNEL_MAJOR" -gt 6 ] || { [ "$KERNEL_MAJOR" -eq 6 ] && [ "$KERNEL_MINOR" -ge 19 ]; }; then
  echo "    REFUSING: kernel $(uname -r) is 6.19 or newer." >&2
  echo "    MongoDB cannot start on this kernel. Use Ubuntu 24.04 (kernel 6.8)," >&2
  echo "    or host the database on MongoDB Atlas instead." >&2
  exit 1
fi

curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
  | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
# Read the codename from the running system rather than hardcoding one, so this
# works on 22.04 (jammy), 24.04 (noble) and 26.04 (resolute) alike. MongoDB
# publishes amd64 and arm64 for all three; a wrong codename here fails with a
# confusing 404 from apt rather than anything that names the real problem.
UBUNTU_CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
echo "    building MongoDB repo line for: $UBUNTU_CODENAME"
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/8.0 multiverse" \
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

echo "==> SSH hardening"
# A root account reachable by password on a public IP is found by scanners
# within hours of the server going live, and guessed from wordlists. Keys only.
#
# This refuses to run if no key is installed, because locking out password
# login with no key present would leave the server unreachable except through
# the provider's console.
if [ ! -s /root/.ssh/authorized_keys ]; then
  echo "    REFUSING: /root/.ssh/authorized_keys is empty or missing." >&2
  echo "    Install your public key first, or you will lock yourself out." >&2
  exit 1
fi

cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'SSHEOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
SSHEOF

# Validate before restarting; a bad config plus a restart means no more SSH.
if sshd -t; then
  systemctl restart ssh 2>/dev/null || systemctl restart sshd
  echo "    password login disabled, keys only"
else
  echo "    sshd config test FAILED, reverting" >&2
  rm -f /etc/ssh/sshd_config.d/99-hardening.conf
  exit 1
fi

echo
echo "Provisioning done. Next:"
echo "  1. Point your domain's A record at this server's IP."
echo "  2. Copy the application up and run update.sh."
echo "  3. sudo certbot --nginx -d your.domain"
