import React from 'react';
import './StatusBadge.css';

// One badge for every status in the app. Each list used to draw its own: some
// with saturated backgrounds, some tinted, and two stylesheets set white text
// on every .status-badge, which made the tinted ones unreadable.
const STATUSES = {
  pending: { label: 'En attente', tone: 'warning' },
  in_progress: { label: 'En cours', tone: 'info' },
  completed: { label: 'Terminé', tone: 'success' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
  approved: { label: 'Approuvé', tone: 'success' },
  rejected: { label: 'Rejeté', tone: 'danger' },
  active: { label: 'Ouvert', tone: 'info' }, // a bon still collecting tasks
  signed: { label: 'Signé', tone: 'success' },
  present: { label: 'Présent', tone: 'success' },
  absent: { label: 'Absent', tone: 'danger' },
  late: { label: 'En retard', tone: 'warning' },
};

function StatusBadge({ status, label }) {
  const known = STATUSES[status] || { label: status || '—', tone: 'neutral' };
  return (
    <span className={`rms-status rms-status--${known.tone}`}>
      {label || known.label}
    </span>
  );
}

export default StatusBadge;
