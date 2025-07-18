// Arquivo: src/pages/StockLogPage.jsx
// MELHORIA (v2): Implementado o `handleSupabaseError`.

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './StockLogPage.module.css';
import { FaArrowLeft } from 'react-icons/fa';
import Button from '../components/Button';
import { handleSupabaseError } from '../utils/errorHandler';

const StockLogPage = () => {
  const { supplyId } = useParams();
  const navigate = useNavigate();
  const [logEntries, setLogEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [supplyName, setSupplyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('monthly');

  const fetchEmployees = useCallback(async () => {
    const { data, error } = await supabase.from('employees').select('id, full_name');
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      setEmployees(data);
    }
  }, []);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    const getStartDate = () => {
      const today = new Date();
      if (filter === 'quarterly') today.setMonth(today.getMonth() - 3);
      else if (filter === 'semiannual') today.setMonth(today.getMonth() - 6);
      else if (filter === 'annual') today.setFullYear(today.getFullYear() - 1);
      else today.setMonth(today.getMonth() - 1);
      return today.toISOString().split('T')[0];
    };

    const startDate = getStartDate();
    const { data, error } = await supabase.rpc('get_supply_stock_log', {
      p_supply_id: supplyId,
      p_start_date: startDate,
    });

    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      setLogEntries(data);
    }
    setLoading(false);
  }, [supplyId, filter]);

  const fetchSupplyName = useCallback(async () => {
    const { data } = await supabase.from('office_supplies').select('name').eq('id', supplyId).single();
    if (data) setSupplyName(data.name);
  }, [supplyId]);

  useEffect(() => {
    fetchEmployees();
    fetchSupplyName();
  }, [fetchEmployees, fetchSupplyName]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const getOperatorName = (userId) => {
    if (!userId) return 'Sistema';
    const employee = employees.find(emp => emp.id === userId);
    return employee ? employee.full_name : 'Desconhecido';
  };

  const filterOptions = [
    { key: 'monthly', label: 'Último Mês' },
    { key: 'quarterly', label: 'Último Trimestre' },
    { key: 'semiannual', label: 'Último Semestre' },
    { key: 'annual', label: 'Último Ano' },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <Button variant="secondary" onClick={() => navigate('/supplies')} className={styles.backButton}>
            <FaArrowLeft /> Voltar
          </Button>
          <h1>Histórico de Movimentações</h1>
          <p className={styles.subtitle}>Item: <strong>{supplyName}</strong></p>
        </div>
        <div className={styles.filters}>
          {filterOptions.map(opt => (
            <Button
              key={opt.key}
              variant={filter === opt.key ? 'primary' : 'secondary'}
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Operador</th>
              <th>Movimentação</th>
              <th>Estoque Final</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">A carregar histórico...</td></tr>
            ) : logEntries.length > 0 ? (
              logEntries.map(entry => (
                <tr key={entry.id}>
                  <td data-label="Data">{new Date(entry.created_at).toLocaleString('pt-BR')}</td>
                  <td data-label="Operador">{getOperatorName(entry.user_id)}</td>
                  <td data-label="Movimentação">
                    <span className={entry.quantity_changed > 0 ? styles.addition : styles.removal}>
                      {entry.quantity_changed > 0 ? `+${entry.quantity_changed}` : entry.quantity_changed}
                    </span>
                  </td>
                  <td data-label="Estoque Final">{entry.new_stock_total}</td>
                  <td data-label="Motivo">{entry.reason || '-'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5">Nenhum registro encontrado para o período selecionado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockLogPage;
