// Client-side mirror of the guards in the backend routes.
//
// These helpers only decide what to SHOW. The server is still the authority,
// and every rule here must match its route guard: a helper that is more
// permissive than the backend produces a button that always fails with 403,
// which is exactly what several screens used to do.
//
// Backend reference: rmc-web/backend/routes/*.js

export const ROLES = {
  EMPLOYER: 'employer',
  RH: 'rh',
  ADMIN: 'admin',
  RESPONSABLE: 'responsable',
  COMPTABLE: 'comptable',
};

const has = (role, ...allowed) => allowed.includes(role);

// ── Clients ────────────────────────────────────────────────────────────────
// routes/client.js
export const canViewClients = (role) => !!role;                                  // protect only
// Creating clients, units and sub-titles was open to every signed-in role on the
// server; it is now restricted, so these must match or employers see buttons
// that fail.
export const canCreateClient = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.RESPONSABLE, ROLES.COMPTABLE);
export const canEditClient = (role) => has(role, ROLES.RH, ROLES.ADMIN);         // PUT /clients/:id
export const canDeleteClient = (role) => has(role, ROLES.RH, ROLES.ADMIN);       // DELETE /clients/:id
export const canCreateUnite = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.RESPONSABLE, ROLES.COMPTABLE);
export const canDeleteUnite = (role) => has(role, ROLES.RH, ROLES.ADMIN);
export const canCreateSousTitre = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.RESPONSABLE, ROLES.COMPTABLE);
export const canDeleteSousTitre = (role) => has(role, ROLES.RH, ROLES.ADMIN);

// ── Planning ───────────────────────────────────────────────────────────────
// routes/planning.js
export const canCreatePlanning = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.RESPONSABLE, ROLES.COMPTABLE); // POST /planning
export const canEditPlanning = (role) => has(role, ROLES.RH, ROLES.ADMIN);       // PUT /planning/:id
export const canDeletePlanning = (role) => has(role, ROLES.ADMIN);               // DELETE /planning/:id
// Marking a task completed is a PUT, so it needs the same rights as editing.
export const canChangePlanningStatus = canEditPlanning;

// ── Bons de réception ──────────────────────────────────────────────────────
// routes/bonDeReception.js
export const canSignBon = (role) => has(role, ROLES.RH, ROLES.ADMIN);            // POST /:id/sign
export const canDeleteBon = (role) => has(role, ROLES.RH, ROLES.ADMIN);

// ── Dépenses ───────────────────────────────────────────────────────────────
// routes/expense.js
export const canApproveExpense = (role) => has(role, ROLES.RH, ROLES.ADMIN);
export const canDeleteExpense = (role) => has(role, ROLES.RH, ROLES.ADMIN);
export const canSeeAllExpenses = (role) => has(role, ROLES.RH, ROLES.ADMIN, ROLES.COMPTABLE);

// ── Employés ───────────────────────────────────────────────────────────────
// routes/rh.js
export const canViewEmployees = (role) => !!role;
export const canManageEmployees = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.RESPONSABLE);                           // POST/PUT /rh/employees
export const canDeleteEmployee = (role) => has(role, ROLES.ADMIN);
export const canSetAvailability = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.RESPONSABLE);
export const canAddPrime = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.RESPONSABLE);
export const canResetPassword = (role) => has(role, ROLES.ADMIN);
export const canSeeSalaries = (role) => has(role, ROLES.RH, ROLES.ADMIN, ROLES.COMPTABLE);

// ── Demandes d'accès ───────────────────────────────────────────────────────
// routes/rh.js
export const canViewAccessRequests = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.RESPONSABLE);
export const canManageAccessRequests = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.RESPONSABLE);                           // create / edit / delete
export const canApproveAccessRequest = (role) => has(role, ROLES.RH, ROLES.ADMIN);

// ── Congés ─────────────────────────────────────────────────────────────────
// routes/rh.js
export const canViewAllConge = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.RESPONSABLE);
export const canApproveConge = (role) => has(role, ROLES.RH, ROLES.ADMIN);
export const canViewSoldes = (role) => has(role, ROLES.RH, ROLES.ADMIN, ROLES.COMPTABLE);

// ── Pointage ───────────────────────────────────────────────────────────────
// routes/pointage.js
export const canFillPointage = (role) => has(role, ROLES.RESPONSABLE, ROLES.ADMIN);
export const canViewAllPointage = (role) => has(role, ROLES.ADMIN, ROLES.RH);
export const canDeletePointage = (role) => has(role, ROLES.ADMIN);               // DELETE /pointage/:id

// ── Facturation ────────────────────────────────────────────────────────────
// routes/facturation.js
export const canViewFacturation = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.COMPTABLE);
export const canCreateFacture = (role) =>
  has(role, ROLES.RH, ROLES.ADMIN, ROLES.COMPTABLE);
export const canDeleteFacture = (role) => has(role, ROLES.ADMIN);

// ── Admin ──────────────────────────────────────────────────────────────────
// routes/admin.js
export const canViewMonthlyReport = (role) => has(role, ROLES.ADMIN);
export const canDeleteAnything = (role) => has(role, ROLES.ADMIN);
