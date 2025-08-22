// path: src/utils/exportUtils.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

/**
 * Gera um relatório em PDF a partir dos dados de inserção em lote.
 * @param {object} reportData - Os dados do relatório.
 * @param {string} title - O título do documento.
 */
export const generatePDFReport = (reportData, title) => {
    if (!reportData || !reportData.objects) {
        console.error("Dados inválidos para gerar PDF.");
        return;
    }

    const doc = new jsPDF();
    const isSimple = reportData.type === 'simple';

    const tableColumn = isSimple
        ? ["N° Controle", "Destinatário", "Tipo de Objeto"]
        : ["N° Controle", "Cód. Rastreio", "Destinatário"];

    const tableRows = reportData.objects.map(item => {
        return isSimple
            ? [item.report_control_number, item.report_recipient_name, reportData.objectType]
            : [item.report_control_number, item.report_tracking_code, item.report_recipient_name];
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
    });

    doc.setFontSize(18);
    doc.text(title, 14, 15);

    const date = format(new Date(), 'dd-MM-yyyy');
    const fileName = `relatorio_${reportData.type}_${date}.pdf`;
    doc.save(fileName);
};

/**
 * Exporta uma lista de clientes para um ficheiro CSV compatível com os Contactos Google.
 * @param {Array} customersToExport - O array de clientes a ser exportado.
 */
export const exportCustomersToGoogleCSV = (customersToExport) => {
  if (!customersToExport || customersToExport.length === 0) {
    toast.error('Nenhum cliente com telefone para exportar.');
    return;
  }

  const headers = "First Name,Birthday,Notes,Labels,E-mail 1 - Label,E-mail 1 - Value,Phone 1 - Label,Phone 1 - Value,Address 1 - Label,Address 1 - Street,Address 1 - Extended Address,Address 1 - City,Address 1 - Region,Address 1 - Postal Code,Address 1 - Country";
  
  const rows = customersToExport.map(c => {
    const firstName = `${c.full_name} ${c.is_active ? '✅' : '❌'}`;
    const birthday = c.birth_date ? new Date(c.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
    const notes = c.associated_contacts || '';
    const labels = 'AC AD';
    const emailLabel = 'Home';
    const emailValue = c.email || '';
    const phoneLabel = 'Mobile';
    let phoneValue = (c.cellphone_to_use || '').replace(/\D/g, '');
    if (phoneValue.length === 11 && !phoneValue.startsWith('0')) {
      phoneValue = `0${phoneValue}`;
    }
    const addressLabel = 'Home';
    const street = `${c.street_name || ''}, ${c.address_number || 'SN'}`;
    const extendedAddress = c.neighborhood || '';
    const city = c.city_name || '';
    const region = c.state_uf || '';
    const postalCode = c.cep || '';
    const country = 'Brasil';
    const fields = [firstName, birthday, notes, labels, emailLabel, emailValue, phoneLabel, phoneValue, addressLabel, street, extendedAddress, city, region, postalCode, country];
    return fields.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',');
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "google_contacts.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success("Exportação concluída!");
};
