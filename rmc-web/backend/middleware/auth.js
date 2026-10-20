const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Shown to users in 403 messages, so the role is named as they know it.
const ROLE_LABELS = {
  admin: 'Administrateur',
  rh: 'RH',
  responsable: 'Responsable',
  comptable: 'Comptable',
  employer: 'Employé',
};

// Verify token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Session absente. Veuillez vous connecter.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    // The token can still be valid after the account was deleted. Without this
    // check req.user stays null and authorize() throws a TypeError (500).
    if (!user) {
      return res.status(401).json({ message: "Ce compte n'existe plus." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expirée. Veuillez vous reconnecter.' });
  }
};

// Check roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Session absente. Veuillez vous connecter.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Action non autorisée pour votre rôle (${ROLE_LABELS[req.user.role] || req.user.role}).`
      });
    }
    next();
  };
};