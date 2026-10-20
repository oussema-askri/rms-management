const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { validatePassword } = require('../utils/roles');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// @route   POST /api/auth/register
// @desc    Create the first administrator when the database has no users
// @access  Public only while no account exists; closed afterwards
//
// This endpoint used to be open and to take `role` from the request body, so
// anyone who could reach the API could create themselves an administrator.
// It is now a one-time bootstrap: once any user exists it refuses, and staff
// accounts are created through POST /api/rh/employees instead.
router.post('/register', async (req, res) => {
  try {
    const existingUsers = await User.estimatedDocumentCount();
    if (existingUsers > 0) {
      return res.status(403).json({
        message: 'Inscription fermée. Un administrateur doit créer les comptes.'
      });
    }

    const { name, email, password, cin, phone, address } = req.body;

    if (!name || !email || !cin) {
      return res.status(400).json({ message: 'Nom, email et CIN requis' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // The bootstrap account is always an administrator; the role is not read
    // from the request.
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      cin,
      phone,
      address
    });

    await user.save();

    res.status(201).json({
      success: true,
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email ou CIN déjà utilisé' });
    }
    console.error('Error during bootstrap registration:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Both must be plain strings. A JSON object such as {"$ne": null} as the
    // email reached User.findOne as a query operator and matched the first
    // account, so its password could be guessed without knowing the address;
    // a non-string password made bcrypt throw a 500.
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ email });

    // Compare against a dummy hash when the account does not exist so the
    // response time does not reveal which emails are registered.
    const hash = user ? user.password : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu';
    const isMatch = await bcrypt.compare(password, hash);

    if (!user || !isMatch) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }

    res.json({
      success: true,
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        cin: user.cin,
        photo: user.photo
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change own password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mot de passe actuel et nouveau requis' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;