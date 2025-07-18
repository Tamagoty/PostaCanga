// Arquivo: src/components/Header.jsx
// MELHORIA (v4): Passa os novos estados de notificação para o componente Notifications.

import React from 'react';
import { FaBars } from 'react-icons/fa';
import styles from './Header.module.css';
import Notifications from './Notifications';
import { useAuth } from '../context/AuthContext';

const Header = ({ toggleSidebar, notifications, loading, showBell, onDismiss }) => {
  const { isAdmin } = useAuth();

  return (
    <header className={styles.header}>
      <button onClick={toggleSidebar} className={styles.menuButton}>
        <FaBars />
      </button>

      <div className={styles.spacer}></div>

      <div className={styles.actions}>
        {/* Renderiza o sino apenas se for admin e o estado showBell for true */}
        {isAdmin && showBell && (
          <Notifications 
            notifications={notifications} 
            loading={loading}
            onDismiss={onDismiss}
          />
        )}
      </div>
    </header>
  );
};

export default Header;
