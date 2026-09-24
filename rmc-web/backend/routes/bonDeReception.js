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
    res.status(500).json({ message: 'Server error' });
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
      return res.status(404).json({ message: 'Bon de Réception not found' });
    }

    res.json({ success: true, data: bon });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
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
    res.status(500).json({ message: 'Server error' });
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
      return res.status(404).json({ message: 'Bon de Réception not found' });
    }

    if (bon.status === 'signed') {
      return res.status(400).json({ message: 'Bon already signed' });
    }

    if (bon.taches.length === 0) {
      return res.status(400).json({ message: 'Cannot sign empty Bon de Réception' });
    }

    // Generate DOCX
    try {
      const docPath = await generateBonDeReceptionDocument(bon);
      bon.docxPath = docPath;
    } catch (docError) {
      console.error('Error generating document:', docError);
      return res.status(500).json({ message: 'Failed to generate document' });
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
      message: 'Bon de Réception signed successfully',
      data: populatedBon,
      newBon: {
        id: newBon._id,
        bonNumber: newBon.bonNumber
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Download Bon de Réception DOCX
router.get('/:id/download', protect, async (req, res) => {
  try {
    const bon = await BonDeReception.findById(req.params.id);

    if (!bon) {
      return res.status(404).json({ message: 'Bon de Réception not found' });
    }

    if (!bon.docxPath) {
      return res.status(404).json({ message: 'Document not generated yet' });
    }

    res.json({
      success: true,
      path: bon.docxPath
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const bon = await BonDeReception.findById(req.params.id);

    if (!bon) {
      return res.status(404).json({ message: 'Bon de Réception not found' });
    }

    // Only allow deletion of signed bons
    if (bon.status !== 'signed') {
      return res.status(400).json({ 
        message: 'Only signed Bons de Réception can be deleted' 
      });
    }

    // Delete the generated document alongside the record.
    removeStoredFile(bon.docxPath);

    await BonDeReception.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'Bon de Réception deleted successfully' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;