// Arquivo: src/pages/DashboardPage.jsx
// MELHORIA (v4): Implementado o Skeleton Loader para o Dashboard.

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './DashboardPage.module.css';
import DashboardStats from '../components/DashboardStats';
import RecentObjects from '../components/RecentObjects';
import UpcomingBirthdays from '../components/UpcomingBirthdays';
import PendingTasks from '../components/PendingTasks';
import { useAuth } from '../context/AuthContext';
import { handleSupabaseError } from '../utils/errorHandler';
import DashboardSkeleton from '../components/DashboardSkeleton'; // 1. Importar o esqueleto

const DashboardPage = () => {
  const { isAdmin } = useAuth();
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

  // 2. Lógica de renderização do Skeleton
  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!dashboardData) {
    return <div className={styles.loading}>Não foi possível carregar os dados.</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <DashboardStats stats={dashboardData} />

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
