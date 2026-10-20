// backend/routes/bonDeReception.js
const express = require('express');
const router = express.Router();
const BonDeReception = require('../models/BonDeReception');
const { protect, authorize } = require('../middleware/auth');
const generateBonDeReceptionDocument = require('../utils/generateBonDeReceptionDocument');
const { withDuplicateRetry } = require('../utils/retry');
const { removeStoredFile } = require('../utils/cleanup');

// Get all Bons de Réception
router.get('/', protect, async (req, res) => {
  try {
    const bons = await BonDeReception.find()
      .populate('client', 'name clientNumber email')
      .populate('signedBy', 'name email')
      .populate({
        path: 'taches.planning',
        select: 'description date'
      })
      .populate({
        path: 'taches.assignedWorkers',
        select: 'name cin'
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bons.length, data: bons });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Get single Bon de Réception
router.get('/:id', protect, async (req, res) => {
  try {
    const bon = await BonDeReception.findById(req.params.id)
      .populate('client', 'name clientNumber email address telephone')
      .populate('signedBy', 'name email')
      .populate({
        path: 'taches.assignedWorkers',
        select: 'name cin'
      });

    if (!bon) {
      return res.status(404).json({ message: 'Bon de réception introuvable' });
    }

    res.json({ success: true, data: bon });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Get Bons by Client
router.get('/client/:clientId', protect, async (req, res) => {
  try {
    const bons = await BonDeReception.find({ client: req.params.clientId })
      .populate('signedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bons.length, data: bons });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Sign Bon de Réception (Lock it and generate DOCX)
router.post('/:id/sign', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const bon = await BonDeReception.findById(req.params.id)
      .populate('client', 'name clientNumber email address telephone')
      .populate({
        path: 'taches.assignedWorkers',
        select: 'name cin'
      });

    if (!bon) {
      return res.status(404).json({ message: 'Bon de réception introuvable' });
    }

    if (bon.status === 'signed') {
      return res.status(400).json({ message: 'Ce bon est déjà signé' });
    }

    if (bon.taches.length === 0) {
      return res.status(400).json({ message: 'Impossible de signer un bon de réception vide' });
    }

    // Generate DOCX
    try {
      const docPath = await generateBonDeReceptionDocument(bon);
      bon.docxPath = docPath;
    } catch (docError) {
      console.error('Error generating document:', docError);
      return res.status(500).json({ message: 'Échec de la génération du document' });
    }

    // Lock the Bon
    bon.status = 'signed';
    bon.signedBy = req.user.id;
    bon.signedAt = Date.now();

    await bon.save();

    // Open the next active Bon for this unité. The bonNumber is left unset so
    // the model's pre-validate hook assigns it; this route used to duplicate
    // that same numbering logic inline.
    const newBon = await withDuplicateRetry(async () => {
      const doc = new BonDeReception({
        client: bon.client._id,
        clientName: bon.clientName,
        clientNumber: bon.clientNumber,
        unite: bon.unite,
        uniteNumber: bon.uniteNumber,
        status: 'active'
      });
      await doc.save();
      return doc;
    });

    const populatedBon = await BonDeReception.findById(bon._id)
      .populate('client', 'name clientNumber')
      .populate('signedBy', 'name email');

    res.json({
      success: true,
      message: 'Bon de réception signé',
      data: populatedBon,
      newBon: {
        id: newBon._id,
        bonNumber: newBon.bonNumber
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Download Bon de Réception DOCX
router.get('/:id/download', protect, async (req, res) => {
  try {
    const bon = await BonDeReception.findById(req.params.id);

    if (!bon) {
      return res.status(404).json({ message: 'Bon de réception introuvable' });
    }

    if (!bon.docxPath) {
      return res.status(404).json({ message: 'Document not generated yet' });
    }

    res.json({
      success: true,
      path: bon.docxPath
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:id', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const bon = await BonDeReception.findById(req.params.id);

    if (!bon) {
      return res.status(404).json({ message: 'Bon de réception introuvable' });
    }

    // Only allow deletion of signed bons
    if (bon.status !== 'signed') {
      return res.status(400).json({
        message: 'Seuls les bons de réception signés peuvent être supprimés'
      });
    }

    // A bon already billed is part of an invoice's line items. Deleting it would
    // leave the facture pointing at a document that no longer exists, so the
    // invoice total could no longer be reconciled against the work it bills.
    // `facture` is the lock facturation.js sets on invoice create and clears on
    // invoice delete, so reading it needs no extra query.
    if (bon.facture != null) {
      return res.status(409).json({
        message: 'Impossible de supprimer ce bon: il est rattaché à une facture.'
      });
    }

    // Delete the generated document alongside the record.
    removeStoredFile(bon.docxPath);

    await BonDeReception.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'Bon de réception supprimé' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;