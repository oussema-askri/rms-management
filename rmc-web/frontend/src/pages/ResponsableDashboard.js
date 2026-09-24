import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import PlanningList from '../components/employer/PlanningList';
import PlanningCalendar from '../components/employer/PlanningCalendar';
import ExpenseList from '../components/employer/ExpenseList';
import EmployeeList from '../components/rh/EmployeeList';
import AccessRequestList from '../components/rh/AccessRequestList';
import MyCongeList from '../components/employer/MyCongeList';
import ClientList from '../components/shared/ClientList';
import BonDeReceptionList from '../components/shared/BonDeReceptionList';
import ProfilePage from '../components/shared/ProfilePage';
import PointageForm from '../components/shared/PointageForm';
import './Dashboard.css';
import './DashboardWithSidebar.css';

function ResponsableDashboard() {
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
      <Sidebar userRole="responsable" onLogout={handleLogout} />

      <div className="main-content">
        <div className="content-header">
          <div className="header-left">
            <h1 className="page-title">
              {activeTab === 'overview' && 'Tableau de bord Responsable'}
              {activeTab === 'clients' && 'Gestion des Clients'}
              {activeTab === 'taches' && 'Gestion des Tâches'}
              {activeTab === 'planning' && 'Planning Équipe'}
              {activeTab === 'bon-reception' && 'Bons de Réception'}
              {activeTab === 'expenses' && 'Mes Dépenses'}
              {activeTab === 'employees' && 'Gestion des Employés'}
              {activeTab === 'access' && 'Demandes d\'Accès'}
              {activeTab === 'pointage' && 'Pointage Journalier'}
              {activeTab === 'conge' && 'Mes Congés'}
              {activeTab === 'profile' && 'Mon Profil'}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'overview' && 'Panneau de contrôle Responsable'}
              {activeTab === 'clients' && 'Gérer vos clients et leurs unités'}
              {activeTab === 'taches' && 'Créer et suivre les tâches de travail'}
              {activeTab === 'planning' && 'Vue calendrier des affectations'}
              {activeTab === 'bon-reception' && 'Gérer et signer les bons de réception'}
              {activeTab === 'expenses' && 'Gérer vos dépenses'}
              {activeTab === 'employees' && 'Gérer les employés'}
              {activeTab === 'access' && 'Gérer les demandes d\'accès aux missions'}
              {activeTab === 'pointage' && 'Enregistrer la présence des employés chaque jour'}
              {activeTab === 'conge' && 'Gérer vos demandes de congé'}
              {activeTab === 'profile' && 'Gérer vos informations personnelles'}
            </p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">Responsable</div>
              </div>
            </div>
          </div>
        </div>

        <div className="content-body">
          {activeTab === 'overview' && (
            <div className="overview-content">
              <div className="quick-actions-section">
                <h2 className="section-title">Accès Rapide</h2>
                <div className="quick-actions-grid">
                  <button className="quick-action-card" onClick={() => window.location.hash = 'clients'}>
                    <div className="action-content">
                      <h3>Clients</h3>
                      <p>Gérer les clients et unités</p>
                    </div>
                    <div className="action-arrow">›</div>
                  </button>
                  <button className="quick-action-card" onClick={() => window.location.hash = 'planning'}>
                    <div className="action-content">
                      <h3>Planning</h3>
                      <p>Voir toutes les tâches</p>
                    </div>
                    <div className="action-arrow">›</div>
                  </button>
                  <button className="quick-action-card" onClick={() => window.location.hash = 'bon-reception'}>
                    <div className="action-content">
                      <h3>Bons de Réception</h3>
                      <p>Signer les bons</p>
                    </div>
                    <div className="action-arrow">›</div>
                  </button>
                  <button className="quick-action-card" onClick={() => window.location.hash = 'expenses'}>
                    <div className="action-content">
                      <h3>Mes Dépenses</h3>
                      <p>Soumettre et suivre</p>
                    </div>
                    <div className="action-arrow">›</div>
                  </button>
                  <button className="quick-action-card" onClick={() => window.location.hash = 'employees'}>
                    <div className="action-content">
                      <h3>Employés</h3>
                      <p>Gérer les employés</p>
                    </div>
                    <div className="action-arrow">›</div>
                  </button>
                  <button className="quick-action-card" onClick={() => window.location.hash = 'access'}>
                    <div className="action-content">
                      <h3>Demandes d'Accès</h3>
                      <p>Gérer les accès</p>
                    </div>
                    <div className="action-arrow">›</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && <ClientList />}
          {activeTab === 'taches' && <PlanningList />}
          {activeTab === 'planning' && <PlanningCalendar />}
          {activeTab === 'bon-reception' && <BonDeReceptionList />}
          {activeTab === 'expenses' && <ExpenseList />}
          {activeTab === 'employees' && <EmployeeList />}
          {activeTab === 'access' && <AccessRequestList />}
          {activeTab === 'pointage' && <PointageForm />}
          {activeTab === 'conge' && <MyCongeList />}
          {activeTab === 'profile' && <ProfilePage />}
        </div>
      </div>
    </div>
  );
}

export default ResponsableDashboard;
