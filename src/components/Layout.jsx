// Arquivo: src/components/Layout.jsx
// MELHORIA (v5): Adicionada a lógica para "dispensar" as notificações.
// O sino agora desaparece após ser clicado, até a próxima atualização da página.

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.css';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { handleSupabaseError } from '../utils/errorHandler';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { isAdmin } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation(); // Hook para detectar mudança de rota
  
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  // 1. Novo estado para controlar a visibilidade do sino
  const [showNotificationBell, setShowNotificationBell] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      const fetchNotifications = async () => {
        setLoadingNotifications(true);
        const { data, error } = await supabase.rpc('get_notifications');
        if (error) {
          toast.error(handleSupabaseError(error));
        } else {
          const fetchedNotifications = data || [];
          setNotifications(fetchedNotifications);
          // 2. Mostra o sino se houver notificações
          if (fetchedNotifications.length > 0) {
            setShowNotificationBell(true);
          }
        }
        setLoadingNotifications(false);
      };

      fetchNotifications();
    }
  }, [isAdmin, location.key]); // 3. Re-busca notificações ao navegar para outra página

  // 4. Função para esconder o sino ao ser clicado
  const handleDismissNotifications = () => {
    setShowNotificationBell(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Você saiu com sucesso.');
    }
  };

  return (
    <div className={styles.layout}>
      <Sidebar onLogout={handleLogout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={styles.contentWrapper}>
        <Header 
          toggleSidebar={toggleSidebar} 
          notifications={notifications} 
          loading={loadingNotifications}
          showBell={showNotificationBell}
          onDismiss={handleDismissNotifications}
        />
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
      {isSidebarOpen && <div className={styles.overlay} onClick={toggleSidebar}></div>}
    </div>
  );
};

export default Layout;
