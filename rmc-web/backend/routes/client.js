const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Client = require('../models/Client');
const { protect, authorize } = require('../middleware/auth');
const { uploadPath, toStoredPath } = require('../config/uploadDirs');
const { removeStoredFiles, blockedBy } = require('../utils/cleanup');
const { withConflictRetry, withDuplicateRetry } = require('../utils/retry');
const Planning = require('../models/Planning');
const BonDeReception = require('../models/BonDeReception');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath('uploads/clients'));
  },
  filename: function (req, file, cb) {
    cb(null, `client-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    const err = new Error('Type de fichier non autorisé (PDF, DOC, DOCX, images uniquement)');
    err.status = 400;
    return cb(err);
  }
});

// Unite and sous-titre numbers must not be derived from array length: deleting
// an entry in the middle makes the next insert reuse a number that already exists.
// Derive the next value from the highest suffix actually in use instead.
const nextSuffix = (existing, extract) => {
  const used = existing
    .map(extract)
    .filter((n) => Number.isFinite(n));
  return (used.length ? Math.max(...used) : 0) + 1;
};

// ============================================
// GET ALL CLIENTS - ALL ROLES
// ============================================
router.get('/', protect, async (req, res) => {
  try {
    const clients = await Client.find()
      .populate('createdBy', 'name email')
      .sort({ clientNumber: 1 });

    res.json({ success: true, count: clients.length, data: clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// GET SINGLE CLIENT - ALL ROLES
// ============================================
router.get('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// CREATE NEW CLIENT - ALL ROLES CAN CREATE
// ============================================
// Creating clients and their units was open to every signed-in role,
// including plain employees, while both interfaces already hid the action from
// them. The guard now matches what the apps present.
router.post('/', protect, authorize('rh', 'admin', 'responsable', 'comptable'), upload.array('pieceJointe', 5), async (req, res) => {
  try {
    const {
      name,
      email,
      address,
      telephone,
      departement,
      tvaPercentage,
      modePaiement,
      devise
    } = req.body;

    // clientNumber is assigned by a pre-validate hook that reads the current
    // maximum. Two simultaneous creates read the same value, and the unique
    // index rejects the second with E11000. Retry so it takes the next number
    // instead of surfacing a server error.
    const client = await withDuplicateRetry(async () => {
      const doc = new Client({
        name,
        email: email || '',
        address: address || '',
        telephone: telephone || '',
        departement: departement || '',
        tvaPercentage: tvaPercentage || 19,
        modePaiement: modePaiement || 'Virement',
        devise: devise || 'TND',
        createdBy: req.user.id
      });

      if (req.files && req.files.length > 0) {
        doc.pieceJointe = req.files.map(file => ({
          fileName: file.originalname,
          filePath: toStoredPath(file.path)
        }));
      }

      await doc.save();
      return doc;
    });

    const populatedClient = await Client.findById(client._id)
      .populate('createdBy', 'name email');

    res.status(201).json({ success: true, data: populatedClient });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================
// UPDATE CLIENT - ONLY RH AND ADMIN
// ============================================
router.put('/:id', protect, authorize('rh', 'admin'), upload.array('pieceJointe', 5), async (req, res) => {
  try {
    const {
      name,
      email,
      address,
      telephone,
      departement,
      tvaPercentage,
      modePaiement,
      devise
    } = req.body;

    let client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Update fields
    if (name) client.name = name;
    if (email !== undefined) client.email = email;
    if (address !== undefined) client.address = address;
    if (telephone !== undefined) client.telephone = telephone;
    if (departement !== undefined) client.departement = departement;
    if (tvaPercentage !== undefined) client.tvaPercentage = tvaPercentage;
    if (modePaiement !== undefined) client.modePaiement = modePaiement;
    if (devise !== undefined) client.devise = devise;
    client.updatedAt = Date.now();

    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => ({
        fileName: file.originalname,
        filePath: toStoredPath(file.path)
      }));
      client.pieceJointe = [...(client.pieceJointe || []), ...newFiles];
    }

    await client.save();

    const populatedClient = await Client.findById(client._id)
      .populate('createdBy', 'name email');

    res.json({ success: true, data: populatedClient });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// DELETE CLIENT - ONLY RH AND ADMIN
// ============================================
router.delete('/:id', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Deleting a client used to leave its tasks, receipt slips and invoices
    // pointing at an id that no longer resolves, which silently broke the
    // monthly report. Refuse instead of destroying the trail.
    const [tasks, bons] = await Promise.all([
      Planning.countDocuments({ client: client._id }),
      BonDeReception.countDocuments({ client: client._id }),
    ]);

    const blocking = blockedBy({ 'tâche(s)': tasks, 'bon(s) de réception': bons });
    if (blocking) {
      return res.status(409).json({
        message: `Impossible de supprimer ce client: ${blocking} y sont rattaché(s).`
      });
    }

    // No references left, so the attachments can go with it.
    removeStoredFiles((client.pieceJointe || []).map(f => f.filePath));
    await client.deleteOne();

    res.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ADD UNITE TO CLIENT - ALL ROLES
// ============================================
router.post('/:id/unites', protect, authorize('rh', 'admin', 'responsable', 'comptable'), async (req, res) => {
  try {
    const { uniteName, responsable, email, phone } = req.body;

    // Only uniteName is required
    if (!uniteName) {
      return res.status(400).json({
        message: 'Le nom de l\'unité est requis'
      });
    }

    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Read-compute-write over two round trips let two simultaneous requests pick
    // the same number. The push below is a single conditional update: it only
    // applies while that number is still absent, so a loser simply retries with
    // the next one. A unique index cannot help here because MongoDB does not
    // enforce uniqueness within one document's own array.
    const updated = await withConflictRetry(async () => {
      const fresh = await Client.findById(req.params.id).select('clientNumber unites.uniteNumber');
      if (!fresh) return null;

      const nextUnite = nextSuffix(fresh.unites, (u) =>
        parseInt(String(u.uniteNumber || '').split('-').pop(), 10)
      );
      const uniteNumber = `${fresh.clientNumber}-${String(nextUnite).padStart(3, '0')}`;

      return Client.findOneAndUpdate(
        { _id: req.params.id, 'unites.uniteNumber': { $ne: uniteNumber } },
        {
          $push: {
            unites: {
              uniteName,
              uniteNumber,
              responsable: responsable || '',
              email: email || '',
              phone: phone || '',
              sousTitres: []
            }
          }
        },
        { new: true, runValidators: true }
      );
    });

    if (!updated) {
      return res.status(409).json({
        message: 'Conflit de numérotation, veuillez réessayer.'
      });
    }

    const populatedClient = await Client.findById(updated._id)
      .populate('createdBy', 'name email');

    res.status(201).json({ success: true, data: populatedClient });
  } catch (error) {
    console.error('Error adding unite:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// DELETE UNITE FROM CLIENT - ONLY RH AND ADMIN
// ============================================
router.delete('/:id/unites/:uniteId', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const unite = client.unites.id(req.params.uniteId);
    if (!unite) {
      return res.status(404).json({ message: 'Unite not found' });
    }

    // Tasks and receipt slips reference a unit by its number, not by its id, so
    // removing a unit that is still in use orphans them.
    const [tasks, bons] = await Promise.all([
      Planning.countDocuments({ uniteNumber: unite.uniteNumber }),
      BonDeReception.countDocuments({ uniteNumber: unite.uniteNumber }),
    ]);

    const blocking = blockedBy({ 'tâche(s)': tasks, 'bon(s) de réception': bons });
    if (blocking) {
      return res.status(409).json({
        message: `Impossible de supprimer cette unité: ${blocking} y sont rattaché(s).`
      });
    }

    client.unites = client.unites.filter(
      u => u._id.toString() !== req.params.uniteId
    );

    await client.save();

    const populatedClient = await Client.findById(client._id)
      .populate('createdBy', 'name email');

    res.json({ success: true, data: populatedClient });
  } catch (error) {
    console.error('Error deleting unite:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ADD SOUS-TITRE TO UNITE
// ============================================
router.post('/:clientId/unites/:uniteId/sous-titres', protect, authorize('rh', 'admin', 'responsable', 'comptable'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Le nom du sous-titre est requis' });
    }

    const client = await Client.findById(req.params.clientId);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    if (!client.unites.id(req.params.uniteId)) {
      return res.status(404).json({ message: 'Unite not found' });
    }

    // Same conditional push as the unite route: apply only while the generated
    // reference is still free, and retry with the next one otherwise.
    const updated = await withConflictRetry(async () => {
      const fresh = await Client.findById(req.params.clientId).select('unites');
      const unite = fresh && fresh.unites.id(req.params.uniteId);
      if (!unite) return null;

      const nextRef = nextSuffix(unite.sousTitres, (st) =>
        parseInt(String(st.refNumber || '').split('-').pop(), 10)
      );
      const refNumber = `${unite.uniteNumber}-${String(nextRef).padStart(2, '0')}`;

      return Client.findOneAndUpdate(
        {
          _id: req.params.clientId,
          'unites._id': req.params.uniteId,
          'unites.sousTitres.refNumber': { $ne: refNumber }
        },
        { $push: { 'unites.$.sousTitres': { name, refNumber } } },
        { new: true, runValidators: true }
      );
    });

    if (!updated) {
      return res.status(409).json({
        message: 'Conflit de numérotation, veuillez réessayer.'
      });
    }

    const populatedClient = await Client.findById(updated._id)
      .populate('createdBy', 'name email');

    res.json({ success: true, data: populatedClient });
  } catch (error) {
    console.error('Error adding sous-titre:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// DELETE SOUS-TITRE FROM UNITE - ONLY RH AND ADMIN
// ============================================
router.delete('/:clientId/unites/:uniteId/sous-titres/:sousTitreId', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const unite = client.unites.id(req.params.uniteId);
    if (!unite) {
      return res.status(404).json({ message: 'Unite not found' });
    }

    unite.sousTitres = unite.sousTitres.filter(
      st => st._id.toString() !== req.params.sousTitreId
    );

    await client.save();

    const populatedClient = await Client.findById(client._id)
      .populate('createdBy', 'name email');

    res.json({ success: true, data: populatedClient });
  } catch (error) {
    console.error('Error deleting sous-titre:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;