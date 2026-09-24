import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import PlanningList from '../components/employer/PlanningList';
import PlanningCalendar from '../components/employer/PlanningCalendar';
import ExpenseList from '../components/employer/ExpenseList';
import EmployeeList from '../components/rh/EmployeeList';
import AccessRequestList from '../components/rh/AccessRequestList';
import CongeList from '../components/rh/CongeList';
import Facturation from '../components/rh/Facturation';
import ClientList from '../components/shared/ClientList';
import BonDeReceptionList from '../components/shared/BonDeReceptionList';
import ProfilePage from '../components/shared/ProfilePage';
import MonthlySummary from '../components/admin/MonthlySummary';
import PointageList from '../components/shared/PointageList';
import './Dashboard.css';
import './DashboardWithSidebar.css';

function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStats();

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

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-with-sidebar">
      <Sidebar userRole="admin" onLogout={handleLogout} />

      <div className="main-content">
        {/* Top Header */}
        <div className="content-header">
          <div className="header-left">
            <h1 className="page-title">
              {activeTab === 'overview' && 'Tableau de bord'}
              {activeTab === 'clients' && 'Gestion des Clients'}
              {activeTab === 'taches' && 'Gestion des Tâches'}
              {activeTab === 'planning' && 'Planning Équipe'}
              {activeTab === 'bon-reception' && 'Bons de Réception'}
              {activeTab === 'expenses' && 'Gestion des Dépenses'}
              {activeTab === 'facturation' && 'Facturation'}
              {activeTab === 'employees' && 'Gestion des Employés'}
              {activeTab === 'access' && 'Demandes d\'Accès'}
              {activeTab === 'conge' && 'Demandes de Congé'}
              {activeTab === 'pointage-list' && 'Pointage Journalier'}
              {activeTab === 'monthly-report' && 'Rapport Mensuel'}
              {activeTab === 'profile' && 'Mon Profil'}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'overview' && 'Vue d\'ensemble du système'}
              {activeTab === 'clients' && 'Gérer vos clients et leurs unités'}
              {activeTab === 'taches' && 'Créer et suivre les tâches de travail'}
              {activeTab === 'planning' && 'Vue calendrier des affectations'}
              {activeTab === 'bon-reception' && 'Gérer et signer les bons de réception'}
              {activeTab === 'expenses' && 'Suivre et approuver les dépenses'}
              {activeTab === 'facturation' && 'Créer et gérer les factures depuis les bons de réception'}
              {activeTab === 'employees' && 'Gérer les employés et leurs informations'}
              {activeTab === 'access' && 'Gérer les demandes d\'accès aux missions'}
              {activeTab === 'conge' && 'Approuver ou rejeter les demandes de congé'}
              {activeTab === 'pointage-list' && 'Consulter les pointages soumis par les responsables'}
              {activeTab === 'monthly-report' && 'Résumé mensuel des activités, coûts et revenus'}
              {activeTab === 'profile' && 'Gérer vos informations personnelles'}
            </p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">Administrateur</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="content-body">
          {activeTab === 'overview' && (
            <div className="overview-content">
              {/* Statistics Grid */}
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Chargement des statistiques...</p>
                </div>
              ) : (
                <div className="stats-grid-modern">
                  <div className="stat-card-modern stat-primary">
                    <div className="stat-info">
                      <div className="stat-label">Total Utilisateurs</div>
                      <div className="stat-value">{stats?.totalUsers || 0}</div>
                    </div>
                  </div>
                  <div className="stat-card-modern stat-secondary">
                    <div className="stat-info">
                      <div className="stat-label">Tâches Planning</div>
                      <div className="stat-value">{stats?.totalPlanning || 0}</div>
                    </div>
                  </div>
                  <div className="stat-card-modern stat-success">
                    <div className="stat-info">
                      <div className="stat-label">Dépenses Totales</div>
                      <div className="stat-value">{stats?.totalExpenses || 0}</div>
                    </div>
                  </div>
                  <div className="stat-card-modern stat-warning">
                    <div className="stat-info">
                      <div className="stat-label">En Attente</div>
                      <div className="stat-value">{stats?.pendingExpenses || 0}</div>
                    </div>
                  </div>
                  <div className="stat-card-modern stat-success">
                    <div className="stat-info">
                      <div className="stat-label">Approuvées</div>
                      <div className="stat-value">{stats?.approvedExpenses || 0}</div>
                    </div>
                  </div>
                  <div className="stat-card-modern stat-primary">
                    <div className="stat-info">
                      <div className="stat-label">Montant Total</div>
                      <div className="stat-value">{stats?.totalExpenseAmount?.toFixed(2) || 0} TND</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
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
                      <h3>Dépenses</h3>
                      <p>Approuver les dépenses</p>
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
          {activeTab === 'facturation' && <Facturation />}
          {activeTab === 'employees' && <EmployeeList />}
          {activeTab === 'access' && <AccessRequestList />}
          {activeTab === 'conge' && <CongeList />}
          {activeTab === 'pointage-list' && <PointageList />}
          {activeTab === 'monthly-report' && <MonthlySummary />}
          {activeTab === 'profile' && <ProfilePage />}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
