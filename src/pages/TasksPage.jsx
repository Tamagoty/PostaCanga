// Arquivo: src/pages/TasksPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './TasksPage.module.css';
import { FaCheckCircle, FaRegCircle, FaInfoCircle, FaCog } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Importando o hook de navegação
import Button from '../components/Button'; // Importando o componente Button

const TasksPage = () => {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Hook para navegação

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_pending_tasks');
    if (error) {
      toast.error('Erro ao buscar tarefas: ' + error.message);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchTasks();
    }
  }, [isAdmin, fetchTasks]);

  const handleCompleteTask = async (taskId) => {
    const originalTasks = [...tasks];
    setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));

    const { error } = await supabase.rpc('complete_task', { p_task_id: taskId });
    if (error) {
      toast.error('Falha ao concluir tarefa. Restaurando...');
      setTasks(originalTasks);
    } else {
      toast.success('Tarefa concluída!');
    }
  };

  if (!isAdmin) {
    return <div className={styles.container}><h1>Acesso Negado</h1><p>Esta página é reservada para administradores.</p></div>;
  }

  const groupedTasks = tasks.reduce((acc, task) => {
    const key = task.frequency_type;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(task);
    return acc;
  }, {});

  const groupOrder = ['daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'once'];
  const groupLabels = {
    daily: 'Diárias', weekly: 'Semanais', monthly: 'Mensais',
    quarterly: 'Trimestrais', semiannual: 'Semestrais', annual: 'Anuais', once: 'Únicas'
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Tarefas do Gestor</h1>
          <p>Atividades pendentes que requerem a sua atenção.</p>
        </div>
        {/* CORREÇÃO: Adicionado o botão para navegar para a página de gestão de tarefas */}
        <Button onClick={() => navigate('/tasks/manage')}>
          <FaCog /> Gerir Tarefas
        </Button>
      </header>

      {loading ? <p>A carregar tarefas...</p> : (
        tasks.length === 0 ? (
          <div className={styles.allDone}>
            <FaCheckCircle />
            <h2>Tudo em dia!</h2>
            <p>Nenhuma tarefa pendente no momento.</p>
          </div>
        ) : (
          <div className={styles.tasksGrid}>
            {groupOrder.map(groupKey => (
              groupedTasks[groupKey] && (
                <div key={groupKey} className={styles.taskGroup}>
                  <h2>{groupLabels[groupKey]}</h2>
                  {groupedTasks[groupKey].map(task => (
                    <div key={task.id} className={styles.taskCard}>
                      <button className={styles.checkButton} onClick={() => handleCompleteTask(task.id)}>
                        <FaRegCircle className={styles.iconUnchecked} />
                        <FaCheckCircle className={styles.iconChecked} />
                      </button>
                      <div className={styles.taskInfo}>
                        <h3>{task.title}</h3>
                        <p>{task.description}</p>
                      </div>
                      <div className={styles.tooltip}>
                        <FaInfoCircle />
                        <span className={styles.tooltiptext}>
                          Última conclusão: {task.last_completed_at ? new Date(task.last_completed_at).toLocaleString('pt-BR') : 'Nunca'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default TasksPage;
