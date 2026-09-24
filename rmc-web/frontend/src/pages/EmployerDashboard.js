import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import PlanningList from '../components/employer/PlanningList';
import PlanningCalendar from '../components/employer/PlanningCalendar';
import ExpenseList from '../components/employer/ExpenseList';
import ClientList from '../components/shared/ClientList';
import MyAccessRequestList from '../components/employer/MyAccessRequestList';
import MyCongeList from '../components/employer/MyCongeList';
import ProfilePage from '../components/shared/ProfilePage';
import './Dashboard.css';
import './DashboardWithSidebar.css';

function EmployerDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Read from URL hash
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setActiveTab(hash);
    }

    // Listen to hash changes
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
      <Sidebar userRole="employer" onLogout={handleLogout} />

      <div className="main-content">
        {/* Top Header */}
        <div className="content-header">
          <div className="header-left">
            <h1 className="page-title">
              {activeTab === 'overview' && 'Mon Espace'}
              {activeTab === 'clients' && 'Clients'}
              {activeTab === 'taches' && 'Mes Tâches'}
              {activeTab === 'planning' && 'Mon Planning'}
              {activeTab === 'expenses' && 'Mes Dépenses'}
              {activeTab === 'my-access' && 'Mes Demandes d\'Accès'}
              {activeTab === 'conge' && 'Mes Congés'}
              {activeTab === 'profile' && 'Mon Profil'}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'overview' && 'Bienvenue dans votre espace personnel'}
              {activeTab === 'clients' && 'Consulter la liste des clients'}
              {activeTab === 'taches' && 'Consulter et créer des tâches'}
              {activeTab === 'planning' && 'Votre calendrier de travail'}
              {activeTab === 'expenses' && 'Gérer mes demandes de dépenses'}
              {activeTab === 'my-access' && 'Demandes d\'accès approuvées vous concernant'}
              {activeTab === 'conge' && 'Soumettre et suivre vos demandes de congé'}
              {activeTab === 'profile' && 'Gérer vos informations personnelles'}
            </p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">Employé</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="content-body">
          {activeTab === 'overview' && (
            <div className="overview-content">
              {/* The leave balance banner was removed from the dashboard. The
                  balance is still shown on the Mes Congés page itself, which is
                  where a request is actually made. */}
              <div className="quick-actions-section">
                <h2 className="section-title">Accès Rapide</h2>
                <div className="quick-actions-grid">
                  <button className="quick-action-card" onClick={() => window.location.hash = 'clients'}>
                    <div className="action-content">
                      <h3>Clients</h3>
                      <p>Voir les clients</p>
                    </div>
                    <div className="action-arrow">›</div>
                  </button>

                  <button className="quick-action-card" onClick={() => window.location.hash = 'planning'}>
                    <div className="action-content">
                      <h3>Mon Planning</h3>
                      <p>Voir mes tâches</p>
                    </div>
                    <div className="action-arrow">›</div>
                  </button>

                  <button className="quick-action-card" onClick={() => window.location.hash = 'expenses'}>
                    <div className="action-content">
                      <h3>Mes Dépenses</h3>
                      <p>Soumettre une dépense</p>
                    </div>
                    <div className="action-arrow">›</div>
                  </button>

                  <button className="quick-action-card" onClick={() => window.location.hash = 'my-access'}>
                    <div className="action-content">
                      <h3>Mes Demandes d'Accès</h3>
                      <p>Voir mes missions approuvées</p>
                    </div>
                    <div className="action-arrow">›</div>
                  </button>

                  {/* Kept from the removed banner so the overview still offers a
                      one-click route to the leave page. */}
                  <button className="quick-action-card" onClick={() => window.location.hash = 'conge'}>
                    <div className="action-content">
                      <h3>Mes Congés</h3>
                      <p>Demander un congé</p>
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
          {activeTab === 'expenses' && <ExpenseList />}
          {activeTab === 'my-access' && <MyAccessRequestList />}
          {activeTab === 'conge' && <MyCongeList />}
          {activeTab === 'profile' && <ProfilePage />}
        </div>
      </div>
    </div>
  );
}

export default EmployerDashboard;
