// Arquivo: src/App.jsx
// Descrição: Gerencia a sessão e define as rotas principais.

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabaseClient';

// Importando páginas e componentes
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import ObjectsPage from './pages/ObjectsPage';
import CustomersPage from './pages/CustomersPage';
import SuppliesPage from './pages/SuppliesPage';
import DashboardPage from './pages/DashboardPage'; // Importando a página real

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Carregando...</div>;
  }

  return (
    <>
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
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <LoginPage /> : <Navigate to="/" />} 
        />
        <Route 
          path="/*" 
          element={session ? <Layout /> : <Navigate to="/login" />}
        >
          {/* Rotas aninhadas que serão renderizadas dentro do Layout */}
          <Route index element={<DashboardPage />} /> {/* Usando a página real */}
          <Route path="objects" element={<ObjectsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="supplies" element={<SuppliesPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
