// Arquivo: src/components/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Sidebar.module.css";
import {
  FaTachometerAlt,
  FaBoxOpen,
  FaUsers,
  FaClipboardList,
  FaSignOutAlt,
  FaCog,
  FaTimes,
  FaUserCog,
  FaMapMarkedAlt,
  FaRulerCombined,
  FaTags,
  FaTasks,
} from "react-icons/fa";

const Sidebar = ({ onLogout, isOpen, toggleSidebar }) => {
  const { isAdmin } = useAuth();
  const agencyName = import.meta.env.VITE_AGENCY_NAME;
  const logoUrl = import.meta.env.VITE_LOGO_URL;

  const navItems = [
    { to: "/", icon: FaTachometerAlt, label: "Dashboard" },
    { to: "/objects", icon: FaBoxOpen, label: "Objetos" },
    { to: "/customers", icon: FaUsers, label: "Clientes" },
    { to: "/addresses", icon: FaMapMarkedAlt, label: "Endereços" },
    { to: "/supplies", icon: FaClipboardList, label: "Expediente" },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo da Aplicação"
              className={styles.logoImage}
            />
          )}
          <div className={styles.logoTextContainer}>
            <h1 className={styles.logoTitle}>PostaCanga</h1>
            {agencyName && (
              <span className={styles.logoSubtitle}>{agencyName}</span>
            )}
          </div>
        </div>
        <button onClick={toggleSidebar} className={styles.closeButton}>
          <FaTimes />
        </button>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ""}`
            }
            end={item.to === "/"}
          >
            <item.icon className={styles.navIcon} />
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <NavLink
              to="/tasks"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              <FaTasks className={styles.navIcon} />
              <span className={styles.navLabel}>Tarefas do Gestor</span>
            </NavLink>
            <NavLink
              to="/employees"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              <FaUserCog className={styles.navIcon} />
              <span className={styles.navLabel}>Funcionários</span>
            </NavLink>
            <NavLink
              to="/tracking-rules"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              <FaRulerCombined className={styles.navIcon} />
              <span className={styles.navLabel}>Regras de Rastreio</span>
            </NavLink>
            <NavLink
              to="/object-types"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              <FaTags className={styles.navIcon} />
              <span className={styles.navLabel}>Tipos de Objeto</span>
            </NavLink>
          </>
        )}
      </nav>
      <div className={styles.footer}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.active : ""}`
          }
        >
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
