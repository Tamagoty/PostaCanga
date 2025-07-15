// Arquivo: src/components/Header.jsx
import React from 'react';
import { FaBars } from 'react-icons/fa';
import styles from './Header.module.css';

const Header = ({ toggleSidebar }) => {
  return (
    <header className={styles.header}>
      <button onClick={toggleSidebar} className={styles.menuButton}>
        <FaBars />
      </button>
      {/* Pode adicionar outros elementos aqui, como nome do usuário ou notificações */}
    </header>
  );
};

export default Header;
