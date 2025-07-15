// Arquivo: src/components/ProgressBar.jsx
import React from 'react';
import styles from './ProgressBar.module.css';

const ProgressBar = ({ startDate, endDate, status }) => {
  // Se o status não for 'Aguardando Retirada', não mostra a barra.
  if (status !== 'Aguardando Retirada') {
    return (
      <span className={`${styles.statusText} ${styles[status.toLowerCase().replace(/ /g, '')]}`}>
        {status}
      </span>
    );
  }

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const today = new Date().getTime();

  const totalDuration = end - start;
  const elapsedDuration = today - start;

  let percentage = 0;
  if (totalDuration > 0) {
    percentage = (elapsedDuration / totalDuration) * 100;
  }
  
  // Garante que a porcentagem não passe de 100%
  percentage = Math.min(Math.max(percentage, 0), 100);

  let barColorClass = styles.green;
  if (percentage > 50) barColorClass = styles.yellow;
  if (percentage > 85) barColorClass = styles.red;

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

  return (
    <div className={styles.progressBarContainer}>
      <div className={styles.progressBar}>
        <div 
          className={`${styles.progressFill} ${barColorClass}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className={styles.dateLabels}>
        <span>{formatDate(startDate)}</span>
        <span>{formatDate(endDate)}</span>
      </div>
    </div>
  );
};

export default ProgressBar;
