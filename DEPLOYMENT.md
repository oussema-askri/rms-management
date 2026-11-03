# Deploying RMS

Target: one VPS running Ubuntu 24.04, serving the web app, the API,
the uploaded files and MongoDB. The mobile app is built separately and installed
on phones as an APK; it talks to the same API.

Replace `rms.tn` with your real domain throughout. All the files
referenced below are in `deploy/`.

## What runs where

```
              https://rms.tn
                        |
                     nginx :443
                    /     |      \
            /            /api/    /uploads/
        static           |            |
    /var/www/rms   ------+------------+
   (React build)         |
                    node server.js :5000   (systemd: rms-api)
                         |
                    MongoDB :27017  (localhost only)
                         |
                  /srv/rms/backend/uploads
```

One domain serves everything, so the browser stays on a single origin and the
web client needs no cross-origin requests at all.

`/uploads/` is proxied to Node rather than served by nginx. That is deliberate:
`routes/files.js` is what enforces the session check and the per-category
ownership rules. Serving those paths statically would expose every CIN scan and
payslip to anyone holding a URL.

## 1. The VM

Hetzner Cloud, **CX22** — 2 vCPU, 4 GB RAM, 40 GB SSD, about €4/month.
Location: **Falkenstein** or **Nuremberg** (roughly 40 ms from Tunis).
Image: **Ubuntu 24.04** -- not 26.04, see below. Add your SSH key during creation.

This is generously sized for the current load — the database is under a
megabyte and there are seven users. The 4 GB matters for two reasons: MongoDB
reserves about half of available RAM for its cache, and the React production
build needs roughly 1.5 GB while it runs. The CX22 is only about €0.50/month
above the smallest option, which is not worth the tighter fit.

## 2. DNS

At your registrar, point the domain at the server:

```
A     rms.tn      <server IPv4>
AAAA  rms.tn      <server IPv6>
```

Do this first. Let's Encrypt validates by fetching a file over HTTP from the
domain, so the record has to have propagated before step 6.

## 3. Provision

```bash
scp deploy/provision.sh root@<server-ip>:/root/
ssh root@<server-ip> 'bash /root/provision.sh'
```

Installs Node 24, MongoDB 8, nginx and certbot; creates the `rms` service user
and the directory layout; restricts the firewall to SSH, HTTP and HTTPS.

## 4. Lock down MongoDB

The stock packages bind to `127.0.0.1`, so the database is not reachable from
the internet. Add authentication as well — this holds payroll and invoices, and
it costs five minutes.

```bash
ssh root@<server-ip>
mongosh
```

```javascript
use admin
db.createUser({
  user: "admin",
  pwd:  "<a long random password>",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})
use rmc
db.createUser({
  user: "rms_app",
  pwd:  "<a different long random password>",
  roles: [{ role: "readWrite", db: "rmc" }]
})
exit
```

Then enable enforcement:

```bash
printf '\nsecurity:\n  authorization: enabled\n' >> /etc/mongod.conf
systemctl restart mongod
```

## 5. Deploy the application

From your machine, copy the source up, excluding the heavy rebuildable parts:

```bash
rsync -av --exclude node_modules --exclude .env --exclude build \
  rmc-web/ root@<server-ip>:/srv/rms/src/rmc-web/
rsync -av deploy/ root@<server-ip>:/srv/rms/src/deploy/
```

Create the production environment file at `/srv/rms/backend/.env`:

```ini
PORT=5000
MONGO_URI=mongodb://rms_app:<password>@127.0.0.1:27017/rmc?authSource=rmc
JWT_SECRET=<generate a new one, see below>
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://rms.tn
TRUST_PROXY=true
```

Generate a fresh secret rather than reusing the development one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`TRUST_PROXY=true` is required here. Behind nginx every request arrives from
`127.0.0.1`, so without it the rate limiter treats all users as a single client
and locks everyone out together after twenty failed logins.

Install the service and deploy:

```bash
cp /srv/rms/src/deploy/rms-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable rms-api
bash /srv/rms/src/deploy/update.sh
```

`update.sh` is safe to re-run for every future deploy. It never touches
`uploads/` or `.env`.

### Deploying from Windows (how updates are done today)

Git Bash has no `rsync`, and a plain `git archive` on a machine with
`core.autocrlf=true` writes Windows line endings, which makes `update.sh` fail
with `$'\r': command not found`. Ship the committed tree with LF endings:

```bash
git -c core.autocrlf=false -c core.eol=lf archive --format=tar.gz \
  -o /tmp/rms.tgz HEAD rmc-web deploy
scp -i ~/.ssh/rms_server /tmp/rms.tgz root@162.35.19.90:/tmp/
ssh -i ~/.ssh/rms_server root@162.35.19.90 '
  cd /srv/rms/src && tar -xzf /tmp/rms.tgz && rm /tmp/rms.tgz
  /usr/local/bin/rms-backup.sh            # backup before every deploy
  bash /srv/rms/src/deploy/update.sh > /var/log/rms-deploy-last.log 2>&1; echo "exit=$?"
  echo <commit-sha> > /srv/rms/src/DEPLOYED_COMMIT'
```

In Git Bash, `$TEMP` is a `C:\...` path that `tar` reads as a remote host; use
`/tmp` or `$(cygpath -u "$TEMP")` instead. Check `exit=0` and "Deployed." in the
log rather than piping the script through `tail`, which hides a failure.

## 6. TLS

```bash
cp /srv/rms/src/deploy/nginx-rms.conf /etc/nginx/sites-available/rms
sed -i 's/rms.tn/your.real.domain/g' /etc/nginx/sites-available/rms
ln -sf /etc/nginx/sites-available/rms /etc/nginx/sites-enabled/rms
rm -f /etc/nginx/sites-enabled/default
certbot --nginx -d rms.tn -d www.rms.tn
nginx -t && systemctl reload nginx
```

certbot installs a renewal timer automatically; nothing further is needed.
Remember to remove the interim `rms-sslip` site at the same time:

```bash
rm -f /etc/nginx/sites-enabled/rms-sslip /etc/nginx/sites-enabled/rms-temp
certbot delete --cert-name 162-35-19-90.sslip.io
```

Then point `rms-mobile/eas.json`'s `preview` profile back at `https://rms.tn/api`
to match `production`, and rebuild the APK.

**HTTPS is not optional here.** Android blocks cleartext HTTP by default, so the
mobile app cannot reach a plain-HTTP API without a configuration change that
weakens every connection the app makes.

### 6a. Interim TLS before the domain is available (currently in use)

TLS needs a *hostname*, because certbot proves control of the domain by fetching
a challenge over HTTP from it. A bare IP cannot be validated. Until `rms.tn`
resolves to this server, `sslip.io` supplies one for free: any host of the form
`162-35-19-90.sslip.io` already resolves to `162.35.19.90`, with no DNS account
and no setup, and Let's Encrypt will issue for it normally.

This is what unblocks the Android build before the client hands over their DNS
panel. It is live now:

```bash
cp /srv/rms/src/deploy/nginx-rms-sslip.conf /etc/nginx/sites-available/rms-sslip
ln -sf /etc/nginx/sites-available/rms-sslip /etc/nginx/sites-enabled/rms-sslip
nginx -t && systemctl reload nginx
certbot --nginx -d 162-35-19-90.sslip.io --redirect
```

Three things to know about it:

- The Let's Encrypt account was registered **without an email**, so no expiry
  warnings are sent. The renewal timer makes that low-risk, but attach an
  address before relying on this long term:
  `certbot update_account --email you@example.com`
- Add the origin to `CORS_ORIGINS` in `/srv/rms/backend/.env` and restart
  `rms-api`, or the browser will reject every API response.
- certbot's generated 443 block has no `http2` parameter. On nginx 1.24
  (Ubuntu 24.04) HTTP/2 is `listen 443 ssl http2;` -- the standalone
  `http2 on;` directive is nginx 1.25.1 and newer, and fails `nginx -t` here
  with `unknown directive "http2"`.

`rms-temp` keeps `default_server`, so plain HTTP on the bare IP goes on working
for browser testing while this hostname serves TLS.

## 7. Move the existing data

35 documents and 75 uploaded files, from your Windows machine:

```bash
# local
mongodump --uri="mongodb://127.0.0.1:27017/rmc" --archive=rmc.archive --gzip
scp rmc.archive root@<server-ip>:/tmp/
rsync -av rmc-web/backend/uploads/ root@<server-ip>:/srv/rms/backend/uploads/

# on the server
mongorestore --uri="mongodb://rms_app:<password>@127.0.0.1:27017/rmc?authSource=rmc" \
  --archive=/tmp/rmc.archive --gzip --drop
chown -R rms:rms /srv/rms/backend/uploads
```

## 8. Backups

Running MongoDB yourself means nobody else is taking these.

```bash
cp /srv/rms/src/deploy/rms-backup.sh /usr/local/bin/
chmod +x /usr/local/bin/rms-backup.sh
crontab -e
# 15 2 * * * /usr/local/bin/rms-backup.sh >> /var/log/rms-backup.log 2>&1
```

That writes a nightly dump plus a tarball of the uploads to `/srv/rms/backups`,
keeping fourteen days.

It lands on the same disk as the data it protects, which covers a bad migration
or an accidental delete but not the loss of the server. Two ways to close that
gap: enable Hetzner's automatic snapshots (20% of the server cost, so under
€1/month), or attach a Storage Box (about €3/month for 1 TB) and rsync the
backup directory to it. Enable the snapshots at minimum.

## 9. The mobile app

The app is not hosted on the VM. Expo's build service compiles it to an APK that
gets installed on each phone; the VM only serves the API it calls.

Set the real domain in `rms-mobile/eas.json` — both the `preview` and
`production` profiles carry `EXPO_PUBLIC_API_URL` — then:

```bash
cd rms-mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

The build runs on Expo's servers and takes 10–20 minutes, ending with a download
link and a QR code. Staff open that link on their phone, allow installation from
unknown sources once, and install.

Build files are kept for **14 days**. After that the old link fails with
"The specified key does not exist" — the APK was deleted, nothing is wrong with
the phone. Download the `.apk` itself and share the file, or run a new build
(`npx eas-cli build:list` shows each build's expiry date). The signing key is
stored on Expo's servers, so later builds can run with `--non-interactive`.

The free tier allows 30 builds a month, which is ample here. The application id
is `tn.riyada.rms`; changing it later means every phone has to uninstall and
reinstall, so change it now if you want something different.

For updates, either rebuild and redistribute the APK, or add `expo-updates` so
the app pulls JavaScript changes over the air without a reinstall.

## Before real staff use this

The four data-loss defects that used to be listed here (CNSS wiped by a
responsable's edit, leave approved past the balance, unsigned slips invoiced,
invoiced slips deleted) were fixed in `ae9bb1b`; see `CHANGELOG.md`.

Also outstanding from `SECURITY.md`: purge the uploaded files from git history,
and reset any password that was ever set to the old default.
