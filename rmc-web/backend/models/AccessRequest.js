const mongoose = require('mongoose');

const AccessRequestSchema = new mongoose.Schema({
  missionDate: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  workers: [{
    name: {
      type: String,
      required: true
    },
    cin: {
      type: String,
      required: true
    }
  }],
  // Changed from single vehicle to array of vehicles
  vehicles: [{
    matricule: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: ''
    }
  }],
  // Legacy single vehicle field (kept for backward compatibility)
  vehicle: {
    matricule: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: ''
    }
  },
  // NEW: Materiels field with autocomplete from planning history
  materiels: {
    type: String,
    default: ''
  },
  duration: String,
  purpose: String,
  bateau: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  docxPath: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Query patterns: the approved-permits-for-me lookup matched on worker CIN
// (routes/rh.js and routes/files.js) and the newest-first listing.
AccessRequestSchema.index({ status: 1, 'workers.cin': 1 });
AccessRequestSchema.index({ createdAt: -1 });
AccessRequestSchema.index({ docxPath: 1 });

module.exports = mongoose.model('AccessRequest', AccessRequestSchema);