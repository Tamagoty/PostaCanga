// Arquivo: src/pages/CustomersPage.jsx
// MELHORIA (v7): Aplicada a máscara de telefone no card do cliente.
// A busca de dados foi ajustada para incluir o telefone do contato associado.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './CustomersPage.module.css';
import { FaSearch, FaPlus, FaEye, FaUserCircle, FaPhoneAlt, FaArrowLeft, FaArrowRight, FaFileCsv, FaUsers } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';
import ToggleSwitch from '../components/ToggleSwitch';
import { useNavigate } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import { ITEMS_PER_PAGE } from '../constants';
import { handleSupabaseError } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import CardSkeleton from '../components/CardSkeleton';
import { maskPhone } from '../utils/masks'; // 1. Importar a máscara

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: count, error: countError } = await supabase.rpc('count_customers_filtered', { p_search_term: debouncedSearchTerm, p_status_filter: statusFilter });
      if (countError) throw countError;
      setTotalCount(count || 0);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // 2. Query ajustada para buscar o 'cellphone' do contato associado
      let dataQuery = supabase
        .from('customers')
        .select('*, addresses(*, city:cities(name, state:states(uf))), contact:contact_customer_id(full_name, cellphone)');

      if (debouncedSearchTerm) {
        const { data: idResults, error: idError } = await supabase.rpc('filter_customer_ids', { p_search_term: debouncedSearchTerm });
        if (idError) throw idError;
        const customerIds = idResults.map(r => r.customer_id);
        dataQuery = dataQuery.in('id', customerIds);
      }
      
      if (statusFilter !== 'all') {
          dataQuery = dataQuery.eq('is_active', statusFilter === 'active');
      }

      dataQuery = dataQuery.range(from, to).order('full_name', { ascending: true });

      const { data, error: dataError } = await dataQuery;
      if (dataError) throw dataError;

      setCustomers(data || []);
    } catch (error) {
        toast.error(handleSupabaseError(error));
    } finally {
        setLoading(false);
    }
  }, [page, debouncedSearchTerm, statusFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(0); }, [debouncedSearchTerm, statusFilter]);

  const handleSaveCustomer = async (formData) => {
    setIsSaving(true);
    const payload = {
      p_customer_id: customerToEdit?.id || null, p_full_name: formData.full_name,
      p_cpf: formData.cpf || null, p_cellphone: formData.cellphone || null, p_birth_date: formData.birth_date || null,
      p_contact_customer_id: formData.contact_customer_id || null, p_email: formData.email || null,
      p_address_id: formData.address_id || null, p_address_number: formData.address_number || null, p_address_complement: formData.address_complement || null
    };
    const { error } = await supabase.rpc('create_or_update_customer', payload);
    if (error) { toast.error(handleSupabaseError(error)); }
    else { toast.success(`Cliente ${customerToEdit ? 'atualizado' : 'criado'}!`); setIsModalOpen(false); fetchCustomers(); }
    setIsSaving(false);
  };

  const handleToggleStatus = async (customer) => {
    const newStatus = !customer.is_active;
    const toastId = toast.loading(`${newStatus ? 'Ativando' : 'Desativando'} cliente...`);
    const { error } = await supabase.rpc('set_customer_status', { p_customer_id: customer.id, p_is_active: newStatus });
    if (error) { toast.error(handleSupabaseError(error), { id: toastId }); }
    else { toast.success('Status atualizado!', { id: toastId }); fetchCustomers(); }
  };

  const handleExportCSV = async () => {
    const toastId = toast.loading('Preparando exportação...');
    const { data: allActiveCustomers, error } = await supabase.from('customers').select('full_name, cellphone').eq('is_active', true).not('cellphone', 'is', null);
    if (error || !allActiveCustomers || allActiveCustomers.length === 0) {
      toast.error(error ? handleSupabaseError(error) : 'Nenhum cliente ativo com telefone para exportar.', { id: toastId });
      return;
    }
    const headers = "Name,Given Name,Family Name,Phone 1 - Type,Phone 1 - Value";
    const rows = allActiveCustomers.map(c => {
      const name = c.full_name; const phone = c.cellphone.replace(/\D/g, '');
      const nameParts = name.split(' '); const givenName = nameParts[0];
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
    toast.success("Exportação concluída!", { id: toastId });
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={customerToEdit ? 'Editar Cliente' : 'Adicionar Novo Cliente'}>
        <CustomerForm onSave={handleSaveCustomer} onClose={() => setIsModalOpen(false)} customerToEdit={customerToEdit} loading={isSaving} />
      </Modal>

      <header className={styles.header}>
        <h1>Gerenciamento de Clientes</h1>
        <div className={styles.actions}>
          <div className={styles.searchInputWrapper}>
            <Input id="search" placeholder="Buscar por nome, CPF ou celular..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <Button variant={statusFilter === 'active' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('active')}>Ativos</Button>
            <Button variant={statusFilter === 'inactive' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('inactive')}>Inativos</Button>
            <Button variant={statusFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('all')}>Todos</Button>
          </div>
          <Button onClick={handleExportCSV} variant="secondary"><FaFileCsv /> Exportar CSV</Button>
          <Button onClick={() => { setCustomerToEdit(null); setIsModalOpen(true); }}><FaPlus /> Novo Cliente</Button>
        </div>
      </header>

      <div className={styles.grid}>
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} />)
        ) : customers.length > 0 ? (
          customers.map(customer => (
            <div key={customer.id} className={`${styles.card} ${!customer.is_active ? styles.inactive : ''}`}>
              <div className={styles.cardHeader}><FaUserCircle className={styles.cardIcon} /><h3 className={styles.cardTitle}>{customer.full_name}</h3></div>
              <div className={styles.cardBody}>
                <p><strong>CPF:</strong> {customer.cpf || 'Não informado'}</p>
                {/* 3. Aplicar a máscara de telefone */}
                {customer.cellphone ? (<p><strong>Celular:</strong> {maskPhone(customer.cellphone)}</p>) 
                : customer.contact ? (<p className={styles.contactInfo}><FaPhoneAlt /> <span>Contato por: <strong>{customer.contact.full_name}</strong> ({maskPhone(customer.contact.cellphone)})</span></p>) 
                : (<p><strong>Celular:</strong> Não informado</p>)}
                <p><strong>Endereço:</strong> {customer.addresses ? `${customer.addresses.street_name}, ${customer.address_number || 'S/N'}` : 'Não informado'}</p>
              </div>
              <div className={styles.cardFooter}>
                <ToggleSwitch id={`toggle-${customer.id}`} checked={customer.is_active} onChange={() => handleToggleStatus(customer)} />
                <button className={styles.actionButton} onClick={() => navigate(`/customers/${customer.id}`)}><FaEye /> Detalhes</button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={FaUsers}
            title={debouncedSearchTerm ? "Nenhum resultado" : "Nenhum cliente"}
            message={
              debouncedSearchTerm
                ? <>Nenhum cliente encontrado para a busca <strong>"{debouncedSearchTerm}"</strong>.</>
                : "Ainda não há clientes cadastrados ou nenhum corresponde ao filtro selecionado."
            }
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button onClick={() => setPage(p => p - 1)} disabled={page === 0}>
            <FaArrowLeft /> Anterior
          </Button>
          <span className={styles.pageInfo}>
            Página {page + 1} de {totalPages}
          </span>
          <Button onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}>
            Próxima <FaArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
