const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AccessRequest = require('../models/AccessRequest');
const CongeRequest = require('../models/CongeRequest');
const { protect, authorize } = require('../middleware/auth');
const generateAccessDocument = require('../utils/generateAccessDocument');
const { yearStartUTC, yearEndUTC, inclusiveDayCount } = require('../utils/dateRange');
const { canAssignRole, canModifyUser, validatePassword } = require('../utils/roles');
const { removeStoredFile, removeStoredFiles, blockedBy } = require('../utils/cleanup');
const Planning = require('../models/Planning');
const Expense = require('../models/Expense');
const DailyPointage = require('../models/DailyPointage');

// Salary, CNSS and bonuses are payroll data. Roles outside this list get the
// employee list without those fields rather than being refused outright, since
// they legitimately need names and contact details.
const PAYROLL_ROLES = ['rh', 'admin', 'comptable'];
const PAYROLL_FIELDS = '-salary -dailyRate -cnss -primes';

// A responsable may award a bonus (POST /employees/:id/prime) but is not shown
// salaries. Withholding `primes` from them too meant the list they had just
// added to came back empty, so bonuses are visible to them while pay is not.
const PRIME_ROLES = [...PAYROLL_ROLES, 'responsable'];
const fieldsFor = (role, isSelf = false) => {
  if (isSelf || PAYROLL_ROLES.includes(role)) return '-password';
  if (PRIME_ROLES.includes(role)) return '-password -salary -dailyRate -cnss';
  return `-password ${PAYROLL_FIELDS}`;
};
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
// ========== EMPLOYEE MANAGEMENT ==========
const badRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

const { uploadPath, toStoredPath } = require('../config/uploadDirs');

const EMPLOYEE_FILE_DIRS = {
  photo: uploadPath('uploads/employees/photos'),
  cinImage: uploadPath('uploads/employees/cin'),
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = EMPLOYEE_FILE_DIRS[file.fieldname];
    // Every branch must call cb. The original had no else, so an unexpected
    // field name left the callback pending and the request hung until timeout.
    if (!dir) {
      return cb(badRequest(`Champ de fichier inattendu: ${file.fieldname}`));
    }
    return cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    // multer expects an Error here; a string is not handled and surfaces as a 500.
    return cb(badRequest('Type de fichier non autorisé (JPEG, PNG, PDF uniquement)'));
  }
});

// Conge piece jointe storage
const congeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath('uploads/conge'));
  },
  filename: function (req, file, cb) {
    cb(null, `conge-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const uploadConge = multer({
  storage: congeStorage,
  limits: { fileSize: 10000000 }, // 10MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    return cb(badRequest('Type de fichier non autorisé (JPEG, PNG, PDF uniquement)'));
  }
});

// Upload directories are created once at startup by config/uploadDirs.js.
// Get all employees
router.get('/employees', protect, authorize('rh', 'admin', 'employer', 'responsable', 'comptable'), async (req, res) => {
  try {
    // Every role could read every colleague's salary, daily rate, CNSS number
    // and bonus history. Withhold those from roles that have no need for them.
    const employees = await User.find()
      .select(fieldsFor(req.user.role))
      .sort({ createdAt: -1 });
    res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/employees', protect, authorize('rh', 'admin', 'responsable'), upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'cinImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      name, email, password, role, cin, phone, address,
      cnss, etatSocial, salary, employeeType, dailyRate
    } = req.body;

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // The role came straight from the request body, so a responsable could
    // create an administrator account for themselves.
    const requestedRole = role || 'employer';
    if (!canAssignRole(req.user.role, requestedRole)) {
      return res.status(403).json({
        message: `Votre rôle ne permet pas de créer un compte "${requestedRole}"`
      });
    }

    // Only administrators set pay. A responsable creating staff should not be
    // able to write a salary either.
    const canSetPay = ['rh', 'admin'].includes(req.user.role);

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    user = await User.findOne({ cin });
    if (user) {
      return res.status(400).json({ message: 'CIN already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create employee
    const employee = new User({
      name,
      email,
      password: hashedPassword,
      role: requestedRole,
      cin,
      phone,
      address,
      cnss: cnss || '',
      etatSocial: etatSocial || '',
      salary: canSetPay ? (salary || 0) : 0,
      // These two were read on update but dropped on create, so an employee
      // created as "taux_journalier" came back as a salarie with no rate.
      employeeType: employeeType || 'salarie',
      dailyRate: canSetPay ? (dailyRate || 0) : 0
    });

    // Handle file uploads
    if (req.files) {
      if (req.files.photo) {
        employee.photo = toStoredPath(req.files.photo[0].path);
      }
      if (req.files.cinImage) {
        employee.cinImage = toStoredPath(req.files.cinImage[0].path);
      }
    }

    await employee.save();

    const savedEmployee = await User.findById(employee._id).select('-password');

    res.status(201).json({
      success: true,
      data: savedEmployee
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single employee
router.get('/employees/:id', protect, authorize('rh', 'admin', 'employer', 'responsable', 'comptable'), async (req, res) => {
  try {
    // Same payroll rule as the list, except that anyone may see their own.
    const isSelf = req.params.id === String(req.user._id);
    const employee = await User.findById(req.params.id).select(fieldsFor(req.user.role, isSelf));


    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update employee
router.put('/employees/:id', protect, authorize('rh', 'admin', 'responsable'), upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'cinImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // An administrator's account may only be edited by another administrator.
    if (!canModifyUser(req.user.role, employee.role)) {
      return res.status(403).json({ message: 'Non autorisé à modifier ce compte' });
    }

    // 'role' used to be writable by a responsable, who could promote any
    // account, including their own, to administrator.
    if (req.body.role !== undefined && req.body.role !== employee.role) {
      if (!canAssignRole(req.user.role, req.body.role)) {
        return res.status(403).json({
          message: `Votre rôle ne permet pas d'attribuer le rôle "${req.body.role}"`
        });
      }
      employee.role = req.body.role;
    }

    // A field a role cannot READ must not be writable by that role either.
    // fieldsFor() strips `cnss` for a responsable, so their edit form renders
    // the value they were never sent as an empty input and submits cnss: "".
    // That is `!== undefined`, so it passed the check below and overwrote a
    // real CNSS number with a blank every time a responsable saved any
    // unrelated change, such as a phone number.
    const allowedFields = req.user.role === 'responsable'
      ? ['name', 'phone', 'address', 'etatSocial', 'employeeType']
      : ['name', 'phone', 'address', 'cnss', 'etatSocial', 'salary', 'dailyRate', 'employeeType'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    });

    if (req.files) {
      if (req.files.photo) {
        employee.photo = toStoredPath(req.files.photo[0].path);
      }
      if (req.files.cinImage) {
        employee.cinImage = toStoredPath(req.files.cinImage[0].path);
      }
    }

    await employee.save();
    const updated = await User.findById(employee._id).select('-password');
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set employee availability (vacation)
router.put('/employees/:id/availability', protect, authorize('rh', 'admin', 'responsable'), async (req, res) => {
  try {
    const { isAvailable, vacationDates } = req.body;

    // $push with an undefined value throws; only push when dates were sent,
    // and accept either a single period or a list.
    const update = {};
    if (isAvailable !== undefined) update.isAvailable = isAvailable;

    if (vacationDates) {
      const periods = Array.isArray(vacationDates) ? vacationDates : [vacationDates];
      const valid = periods.filter(p => p && p.startDate && p.endDate);
      if (valid.length) update.$push = { vacationDates: { $each: valid } };
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: 'Aucune modification fournie' });
    }

    const employee = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add prime (bonus) to employee
router.post('/employees/:id/prime', protect, authorize('rh', 'admin', 'responsable'), async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const primeAmount = Number(amount);
    if (!Number.isFinite(primeAmount) || primeAmount <= 0) {
      return res.status(400).json({ message: 'Montant de prime invalide' });
    }

    const employee = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $push: {
          primes: {
            amount: primeAmount,
            reason,
            date: Date.now()
          }
        }
      },
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete employee
router.delete('/employees/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // Deleting your own account would leave you holding a valid token for a
    // user that no longer exists, and can remove the last administrator.
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (target.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Impossible de supprimer le dernier administrateur' });
      }
    }

    // Deleting a person used to leave their tasks, expenses, leave requests and
    // attendance sheets pointing at a missing user, which breaks the payroll
    // report. Someone with history should be marked unavailable, not removed.
    const [tasks, expenses, conges, pointages, accessRequests] = await Promise.all([
      Planning.countDocuments({ assignedWorkers: target._id }),
      Expense.countDocuments({ createdBy: target._id }),
      CongeRequest.countDocuments({ employee: target._id }),
      DailyPointage.countDocuments({ createdBy: target._id }),
      AccessRequest.countDocuments({ createdBy: target._id }),
    ]);

    const blocking = blockedBy({
      'tâche(s)': tasks,
      'dépense(s)': expenses,
      'congé(s)': conges,
      'pointage(s)': pointages,
      "demande(s) d'accès": accessRequests,
    });
    if (blocking) {
      return res.status(409).json({
        message:
          `Impossible de supprimer cet employé: ${blocking} y sont rattaché(s). ` +
          "Marquez-le indisponible pour conserver l'historique."
      });
    }

    const employee = await User.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    removeStoredFiles([employee.photo, employee.cinImage]);

    res.json({ success: true, message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== ACCESS REQUESTS ==========

// Get approved access requests for the logged-in employee (matched by CIN)
router.get('/my-access-requests', protect, async (req, res) => {
  try {
    const userCin = req.user.cin;
    if (!userCin) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const requests = await AccessRequest.find({
      status: 'approved',
      'workers.cin': userCin
    })
      .populate('createdBy', 'name email')
      .sort({ missionDate: -1 });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all access requests
router.get('/access-requests', protect, authorize('rh', 'admin', 'responsable'), async (req, res) => {
  try {
    const requests = await AccessRequest.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single access request
router.get('/access-requests/:id', protect, authorize('rh', 'admin', 'responsable'), async (req, res) => {
  try {
    const accessRequest = await AccessRequest.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!accessRequest) {
      return res.status(404).json({ message: 'Demande introuvable' });
    }

    res.json({ success: true, data: accessRequest });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create access request
router.post('/access-requests', protect, authorize('rh', 'admin', 'responsable'), async (req, res) => {
  try {
    const { missionDate, location, workers, vehicle, vehicles, duration, purpose, materiels, bateau } = req.body;

    const accessRequest = new AccessRequest({
      missionDate,
      location,
      workers,
      vehicle,
      vehicles: vehicles || [],
      duration,
      purpose,
      bateau,
      materiels: materiels || '',
      createdBy: req.user.id
    });

    await accessRequest.save();

    // Generate document
    try {
      const docPath = await generateAccessDocument(accessRequest);
      accessRequest.docxPath = docPath;
      await accessRequest.save();
    } catch (docError) {
      console.error('Error generating document:', docError);
      // Continue even if document generation fails
    }

    const populatedRequest = await AccessRequest.findById(accessRequest._id)
      .populate('createdBy', 'name email');

    res.status(201).json({ success: true, data: populatedRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update access request status (approve / reject)
router.patch('/access-requests/:id/status', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const accessRequest = await AccessRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('createdBy', 'name email');

    if (!accessRequest) {
      return res.status(404).json({ message: 'Demande introuvable' });
    }

    res.json({ success: true, data: accessRequest });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update access request
const ACCESS_REQUEST_UPDATABLE = [
  'missionDate', 'location', 'workers', 'vehicle', 'vehicles',
  'duration', 'purpose', 'materiels', 'bateau'
];

router.put('/access-requests/:id', protect, authorize('rh', 'admin', 'responsable'), async (req, res) => {
  try {
    const accessRequest = await AccessRequest.findById(req.params.id);

    if (!accessRequest) {
      return res.status(404).json({ message: 'Access request not found' });
    }

    // Whitelist: passing req.body straight through also let a caller set
    // status, createdBy and docxPath.
    ACCESS_REQUEST_UPDATABLE.forEach((field) => {
      if (req.body[field] !== undefined) accessRequest[field] = req.body[field];
    });

    await accessRequest.save();

    // The permit document is built from these fields, so it has to be rebuilt
    // when they change. Previously the edit left the old .docx in place.
    try {
      accessRequest.docxPath = await generateAccessDocument(accessRequest);
      await accessRequest.save();
    } catch (docError) {
      console.error('Error regenerating access document:', docError);
      // Keep the update even if regeneration fails.
    }

    const populated = await AccessRequest.findById(accessRequest._id)
      .populate('createdBy', 'name email');

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Error updating access request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete access request
router.delete('/access-requests/:id', protect, authorize('rh', 'admin', 'responsable'), async (req, res) => {
  try {
    const accessRequest = await AccessRequest.findByIdAndDelete(req.params.id);

    if (!accessRequest) {
      return res.status(404).json({ message: 'Access request not found' });
    }

    // The generated permit was left on disk after the record was removed.
    removeStoredFile(accessRequest.docxPath);

    res.json({ success: true, message: 'Access request deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== CONGÉ REQUESTS ==========

const ANNUAL_CONGE_DAYS = 18;

// `year` is explicit because the entitlement is per calendar year, keyed on a
// request's startDate. The approval check must measure against the year the
// request falls in -- approving a December request in January has to count
// December's usage, not the near-empty new year's. The display endpoints pass
// no year and get the current one.
const calcSolde = async (employeeId, year = new Date().getUTCFullYear()) => {
  const query = {
    employee: employeeId,
    status: 'approved',
    startDate: { $gte: yearStartUTC(year), $lt: yearEndUTC(year) },
  };
  const approved = await CongeRequest.find(query);
  const used = approved.reduce((sum, c) => sum + inclusiveDayCount(c.startDate, c.endDate), 0);
  return Math.max(0, ANNUAL_CONGE_DAYS - used);
};

// Employee creates a congé request
router.post('/conge', protect, uploadConge.single('pieceJointe'), async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Dates invalides' });
    }
    // Without this an end date before the start date yields a negative day
    // count, which passes the solde check and stores a nonsensical request.
    if (end < start) {
      return res.status(400).json({ message: 'La date de fin doit être après la date de début' });
    }

    const solde = await calcSolde(req.user.id);
    const days = inclusiveDayCount(startDate, endDate);
    if (days > solde) {
      return res.status(400).json({ message: `Solde insuffisant. Il vous reste ${solde} jour(s).` });
    }

    const conge = new CongeRequest({
      employee: req.user.id,
      employeeName: req.user.name,
      startDate,
      endDate,
      reason,
      pieceJointe: req.file ? toStoredPath(req.file.path) : null,
    });
    await conge.save();
    res.status(201).json({ success: true, data: conge });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Employee gets their own congé requests + solde
router.get('/my-conge', protect, async (req, res) => {
  try {
    const conges = await CongeRequest.find({ employee: req.user.id }).sort({ createdAt: -1 });
    const solde = await calcSolde(req.user.id);
    res.json({ success: true, data: conges, solde, totalDays: ANNUAL_CONGE_DAYS });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// RH/Admin/Responsable get all congé requests
router.get('/conge', protect, authorize('rh', 'admin', 'responsable'), async (req, res) => {
  try {
    const conges = await CongeRequest.find()
      .populate('employee', 'name email cin')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: conges });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// RH/Admin approve or reject
router.patch('/conge/:id/status', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const { status, rhComment } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }
    const conge = await CongeRequest.findById(req.params.id);
    if (!conge) return res.status(404).json({ message: 'Demande introuvable' });

    // Approval was a blind status write, so 30 days could be approved against
    // an 18-day entitlement with nothing to stop it. The balance is checked
    // here rather than at request time because approvals are what consume it,
    // and other requests may have been approved in between.
    if (status === 'approved' && conge.status !== 'approved') {
      const days = inclusiveDayCount(conge.startDate, conge.endDate);
      const year = new Date(conge.startDate).getUTCFullYear();
      const remaining = await calcSolde(conge.employee, year);
      if (days > remaining) {
        return res.status(400).json({
          message: `Solde insuffisant: ${days} jour(s) demandé(s), ${remaining} jour(s) restant(s) sur ${ANNUAL_CONGE_DAYS} par an.`,
        });
      }
    }

    conge.status = status;
    conge.rhComment = rhComment || '';
    await conge.save();
    await conge.populate('employee', 'name email cin');
    res.json({ success: true, data: conge });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete congé request (owner or RH/Admin)
router.delete('/conge/:id', protect, async (req, res) => {
  try {
    const conge = await CongeRequest.findById(req.params.id);
    if (!conge) return res.status(404).json({ message: 'Demande introuvable' });
    const isOwner = conge.employee.toString() === req.user.id;
    const isPrivileged = ['rh', 'admin'].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    await conge.deleteOne();
    // The attachment used to stay on disk after the request was deleted.
    removeStoredFile(conge.pieceJointe);
    res.json({ success: true, message: 'Demande supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get solde for a specific employee (RH/Admin)
router.get('/employees/:id/solde', protect, authorize('rh', 'admin'), async (req, res) => {
  try {
    const solde = await calcSolde(req.params.id);
    res.json({ success: true, solde, totalDays: ANNUAL_CONGE_DAYS });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get soldes for all employees (RH/Admin/Comptable)
router.get('/conge/soldes', protect, authorize('rh', 'admin', 'comptable'), async (req, res) => {
  try {
    const year = new Date().getUTCFullYear();
    const approved = await CongeRequest.find({
      status: 'approved',
      startDate: { $gte: yearStartUTC(year), $lt: yearEndUTC(year) },
    }).select('employee startDate endDate');

    const usedMap = {};
    approved.forEach(c => {
      const id = c.employee.toString();
      usedMap[id] = (usedMap[id] || 0) + inclusiveDayCount(c.startDate, c.endDate);
    });

    const employees = await User.find().select('_id');
    const soldes = {};
    employees.forEach(e => {
      const id = e._id.toString();
      soldes[id] = Math.max(0, ANNUAL_CONGE_DAYS - (usedMap[id] || 0));
    });

    res.json({ success: true, soldes, totalDays: ANNUAL_CONGE_DAYS });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;