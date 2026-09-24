const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const connectDB = require('./config/db');
const { ensureUploadDirs } = require('./config/uploadDirs');
const {
  securityHeaders,
  authLimiter,
  apiLimiter,
  buildCorsOptions,
} = require('./middleware/security');

// Load env vars
dotenv.config();

// A weak or missing signing key makes every token forgeable, so refuse to boot
// rather than run with one.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    'JWT_SECRET must be set and at least 32 characters. Generate one with:\n' +
    '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
  process.exit(1);
}

// Connect to database
connectDB();

// Create the upload directories before any route can write to them
ensureUploadDirs();

const app = express();

// Behind a proxy (Render, nginx) req.ip only reflects the client when Express
// is told to trust the forwarding headers.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(securityHeaders);
app.use(cors(buildCorsOptions()));
// Cap body size; the default is 100kb but being explicit documents the intent.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api', apiLimiter);

// Stored files. This used to be express.static, which served every CIN scan,
// employee photo, expense receipt and site permit to anyone with the URL.
// routes/files.js requires a session and checks ownership per category.
app.use('/uploads', require('./routes/files'));

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/planning', require('./routes/planning'));
app.use('/api/expenses', require('./routes/expense'));
app.use('/api/rh', require('./routes/rh'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/clients', require('./routes/client'));
app.use('/api/bon-de-reception', require('./routes/bonDeReception'));
app.use('/api/facturation', require('./routes/facturation'));
app.use('/api/pointage', require('./routes/pointage'));

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'RMS Management API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      planning: '/api/planning',
      expenses: '/api/expenses',
      rh: '/api/rh',
      admin: '/api/admin',
      clients: '/api/clients',
      bonDeReception: '/api/bon-de-reception',
      facturation: '/api/facturation',
      pointage: '/api/pointage',
      files: '/uploads',
    },
  });
});

// Unknown API route -> JSON 404 instead of Express's HTML page
app.use('/api', (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} introuvable` });
});

// Central error handler. Without this, an error thrown by multer (file too
// large, unexpected field, rejected type) escapes as an HTML stack trace.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && /not allowed by CORS/.test(err.message || '')) {
    return res.status(403).json({ message: 'Origine non autorisée' });
  }

  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'Fichier trop volumineux',
      LIMIT_UNEXPECTED_FILE: `Champ de fichier inattendu: ${err.field}`,
      LIMIT_FILE_COUNT: 'Trop de fichiers',
    };
    return res.status(400).json({ message: messages[err.code] || `Erreur de téléversement: ${err.code}` });
  }

  if (err && err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Données invalides',
      errors: Object.values(err.errors || {}).map((e) => e.message),
    });
  }

  if (err && err.name === 'CastError') {
    return res.status(400).json({ message: `Identifiant invalide: ${err.value}` });
  }

  if (err && err.code === 11000) {
    return res.status(400).json({
      message: `Valeur déjà utilisée: ${Object.keys(err.keyValue || {}).join(', ')}`,
    });
  }

  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
