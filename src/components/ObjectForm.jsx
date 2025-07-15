// Arquivo: src/components/ObjectForm.jsx
// Descrição: Formulário atualizado SEM o campo de prazo de guarda.
import React, { useState, useEffect } from 'react';
import styles from './ObjectForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

const ObjectForm = ({ onSave, onClose, objectToEdit, loading }) => {
  const [formData, setFormData] = useState({
    recipient_name: '',
    object_type: 'Encomenda PAC',
    tracking_code: '',
  });

  useEffect(() => {
    if (objectToEdit) {
      setFormData({
        recipient_name: objectToEdit.recipient_name || '',
        object_type: objectToEdit.object_type || 'Encomenda PAC',
        tracking_code: objectToEdit.tracking_code || '',
      });
    }
  }, [objectToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.recipient_name) {
      toast.error('O nome do Destinatário é obrigatório.');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        id="recipient_name"
        name="recipient_name"
        label="Nome do Destinatário"
        value={formData.recipient_name}
        onChange={handleChange}
        required
      />
      <div className={styles.formGroup}>
        <label htmlFor="object_type">Tipo de Objeto</label>
        <select 
          id="object_type" 
          name="object_type" 
          value={formData.object_type} 
          onChange={handleChange}
          className={styles.select}
        >
          <option>Encomenda PAC</option>
          <option>SEDEX</option>
          <option>Carta Registrada</option>
          <option>Carta Simples</option>
          <option>Revista</option>
          <option>Cartão</option>
          <option>Telegrama</option>
          <option>Outro</option>
        </select>
      </div>
      <Input
        id="tracking_code"
        name="tracking_code"
        label="Código de Rastreio (Opcional)"
        value={formData.tracking_code}
        onChange={handleChange}
      />
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Objeto'}
        </Button>
      </div>
    </form>
  );
};

export default ObjectForm;
