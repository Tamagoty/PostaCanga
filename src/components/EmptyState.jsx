// Arquivo: src/components/EmptyState.jsx
// DESCRIÇÃO: Novo componente reutilizável para exibir mensagens de estado vazio.

import React from 'react';
import styles from './EmptyState.module.css';
import { FaSearch } from 'react-icons/fa';

const EmptyState = ({ icon: Icon = FaSearch, title, message }) => {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <Icon />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
    </div>
  );
};

export default EmptyState;
