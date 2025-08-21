// path: src/components/ObjectsFilterBar.jsx
import React from 'react';
import styles from '../pages/ObjectsPage.module.css';
import { FaCheckCircle, FaUndoAlt, FaArchive, FaBoxOpen, FaExclamationTriangle } from 'react-icons/fa';
import Button from './Button';

const FilterButton = ({ status, icon, label, active, count, onClick }) => (
    <button className={`${styles.filterButton} ${styles[status]} ${active ? styles.active : ''}`} onClick={onClick}>
        {icon} {label} <span className={styles.countBadge}>{count || 0}</span>
    </button>
);

const ObjectsFilterBar = ({ statusFilters, handleFilterToggle, statusCounts, onArchiveAction }) => {
  const filters = [
    { status: 'aguardando', label: 'Aguardando', value: 'Aguardando Retirada', icon: <FaBoxOpen /> },
    { status: 'vencidos', label: 'Vencidos', value: 'Vencidos', icon: <FaExclamationTriangle /> },
    { status: 'entregues', label: 'Entregues', value: 'Entregue', icon: <FaCheckCircle /> },
    { status: 'devolvidos', label: 'Devolvidos', value: 'Devolvido', icon: <FaUndoAlt /> },
    { status: 'arquivados', label: 'Arquivados', value: 'Arquivados', icon: <FaArchive /> },
  ];

  return (
    <div className={styles.filterActions}>
      <div className={styles.filterGroup}>
        {filters.map(filter => (
          <FilterButton
            key={filter.status}
            status={filter.status}
            icon={filter.icon}
            label={filter.label}
            active={statusFilters.has(filter.value)}
            count={statusCounts[filter.value]}
            onClick={() => handleFilterToggle(filter.value)}
          />
        ))}
      </div>
      {!statusFilters.has('Arquivados') && (
        <button onClick={onArchiveAction} className={`${styles.filterButton} ${styles.archiveActionButton}`}>
          <FaArchive /> Arquivar Concluídos
        </button>
      )}
    </div>
  );
};

export default ObjectsFilterBar;
