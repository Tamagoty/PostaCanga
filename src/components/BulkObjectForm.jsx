// Arquivo: src/components/BulkObjectForm.jsx
import React, { useState } from 'react';
import styles from './EmployeeForm.module.css'; // Reutilizando estilos
import Button from './Button';
import toast from 'react-hot-toast';

const BulkObjectForm = ({ onSave, onClose, loading }) => {
  const [textData, setTextData] = useState('');
  const [objectType, setObjectType] = useState('Carta Simples');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!textData.trim()) {
      toast.error('Por favor, cole os dados dos objetos na área de texto.');
      return;
    }
    
    // Processa o texto colado para extrair os dados
    const lines = textData.trim().split('\n');
    const objectsToCreate = lines.map(line => {
      const columns = line.split('\t'); // Separa por TAB
      if (columns.length >= 4) {
        return {
          recipient_name: columns[2].trim(),
          street_name: columns[3].trim()
        };
      }
      return null;
    }).filter(Boolean); // Remove linhas que não puderam ser processadas

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
          >
            <option>Carta Simples</option>
            <option>Cartão</option>
            <option>Revista</option>
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
