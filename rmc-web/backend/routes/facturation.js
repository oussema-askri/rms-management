const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const generateFacturationDocument = require('../utils/generateFacturationDocument');
const Facture = require('../models/Facture');
const BonDeReception = require('../models/BonDeReception');
const mongoose = require('mongoose');

// GET /api/facturation
// Fetch all generated invoices
router.get('/', protect, authorize('rh', 'admin', 'comptable'), async (req, res) => {
  try {
    const factures = await Facture.find().sort({ createdAt: -1 }).populate('bons', 'bonNumber clientName');
    res.json({ success: true, data: factures });
  } catch (error) {
    console.error('Error fetching factures:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des factures' });
  }
});

// POST /api/facturation
// Generate and save a new invoice
router.post('/', protect, authorize('rh', 'admin', 'comptable'), async (req, res) => {
  try {
    const { factureNumber, date, clientName, clientAddress, clientTel, items, bonIds } = req.body;

    if (!factureNumber) {
      return res.status(400).json({ message: 'Numéro de facture requis' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Aucun article dans la facture' });
    }

    // Recompute line and invoice totals from the unit prices. The client used
    // to send totalHT and it was stored unchecked, so a wrong or stale total
    // could be invoiced.
    const normalisedItems = items.map((item) => {
      const quantite = Number(item.quantite) || 0;
      const prixUHT = Number(item.prixUHT) || 0;
      return {
        description: item.description || '',
        unite: item.unite || '',
        quantite,
        prixUHT,
        prixTHT: Math.round(quantite * prixUHT * 1000) / 1000,
      };
    });

    const totalHT = Math.round(
      normalisedItems.reduce((sum, item) => sum + item.prixTHT, 0) * 1000
    ) / 1000;

    // De-duplicate: a bon sent twice would make the existence count below
    // (selected.length !== bons.length) reject an otherwise valid request.
    const bons = [...new Set((Array.isArray(bonIds) ? bonIds : []).filter(Boolean).map(String))];

    // Fetched once and checked three ways rather than one query each.
    if (bons.length > 0) {
      // A non-ObjectId would make the $in query throw a CastError and fall
      // through to the generic 500; reject it as a bad request up front.
      if (bons.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({ message: 'Identifiant de bon invalide.' });
      }

      const selected = await BonDeReception.find({ _id: { $in: bons } })
        .select('bonNumber status facture');

      if (selected.length !== bons.length) {
        return res.status(400).json({ message: 'Un ou plusieurs bons sont introuvables.' });
      }

      if (selected.some((b) => b.facture != null)) {
        return res.status(400).json({ message: 'Un ou plusieurs bons ont déjà été facturés.' });
      }

      // An unsigned bon is still open: tâches can go on being added to it after
      // the invoice is raised, and that later work is then never billable,
      // because the bon already carries a facture reference and so is refused
      // by the already-billed check above. Only a signed bon is final.
      const unsigned = selected.filter((b) => b.status !== 'signed');
      if (unsigned.length > 0) {
        return res.status(400).json({
          message: `Seuls les bons signés peuvent être facturés. Non signé(s): ${unsigned.map((b) => b.bonNumber).join(', ')}.`,
        });
      }
    }

    const duplicate = await Facture.findOne({ factureNumber });
    if (duplicate) {
      return res.status(400).json({ message: `La facture ${factureNumber} existe déjà.` });
    }

    const facture = new Facture({
      factureNumber,
      date: date || new Date(),
      clientName,
      clientAddress,
      clientTel,
      items: normalisedItems,
      totalHT,
      bons,
      createdBy: req.user.id
    });

    await facture.save();

    // Lock the Bons
    if (bons.length > 0) {
      await BonDeReception.updateMany(
        { _id: { $in: bons } },
        { $set: { facture: facture._id } }
      );
    }

    res.status(201).json({ success: true, data: facture });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ce numéro de facture existe déjà.' });
    }
    console.error('Error creating facture:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la facture' });
  }
});

// GET /api/facturation/:id/download
// Regenerate and download the Word document for a saved invoice
router.get('/:id/download', protect, authorize('rh', 'admin', 'comptable'), async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id).populate('bons', 'bonNumber');
    if (!facture) {
      return res.status(404).json({ message: 'Facture introuvable' });
    }

    const bonNumbers = facture.bons && facture.bons.length > 0
      ? facture.bons.map(b => b.bonNumber).join(' - ')
      : '';

    const buffer = await generateFacturationDocument({
      factureNumber: facture.factureNumber,
      date: facture.date.toISOString().split('T')[0],
      clientName: facture.clientName,
      clientAddress: facture.clientAddress,
      clientTel: facture.clientTel,
      items: facture.items,
      totalHT: facture.totalHT,
      bonNumber: bonNumbers // New prop passed to generator
    });

    const safeNum = (facture.factureNumber || 'facture').replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `Facture-${safeNum}.docx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error downloading facturation doc:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du document' });
  }
});

// DELETE /api/facturation/:id
// Delete an invoice (Admin only) and release attached BonDeReceptions
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const factureId = req.params.id;
    const facture = await Facture.findById(factureId);

    if (!facture) {
      return res.status(404).json({ message: 'Facture introuvable.' });
    }

    // Release Bons
    await BonDeReception.updateMany(
      { facture: factureId },
      { $set: { facture: null } }
    );

    await facture.deleteOne();
    res.json({ success: true, message: 'Facture supprimée, Bons d\'origine débloqués.' });
  } catch (error) {
    console.error('Error deleting facture:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la facture.' });
  }
});

module.exports = router;
