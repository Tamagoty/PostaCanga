// Arquivo: src/components/MonthlyObjectsChart.jsx
// CORREÇÃO (v1.1): Desativadas as animações do gráfico para garantir a
// compatibilidade com a biblioteca de exportação para PDF (html2canvas).

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './MonthlyObjectsChart.module.css';

const MonthlyObjectsChart = ({ data, year }) => {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Fluxo de Objetos em {year}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="mes" stroke="var(--text-secondary)" />
          <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
          <Tooltip 
            cursor={{ fill: 'rgba(113, 113, 122, 0.2)' }}
            contentStyle={{ 
              backgroundColor: 'var(--bg-tertiary)', 
              borderColor: 'var(--border-color)',
              borderRadius: 'var(--border-radius)'
            }}
          />
          <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
          {/* A propriedade isAnimationActive={false} resolve o problema de captura */}
          <Bar dataKey="criados" fill="var(--accent-primary)" name="Criados" isAnimationActive={false} />
          <Bar dataKey="entregues" fill="var(--accent-secondary)" name="Entregues" isAnimationActive={false} />
          <Bar dataKey="devolvidos" fill="var(--accent-danger)" name="Devolvidos" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyObjectsChart;
