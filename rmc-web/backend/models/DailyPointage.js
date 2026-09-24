const mongoose = require('mongoose');

const PointageEntrySchema = new mongoose.Schema({
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workerName: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  absentReason: { type: String, default: '' },
  clientName: { type: String, default: '' },
  unite: { type: String, default: '' },
  planning: { type: mongoose.Schema.Types.ObjectId, ref: 'Planning', default: null },
  notes: { type: String, default: '' },
});

const DailyPointageSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  entries: [PointageEntrySchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// One pointage per responsable per day
DailyPointageSchema.index({ date: 1, createdBy: 1 }, { unique: true });

// Query patterns: month range listing, newest first. The unique (date, createdBy)
// index above already covers the per-user lookups.
DailyPointageSchema.index({ date: -1 });

module.exports = mongoose.model('DailyPointage', DailyPointageSchema);
