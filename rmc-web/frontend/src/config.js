// Single place where the backend location is defined.
//
// Set REACT_APP_API_URL at build time to point a deployed frontend at its API
// (e.g. REACT_APP_API_URL=https://rms-api.example.com/api). Create React App
// only exposes variables prefixed with REACT_APP_, and they are inlined when
// the bundle is built, not read at runtime.
export const API_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Uploaded files are served from the server root (/uploads/...), not from /api,
// so strip a trailing /api to build file URLs.
export const FILE_BASE_URL = API_URL.replace(/\/api\/?$/, '');

// Build an absolute URL for a stored upload path.
// Paths written before the backend normalised them may contain Windows
// backslashes, so convert those and drop any leading slash.
//
// /uploads now requires a session, so this URL cannot be opened directly in a
// tab or used as an <img src>. Use openFile or useFileObjectUrl below, which
// fetch through axios and therefore send the Authorization header.
export const fileUrl = (storedPath) => {
  if (!storedPath) return '';
  const normalised = String(storedPath).replace(/\\/g, '/').replace(/^\/+/, '');
  return `${FILE_BASE_URL}/${normalised}`;
};
