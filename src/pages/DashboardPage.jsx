// Arquivo: src/pages/DashboardPage.jsx
// MELHORIA (v3): Adicionado o componente de Tarefas Pendentes para administradores.

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './DashboardPage.module.css';
import DashboardStats from '../components/DashboardStats';
import RecentObjects from '../components/RecentObjects';
import UpcomingBirthdays from '../components/UpcomingBirthdays';
import PendingTasks from '../components/PendingTasks'; // 1. Importa o novo componente
import { useAuth } from '../context/AuthContext'; // 2. Importa o hook de autenticação
import { handleSupabaseError } from '../utils/errorHandler';

const DashboardPage = () => {
  const { isAdmin } = useAuth(); // 3. Pega o status de admin
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_dashboard_data');

      if (error) {
        toast.error(handleSupabaseError(error));
      } else {
        setDashboardData(data);
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Carregando dashboard...</div>;
  }

  if (!dashboardData) {
    return <div className={styles.loading}>Não foi possível carregar os dados.</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <DashboardStats stats={dashboardData} />

      {/* 4. Renderiza o componente de tarefas apenas se o usuário for admin e houver tarefas */}
      {isAdmin && dashboardData.pending_tasks && (
        <PendingTasks tasks={dashboardData.pending_tasks} />
      )}

      <div className={styles.grid}>
        <RecentObjects objects={dashboardData.recent_objects} />
        <UpcomingBirthdays birthdays={dashboardData.upcoming_birthdays} />
      </div>
    </div>
  );
};

export default DashboardPage;
