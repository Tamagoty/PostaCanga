// Arquivo: src/components/TableSkeleton.jsx
// DESCRIÇÃO: Componente de esqueleto para a visualização em tabela.

import React from 'react';
import styles from './Skeleton.module.css';

const TableSkeleton = ({ columns = 5, rows = 5 }) => {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i}>
              <div className={`${styles.skeletonLine} ${styles.skeletonAnimation}`}></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            {Array.from({ length: columns }).map((_, j) => (
              <td key={j}>
                <div className={`${styles.skeletonLine} ${styles.skeletonAnimation}`}></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TableSkeleton;
