// src/components/BulkNotifyForm.jsx
// DESCRIÇÃO: Novo formulário para gerar notificações em lote por filtros.

import React, { useState } from 'react';
import styles from './BulkNotifyForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

const BulkNotifyForm = ({ onSave, onClose, loading }) => {
  const [filterType, setFilterType] = useState('control_number'); // 'control_number' ou 'arrival_date'
  const [startControl, setStartControl] = useState('');
  const [endControl, setEndControl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { filterType };

    if (filterType === 'control_number') {
      if (!startControl || !endControl) {
        toast.error('Por favor, preencha o número de controlo inicial e final.');
        return;
      }
      payload.start_control = parseInt(startControl, 10);
      payload.end_control = parseInt(endControl, 10);
    } else {
      if (!startDate || !endDate) {
        toast.error('Por favor, preencha a data de início e fim.');
        return;
      }
      payload.start_date = startDate;
      payload.end_date = endDate;
    }

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.filterSelector}>
        <Button
          type="button"
          variant={filterType === 'control_number' ? 'primary' : 'secondary'}
          onClick={() => setFilterType('control_number')}
        >
          Por N° de Controlo
        </Button>
        <Button
          type="button"
          variant={filterType === 'arrival_date' ? 'primary' : 'secondary'}
          onClick={() => setFilterType('arrival_date')}
        >
          Por Data de Chegada
        </Button>
      </div>

      {filterType === 'control_number' ? (
        <fieldset className={styles.fieldset}>
          <legend>Faixa de Números de Controlo</legend>
          <div className={styles.grid}>
            <Input id="startControl" name="startControl" label="De" type="number" value={startControl} onChange={(e) => setStartControl(e.target.value)} required />
            <Input id="endControl" name="endControl" label="Até" type="number" value={endControl} onChange={(e) => setEndControl(e.target.value)} required />
          </div>
        </fieldset>
      ) : (
        <fieldset className={styles.fieldset}>
          <legend>Intervalo de Datas de Chegada</legend>
           <div className={styles.grid}>
            <Input id="startDate" name="startDate" label="De" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            <Input id="endDate" name="endDate" label="Até" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
        </fieldset>
      )}

      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {loading ? 'A Gerar...' : 'Gerar Notificações'}
        </Button>
      </div>
    </form>
  );
};

export default BulkNotifyForm;
