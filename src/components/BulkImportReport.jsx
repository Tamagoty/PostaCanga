// path: src/components/BulkImportReport.jsx
import React from 'react';
import styles from './BulkImportReport.module.css';
import Button from './Button';
import { FaFilePdf } from 'react-icons/fa';
import { generatePDFReport } from '../utils/exportUtils';

const BulkImportReport = ({ reportData, onClose }) => {
    if (!reportData || !reportData.objects || reportData.objects.length === 0) {
        return (
            <div className={styles.container}>
                <p>Nenhum dado para exibir no relatório.</p>
                <div className={styles.actions}>
                    <Button variant="secondary" onClick={onClose}>Fechar</Button>
                </div>
            </div>
        );
    }

    const isSimple = reportData.type === 'simple';
    const title = isSimple ? 'Relatório de Inserção Simples' : 'Relatório de Inserção de Registrados';
    const headers = isSimple
        ? ["N° Controle", "Destinatário", "Tipo de Objeto"]
        : ["N° Controle", "Cód. Rastreio", "Destinatário"];

    const handleSavePDF = () => {
        generatePDFReport(reportData, title);
    };

    return (
        <div className={styles.container}>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            {headers.map(header => <th key={header}>{header}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.objects.map((item, index) => (
                            <tr key={index}>
                                <td>{item.report_control_number}</td>
                                {isSimple ? (
                                    <>
                                        <td>{item.report_recipient_name}</td>
                                        <td>{reportData.objectType}</td>
                                    </>
                                ) : (
                                    <>
                                        <td>{item.report_tracking_code}</td>
                                        <td>{item.report_recipient_name}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className={styles.actions}>
                <Button variant="secondary" onClick={onClose}>Fechar</Button>
                <Button onClick={handleSavePDF}><FaFilePdf /> Salvar PDF</Button>
            </div>
        </div>
    );
};

export default BulkImportReport;
