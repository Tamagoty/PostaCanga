// Arquivo: src/components/SuppliesUsageReport.jsx
// DESCRIÇÃO: Componente para o relatório de uso de material de expediente.

import React, { useRef } from 'react';
import styles from './ReportsShared.module.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Button from './Button';
import { FaFilePdf } from 'react-icons/fa';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const SuppliesUsageReport = ({ data, periodInMonths }) => {
  const chartRef = useRef(null);

  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    const toastId = toast.loading('A gerar PDF...');

    try {
      const canvas = await html2canvas(chartRef.current, { backgroundColor: '#272b35' });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({ orientation: 'portrait' });
      
      pdf.text(`Relatório de Uso de Expediente - Últimos ${periodInMonths} Meses`, 14, 22);
      pdf.addImage(imgData, 'PNG', 10, 30, 190, 100); // Ajustado para retrato

      pdf.autoTable({
        head: [['Material', 'Consumido', 'Estoque Atual', 'Média Mensal', 'Sugestão de Compra (3 meses)']],
        body: data.map(item => [item.supply_name, item.total_consumed, item.current_stock, item.monthly_avg, item.suggestion]),
        startY: 140,
        theme: 'grid',
        headStyles: { fillColor: '#3b82f6' },
      });

      pdf.save(`relatorio_expediente.pdf`);
      toast.success('PDF gerado com sucesso!', { id: toastId });
    } catch (err) {
      console.error("Erro detalhado ao gerar PDF:", err);
      toast.error('Ocorreu um erro ao gerar o PDF.', { id: toastId });
    }
  };

  return (
    <div className={styles.reportContainer}>
      <div className={styles.reportHeader}>
        <h3>Consumo nos Últimos {periodInMonths} Meses</h3>
        <Button onClick={handleExportPDF} variant="secondary">
          <FaFilePdf /> Exportar PDF
        </Button>
      </div>

      <div className={styles.chartWrapper} ref={chartRef}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="supply_name" stroke="var(--text-secondary)" />
            <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(113, 113, 122, 0.2)' }}
              contentStyle={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
            />
            <Legend />
            <Bar dataKey="total_consumed" fill="var(--accent-primary)" name="Total Consumido" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.reportTable}>
          <thead>
            <tr>
              <th>Material</th>
              <th>Consumido no Período</th>
              <th>Estoque Atual</th>
              <th>Média Mensal</th>
              <th>Sugestão de Compra</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.supply_name}>
                <td>{item.supply_name}</td>
                <td>{item.total_consumed}</td>
                <td>{item.current_stock}</td>
                <td>{item.monthly_avg}</td>
                <td className={styles.suggestionCell}>{item.suggestion > 0 ? `Comprar ${item.suggestion}` : 'OK'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuppliesUsageReport;
