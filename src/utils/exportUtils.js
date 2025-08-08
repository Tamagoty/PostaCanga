// path: src/utils/exportUtils.js
// DESCRIÇÃO: Funções utilitárias para exportação de dados.

import toast from 'react-hot-toast';

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
