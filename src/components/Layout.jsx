// Arquivo: src/components/Layout.jsx
// MELHORIA (v2): Implementado o `handleSupabaseError`.

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.css';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { handleSupabaseError } from '../utils/errorHandler';

const Layout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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
        <Header toggleSidebar={toggleSidebar} />
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
      {isSidebarOpen && <div className={styles.overlay} onClick={toggleSidebar}></div>}
    </div>
  );
};

export default Layout;
