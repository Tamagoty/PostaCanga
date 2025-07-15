// Arquivo: src/components/DashboardStats.jsx
import React from 'react';
import styles from './DashboardStats.module.css';
import { FaBoxOpen, FaExclamationTriangle, FaArchive } from 'react-icons/fa';

const StatCard = ({ icon, value, label, color }) => {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper} style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className={styles.textWrapper}>
        <span className={styles.value}>{value}</span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
};

const DashboardStats = ({ stats }) => {
  return (
    <div className={styles.grid}>
      <StatCard
        icon={<FaBoxOpen />}
        value={stats.awaiting_count}
        label="Aguardando Retirada"
        color="var(--accent-primary)"
      />
      <StatCard
        icon={<FaExclamationTriangle />}
        value={stats.expiring_count}
        label="Vencendo em 3 dias"
        color="#f59e0b" // Amarelo/Laranja
      />
      <StatCard
        icon={<FaArchive />}
        value={stats.low_stock_count}
        label="Materiais com Stock Baixo"
        color="var(--accent-danger)"
      />
    </div>
  );
};

export default DashboardStats;
