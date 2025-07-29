// Arquivo: src/components/DashboardSkeleton.jsx
// DESCRIÇÃO: Componente de esqueleto de carregamento para a página do Dashboard.

import React from 'react';
import styles from './DashboardSkeleton.module.css';
import skeletonStyles from './Skeleton.module.css';

const DashboardSkeleton = () => {
  return (
    <div className={styles.container}>
      {/* Skeleton para os cards de estatísticas */}
      <div className={styles.statsGrid}>
        <div className={`${skeletonStyles.card} ${skeletonStyles.skeletonAnimation}`}></div>
        <div className={`${skeletonStyles.card} ${skeletonStyles.skeletonAnimation}`}></div>
        <div className={`${skeletonStyles.card} ${skeletonStyles.skeletonAnimation}`}></div>
      </div>

      {/* Skeleton para a seção de tarefas/outra seção grande */}
      <div className={`${styles.largeBlock} ${skeletonStyles.skeletonAnimation}`}></div>

      {/* Skeleton para as duas colunas inferiores */}
      <div className={styles.bottomGrid}>
        <div className={`${styles.largeBlock} ${skeletonStyles.skeletonAnimation}`}></div>
        <div className={`${styles.largeBlock} ${skeletonStyles.skeletonAnimation}`}></div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
