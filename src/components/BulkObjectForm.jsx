// Arquivo: src/components/BulkObjectForm.jsx
// MELHORIA (v2): O seletor de "Tipo de Objeto" agora busca os dados dinamicamente.

import React, { useState, useEffect } from 'react';
import styles from './EmployeeForm.module.css';
import Button from './Button';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { handleSupabaseError } from '../utils/errorHandler';

const BulkObjectForm = ({ onSave, onClose, loading }) => {
  const [textData, setTextData] = useState('');
  const [objectType, setObjectType] = useState('');
  const [objectTypes, setObjectTypes] = useState([]);

  useEffect(() => {
    const fetchObjectTypes = async () => {
      const { data, error } = await supabase.from('object_types').select('name').order('name');
      if (error) {
        toast.error(handleSupabaseError(error));
      } else if (data) {
        setObjectTypes(data.map(item => item.name));
        if (data.length > 0) {
          setObjectType(data.find(t => t.name === 'Carta Simples') ? 'Carta Simples' : data[0].name);
        }
      }
    };
    fetchObjectTypes();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!textData.trim()) {
      toast.error('Por favor, cole os dados dos objetos na área de texto.');
      return;
    }
    
    const lines = textData.trim().split('\n');
    const objectsToCreate = lines.map(line => {
      const columns = line.split('\t');
      if (columns.length >= 4) {
        return {
          recipient_name: columns[2].trim(),
          street_name: columns[3].trim()
        };
      }
      return null;
    }).filter(Boolean);

    if (objectsToCreate.length === 0) {
      toast.error('Nenhum objeto válido encontrado nos dados colados. Verifique o formato.');
      return;
    }

    onSave({ objects: objectsToCreate, type: objectType });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Dados para Inserção em Massa</legend>
        <div className={styles.formGroup}>
          <label htmlFor="textData">Cole os dados aqui</label>
          <textarea
            id="textData"
            value={textData}
            onChange={(e) => setTextData(e.target.value)}
            className={styles.textarea}
            rows="10"
            placeholder="Cole os dados do seu sistema aqui. Cada linha deve conter as colunas separadas por TAB."
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="objectType">Tipo de Objeto a ser Criado</label>
          <select 
            id="objectType" 
            value={objectType} 
            onChange={(e) => setObjectType(e.target.value)} 
            className={styles.select}
            required
          >
            <option value="" disabled>Selecione um tipo</option>
            {objectTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Processando...' : 'Inserir Objetos'}
        </Button>
      </div>
    </form>
  );
};

export default BulkObjectForm;
