const fs = require('fs');
const path = require('path');
const { BACKEND_ROOT, uploadsRoot } = require('../config/uploadDirs');

// Deleting a record used to leave its uploaded file on disk forever, and to
// leave every reference to it dangling in other collections. These helpers
// cover both halves.

// Remove a file named by a stored path such as "uploads/factures/x.jpg".
// Refuses anything that resolves outside the uploads directory, and treats a
// missing file as success so a delete is never blocked by an earlier failure.
const removeStoredFile = (storedPath) => {
  if (!storedPath) return false;

  const normalised = String(storedPath).replace(/\\/g, '/').replace(/^\/+/, '');
  const absolute = path.resolve(BACKEND_ROOT, normalised);

  const rootWithSep = uploadsRoot.endsWith(path.sep) ? uploadsRoot : uploadsRoot + path.sep;
  if (!absolute.startsWith(rootWithSep)) {
    console.warn('Refusing to delete a file outside uploads:', storedPath);
    return false;
  }

  try {
    if (fs.existsSync(absolute)) {
      fs.unlinkSync(absolute);
      return true;
    }
  } catch (error) {
    // A file that cannot be removed should not fail the request; the record is
    // still deleted and the leftover is a disk-space matter, not a data one.
    console.warn('Could not delete file', storedPath, error.message);
  }
  return false;
};

const removeStoredFiles = (paths = []) => paths.forEach(removeStoredFile);

// Build the 409 body listing what still points at a record, so the user is told
// why the deletion was refused rather than being left with a generic error.
const blockedBy = (counts) => {
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${n} ${label}`);
  return parts.length ? parts.join(', ') : null;
};

module.exports = { removeStoredFile, removeStoredFiles, blockedBy };
