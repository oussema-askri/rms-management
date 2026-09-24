# RMS security notes

What changed in the security pass, and what still needs a person to do it.

## Actions you must take

These cannot be done from the code and the system is not secure until they are.

### 1. Set a strong signing key

The server now refuses to start unless `JWT_SECRET` is at least 32 characters.
Generate one:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Put it in `rmc-web/backend/.env`. Changing it signs everyone out, which is the
correct outcome if the old key was ever shared or weak.

### 2. Purge uploaded personal data from git history

`rmc-web/backend/uploads/` is now in `.gitignore` and no longer tracked, but 51
files remain in the repository history: CIN scans, employee photos, expense
receipts and generated site permits.

Removing them means rewriting history, which invalidates existing clones, so it
is your call. Use `git filter-repo`:

```
git filter-repo --path rmc-web/backend/uploads --invert-paths
```

Until that runs, anyone with a clone of this repository has those files.

### 3. Rotate the database credentials if the connection string was ever shared

`.env` was never committed, which is good. If the Atlas connection string was
pasted into a chat, an issue or a screenshot, rotate the database user password.

### 4. Set the deployment variables

See `rmc-web/backend/.env.example`. `CORS_ORIGINS` must list your real frontend
origin, otherwise only `localhost:3000` is accepted. Set `TRUST_PROXY=true` when
running behind Render or nginx so rate limiting sees real client addresses.

### 5. Change passwords set before this pass

Any account whose password was ever reset had it set to `123456`. Reset each one
through the admin screen, which now generates a random temporary password shown
once.

## What was fixed

### Stored files were public

`/uploads` was served by `express.static` with no authentication. Every CIN
scan, employee photo, expense receipt, leave attachment, site permit and invoice
was readable by anyone with the URL, and the URLs are predictable.

`routes/files.js` replaces it. Every request needs a valid session, and the
personal categories additionally require a privileged role or ownership of the
underlying record:

| Path | Who may read it |
|---|---|
| `uploads/clients/` | any signed-in user |
| `uploads/bon-de-reception/` | any signed-in user |
| `uploads/employees/` | rh, admin, responsable, or the employee themselves |
| `uploads/conge/` | rh, admin, responsable, or the employee who filed it |
| `uploads/factures/` | rh, admin, comptable, or the submitter |
| `uploads/documents/` | rh, admin, responsable, or a worker named on the approved request |

Permission is decided before the file is looked up, so an unauthorised caller
gets the same `403` whether or not the file exists and cannot probe for
filenames. Path traversal is blocked, and an unknown category is denied rather
than served.

Both clients were updated. The web app fetches files through axios and renders
them from blob URLs, since a browser will not attach a token to an `<img src>`
or `window.open`. The mobile app attaches the token to `FileSystem.downloadAsync`.

### Anyone could create an administrator

`POST /api/auth/register` was public and read `role` from the request body. It is
now a one-time bootstrap that works only while the database has no users, and it
always creates an administrator; afterwards it refuses.

`POST /api/rh/employees` also took `role` from the body, so a responsable could
create an administrator. `utils/roles.js` now defines who may assign what:

| Actor | May assign |
|---|---|
| admin | every role |
| rh | employer, responsable, comptable |
| responsable | employer |
| comptable, employer | nothing |

The update route enforces the same rule, only administrators may edit or delete
another administrator's account, and the last administrator cannot be deleted.

### Every password reset produced the same password

`POST /api/admin/users/:id/reset-password` set the password to `123456` and both
interfaces printed that value. It now generates a random 12-character password
per reset and returns it once.

Passwords everywhere must be at least 8 characters with a letter and a digit.

### Payroll data was readable by everyone

`GET /api/rh/employees` returned salary, daily rate, CNSS number and bonus
history to all five roles. Those fields are now withheld from roles outside rh,
admin and comptable, except that anyone may see their own.

### Missing role guards

Creating clients, units, sub-titles and planning tasks required only a valid
session, though both interfaces already hid the actions from employers. Reading
an arbitrary attendance sheet was open to employers and accounting. All now carry
explicit guards, and the client-side gates were aligned so no button appears that
the server will refuse.

### Transport and abuse

- CORS reflected any origin; it now uses an allowlist from `CORS_ORIGINS`.
  Requests with no `Origin`, which is what the mobile app sends, still pass.
- Login and password change are limited to 10 attempts per 15 minutes per
  address. Other API routes are limited to 300 per minute.
- Security headers are set: `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Resource-Policy`, and
  HSTS when the request arrives over TLS. `X-Powered-By` is removed.
- Login no longer reveals which email addresses are registered through response
  timing.
- Session lifetime moved from 30 days to a configurable `JWT_EXPIRES_IN`,
  default 7 days.

The rate limiter keeps its counters in memory, so it is per process. Put a
limiter in front of the app if you run more than one instance.

### Dangerous scripts

`cleanClients.js` deleted every client immediately on execution with no
confirmation. It now reports the target database and document count, and deletes
only with `CONFIRM_DELETE_CLIENTS=yes`.

`seedUsers.js` created five accounts sharing the password `123456`, including an
administrator at a predictable address. It now creates one administrator from
environment variables, rejects a weak password, and does nothing if any user
already exists.

## Known gaps

- **No token revocation.** Signing out discards the token client-side but the
  server keeps honouring it until it expires. Rotating `JWT_SECRET` is the only
  way to invalidate issued tokens.
- **No audit trail.** Approvals, signatures and deletions are not logged beyond
  the fields on each record.
- **Rate limiting is per process** and resets when the server restarts.
- **Uploaded files are not scanned** for malicious content. They are served with
  `nosniff` and a restrictive `Content-Security-Policy`, so a stored HTML file
  cannot execute in the application's origin, but the files themselves are not
  inspected.
- **No account lockout.** Repeated failures are slowed by rate limiting but an
  account is never locked.
