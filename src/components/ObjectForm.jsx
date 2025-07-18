// Arquivo: src/components/ObjectForm.jsx
// MELHORIA (v2): O seletor de "Tipo de Objeto" agora busca os dados dinamicamente do banco de dados.

import React, { useState, useEffect } from 'react';
import styles from './CustomerForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';
import { FaSearch } from 'react-icons/fa';
import { supabase } from '../lib/supabaseClient';
import { handleSupabaseError } from '../utils/errorHandler';

const ObjectForm = ({ onSave, onClose, objectToEdit, loading }) => {
  const initialFormData = {
    recipient_name: '',
    object_type: '', // Inicia vazio para forçar a seleção
    tracking_code: '',
    cep: '',
    street_name: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [cepLoading, setCepLoading] = useState(false);
  const [objectTypes, setObjectTypes] = useState([]); // Estado para armazenar os tipos

  // Busca os tipos de objeto do banco de dados quando o componente é montado
  useEffect(() => {
    const fetchObjectTypes = async () => {
      const { data, error } = await supabase.from('object_types').select('name').order('name');
      if (error) {
        toast.error(handleSupabaseError(error));
      } else if (data) {
        setObjectTypes(data.map(item => item.name));
        // Define um valor padrão para o formulário após carregar os tipos
        if (!objectToEdit) {
            setFormData(prev => ({...prev, object_type: data[0]?.name || ''}))
        }
      }
    };
    fetchObjectTypes();
  }, [objectToEdit]);

  useEffect(() => {
    if (objectToEdit) {
      setFormData({
        recipient_name: objectToEdit.recipient_name || '',
        object_type: objectToEdit.object_type || '',
        tracking_code: objectToEdit.tracking_code || '',
        cep: '', street_name: '', number: '', neighborhood: '', city: '', state: '',
      });
    } else {
      setFormData(initialFormData);
    }
  }, [objectToEdit]);

  const handleCepChange = async (e) => {
    const cepValue = e.target.value;
    setFormData(prev => ({ ...prev, cep: cepValue }));
    
    const cleanedCep = cepValue.replace(/\D/g, '');
    
    if (cleanedCep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await response.json();
        if (data.erro) {
          toast.error('CEP não encontrado.');
        } else {
          setFormData(prev => ({
            ...prev,
            street_name: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
          toast.success('Endereço preenchido!');
          document.getElementById('number')?.focus();
        }
      } catch (error) {
        toast.error('Falha ao buscar o CEP. Verifique sua conexão.');
      } finally {
        setCepLoading(false);
      }
    }
  };

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
    if (formData.street_name && (!formData.city || !formData.state)) {
        toast.error('Para adicionar um endereço, os campos Logradouro, Cidade e UF são obrigatórios.');
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
      
      {!objectToEdit && (
        <fieldset className={styles.fieldset}>
          <legend>Endereço de Entrega (Opcional)</legend>
          <div className={styles.cepGroup}>
            <Input id="cep" name="cep" label="CEP" value={formData.cep} onChange={handleCepChange} icon={cepLoading ? undefined : FaSearch} />
            {cepLoading && <div className={styles.loader}></div>}
          </div>
          <Input id="street_name" name="street_name" label="Logradouro" value={formData.street_name} onChange={handleChange} />
          <div className={styles.grid}>
            <Input id="number" name="number" label="Número" value={formData.number} onChange={handleChange} />
            <Input id="neighborhood" name="neighborhood" label="Bairro" value={formData.neighborhood} onChange={handleChange} />
          </div>
          <div className={styles.grid}>
            <Input id="city" name="city" label="Cidade" value={formData.city} onChange={handleChange} />
            <Input id="state" name="state" label="UF" value={formData.state} onChange={handleChange} maxLength="2" />
          </div>
        </fieldset>
      )}

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
