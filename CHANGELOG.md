# Changelog

What changed in RMS, newest first, and why. Each entry names the commit it
shipped in. For how to deploy, see `DEPLOYMENT.md`; for security notes, see
`SECURITY.md`.

---

## 2026-11-02 — `22e0411` Backend rules, client archive, dashboard redesign

Deployed to the VM the same day (pre-deploy backup in
`/srv/rms/backups/2026-11-02_2024`). New Android APK built from this commit
(EAS build `ad8c6fce`, download link valid until 2026-11-16); the previous APK
link had expired, which is what "The specified key does not exist" meant.

### Reported problems fixed

- **Same vehicle or employee could be added twice to a demande d'accès.** The
  server now refuses a repeated CIN or plate, whatever the spacing or case, on
  create and on edit (`backend/utils/accessCrew.js`). The form hides employees
  already chosen in another row and flags a duplicate typed by hand.
- **Admins could not delete clients.** A client with tasks or bons is now
  *archived* instead of refused: it leaves the lists and the task form, while its
  tasks, bons and invoices keep resolving. A client with no history is still
  deleted. New "Archivés" view with a Restaurer button
  (`GET /clients?archived=true`, `PATCH /clients/:id/restore`). New tasks for an
  archived client are refused.
- **Admins could not approve their own expenses.** They now can. RH still cannot
  decide on their own expense; an administrator does.
- **Status colours were unreadable.** One `StatusBadge` component for every
  status. Two list stylesheets had set white text on every `.status-badge` in the
  app.

### Other bugs found and fixed

- A client with 0 % TVA was saved, edited and shown as 19 % (web form, client
  card, mobile form and detail screen).
- A task created directly as "Terminé" never reached a bon, so it could never be
  invoiced.
- The same worker could be assigned twice to a task, or marked twice in one
  pointage.
- Overlapping congé requests for the same days were accepted.
- Two people signing the same bon, or invoicing the same bons, at the same moment
  could create duplicates; both are now atomic.
- A responsable could edit a permit RH had already approved (e.g. add people);
  such an edit now sends it back to "en attente".
- Errors in routes are passed to the central handler, so a bad id or a missing
  field answers 400 with a message instead of 500 "Erreur serveur".
- Uploads from failed requests, replaced employee photos/CIN scans and
  regenerated permit documents were left on disk.
- Expense categories showed their English keys ("Materials") in the list, the
  monthly report and its Excel export.

### Web redesign

- Navy accents instead of brass; cool neutral background.
- Icon action buttons with distinct meanings (delete is a bin, no longer the same
  ✕ as reject).
- **Tableau de bord** shared by every role (`components/shared/DashboardOverview.js`):
  four figures on one line, then quick links arranged so no card sits alone on a
  row. Figures per role — Admin: utilisateurs, tâches, dépenses en attente,
  dépenses approuvées · RH: employés, congés / demandes d'accès / dépenses en
  attente · Comptable: bons à facturer, factures, total facturé, dépenses
  approuvées · Responsable: tâches à réaliser, pointage du jour, demandes d'accès
  en attente, mes dépenses en attente · Employé: mes tâches, mes dépenses en
  attente, mes autorisations d'accès, mes congés en attente.
- List pages: the title repeated under the page header became a slim toolbar;
  summary counters restyled as tiles; congé calendar about a third of its old
  height; the collapsed sidebar shows the RMS emblem instead of a cut-off logo.

### Verification

37 backend unit tests, plus a 63-step end-to-end run of all five roles against a
throwaway database, all passing; production build passing.

---

## 2026-10-20 — `18aec1e` Sessions, role-gated UI, stale lists

- **Reload signed people out / wrong role errors.** The token lived only in
  `localStorage`, shared by every tab, so signing in as someone else in another
  tab swapped it under the first. Each tab now keeps its own session
  (`services/session.js`).
- **Pages did not show new data until a reload** (e.g. new demandes d'accès):
  lists refresh on focus and every 30 s (`hooks/useAutoRefresh.js`).
- **"Erreur lors de la duplication" for a responsable on pointage** — caused by
  the token mix-up above; the real server message is now shown.
- **Buttons a role cannot use are hidden** (e.g. RH signing a bon), using a
  permissions helper mirrored from the mobile app (`utils/permissions.js`).
- Whole site in French, including server messages; tab icon changed from React to
  RMS; congé request box fixed.
- Security: a crafted path could read another category's uploads; login accepted
  query operators in the email field. Both closed, with tests.

## 2026-10-14 — `882eeba` Mobile app linked to EAS

Android APK built with EAS (`preview` profile, pointing at the VM).

## 2026-10-12 — `ae9bb1b` Data integrity, fonts, deployment hardening

- Data-integrity fixes, including: a responsable editing an employee wiped their
  CNSS number; leave approval ignored the 18-day balance; unsigned bons could be
  invoiced; invoiced bons could be deleted.
- Fonts and Material Symbols self-hosted, so icons no longer break when Google
  Fonts is blocked or the browser translates the page.
- VM deployment: nginx, MongoDB with authentication, `/uploads` served only
  through the access-checked route, nightly backups, HTTPS via sslip.io until the
  rms.tn domain is pointed.

## 2026-09-24 — `4328826` Initial commit

---

## Still open

- Point `rms.tn` at the VM when the client provides DNS access, then switch TLS
  and `CORS_ORIGINS` (see `DEPLOYMENT.md` §2 and §6).
- APK download links from EAS expire after 14 days; keep the downloaded `.apk`
  file, or rebuild (see `DEPLOYMENT.md` §9).
- Optional: fail2ban on the VM now that root password SSH is enabled; an email on
  the Let's Encrypt account for expiry notices.
- Decisions to confirm: RH keeps permission to sign bons (could be
  download-only); employees may withdraw only pending congés.
