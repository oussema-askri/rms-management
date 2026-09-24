const express = require('express');
const router = express.Router();
const DailyPointage = require('../models/DailyPointage');
const Planning = require('../models/Planning');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { monthStartUTC, monthEndUTC } = require('../utils/dateRange');

// @route   GET /api/pointage/planning-for-date?date=YYYY-MM-DD
// @desc    Get planned tasks and workers for a specific date (pre-fill form)
// @access  Responsable, Admin, RH
router.get('/planning-for-date', protect, authorize('responsable', 'admin', 'rh'), async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    const plannings = await Planning.find({
      date: { $gte: dayStart, $lte: dayEnd },
    })
      .populate('assignedWorkers', 'name employeeType')
      .populate('client', 'name')
      .lean();

    res.json({ success: true, data: plannings });
  } catch (error) {
    console.error('Error fetching planning for date:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pointage/employees
// @desc    Get all employees (for adding unplanned workers)
// @access  Responsable, Admin, RH
router.get('/employees', protect, authorize('responsable', 'admin', 'rh'), async (req, res) => {
  try {
    const employees = await User.find({ role: { $in: ['employer', 'responsable'] } })
      .select('name role employeeType')
      .sort('name')
      .lean();
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/pointage
// @desc    Create or update daily pointage
// @access  Responsable, Admin
router.post('/', protect, authorize('responsable', 'admin'), async (req, res) => {
  try {
    const { date, entries } = req.body;
    if (!date || !entries || !Array.isArray(entries)) {
      return res.status(400).json({ message: 'Date and entries are required' });
    }

    const dayDate = new Date(date + 'T00:00:00.000Z');

    // Check if pointage already exists for this user+date
    let pointage = await DailyPointage.findOne({
      date: dayDate,
      createdBy: req.user.id,
    });

    if (pointage) {
      // Update existing
      pointage.entries = entries;
      pointage.updatedAt = new Date();
      await pointage.save();
    } else {
      // Create new
      pointage = new DailyPointage({
        date: dayDate,
        entries,
        createdBy: req.user.id,
        createdByName: req.user.name,
      });
      await pointage.save();
    }

    res.json({ success: true, data: pointage });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Un pointage existe déjà pour cette date' });
    }
    console.error('Error saving pointage:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pointage/my?date=YYYY-MM-DD
// @desc    Get my pointage for a specific date
// @access  Responsable, Admin
router.get('/my', protect, authorize('responsable', 'admin'), async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const dayDate = new Date(date + 'T00:00:00.000Z');

    const pointage = await DailyPointage.findOne({
      date: dayDate,
      createdBy: req.user.id,
    }).lean();

    res.json({ success: true, data: pointage });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pointage/duplicate?date=YYYY-MM-DD
// @desc    Get previous day's pointage for duplication
// @access  Responsable, Admin
router.get('/duplicate', protect, authorize('responsable', 'admin'), async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const currentDate = new Date(date + 'T00:00:00.000Z');

    // Find the most recent pointage before this date by this user
    const previous = await DailyPointage.findOne({
      createdBy: req.user.id,
      date: { $lt: currentDate },
    })
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: previous });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pointage/all
// @desc    Get all pointage records (admin view) with optional filters
// @access  Admin, RH
router.get('/all', protect, authorize('admin', 'rh'), async (req, res) => {
  try {
    const { month, responsableId } = req.query;
    const filter = {};

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, m] = month.split('-').map(Number);
      // Pointage dates are stored at UTC midnight, so the bounds must be UTC too.
      filter.date = {
        $gte: monthStartUTC(year, m),
        $lt: monthEndUTC(year, m),
      };
    }

    if (responsableId) {
      filter.createdBy = responsableId;
    }

    const pointages = await DailyPointage.find(filter)
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: pointages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/pointage/:id
// @desc    Get single pointage by ID
// @access  Admin, RH, Responsable (own)
// Attendance sheets name who was present or absent and why, so employers and
// accounting have no reason to read arbitrary ones.
router.get('/:id', protect, authorize('admin', 'rh', 'responsable'), async (req, res) => {
  try {
    const pointage = await DailyPointage.findById(req.params.id)
      .populate('createdBy', 'name role')
      .lean();

    if (!pointage) {
      return res.status(404).json({ message: 'Pointage introuvable' });
    }

    // Responsable can only see their own
    if (req.user.role === 'responsable' && pointage.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    res.json({ success: true, data: pointage });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/pointage/:id
// @desc    Delete pointage
// @access  Admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const pointage = await DailyPointage.findByIdAndDelete(req.params.id);
    if (!pointage) return res.status(404).json({ message: 'Pointage introuvable' });
    res.json({ success: true, message: 'Pointage supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
