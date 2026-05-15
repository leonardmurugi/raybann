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
import Login from './components/Login';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
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
        <Route index element={<Dashboard />} />
        <Route path="lands" element={<LandManagement />} />
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="financials" element={<Financials />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="import" element={<DataMigration />} />
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
