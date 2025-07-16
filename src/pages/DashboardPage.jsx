// Arquivo: src/pages/CustomersPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './CustomersPage.module.css';
import { FaSearch, FaPlus, FaEye, FaUserCircle, FaPhoneAlt } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';
import ToggleSwitch from '../components/ToggleSwitch';
import { useNavigate } from 'react-router-dom';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'inactive', 'all'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    let { data, error } = await supabase
      .from('customers')
      .select('*, addresses(*, city:cities(name, state:states(uf))), contact:contact_customer_id(full_name)')
      .order('full_name', { ascending: true });

    if (error) toast.error('Erro ao buscar clientes: ' + error.message);
    else setCustomers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSaveCustomer = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_customer', formData);
    if (error) toast.error(`Erro ao salvar: ${error.message}`);
    else {
      toast.success(`Cliente ${customerToEdit ? 'atualizado' : 'criado'}!`);
      setIsModalOpen(false);
      fetchCustomers();
    }
    setIsSaving(false);
  };

  const handleToggleStatus = async (customer) => {
    const newStatus = !customer.is_active;
    const toastId = toast.loading(`${newStatus ? 'Ativando' : 'Desativando'} cliente...`);
    const { error } = await supabase.rpc('set_customer_status', { p_customer_id: customer.id, p_is_active: newStatus });
    if (error) toast.error(`Erro: ${error.message}`, { id: toastId });
    else { toast.success('Status atualizado!', { id: toastId }); fetchCustomers(); }
  };

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        if (statusFilter === 'active') return c.is_active;
        if (statusFilter === 'inactive') return !c.is_active;
        return true; // 'all'
      })
      .filter(c => 
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cpf && c.cpf.includes(searchTerm)) ||
        (c.cellphone && c.cellphone.includes(searchTerm))
      );
  }, [customers, searchTerm, statusFilter]);

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={customerToEdit ? 'Editar Cliente' : 'Adicionar Novo Cliente'}>
        <CustomerForm onSave={handleSaveCustomer} onClose={() => setIsModalOpen(false)} customerToEdit={customerToEdit} loading={isSaving} />
      </Modal>

      <header className={styles.header}>
        <h1>Gerenciamento de Clientes</h1>
        <div className={styles.actions}>
          <div className={styles.searchInputWrapper}>
            <Input id="search" placeholder="Buscar por nome, CPF..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <Button variant={statusFilter === 'active' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('active')}>Ativos</Button>
            <Button variant={statusFilter === 'inactive' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('inactive')}>Inativos</Button>
            <Button variant={statusFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('all')}>Todos</Button>
          </div>
          <Button onClick={() => { setCustomerToEdit(null); setIsModalOpen(true); }}><FaPlus /> Novo Cliente</Button>
        </div>
      </header>

      <div className={styles.grid}>
        {loading ? (<p>A carregar clientes...</p>) 
        : filteredCustomers.length > 0 ? (
          filteredCustomers.map(customer => (
            <div key={customer.id} className={`${styles.card} ${!customer.is_active ? styles.inactive : ''}`}>
              <div className={styles.cardHeader}>
                <FaUserCircle className={styles.cardIcon} />
                <h3 className={styles.cardTitle}>{customer.full_name}</h3>
              </div>
              <div className={styles.cardBody}>
                <p><strong>CPF:</strong> {customer.cpf || 'Não informado'}</p>
                {customer.cellphone ? (<p><strong>Celular:</strong> {customer.cellphone}</p>) 
                : customer.contact ? (<p className={styles.contactInfo}><FaPhoneAlt /> <span>Contato por: <strong>{customer.contact.full_name}</strong></span></p>) 
                : (<p><strong>Celular:</strong> Não informado</p>)}
                <p><strong>Endereço:</strong> {customer.addresses ? `${customer.addresses.street_name}, ${customer.address_number || 'S/N'}` : 'Não informado'}</p>
              </div>
              <div className={styles.cardFooter}>
                <ToggleSwitch id={`toggle-${customer.id}`} checked={customer.is_active} onChange={() => handleToggleStatus(customer)} />
                <button className={styles.actionButton} onClick={() => navigate(`/customers/${customer.id}`)}><FaEye /> Detalhes</button>
              </div>
            </div>
          ))
        ) : (<p>Nenhum cliente encontrado.</p>)}
      </div>
    </div>
  );
};

export default CustomersPage;
