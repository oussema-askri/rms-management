import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Shared component styles (styles/components.css). Imported before the pages so
// the per-component stylesheets that follow can still override the baseline.
// Nothing imported this file, so styles/components.css was never loaded at all.
import './App.css';

import { AuthProvider, AuthContext } from './context/AuthContext';
import { homePathFor } from './utils/permissions';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './components/auth/Login';
import EmployerDashboard from './pages/EmployerDashboard';
import RHDashboard from './pages/RHDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ResponsableDashboard from './pages/ResponsableDashboard';
import ComptableDashboard from './pages/ComptableDashboard';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Another role's page: go to this user's own dashboard. This used to send
  // them to the landing page, which looked exactly like being signed out.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return children;
}

// Someone already signed in who opens /login (a bookmark, the back button)
// goes straight to their dashboard instead of a login form.
function LoginRoute() {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (user) return <Navigate to={homePathFor(user.role)} replace />;
  return <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginRoute />} />

      <Route
        path="/employer"
        element={
          <ProtectedRoute allowedRoles={['employer']}>
            <EmployerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/rh"
        element={
          <ProtectedRoute allowedRoles={['rh', 'admin']}>
            <RHDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/responsable"
        element={
          <ProtectedRoute allowedRoles={['responsable']}>
            <ResponsableDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/comptable"
        element={
          <ProtectedRoute allowedRoles={['comptable']}>
            <ComptableDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;