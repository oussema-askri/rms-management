import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import ExpenseList from '../components/employer/ExpenseList';
import EmployeeList from '../components/rh/EmployeeList';
import BonDeReceptionList from '../components/shared/BonDeReceptionList';
import Facturation from '../components/rh/Facturation';
import ProfilePage from '../components/shared/ProfilePage';
import DashboardOverview from '../components/shared/DashboardOverview';
import './Dashboard.css';
import './DashboardWithSidebar.css';

function ComptableDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) setActiveTab(hash);

    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '');
      setActiveTab(newHash || 'overview');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-with-sidebar">
      <Sidebar userRole="comptable" onLogout={handleLogout} />

      <div className="main-content">
        <div className="content-header">
          <div className="header-left">
            <h1 className="page-title">
              {activeTab === 'overview' && 'Tableau de bord Comptable'}
              {activeTab === 'expenses' && 'Dépenses'}
              {activeTab === 'bon-reception' && 'Bons de Réception'}
              {activeTab === 'facturation' && 'Facturation'}
              {activeTab === 'employees' && 'Employés & Salaires'}
              {activeTab === 'profile' && 'Mon Profil'}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'overview' && 'Consultation financière'}
              {activeTab === 'expenses' && 'Consulter toutes les dépenses'}
              {activeTab === 'bon-reception' && 'Consulter les bons de réception'}
              {activeTab === 'facturation' && 'Consulter et télécharger les factures'}
              {activeTab === 'employees' && 'Consulter les employés et leurs salaires'}
              {activeTab === 'profile' && 'Gérer vos informations personnelles'}
            </p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">Comptable</div>
              </div>
            </div>
          </div>
        </div>

        <div className="content-body">
          {activeTab === 'overview' && <DashboardOverview role="comptable" />}

          {activeTab === 'expenses' && <ExpenseList />}
          {activeTab === 'bon-reception' && <BonDeReceptionList />}
          {activeTab === 'facturation' && <Facturation />}
          {activeTab === 'employees' && <EmployeeList />}
          {activeTab === 'profile' && <ProfilePage />}
        </div>
      </div>
    </div>
  );
}

export default ComptableDashboard;
