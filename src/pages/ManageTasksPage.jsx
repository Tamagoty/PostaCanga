// Arquivo: src/pages/ManageTasksPage.jsx
// MELHORIA (v3): Implementado o `handleSupabaseError`.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaPlus, FaEdit, FaTrashAlt } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { useNavigate } from 'react-router-dom';
import { handleSupabaseError } from '../utils/errorHandler';

const ManageTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const navigate = useNavigate();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tasks').select('*').order('title');
    if (error) toast.error(handleSupabaseError(error));
    else setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleOpenModal = (task = null) => {
    setTaskToEdit(task);
    setIsFormModalOpen(true);
  };

  const handleSaveTask = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_task', formData);
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Tarefa salva!'); setIsFormModalOpen(false); fetchTasks(); }
    setIsSaving(false);
  };

  const startDeleteTask = (task) => {
    setTaskToDelete(task);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.rpc('delete_task', { p_task_id: taskToDelete.id });
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Tarefa apagada.');
      fetchTasks();
    }
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setTaskToDelete(null);
  };

  const frequencyLabels = {
    daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal', quarterly: 'Trimestral',
    semiannual: 'Semestral', annual: 'Anual', once: 'Única'
  };

  return (
    <div className={styles.container}>
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}>
        <TaskForm onSave={handleSaveTask} onClose={() => setIsFormModalOpen(false)} taskToEdit={taskToEdit} loading={isSaving} />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteTask}
        title="Confirmar Exclusão"
        loading={isDeleting}
      >
        <p>Tem certeza que deseja apagar a tarefa <strong>{taskToDelete?.title}</strong>?</p>
        <p>Todas as conclusões desta tarefa também serão apagadas.</p>
      </ConfirmationModal>

      <header className={styles.header}>
        <h1>Gerir Tarefas</h1>
        <div>
          <Button onClick={() => navigate('/tasks')} variant="secondary" style={{marginRight: '1rem'}}>Ver Pendentes</Button>
          <Button onClick={() => handleOpenModal()}><FaPlus /> Nova Tarefa</Button>
        </div>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead><tr><th>Título</th><th>Frequência</th><th>Ações</th></tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan="3">A carregar...</td></tr>)
            : tasks.map(task => (
              <tr key={task.id}>
                <td data-label="Título">{task.title}</td>
                <td data-label="Frequência">{frequencyLabels[task.frequency_type] || task.frequency_type}</td>
                <td data-label="Ações">
                  <div className={styles.actionButtons}>
                    <button className={styles.actionButton} onClick={() => handleOpenModal(task)}><FaEdit /></button>
                    <button className={`${styles.actionButton} ${styles.removeStock}`} onClick={() => startDeleteTask(task)}><FaTrashAlt /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageTasksPage;
