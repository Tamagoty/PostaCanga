// Arquivo: src/components/RecentObjects.jsx
import React from 'react';
import styles from './RecentObjects.module.css';
import { FaBox } from 'react-icons/fa';

const RecentObjects = ({ objects }) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Objetos Recentes</h2>
      {objects && objects.length > 0 ? (
        <ul className={styles.list}>
          {objects.map(obj => (
            <li key={obj.control_number} className={styles.listItem}>
              <div className={styles.iconWrapper}>
                <FaBox />
              </div>
              <div className={styles.info}>
                <span className={styles.recipient}>{obj.recipient_name}</span>
                <span className={styles.details}>
                  {`#${obj.control_number} - ${obj.object_type}`}
                </span>
              </div>
              <span className={styles.date}>
                {new Date(obj.arrival_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyMessage}>Nenhuma atividade recente.</p>
      )}
    </div>
  );
};

export default RecentObjects;
