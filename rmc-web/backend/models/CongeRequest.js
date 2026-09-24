const mongoose = require('mongoose');

const CongeRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employeeName: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  pieceJointe: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rhComment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// Query patterns: a person's own requests, the approved-days balance per year,
// and the ownership check on leave attachments (routes/files.js).
CongeRequestSchema.index({ employee: 1, createdAt: -1 });
CongeRequestSchema.index({ status: 1, startDate: 1 });
CongeRequestSchema.index({ pieceJointe: 1 });

module.exports = mongoose.model('CongeRequest', CongeRequestSchema);
