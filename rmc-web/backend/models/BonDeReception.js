const mongoose = require('mongoose');

const BonDeReceptionSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  clientName: String,
  clientNumber: String,
  unite: {
    type: String,
    required: true
  },
  uniteNumber: {
    type: String,
    required: true
  },
  bonNumber: {
    type: String,
    unique: true,
    required: true
  },
  taches: [{
    planning: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Planning'
    },
    description: String,
    materielsNecessaires: String,
    quantite: Number,
    uniteQuantite: String,
    dateCompleted: Date,
    assignedWorkers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  status: {
    type: String,
    enum: ['active', 'signed'],
    default: 'active'
  },
  signedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  signedAt: Date,
  docxPath: String,
  facture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facture',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// IMPROVED: Auto-generate bon number: UNITENUM-BONXX
BonDeReceptionSchema.pre('validate', async function(next) {
  if (this.isNew && !this.bonNumber) {
    try {
      // Find the highest bon number for this unite
      const lastBon = await this.constructor.findOne({
        uniteNumber: this.uniteNumber
      })
      .sort({ bonNumber: -1 })
      .select('bonNumber')
      .lean();

      let nextNumber = 1;

      if (lastBon && lastBon.bonNumber) {
        // Extract number from format: "0001-001-BON003" -> 3
        const match = lastBon.bonNumber.match(/BON(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      this.bonNumber = `${this.uniteNumber}-BON${String(nextNumber).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating bon number:', error);
      return next(error);
    }
  }
  next();
});

// Query patterns: find the open slip for a unit (routes/planning.js), list by
// client, release slips when an invoice is deleted, and the duplicate-task guard.
BonDeReceptionSchema.index({ client: 1, uniteNumber: 1, status: 1 });
BonDeReceptionSchema.index({ uniteNumber: 1, bonNumber: -1 });
BonDeReceptionSchema.index({ facture: 1 });
BonDeReceptionSchema.index({ createdAt: -1 });
BonDeReceptionSchema.index({ 'taches.planning': 1 });
BonDeReceptionSchema.index({ docxPath: 1 });

module.exports = mongoose.model('BonDeReception', BonDeReceptionSchema);