// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['employer', 'rh', 'admin', 'responsable', 'comptable'],
    default: 'employer'
  },
  cin: {
    type: String,
    required: true,
    unique: true
  },
  phone: String,
  address: String,
  photo: String,
  cinImage: String,           // NEW: CIN Image
  cnss: {                     // NEW: CNSS Number
    type: String,
    default: ''
  },
  etatSocial: {               // NEW: Marital Status
    type: String,
    enum: ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)', ''],
    default: ''
  },
  employeeType: {
    type: String,
    enum: ['salarie', 'taux_journalier', 'prestataire'],
    default: 'salarie'
  },
  salary: { type: Number, default: 0 },    // salarie & prestataire
  dailyRate: { type: Number, default: 0 }, // taux_journalier
  isAvailable: {
    type: Boolean,
    default: true
  },
  vacationDates: [{
    startDate: Date,
    endDate: Date,
    reason: String
  }],
  primes: [{
    amount: Number,
    reason: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// The clients read `user.id` (AuthContext, PlanningCalendar, permission checks)
// but a plain toJSON only emits `_id`. Expose both, and never let a password
// hash reach a response even if a query forgets `.select('-password')`.
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id ? ret._id.toString() : undefined;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

// Query patterns: the pointage worker picker filters by role, and the file route
// checks photo and CIN ownership on every employee image request.
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ photo: 1 });
UserSchema.index({ cinImage: 1 });

module.exports = mongoose.model('User', UserSchema);