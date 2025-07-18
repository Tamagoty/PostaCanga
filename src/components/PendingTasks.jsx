// Arquivo: src/components/PendingTasks.jsx
// DESCRIÇÃO: Novo componente para exibir a lista de tarefas pendentes no Dashboard.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PendingTasks.module.css';
import { FaTasks, FaCheckCircle } from 'react-icons/fa';
import Button from './Button';

const PendingTasks = ({ tasks }) => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Tarefas Pendentes do Gestor</h2>
        <Button variant="secondary" onClick={() => navigate('/tasks')}>
          Ver Todas
        </Button>
      </div>
      
      {tasks && tasks.length > 0 ? (
        <ul className={styles.list}>
          {tasks.slice(0, 5).map(task => ( // Mostra no máximo 5 tarefas
            <li key={task.id} className={styles.listItem}>
              <div className={styles.iconWrapper}>
                <FaTasks />
              </div>
              <div className={styles.info}>
                <span className={styles.taskTitle}>{task.title}</span>
                <span className={styles.details}>{task.description}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.allDone}>
          <FaCheckCircle />
          <p>Tudo em dia! Nenhuma tarefa pendente.</p>
        </div>
      )}
    </div>
  );
};

export default PendingTasks;
