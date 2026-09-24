const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { uploadsRoot } = require('../config/uploadDirs');

const User = require('../models/User');
const Client = require('../models/Client');
const Expense = require('../models/Expense');
const CongeRequest = require('../models/CongeRequest');
const AccessRequest = require('../models/AccessRequest');
const BonDeReception = require('../models/BonDeReception');

// This directory was previously handed to express.static with no auth at all,
// so CIN scans, employee photos, expense receipts, signed site permits and
// invoices were readable by anyone who could guess or was given a URL.
//
// Everything here now requires a valid session, and the personal categories
// additionally require either a privileged role or ownership of the record the
// file belongs to.

const has = (role, ...roles) => roles.includes(role);

// Resolve the request path inside the uploads directory, refusing anything that
// escapes it via .. or an absolute path.
const resolveSafePath = (relative) => {
  const decoded = decodeURIComponent(relative || '').replace(/\\/g, '/');
  const target = path.resolve(uploadsRoot, '.' + path.posix.resolve('/', decoded));
  const rootWithSep = uploadsRoot.endsWith(path.sep) ? uploadsRoot : uploadsRoot + path.sep;
  if (target !== uploadsRoot && !target.startsWith(rootWithSep)) return null;
  return target;
};

// The value stored in the database for a given request path.
const storedPathFor = (relative) => 'uploads/' + relative.replace(/^\/+/, '');

// Match either the normalised path or a legacy one containing backslashes.
const pathVariants = (stored) => [stored, stored.replace(/\//g, '\\')];

const rules = {
  // Client attachments and receipt slips are visible to every signed-in user,
  // matching the read access those routes already grant.
  clients: async () => true,
  'bon-de-reception': async () => true,

  // Employee photo and CIN scan: staff who manage people, or the employee.
  employees: async (user, stored) => {
    if (has(user.role, 'rh', 'admin', 'responsable')) return true;
    const variants = pathVariants(stored);
    return !!(await User.exists({
      _id: user._id,
      $or: [{ photo: { $in: variants } }, { cinImage: { $in: variants } }],
    }));
  },

  // Leave request attachment: HR staff, or the employee who filed it.
  conge: async (user, stored) => {
    if (has(user.role, 'rh', 'admin', 'responsable')) return true;
    return !!(await CongeRequest.exists({
      employee: user._id,
      pieceJointe: { $in: pathVariants(stored) },
    }));
  },

  // Expense receipt: approvers and accounting, or the person who submitted it.
  factures: async (user, stored) => {
    if (has(user.role, 'rh', 'admin', 'comptable')) return true;
    return !!(await Expense.exists({
      createdBy: user._id,
      factureImage: { $in: pathVariants(stored) },
    }));
  },

  // Site access permit: the staff who handle them, or a worker named on an
  // approved request, which is the same rule as GET /rh/my-access-requests.
  documents: async (user, stored) => {
    if (has(user.role, 'rh', 'admin', 'responsable')) return true;
    if (!user.cin) return false;
    return !!(await AccessRequest.exists({
      status: 'approved',
      'workers.cin': user.cin,
      docxPath: { $in: pathVariants(stored) },
    }));
  },
};

router.get(/^\/(.*)/, protect, async (req, res) => {
  try {
    const relative = req.params[0];
    if (!relative) return res.status(404).json({ message: 'Fichier introuvable' });

    const absolute = resolveSafePath(relative);
    if (!absolute) {
      return res.status(400).json({ message: 'Chemin de fichier invalide' });
    }

    // Authorisation is decided before existence, so a caller who may not read a
    // category always gets the same 403 whether or not the file is there. The
    // other order lets someone probe for filenames by telling 404 from 403.
    const category = relative.replace(/^\/+/, '').split('/')[0];
    const rule = rules[category];
    if (!rule) {
      // Unknown category: deny rather than serve something no rule covers.
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const allowed = await rule(req.user, storedPathFor(relative));
    if (!allowed) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return res.status(404).json({ message: 'Fichier introuvable' });
    }

    // Never let a stored file be interpreted as markup by the browser.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');

    return res.sendFile(absolute);
  } catch (error) {
    console.error('Error serving upload:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
