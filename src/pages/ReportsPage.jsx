// Arquivo: src/pages/ReportsPage.jsx
// MELHORIA (v3): Adicionado o relatório de uso de expediente e um seletor de relatórios.

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './ReportsPage.module.css';
import { FaChartBar, FaClipboardList } from 'react-icons/fa';
import Button from '../components/Button';
import MonthlyObjectsChart from '../components/MonthlyObjectsChart';
import SuppliesUsageReport from '../components/SuppliesUsageReport'; // 1. Importar novo componente
import { handleSupabaseError } from '../utils/errorHandler';
import { useAuth } from '../context/AuthContext';

const ReportsPage = () => {
  const { isAdmin } = useAuth();
  const [reportType, setReportType] = useState('objects'); // 'objects' ou 'supplies'
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState(3); // 3, 6, ou 12 meses para expediente
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    setLoading(true);
    setReportData([]);
    
    let rpcName = '';
    let params = {};

    if (reportType === 'objects') {
      rpcName = 'get_monthly_objects_report';
      params = { p_year: year };
    } else {
      rpcName = 'get_supplies_usage_report';
      params = { p_months: period };
    }

    const { data, error } = await supabase.rpc(rpcName, params);
    
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      setReportData(data);
      if (data.length === 0) {
        toast.success('Nenhum dado encontrado para os filtros selecionados.');
      }
    }
    setLoading(false);
  };

  if (!isAdmin) {
    return <div className={styles.container}><h1>Acesso Negado</h1><p>Você não tem permissão para ver esta página.</p></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Relatórios Gerenciais</h1>
      </header>
      
      <div className={styles.filterSection}>
        <div className={styles.reportSelector}>
          <Button variant={reportType === 'objects' ? 'primary' : 'secondary'} onClick={() => setReportType('objects')}><FaChartBar /> Fluxo de Objetos</Button>
          <Button variant={reportType === 'supplies' ? 'primary' : 'secondary'} onClick={() => setReportType('supplies')}><FaClipboardList /> Uso de Expediente</Button>
        </div>
        
        <div className={styles.filterGroup}>
          {reportType === 'objects' ? (
            <>
              <label htmlFor="year-select">Ano:</label>
              <input id="year-select" type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className={styles.yearInput} />
            </>
          ) : (
            <>
              <label htmlFor="period-select">Período:</label>
              <select id="period-select" value={period} onChange={(e) => setPeriod(parseInt(e.target.value, 10))} className={styles.periodSelect}>
                <option value="3">Últimos 3 meses</option>
                <option value="6">Últimos 6 meses</option>
                <option value="12">Último ano</option>
              </select>
            </>
          )}
          <Button onClick={handleGenerateReport} loading={loading}>
            Gerar Relatório
          </Button>
        </div>
      </div>

      <div className={styles.reportDisplay}>
        {reportType === 'objects' && reportData.length > 0 && <MonthlyObjectsChart data={reportData} year={year} />}
        {reportType === 'supplies' && reportData.length > 0 && <SuppliesUsageReport data={reportData} periodInMonths={period} />}
      </div>
    </div>
  );
};

export default ReportsPage;
