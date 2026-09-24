import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Shared component styles (styles/components.css). Imported before the pages so
// the per-component stylesheets that follow can still override the baseline.
// Nothing imported this file, so styles/components.css was never loaded at all.
import './App.css';

import { AuthProvider, AuthContext } from './context/AuthContext';

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
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />

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