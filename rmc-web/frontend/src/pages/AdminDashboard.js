import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
import DashboardOverview from '../components/shared/DashboardOverview';
import './Dashboard.css';
import './DashboardWithSidebar.css';

function AdminDashboard() {
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
          {activeTab === 'overview' && <DashboardOverview role="admin" />}

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
