import React from 'react';
import { useLocation } from 'react-router-dom';
import './Sidebar.css';

const ICON_MAP = {
  overview: 'dashboard',
  clients: 'group',
  taches: 'task_alt',
  planning: 'calendar_month',
  'bon-reception': 'verified',
  expenses: 'account_balance_wallet',
  facturation: 'receipt_long',
  employees: 'badge',
  access: 'vpn_key',
  'my-access': 'vpn_key',
  conge: 'flight_takeoff',
  'monthly-report': 'summarize',
  pointage: 'fact_check',
  'pointage-list': 'fact_check',
  profile: 'person',
};

const Sidebar = ({ userRole, onLogout }) => {
  const location = useLocation();

  const menuItems = {
    admin: [
      { label: 'Vue d\'ensemble', path: '/admin', value: 'overview' },
      { label: 'Clients', path: '/admin', value: 'clients' },
      { label: 'Tâches', path: '/admin', value: 'taches' },
      { label: 'Planning', path: '/admin', value: 'planning' },
      { label: 'Bons de Réception', path: '/admin', value: 'bon-reception' },
      { label: 'Dépenses', path: '/admin', value: 'expenses' },
      { label: 'Facturation', path: '/admin', value: 'facturation' },
      { label: 'Employés', path: '/admin', value: 'employees' },
      { label: 'Demandes d\'Accès', path: '/admin', value: 'access' },
      { label: 'Demandes de Congé', path: '/admin', value: 'conge' },
      { label: 'Pointage Journalier', path: '/admin', value: 'pointage-list' },
      { label: 'Rapport Mensuel', path: '/admin', value: 'monthly-report' },
      { label: 'Mon Profil', path: '/admin', value: 'profile' },
    ],
    rh: [
      { label: 'Vue d\'ensemble', path: '/rh', value: 'overview' },
      { label: 'Clients', path: '/rh', value: 'clients' },
      { label: 'Tâches', path: '/rh', value: 'taches' },
      { label: 'Planning', path: '/rh', value: 'planning' },
      { label: 'Bons de Réception', path: '/rh', value: 'bon-reception' },
      { label: 'Dépenses', path: '/rh', value: 'expenses' },
      { label: 'Facturation', path: '/rh', value: 'facturation' },
      { label: 'Employés', path: '/rh', value: 'employees' },
      { label: 'Demandes d\'Accès', path: '/rh', value: 'access' },
      { label: 'Demandes de Congé', path: '/rh', value: 'conge' },
      { label: 'Mon Profil', path: '/rh', value: 'profile' },
    ],
    employer: [
      { label: 'Mon Espace', path: '/employer', value: 'overview' },
      { label: 'Clients', path: '/employer', value: 'clients' },
      { label: 'Tâches', path: '/employer', value: 'taches' },
      { label: 'Mon Planning', path: '/employer', value: 'planning' },
      { label: 'Mes Dépenses', path: '/employer', value: 'expenses' },
      { label: 'Mes Demandes d\'Accès', path: '/employer', value: 'my-access' },
      { label: 'Mes Congés', path: '/employer', value: 'conge' },
      { label: 'Mon Profil', path: '/employer', value: 'profile' },
    ],
    responsable: [
      { label: 'Vue d\'ensemble', path: '/responsable', value: 'overview' },
      { label: 'Clients', path: '/responsable', value: 'clients' },
      { label: 'Tâches', path: '/responsable', value: 'taches' },
      { label: 'Planning', path: '/responsable', value: 'planning' },
      { label: 'Bons de Réception', path: '/responsable', value: 'bon-reception' },
      { label: 'Mes Dépenses', path: '/responsable', value: 'expenses' },
      { label: 'Employés', path: '/responsable', value: 'employees' },
      { label: 'Demandes d\'Accès', path: '/responsable', value: 'access' },
      { label: 'Pointage Journalier', path: '/responsable', value: 'pointage' },
      { label: 'Mes Congés', path: '/responsable', value: 'conge' },
      { label: 'Mon Profil', path: '/responsable', value: 'profile' },
    ],
    comptable: [
      { label: 'Vue d\'ensemble', path: '/comptable', value: 'overview' },
      { label: 'Dépenses', path: '/comptable', value: 'expenses' },
      { label: 'Bons de Réception', path: '/comptable', value: 'bon-reception' },
      { label: 'Facturation', path: '/comptable', value: 'facturation' },
      { label: 'Employés & Salaires', path: '/comptable', value: 'employees' },
      { label: 'Mon Profil', path: '/comptable', value: 'profile' },
    ],
  };

  const items = menuItems[userRole] || menuItems.employer;
  const currentHash = location.hash.replace('#', '') || 'overview';

  return (
    <div className="sidebar">
      {/* Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo-rms.png" alt="RMS" className="sidebar-logo-img" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {items.map((item, index) => (
          <button
            key={index}
            className={`nav-item ${currentHash === item.value ? 'active' : ''}`}
            onClick={() => {
              window.location.hash = item.value;
            }}
          >
            <span className="material-symbols-outlined nav-icon">
              {ICON_MAP[item.value] || 'circle'}
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="nav-item footer-link" onClick={onLogout}>
          <span className="material-symbols-outlined nav-icon">logout</span>
          <span className="nav-label">Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
