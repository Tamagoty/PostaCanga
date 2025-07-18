// Arquivo: src/components/LinkForm.jsx
// DESCRIÇÃO: Formulário para criar e editar os links de sistemas.

import React, { useState, useEffect } from 'react';
import styles from './EmployeeForm.module.css'; // Reutilizando estilos
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

const LinkForm = ({ onSave, onClose, linkToEdit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    details: '',
  });

  useEffect(() => {
    if (linkToEdit) {
      setFormData({
        name: linkToEdit.name || '',
        url: linkToEdit.url || '',
        description: linkToEdit.description || '',
        details: linkToEdit.details || '',
      });
    } else {
      setFormData({ name: '', url: '', description: '', details: '' });
    }
  }, [linkToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url) {
      toast.error('O Nome e a URL do sistema são obrigatórios.');
      return;
    }
    const payload = { ...formData, p_link_id: linkToEdit?.id || null };
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Detalhes do Link</legend>
        <Input id="name" name="name" label="Nome do Sistema" value={formData.name} onChange={handleChange} required />
        <Input id="url" name="url" label="URL (link de acesso)" type="url" value={formData.url} onChange={handleChange} required placeholder="https://..." />
        <Input id="description" name="description" label="Descrição Curta" value={formData.description} onChange={handleChange} />
        <div className={styles.formGroup}>
          <label htmlFor="details">Informações (Login, Instruções, etc.)</label>
          <textarea id="details" name="details" value={formData.details} onChange={handleChange} className={styles.textarea} rows="5" />
        </div>
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Link'}
        </Button>
      </div>
    </form>
  );
};

export default LinkForm;
