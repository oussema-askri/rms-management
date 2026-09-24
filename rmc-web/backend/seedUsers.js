// One-time bootstrap: create the first administrator account.
//
// This script used to insert five accounts that all shared the password
// "123456", including an administrator at a predictable address. Running it
// against a reachable database handed anyone who knew the convention a working
// administrator login. It now creates a single account from environment
// variables, refuses a weak password, and does nothing if any user already exists.
//
// Usage:
//   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... SEED_ADMIN_CIN=... node seedUsers.js
// or set those in .env (see .env.example).

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const { validatePassword } = require('./utils/roles');

dotenv.config();

const seedAdmin = async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const cin = process.env.SEED_ADMIN_CIN;
  const name = process.env.SEED_ADMIN_NAME || 'Administrateur';

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set.');
    process.exit(1);
  }

  if (!email || !password || !cin) {
    console.error(
      'Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_ADMIN_CIN before running this script.'
    );
    process.exit(1);
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(`SEED_ADMIN_PASSWORD rejected: ${passwordError}`);
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await User.estimatedDocumentCount();
    if (existing > 0) {
      console.log(
        `Database already has ${existing} user(s). Nothing to do. ` +
        'Create further accounts through the application.'
      );
      await mongoose.disconnect();
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    await User.create({
      name,
      email,
      password: await bcrypt.hash(password, salt),
      role: 'admin',
      cin,
    });

    console.log(`Administrator ${email} created. Sign in and change the password.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding administrator:', error.message);
    process.exit(1);
  }
};

seedAdmin();
