// Backend location.
//
// Set EXPO_PUBLIC_API_URL in a .env file at the project root (see .env.example)
// so the URL does not have to be edited in source on every machine. Expo inlines
// EXPO_PUBLIC_* variables at build time.
//
// The dev fallback is a LAN address because a phone or emulator cannot reach the
// host's localhost. Find yours with `ipconfig` on Windows or `ifconfig` elsewhere.
const DEV_FALLBACK_URL = 'http://192.168.100.193:5000/api';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? DEV_FALLBACK_URL : '');

if (!API_BASE_URL) {
  console.warn(
    'No API URL configured. Set EXPO_PUBLIC_API_URL before building for production.'
  );
}

// Uploaded files are served from the server root, not from /api.
export const FILE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

// Absolute URL for a stored upload path. Records written before the backend
// normalised separators may still contain Windows backslashes.
export const fileUrl = (storedPath) => {
  if (!storedPath) return '';
  const normalised = String(storedPath).replace(/\\/g, '/').replace(/^\/+/, '');
  return `${FILE_BASE_URL}/${normalised}`;
};

export const COLORS = {
  // Primary Colors - Deep Navy
  primary: '#1E4D80',
  primaryDark: '#003664',
  primaryLight: '#D3E3FF',

  // Secondary Colors - Warm Gold
  secondary: '#785A00',
  secondaryDark: '#251A00',
  secondaryLight: '#FFDF9C',

  // Status Colors
  success: '#27976A',
  successDark: '#165A3D',
  successLight: '#E8F4EE',

  warning: '#C26B1E',
  warningDark: '#773F11',
  warningLight: '#FAF0E6',

  danger: '#B53535',
  dangerDark: '#6E1E1E',
  dangerLight: '#FFDAD6',

  // Neutral Colors
  background: '#F5F3EF',
  white: '#FFFFFF',
  black: '#000000',

  // Text Colors
  text: '#1A2435',
  textSecondary: '#4A5568',
  textLight: '#6B7280',
  textDisabled: '#BDBDBD',

  // UI Colors
  border: '#EAE8E4',
  borderLight: '#F0EEEA',
  borderDark: '#DBDAD6',

  // Card & Surface
  cardBg: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

// ROLES lives in utils/permissions.js. The copy that used to sit here listed
// only three of the five roles and was never imported anywhere.

export const STATUS_COLORS = {
  pending: {
    bg: '#FAF0E6',
    text: '#773F11',
    label: 'En attente'
  },
  in_progress: {
    bg: '#EEF2F8',
    text: '#163C66',
    label: 'En cours'
  },
  completed: {
    bg: '#E8F4EE',
    text: '#165A3D',
    label: 'Terminé'
  },
  cancelled: {
    bg: '#FAECEC',
    text: '#6E1E1E',
    label: 'Annulé'
  }
};