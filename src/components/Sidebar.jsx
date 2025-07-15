// Arquivo: src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Importando o hook de autenticação
import styles from './Sidebar.module.css';
import { FaTachometerAlt, FaBoxOpen, FaUsers, FaClipboardList, FaSignOutAlt, FaCog, FaTimes, FaUserCog } from 'react-icons/fa';

const Sidebar = ({ onLogout, isOpen, toggleSidebar }) => {
  const { isAdmin } = useAuth(); // Usando o hook para verificar se é admin

  const navItems = [
    { to: "/", icon: FaTachometerAlt, label: "Dashboard" },
    { to: "/objects", icon: FaBoxOpen, label: "Objetos" },
    { to: "/customers", icon: FaUsers, label: "Clientes" },
    { to: "/supplies", icon: FaClipboardList, label: "Expediente" },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.header}>
        <h1 className={styles.logo}>PostaCanga</h1>
        <button onClick={toggleSidebar} className={styles.closeButton}>
          <FaTimes />
        </button>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`} end={item.to === "/"}>
            <item.icon className={styles.navIcon} />
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
        {/* Renderização condicional do link de Gestão de Funcionários */}
        {isAdmin && (
          <NavLink to="/employees" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            <FaUserCog className={styles.navIcon} />
            <span className={styles.navLabel}>Funcionários</span>
          </NavLink>
        )}
      </nav>
      <div className={styles.footer}>
        <NavLink to="/settings" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            <FaCog className={styles.navIcon} />
            <span className={styles.navLabel}>Configurações</span>
        </NavLink>
        <button onClick={onLogout} className={styles.logoutButton}>
          <FaSignOutAlt className={styles.navIcon} />
          <span className={styles.navLabel}>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
