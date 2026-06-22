import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LandManagement from './components/LandManagement';
import CustomerManagement from './components/CustomerManagement';
import Financials from './components/Financials';
import Approvals from './components/Approvals';
import DataMigration from './components/DataMigration';
import Reports from './components/Reports';
import AdminInventory from './components/AdminInventory';
import Login from './components/Login';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuth();
  if (!roles) return <>{children}</>;
  if (user && roles.includes(user.role)) return <>{children}</>;
  return <Navigate to="/reports" />;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<RoleRoute roles={['admin', 'reception', 'field']}><Dashboard /></RoleRoute>} />
        <Route path="lands" element={<RoleRoute roles={['admin', 'reception', 'field']}><LandManagement /></RoleRoute>} />
        <Route path="inventory-admin" element={<RoleRoute roles={['admin']}><AdminInventory /></RoleRoute>} />
        <Route path="customers" element={<RoleRoute roles={['admin', 'reception', 'field']}><CustomerManagement /></RoleRoute>} />
        <Route path="financials" element={<RoleRoute roles={['admin', 'reception', 'field']}><Financials /></RoleRoute>} />
        <Route path="approvals" element={<RoleRoute roles={['admin']}><Approvals /></RoleRoute>} />
        <Route path="import" element={<RoleRoute roles={['admin', 'reception', 'field']}><DataMigration /></RoleRoute>} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
