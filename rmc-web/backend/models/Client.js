const mongoose = require('mongoose');

// Sous-titre Schema
const SousTitreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  refNumber: {
    type: String,
    required: true
  }
}, { _id: true });

// Unite Schema
const UniteSchema = new mongoose.Schema({
  uniteName: {
    type: String,
    required: true
  },
  uniteNumber: {
    type: String,
    required: true
  },
  responsable: {
    type: String,
    default: ''  // Changed: Make optional with default
  },
  email: {
    type: String,
    default: ''  // Changed: Make optional with default
  },
  phone: {
    type: String,
    default: ''  // Changed: Make optional with default
  },
  sousTitres: [SousTitreSchema]
}, { _id: true });

const ClientSchema = new mongoose.Schema({
  clientNumber: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ''  // Changed: Make optional
  },
  address: {
    type: String,
    default: ''  // Changed: Make optional
  },
  telephone: {
    type: String,
    default: ''  // Changed: Make optional
  },
  departement: {
    type: String,
    default: ''  // Changed: Make optional
  },
  tvaPercentage: {
    type: Number,
    default: 19
  },
  modePaiement: {
    type: String,
    enum: ['Espèce', 'Chèque', 'Virement', 'Effet', ''],  // Fixed encoding + allow empty
    default: 'Virement'
  },
  devise: {
    type: String,
    enum: ['TND', 'EUR', 'USD'],
    default: 'TND'
  },
  unites: [UniteSchema],
  pieceJointe: [{
    fileName: String,
    filePath: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-increment client number BEFORE validation
ClientSchema.pre('validate', async function(next) {
  if (this.isNew && !this.clientNumber) {
    try {
      const lastClient = await this.constructor.findOne({}, { clientNumber: 1 })
        .sort({ clientNumber: -1 })
        .limit(1)
        .lean();

      if (lastClient && lastClient.clientNumber) {
        const lastNumber = parseInt(lastClient.clientNumber);
        this.clientNumber = String(lastNumber + 1).padStart(4, '0');
      } else {
        this.clientNumber = '0001';
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Query patterns: the client list is always sorted by clientNumber.
ClientSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Client', ClientSchema);