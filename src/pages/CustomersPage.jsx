// Arquivo: src/pages/CustomersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './CustomersPage.module.css';
import { FaSearch, FaPlus, FaEdit, FaUserCircle, FaPhoneAlt, FaFileCsv } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';
import ToggleSwitch from '../components/ToggleSwitch';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    let { data, error } = await supabase
      .from('customers')
      .select('*, addresses(*), contact:contact_customer_id(full_name)')
      .order('full_name', { ascending: true });

    if (error) {
      toast.error('Erro ao buscar clientes: ' + error.message);
    } else {
      setCustomers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenModalForNew = () => {
    setCustomerToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (customer) => {
    setCustomerToEdit(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCustomerToEdit(null);
  };

  const handleSaveCustomer = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_customer', {
      p_customer_id: formData.p_customer_id,
      p_full_name: formData.full_name,
      p_cpf: formData.cpf || null,
      p_cellphone: formData.cellphone || null,
      p_birth_date: formData.birth_date || null,
      p_contact_customer_id: formData.contact_customer_id || null,
      p_address_id: formData.p_address_id,
      p_cep: formData.cep || null,
      p_street_type: formData.street_type || null,
      p_street_name: formData.street_name || null,
      p_neighborhood: formData.neighborhood || null,
      p_city: formData.city || null,
      p_state: formData.state || null
    });

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } else {
      toast.success(`Cliente ${customerToEdit ? 'atualizado' : 'criado'}!`);
      handleCloseModal();
      fetchCustomers();
    }
    setIsSaving(false);
  };

  const handleToggleStatus = async (customer) => {
    const newStatus = !customer.is_active;
    const toastId = toast.loading(`${newStatus ? 'Ativando' : 'Desativando'} cliente...`);
    
    const { error } = await supabase.rpc('set_customer_status', {
      p_customer_id: customer.id,
      p_is_active: newStatus
    });

    if (error) {
      toast.error(`Erro: ${error.message}`, { id: toastId });
    } else {
      toast.success('Status atualizado com sucesso!', { id: toastId });
      fetchCustomers();
    }
  };

  const handleExportCSV = () => {
    if (customers.length === 0) {
      toast.error("Não há clientes para exportar.");
      return;
    }

    const headers = "Name,Given Name,Family Name,Phone 1 - Type,Phone 1 - Value";
    const rows = customers
      .filter(c => c.is_active && c.cellphone) // Exporta apenas clientes ativos com celular
      .map(c => {
        const name = c.full_name;
        const phone = c.cellphone.replace(/\D/g, '');
        // Simples separação de nome, pode ser melhorada
        const nameParts = name.split(' ');
        const givenName = nameParts[0];
        const familyName = nameParts.slice(1).join(' ');
        
        return `"${name}","${givenName}","${familyName}","Mobile","${phone}"`;
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

  const filteredCustomers = customers.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cpf && c.cpf.includes(searchTerm)) ||
    (c.cellphone && c.cellphone.includes(searchTerm))
  );

  return (
    <div className={styles.container}>
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={customerToEdit ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
      >
        <CustomerForm
          onSave={handleSaveCustomer}
          onClose={handleCloseModal}
          customerToEdit={customerToEdit}
          loading={isSaving}
        />
      </Modal>

      <header className={styles.header}>
        <h1>Gerenciamento de Clientes</h1>
        <div className={styles.actions}>
          <Input 
            id="search"
            placeholder="Buscar por nome, CPF ou celular..."
            icon={FaSearch}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button onClick={handleExportCSV} variant="secondary">
            <FaFileCsv /> Exportar CSV
          </Button>
          <Button onClick={handleOpenModalForNew}>
            <FaPlus /> Novo Cliente
          </Button>
        </div>
      </header>

      <div className={styles.grid}>
        {loading ? (
          <p>Carregando clientes...</p>
        ) : filteredCustomers.length > 0 ? (
          filteredCustomers.map(customer => (
            <div key={customer.id} className={`${styles.card} ${!customer.is_active ? styles.inactive : ''}`}>
              <div className={styles.cardHeader}>
                <FaUserCircle className={styles.cardIcon} />
                <h3 className={styles.cardTitle}>{customer.full_name}</h3>
              </div>
              <div className={styles.cardBody}>
                <p><strong>CPF:</strong> {customer.cpf || 'Não informado'}</p>
                {customer.cellphone ? (
                  <p><strong>Celular:</strong> {customer.cellphone}</p>
                ) : customer.contact ? (
                  <p className={styles.contactInfo}>
                    <FaPhoneAlt /> 
                    <span>Contato por: <strong>{customer.contact.full_name}</strong></span>
                  </p>
                ) : (
                  <p><strong>Celular:</strong> Não informado</p>
                )}
                <p><strong>Endereço:</strong> {customer.addresses ? `${customer.addresses.street_name}, ${customer.addresses.city}` : 'Não informado'}</p>
              </div>
              <div className={styles.cardFooter}>
                <ToggleSwitch 
                  id={`toggle-${customer.id}`}
                  checked={customer.is_active}
                  onChange={() => handleToggleStatus(customer)}
                />
                <button className={styles.actionButton} onClick={() => handleOpenModalForEdit(customer)}>
                  <FaEdit /> Editar
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>Nenhum cliente encontrado.</p>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
