const mongoose = require('mongoose');

const FactureItemSchema = new mongoose.Schema({
  description: String,
  unite: String,
  quantite: Number,
  prixUHT: Number,
  prixTHT: Number
});

const FactureSchema = new mongoose.Schema({
  factureNumber: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true
  },
  clientName: String,
  clientAddress: String,
  clientTel: String,
  bons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BonDeReception'
  }],
  items: [FactureItemSchema],
  totalHT: {
    type: Number,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Query patterns: month range for the report and newest-first listing.
FactureSchema.index({ date: -1 });
FactureSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Facture', FactureSchema);
