// Arquivo: src/components/AppSettingForm.jsx
// MELHORIA (v2): Adicionado o campo "Rótulo" para um nome de exibição amigável.

import React, { useState, useEffect } from 'react';
import styles from './EmployeeForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

const AppSettingForm = ({ onSave, onClose, settingToEdit, loading }) => {
  const [formData, setFormData] = useState({ key: '', value: '', description: '', label: '' });
  const isEditing = !!settingToEdit;

  useEffect(() => {
    if (settingToEdit) {
      setFormData({
        key: settingToEdit.key || '',
        value: settingToEdit.value || '',
        description: settingToEdit.description || '',
        label: settingToEdit.label || '', // Carrega o rótulo existente
      });
    } else {
      // Reseta o formulário para criação
      setFormData({ key: '', value: '', description: '', label: '' });
    }
  }, [settingToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.key || !formData.value || !formData.label) {
      toast.error('Chave, Rótulo e Valor são obrigatórios.');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Detalhes da Configuração</legend>
        <Input id="label" name="label" label="Rótulo (Nome de Exibição)" value={formData.label} onChange={handleChange} required />
        <Input id="key" name="key" label="Chave (identificador único no sistema)" value={formData.key} onChange={handleChange} required disabled={isEditing} />
        <Input id="value" name="value" label="Valor" value={formData.value} onChange={handleChange} required />
        <div className={styles.formGroup}>
          <label htmlFor="description">Descrição</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} className={styles.textarea} rows="3" />
        </div>
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Configuração'}</Button>
      </div>
    </form>
  );
};

export default AppSettingForm;
