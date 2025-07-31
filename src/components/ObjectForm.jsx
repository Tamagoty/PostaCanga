// src/components/ObjectForm.jsx
// CORREÇÃO: Componente reconstruído com a lógica correta para adicionar/editar um objeto.

import React, { useState, useEffect, useCallback } from 'react';
import styles from './ObjectForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandler';

const ObjectForm = ({ onSave, onClose, objectToEdit, loading }) => {
  const [formData, setFormData] = useState({
    recipient_name: '',
    object_type: '',
    tracking_code: '',
    street_name: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: ''
  });
  const [objectTypes, setObjectTypes] = useState([]);

  // Busca os tipos de objeto para preencher o seletor
  const fetchObjectTypes = useCallback(async () => {
    const { data, error } = await supabase.from('object_types').select('name').order('name');
    if (error) {
      toast.error(handleSupabaseError(error));
    } else if (data) {
      setObjectTypes(data.map(item => item.name));
      // Define um valor padrão se não estiver a editar
      if (!objectToEdit && data.length > 0) {
        setFormData(prev => ({ ...prev, object_type: data[0].name }));
      }
    }
  }, [objectToEdit]);

  useEffect(() => {
    fetchObjectTypes();
  }, [fetchObjectTypes]);

  // Preenche o formulário se estiver no modo de edição
  useEffect(() => {
    if (objectToEdit) {
      setFormData({
        recipient_name: objectToEdit.recipient_name || '',
        object_type: objectToEdit.object_type || '',
        tracking_code: objectToEdit.tracking_code || '',
        street_name: objectToEdit.addresses?.street_name || '',
        number: objectToEdit.address_number || '',
        neighborhood: objectToEdit.addresses?.neighborhood || '',
        city: objectToEdit.addresses?.city?.name || '',
        state: objectToEdit.addresses?.city?.state?.uf || '',
        cep: objectToEdit.addresses?.cep || ''
      });
    }
  }, [objectToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.recipient_name || !formData.object_type) {
      toast.error('O Nome do Destinatário e o Tipo de Objeto são obrigatórios.');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Dados do Objeto</legend>
        <Input id="recipient_name" name="recipient_name" label="Nome do Destinatário" value={formData.recipient_name} onChange={handleChange} required />
        <div className={styles.formGroup}>
          <label htmlFor="object_type">Tipo de Objeto</label>
          <select id="object_type" name="object_type" value={formData.object_type} onChange={handleChange} className={styles.select} required>
            <option value="" disabled>Selecione um tipo</option>
            {objectTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <Input id="tracking_code" name="tracking_code" label="Código de Rastreio (Opcional)" value={formData.tracking_code} onChange={handleChange} />
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Endereço de Entrega (Opcional, para objetos não cadastrados)</legend>
        <Input id="street_name" name="street_name" label="Rua / Logradouro" value={formData.street_name} onChange={handleChange} />
        <div className={styles.grid}>
          <Input id="number" name="number" label="Número" value={formData.number} onChange={handleChange} />
          <Input id="neighborhood" name="neighborhood" label="Bairro" value={formData.neighborhood} onChange={handleChange} />
        </div>
        <div className={styles.grid}>
          <Input id="city" name="city" label="Cidade" value={formData.city} onChange={handleChange} />
          <Input id="state" name="state" label="UF" value={formData.state} onChange={handleChange} maxLength="2" />
        </div>
        <Input id="cep" name="cep" label="CEP" value={formData.cep} onChange={handleChange} />
      </fieldset>

      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Objeto'}
        </Button>
      </div>
    </form>
  );
};

export default ObjectForm;
