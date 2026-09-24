// backend/models/Planning.js
const mongoose = require('mongoose');

const PlanningSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  clientName: String,
  unite: {
    type: String,
    required: true
  },
  uniteNumber: String,
  sousTitre: String,
  sousTitreRef: String,
  // REMOVED: workType
  description: {
    type: String,
    required: true
  },
  materielsNecessaires: {    // Materials
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: true
  },
  quantite: {
    type: Number,
    default: 1
  },
  uniteQuantite: {
    type: String,
    default: 'FTF'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  assignedWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

PlanningSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Query patterns: month and day ranges (routes/admin.js, routes/pointage.js),
// listing newest first, and the completed-task lookup that builds receipt slips.
PlanningSchema.index({ date: 1 });
PlanningSchema.index({ createdAt: -1 });
PlanningSchema.index({ client: 1, uniteNumber: 1 });
PlanningSchema.index({ assignedWorkers: 1 });
PlanningSchema.index({ status: 1 });

module.exports = mongoose.model('Planning', PlanningSchema);