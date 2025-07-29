// Arquivo: src/components/CardSkeleton.jsx
// DESCRIÇÃO: Componente de esqueleto para a visualização em cards.

import React from 'react';
import styles from './Skeleton.module.css';

const CardSkeleton = () => {
  return (
    <div className={`${styles.card} ${styles.skeleton}`}>
      <div className={styles.cardHeader}>
        <div className={`${styles.skeletonCircle} ${styles.skeletonAnimation}`}></div>
        <div className={`${styles.skeletonLine} ${styles.skeletonAnimation}`} style={{ width: '70%' }}></div>
      </div>
      <div className={styles.cardBody}>
        <div className={`${styles.skeletonLine} ${styles.skeletonAnimation}`}></div>
        <div className={`${styles.skeletonLine} ${styles.skeletonAnimation}`} style={{ width: '80%' }}></div>
        <div className={`${styles.skeletonLine} ${styles.skeletonAnimation}`} style={{ width: '90%' }}></div>
      </div>
      <div className={styles.cardFooter}>
        <div className={`${styles.skeletonLine} ${styles.skeletonAnimation}`} style={{ width: '30%', height: '24px' }}></div>
        <div className={`${styles.skeletonLine} ${styles.skeletonAnimation}`} style={{ width: '40%', height: '32px' }}></div>
      </div>
    </div>
  );
};

export default CardSkeleton;
