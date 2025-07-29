// Arquivo: src/App.jsx
// CORREÇÃO (v5.1): Removida a importação e o uso do componente InitialLoading.jsx,
// que agora é tratado diretamente no index.html.

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ObjectsPage from './pages/ObjectsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import AddressesPage from './pages/AddressesPage';
import SuppliesPage from './pages/SuppliesPage';
import StockLogPage from './pages/StockLogPage';
import SettingsPage from './pages/SettingsPage';
import EmployeesPage from './pages/EmployeesPage';
import TrackingRulesPage from './pages/TrackingRulesPage';
import ObjectTypesPage from './pages/ObjectTypesPage';
import TasksPage from './pages/TasksPage';
import ManageTasksPage from './pages/ManageTasksPage';
import LinksPage from './pages/LinksPage';
import ReportsPage from './pages/ReportsPage';

function App() {
  const { session } = useAuth();

  // A lógica de "loading" foi removida, pois o AuthContext já garante
  // que o app só renderize após a verificação da sessão, e o index.html
  // exibe o pré-carregador.
  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' } }} />
      <Routes>
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/*" element={session ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<DashboardPage />} />
          <Route path="objects" element={<ObjectsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="supplies" element={<SuppliesPage />} />
          <Route path="supplies/:supplyId/log" element={<StockLogPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="tracking-rules" element={<TrackingRulesPage />} />
          <Route path="object-types" element={<ObjectTypesPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/manage" element={<ManageTasksPage />} />
          <Route path="links" element={<LinksPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </>
  );
}
export default App;
