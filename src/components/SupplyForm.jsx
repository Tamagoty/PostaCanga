// Arquivo: src/components/SupplyForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './CustomerForm.module.css'; // Reutilizando o estilo do formulário de cliente
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

const SupplyForm = ({ onSave, onClose, supplyToEdit, loading }) => {
  const isEditing = !!supplyToEdit;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initial_stock: 0,
  });

  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: supplyToEdit.name || '',
        description: supplyToEdit.description || '',
        initial_stock: supplyToEdit.stock || 0,
      });
    }
  }, [supplyToEdit, isEditing]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? parseInt(value, 10) : value 
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('O nome do material é obrigatório.');
      return;
    }
       const payload = {
          supply_id: supplyToEdit?.id || null,
          name: formData.name,
          description: formData.description,
          initial_stock: formData.initial_stock,
        };
        onSave(payload);
    };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Detalhes do Material</legend>
        <Input id="name" name="name" label="Nome do Material" value={formData.name} onChange={handleChange} required />
        <Input id="description" name="description" label="Descrição" value={formData.description} onChange={handleChange} />
        <Input 
          id="initial_stock" 
          name="initial_stock" 
          label={isEditing ? "Estoque Atual (não editável aqui)" : "Estoque Inicial"}
          type="number" 
          value={formData.initial_stock} 
          onChange={handleChange} 
          disabled={isEditing}
          min="0"
        />
      </fieldset>

      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Material'}
        </Button>
      </div>
    </form>
  );
};

export default SupplyForm;
