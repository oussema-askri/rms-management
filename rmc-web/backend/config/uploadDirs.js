const fs = require('fs');
const path = require('path');

// Every directory multer writes into. multer.diskStorage does NOT create the
// destination, so a missing folder makes the upload fail at request time.
const UPLOAD_DIRS = [
  'uploads/clients',
  'uploads/factures',
  'uploads/conge',
  'uploads/documents',
  'uploads/bon-de-reception',
  'uploads/employees/photos',
  'uploads/employees/cin',
];

// Resolved against the backend root, not the current working directory, so the
// server behaves the same whether it is started from backend/ or from the repo root.
const BACKEND_ROOT = path.join(__dirname, '..');

const uploadsRoot = path.join(BACKEND_ROOT, 'uploads');

const ensureUploadDirs = () => {
  UPLOAD_DIRS.forEach((dir) => {
    const abs = path.join(BACKEND_ROOT, dir);
    if (!fs.existsSync(abs)) {
      fs.mkdirSync(abs, { recursive: true });
    }
  });
};

// Absolute destination for multer. multer.diskStorage resolves a relative
// destination against process.cwd(), so the server only worked when started
// from backend/. Passing an absolute path removes that dependency.
const uploadPath = (dir) => path.join(BACKEND_ROOT, dir);

// multer records the absolute path in file.path, but the database and the
// /uploads static URL both use a POSIX path relative to the backend root
// (e.g. "uploads/clients/client-123.jpg"). Normalise before storing.
const toStoredPath = (absolutePath) =>
  path.relative(BACKEND_ROOT, absolutePath).split(path.sep).join('/');

module.exports = {
  ensureUploadDirs,
  uploadsRoot,
  uploadPath,
  toStoredPath,
  UPLOAD_DIRS,
  BACKEND_ROOT,
};
