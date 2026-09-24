const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Planning = require('../models/Planning');
const Expense = require('../models/Expense');
const AccessRequest = require('../models/AccessRequest');
const BonDeReception = require('../models/BonDeReception');
const Facture = require('../models/Facture');
const CongeRequest = require('../models/CongeRequest');
const { protect, authorize } = require('../middleware/auth');
const { monthStartUTC, monthEndUTC, monthLastDayISO, parseMonthParam } = require('../utils/dateRange');
const { generateTemporaryPassword } = require('../utils/roles');

// Get dashboard statistics
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPlanning = await Planning.countDocuments();
    const totalExpenses = await Expense.countDocuments();
    const pendingExpenses = await Expense.countDocuments({ status: 'pending' });
    const approvedExpenses = await Expense.countDocuments({ status: 'approved' });
    const totalAccessRequests = await AccessRequest.countDocuments();

    // Total expense amount
    const expenseStats = await Expense.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalExpenseAmount = expenseStats.length > 0 ? expenseStats[0].total : 0;

    // Users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPlanning,
        totalExpenses,
        pendingExpenses,
        approvedExpenses,
        totalExpenseAmount,
        totalAccessRequests,
        usersByRole
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent activities
router.get('/recent-activity', protect, authorize('admin'), async (req, res) => {
  try {
    const recentExpenses = await Expense.find()
      .limit(5)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    const recentPlanning = await Planning.find()
      .limit(5)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    const recentUsers = await User.find()
      .limit(5)
      .sort({ createdAt: -1 })
      .select('-password');

    res.json({
      success: true,
      data: {
        recentExpenses,
        recentPlanning,
        recentUsers
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users/:id/reset-password
// @desc    Reset a user's password to a freshly generated temporary one
// @access  Admin only
//
// Every reset used to set the password to "123456", which was also printed in
// the web and mobile interfaces. Any account that had ever been reset and not
// changed since could be signed into by anyone who knew the email address.
router.post('/users/:id/reset-password', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(temporaryPassword, salt);
    await user.save();

    // Shown once to the administrator who performed the reset; it is not stored
    // anywhere in readable form and cannot be retrieved again.
    res.json({
      success: true,
      temporaryPassword,
      message: `Mot de passe de ${user.name} réinitialisé. Communiquez-le en personne, il ne sera plus affiché.`
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/monthly-report
// @desc    Get aggregated monthly report data
// @access  Admin only
router.get('/monthly-report', protect, authorize('admin'), async (req, res) => {
  try {
    const { year, month } = parseMonthParam(req.query.month); // YYYY-MM

    // UTC bounds so the report covers the same days regardless of server timezone.
    const startDate = monthStartUTC(year, month);
    const endDate = monthEndUTC(year, month);

    // Run all queries in parallel
    const [employees, expenses, plannings, bons, factures, conges] = await Promise.all([
      User.find().select('name employeeType salary dailyRate primes role').lean(),
      Expense.find({ createdAt: { $gte: startDate, $lt: endDate } })
        .populate('createdBy', 'name')
        .lean(),
      Planning.find({ date: { $gte: startDate, $lt: endDate } })
        .populate('assignedWorkers', 'name employeeType salary dailyRate')
        .populate('client', 'name')
        .lean(),
      BonDeReception.find({ createdAt: { $gte: startDate, $lt: endDate } })
        .lean(),
      Facture.find({ date: { $gte: startDate, $lt: endDate } })
        .lean(),
      CongeRequest.find({
        $or: [
          { startDate: { $gte: startDate, $lt: endDate } },
          { endDate: { $gte: startDate, $lt: endDate } },
          { startDate: { $lt: startDate }, endDate: { $gte: endDate } }
        ]
      }).populate('employee', 'name').lean(),
    ]);

    // --- Employee work days from Planning ---
    const workDaysMap = {}; // userId -> Set of date strings
    plannings.forEach(p => {
      if (!p.assignedWorkers) return;
      const dateStr = new Date(p.date).toISOString().split('T')[0];
      p.assignedWorkers.forEach(w => {
        if (!w || !w._id) return;
        const id = w._id.toString();
        if (!workDaysMap[id]) workDaysMap[id] = new Set();
        workDaysMap[id].add(dateStr);
      });
    });

    // --- Employee salary costs ---
    const employeeData = employees.map(emp => {
      const id = emp._id.toString();
      const daysWorked = workDaysMap[id] ? Array.from(workDaysMap[id]).sort() : [];
      const totalDays = daysWorked.length;

      let monthlyCost = 0;
      if (emp.employeeType === 'taux_journalier') {
        monthlyCost = (emp.dailyRate || 0) * totalDays;
      } else {
        monthlyCost = emp.salary || 0;
      }

      // Primes for this month
      const monthPrimes = (emp.primes || []).filter(p => {
        const d = new Date(p.date);
        return d >= startDate && d < endDate;
      });

      return {
        userId: id,
        name: emp.name,
        role: emp.role,
        employeeType: emp.employeeType,
        salary: emp.salary || 0,
        dailyRate: emp.dailyRate || 0,
        daysWorked,
        totalDays,
        monthlyCost,
        primes: monthPrimes,
        primesTotal: monthPrimes.reduce((sum, p) => sum + (p.amount || 0), 0),
      };
    });

    const totalSalaryCost = employeeData.reduce((sum, e) => sum + e.monthlyCost, 0);
    const totalPrimes = employeeData.reduce((sum, e) => sum + e.primesTotal, 0);

    // --- Expenses ---
    const approvedExpenses = expenses.filter(e => e.status === 'approved');
    const totalExpensesApproved = approvedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpensesAll = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const expensesByCategory = {};
    approvedExpenses.forEach(e => {
      const cat = e.category || 'Non catégorisé';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (e.amount || 0);
    });

    // --- Planning summary ---
    const planningByStatus = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
    plannings.forEach(p => {
      if (planningByStatus[p.status] !== undefined) planningByStatus[p.status]++;
    });

    // --- Bons de reception ---
    const signedBons = bons.filter(b => b.status === 'signed');

    // --- Factures ---
    const totalRevenue = factures.reduce((sum, f) => sum + (f.totalHT || 0), 0);

    const revenueByClient = {};
    factures.forEach(f => {
      const client = f.clientName || 'Inconnu';
      revenueByClient[client] = (revenueByClient[client] || 0) + (f.totalHT || 0);
    });

    // --- Congés ---
    const congeByStatus = { pending: 0, approved: 0, rejected: 0 };
    conges.forEach(c => {
      if (congeByStatus[c.status] !== undefined) congeByStatus[c.status]++;
    });

    // --- Financial overview ---
    const totalSpent = totalSalaryCost + totalPrimes + totalExpensesApproved;
    const netResult = totalRevenue - totalSpent;

    res.json({
      success: true,
      data: {
        month: `${year}-${String(month).padStart(2, '0')}`,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: monthLastDayISO(year, month),
        },
        financial: {
          totalRevenue,
          totalSalaryCost,
          totalPrimes,
          totalExpenses: totalExpensesApproved,
          totalSpent,
          netResult,
          revenueByClient: Object.entries(revenueByClient).map(([client, total]) => ({ client, total })),
          expensesByCategory: Object.entries(expensesByCategory).map(([category, total]) => ({ category, total })),
        },
        employees: employeeData,
        expenses: {
          items: expenses.map(e => ({
            _id: e._id,
            description: e.description,
            amount: e.amount,
            category: e.category,
            paymentMethod: e.paymentMethod,
            status: e.status,
            createdBy: e.createdBy?.name || 'Inconnu',
            createdAt: e.createdAt,
          })),
          summary: {
            total: expenses.length,
            totalAmount: totalExpensesAll,
            pending: expenses.filter(e => e.status === 'pending').length,
            approved: approvedExpenses.length,
            rejected: expenses.filter(e => e.status === 'rejected').length,
            approvedAmount: totalExpensesApproved,
          },
        },
        planning: {
          items: plannings.map(p => ({
            _id: p._id,
            description: p.description,
            clientName: p.clientName,
            unite: p.unite,
            date: p.date,
            status: p.status,
            quantite: p.quantite,
            uniteQuantite: p.uniteQuantite,
            assignedWorkers: (p.assignedWorkers || []).map(w => w?.name || 'Inconnu'),
          })),
          summary: {
            total: plannings.length,
            ...planningByStatus,
          },
        },
        bonsDeReception: {
          items: bons.map(b => ({
            _id: b._id,
            bonNumber: b.bonNumber,
            clientName: b.clientName,
            unite: b.unite,
            status: b.status,
            createdAt: b.createdAt,
            signedAt: b.signedAt,
          })),
          summary: {
            total: bons.length,
            signed: signedBons.length,
            active: bons.length - signedBons.length,
          },
        },
        factures: {
          items: factures.map(f => ({
            _id: f._id,
            factureNumber: f.factureNumber,
            clientName: f.clientName,
            totalHT: f.totalHT,
            date: f.date,
            itemCount: (f.items || []).length,
          })),
          summary: {
            total: factures.length,
            totalHT: totalRevenue,
          },
        },
        conges: {
          items: conges.map(c => ({
            _id: c._id,
            employeeName: c.employeeName || c.employee?.name || 'Inconnu',
            startDate: c.startDate,
            endDate: c.endDate,
            reason: c.reason,
            status: c.status,
          })),
          summary: {
            total: conges.length,
            ...congeByStatus,
          },
        },
      },
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;