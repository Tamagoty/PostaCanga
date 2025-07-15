// Arquivo: src/App.jsx
// Descrição: Gerencia a sessão e define as rotas principais da aplicação.

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext'; // Importando o hook de autenticação

// Importando todas as páginas e componentes de layout
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ObjectsPage from './pages/ObjectsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage'; // Importando a página de detalhes
import SuppliesPage from './pages/SuppliesPage';
import SettingsPage from './pages/SettingsPage';
import EmployeesPage from './pages/EmployeesPage';

function App() {
  // Utiliza o estado de sessão e carregamento do nosso AuthContext
  const { session, loading } = useAuth();

  // Exibe uma mensagem de carregamento enquanto a sessão é verificada
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Carregando...</div>;
  }

  return (
    <>
      {/* Componente para exibir notificações em toda a aplicação */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          },
        }}
      />
      
      {/* Sistema de Roteamento Principal */}
      <Routes>
        {/* Rota para a página de login */}
        <Route 
          path="/login" 
          element={!session ? <LoginPage /> : <Navigate to="/" />} 
        />
        
        {/* Rota protegida que engloba todas as páginas internas */}
        <Route 
          path="/*" 
          element={session ? <Layout /> : <Navigate to="/login" />}
        >
          {/* Rotas aninhadas que são renderizadas dentro do componente Layout */}
          <Route index element={<DashboardPage />} />
          <Route path="objects" element={<ObjectsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          {/* ROTA CORRIGIDA: Esta é a rota que define o caminho para a página de detalhes do cliente. */}
          <Route path="customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="supplies" element={<SuppliesPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          
          {/* Rota "catch-all" para redirecionar qualquer caminho não encontrado para o Dashboard */}
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
