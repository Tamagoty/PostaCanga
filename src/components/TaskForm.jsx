// Arquivo: src/components/TaskForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './EmployeeForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

const TaskForm = ({ onSave, onClose, taskToEdit, loading }) => {
  const [formData, setFormData] = useState({
    title: '', description: '', frequency_type: 'daily', due_date: null
  });

  useEffect(() => {
    if (taskToEdit) {
      setFormData({
        title: taskToEdit.title || '',
        description: taskToEdit.description || '',
        frequency_type: taskToEdit.frequency_type || 'daily',
        due_date: taskToEdit.due_date ? new Date(taskToEdit.due_date).toISOString().split('T')[0] : null
      });
    }
  }, [taskToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('O título da tarefa é obrigatório.');
      return;
    }
    const payload = { ...formData, p_task_id: taskToEdit?.id || null };
    onSave(payload);
  };

  const frequencyOptions = [
    { value: 'daily', label: 'Diária' }, { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' }, { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannual', label: 'Semestral' }, { value: 'annual', label: 'Anual' },
    { value: 'once', label: 'Única (com prazo)' }
  ];

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Detalhes da Tarefa</legend>
        <Input id="title" name="title" label="Título" value={formData.title} onChange={handleChange} required />
        <div className={styles.formGroup}>
          <label htmlFor="description">Descrição</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} className={styles.textarea} rows="3" />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="frequency_type">Frequência</label>
          <select id="frequency_type" name="frequency_type" value={formData.frequency_type} onChange={handleChange} className={styles.select}>
            {frequencyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        {formData.frequency_type === 'once' && (
          <Input id="due_date" name="due_date" label="Prazo Final" type="date" value={formData.due_date} onChange={handleChange} required />
        )}
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Tarefa'}</Button>
      </div>
    </form>
  );
};

export default TaskForm;
