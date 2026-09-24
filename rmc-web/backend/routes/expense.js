const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/auth');
const { uploadPath, toStoredPath } = require('../config/uploadDirs');
const { removeStoredFile } = require('../utils/cleanup');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath('uploads/factures'));
  },
  filename: function (req, file, cb) {
    cb(null, `facture-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    const err = new Error('Type de fichier non autorisé (JPEG, PNG, PDF uniquement)');
    err.status = 400;
    return cb(err);
  }
});

// Get expenses (employer sees only their own, RH/Admin see all)
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    // employer & responsable see only their own expenses; rh, admin, comptable see all
    if (['employer', 'responsable'].includes(req.user.role)) {
      query.createdBy = req.user.id;
    }

    const expenses = await Expense.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: expenses.length, data: expenses });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single expense
router.get('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if employer/responsable is accessing their own expense
    if (['employer', 'responsable'].includes(req.user.role) && expense.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new expense
router.post('/', protect, upload.single('facture'), async (req, res) => {
  try {
    const { description, amount, paymentMethod, category, notes } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Facture image is required' });
    }

    const expense = new Expense({
      description,
      amount,
      paymentMethod,
      category,
      notes,
      factureImage: toStoredPath(req.file.path),
      createdBy: req.user.id
    });

    await expense.save();

    const populatedExpense = await Expense.findById(expense._id)
      .populate('createdBy', 'name email');

    res.status(201).json({ success: true, data: populatedExpense });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update expense
router.put('/:id', protect, async (req, res) => {
  try {
    let expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check ownership for employers and responsable
    if (['employer', 'responsable'].includes(req.user.role) && expense.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Employers/responsable can only update if status is pending
    if (['employer', 'responsable'].includes(req.user.role) && expense.status !== 'pending') {
      return res.status(403).json({ message: 'Cannot update approved/rejected expense' });
    }

    // Whitelist: req.body went straight into the update, so a submitter could
    // set their own status/approvedBy or repoint factureImage.
    const updates = {};
    ['description', 'amount', 'paymentMethod', 'category', 'notes'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    expense = await Expense.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('approvedBy', 'name email');

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve/Reject expense
router.put('/:id/status', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        status,
        approvedBy: req.user.id,
        approvedAt: Date.now()
      },
      { new: true }
    ).populate('createdBy', 'name email')
     .populate('approvedBy', 'name email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete expense
router.delete('/:id', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // The receipt image used to stay on disk after the expense was removed.
    removeStoredFile(expense.factureImage);

    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;