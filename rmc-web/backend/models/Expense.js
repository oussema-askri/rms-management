const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['espece', 'virement_bancaire'],
    required: true
  },
  factureImage: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date
});

// Query patterns: list scoped to createdBy sorted by createdAt (routes/expense.js),
// status counts and month ranges (routes/admin.js), and the ownership check the
// file route runs on every receipt request (routes/files.js).
ExpenseSchema.index({ createdBy: 1, createdAt: -1 });
ExpenseSchema.index({ status: 1 });
ExpenseSchema.index({ createdAt: -1 });
ExpenseSchema.index({ factureImage: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);