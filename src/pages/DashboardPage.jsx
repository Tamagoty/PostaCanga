// Arquivo: src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './DashboardPage.module.css';
import DashboardStats from '../components/DashboardStats';
import RecentObjects from '../components/RecentObjects';
import UpcomingBirthdays from '../components/UpcomingBirthdays';

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_dashboard_data');

      if (error) {
        toast.error('Erro ao carregar dados do dashboard: ' + error.message);
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
      <div className={styles.grid}>
        <RecentObjects objects={dashboardData.recent_objects} />
        <UpcomingBirthdays birthdays={dashboardData.upcoming_birthdays} />
      </div>
    </div>
  );
};

export default DashboardPage;
