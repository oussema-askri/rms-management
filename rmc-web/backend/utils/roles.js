const ROLES = ['employer', 'rh', 'admin', 'responsable', 'comptable'];

// Which roles each role is allowed to hand out.
//
// Before this existed, POST /api/rh/employees took the role straight from the
// request body, so a responsable could create an administrator, and the update
// route let a responsable change anyone's role for the same reason.
const ASSIGNABLE_ROLES = {
  admin: ['employer', 'rh', 'admin', 'responsable', 'comptable'],
  rh: ['employer', 'responsable', 'comptable'],
  responsable: ['employer'],
  comptable: [],
  employer: [],
};

// Roles that must not be created or modified by anyone below an administrator.
const PRIVILEGED_ROLES = ['admin'];

const canAssignRole = (actorRole, targetRole) =>
  (ASSIGNABLE_ROLES[actorRole] || []).includes(targetRole);

// Only an administrator may edit or delete another administrator's account.
const canModifyUser = (actorRole, targetUserRole) => {
  if (actorRole === 'admin') return true;
  return !PRIVILEGED_ROLES.includes(targetUserRole);
};

// A shared minimum so passwords set through any route are equally strong.
const MIN_PASSWORD_LENGTH = 8;

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Mot de passe requis';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre et un chiffre';
  }
  return null;
};

// Temporary password for an administrator-triggered reset. Random per reset,
// replacing the hard-coded "123456" that every reset used to produce.
const generateTemporaryPassword = () => {
  const crypto = require('crypto');
  const letters = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const alphabet = letters + digits;

  const pick = (set) => set[crypto.randomInt(0, set.length)];

  // Guarantee the result satisfies validatePassword.
  const chars = [pick(letters), pick(digits)];
  while (chars.length < 12) chars.push(pick(alphabet));

  // Fisher-Yates with a cryptographic source so position is not predictable.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

module.exports = {
  ROLES,
  ASSIGNABLE_ROLES,
  PRIVILEGED_ROLES,
  canAssignRole,
  canModifyUser,
  validatePassword,
  generateTemporaryPassword,
  MIN_PASSWORD_LENGTH,
};
