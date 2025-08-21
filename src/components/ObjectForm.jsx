// path: src/components/ObjectForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import styles from './CustomerForm.module.css'; // Reutilizando estilos
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandler';
import useDebounce from '../hooks/useDebounce';
import { capitalizeName } from '../utils/formatters';

const ObjectForm = ({ onSave, onClose, objectToEdit, loading }) => {
  const [formData, setFormData] = useState({
    recipient_name: '', object_type: '', tracking_code: '', street_name: '',
    number: '', neighborhood: '', city: '', state: '', cep: ''
  });
  const [objectTypes, setObjectTypes] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const debouncedRecipientName = useDebounce(formData.recipient_name, 500);

  const fetchObjectTypes = useCallback(async () => {
    const { data, error } = await supabase.from('object_types').select('name').order('name');
    if (error) {
      toast.error(handleSupabaseError(error));
    } else if (data) {
      setObjectTypes(data.map(item => item.name));
      if (!objectToEdit && data.length > 0) {
        setFormData(prev => ({ ...prev, object_type: data[0].name }));
      }
    }
  }, [objectToEdit]);

  useEffect(() => {
    fetchObjectTypes();
  }, [fetchObjectTypes]);

  useEffect(() => {
    const getSuggestions = async () => {
      if (debouncedRecipientName.length < 3) {
        setCustomerSuggestions([]);
        return;
      }
      const { data, error } = await supabase.rpc('suggest_customers', { p_search_term: debouncedRecipientName });
      if (error) {
        console.error(error);
        setCustomerSuggestions([]);
      } else {
        setCustomerSuggestions(data || []);
      }
    };
    getSuggestions();
  }, [debouncedRecipientName]);

  useEffect(() => {
    if (objectToEdit) {
      setFormData({
        recipient_name: objectToEdit.recipient_name || '',
        object_type: objectToEdit.object_type || '',
        tracking_code: objectToEdit.tracking_code || '',
        street_name: objectToEdit.delivery_street_name || '',
        number: objectToEdit.delivery_address_number || '',
        neighborhood: objectToEdit.delivery_neighborhood || '',
        city: objectToEdit.delivery_city_name || '',
        state: objectToEdit.delivery_state_uf || '',
        cep: objectToEdit.delivery_cep || ''
      });
    }
  }, [objectToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'recipient_name' || name === 'street_name' || name === 'neighborhood' || name === 'city') {
        setFormData(prev => ({ ...prev, [name]: capitalizeName(value) }));
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setFormData(prev => ({ ...prev, recipient_name: suggestion.full_name }));
    setCustomerSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.recipient_name || !formData.object_type) {
      toast.error('O Nome do Destinatário e o Tipo de Objeto são obrigatórios.');
      return;
    }

    // CORREÇÃO: Enviando o payload sem os prefixos 'p_'.
    // A função `handleSaveObject` no componente pai (ObjectsPage.jsx)
    // é responsável por montar o objeto final para a chamada RPC.
    const payload = {
        recipient_name: capitalizeName(formData.recipient_name),
        object_type: formData.object_type,
        tracking_code: formData.tracking_code || null,
        street_name: capitalizeName(formData.street_name) || null,
        number: formData.number || null,
        neighborhood: capitalizeName(formData.neighborhood) || null,
        city: capitalizeName(formData.city) || null,
        state: formData.state || null,
        cep: formData.cep || null
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Dados do Objeto</legend>
        <div className={styles.searchWrapper}>
            <Input id="recipient_name" name="recipient_name" label="Nome do Destinatário" value={formData.recipient_name} onChange={handleChange} onBlur={handleBlur} required autoComplete="off" />
            {customerSuggestions.length > 0 && (
              <ul className={styles.searchResults}>
                {customerSuggestions.map((suggestion) => (
                  <li key={suggestion.id} onClick={() => handleSelectSuggestion(suggestion)}>
                    {suggestion.full_name}
                  </li>
                ))}
              </ul>
            )}
        </div>
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
        <legend>Endereço de Entrega (Opcional)</legend>
        <Input id="street_name" name="street_name" label="Rua / Logradouro" value={formData.street_name} onChange={handleChange} onBlur={handleBlur} />
        <div className={styles.grid}>
          <Input id="number" name="number" label="Número" value={formData.number} onChange={handleChange} />
          <Input id="neighborhood" name="neighborhood" label="Bairro" value={formData.neighborhood} onChange={handleChange} onBlur={handleBlur} />
        </div>
        <div className={styles.grid}>
          <Input id="city" name="city" label="Cidade" value={formData.city} onChange={handleChange} onBlur={handleBlur} />
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
