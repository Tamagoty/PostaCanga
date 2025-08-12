// path: src/pages/CustomersPage.jsx
// REATORAÇÃO: Adicionada a opção de alternar entre visualização em cartões e tabela.
// A lógica de exportação foi movida para um utilitário.

import React, { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './CustomersPage.module.css';
import { FaSearch, FaPlus, FaEye, FaUserCircle, FaArrowLeft, FaArrowRight, FaFileCsv, FaUsers, FaTh, FaList } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';
import ToggleSwitch from '../components/ToggleSwitch';
import { useNavigate } from 'react-router-dom';
import { ITEMS_PER_PAGE } from '../constants';
import { handleSupabaseError } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import CardSkeleton from '../components/CardSkeleton';
import { maskPhone } from '../utils/masks';
import useResourceManagement from '../hooks/useResourceManagement';
import { exportCustomersToGoogleCSV } from '../utils/exportUtils'; // Importação da função de exportação

const CustomersPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('card'); // 'card' ou 'table'

  const fetchCustomersFn = useCallback(async ({ page, itemsPerPage, searchTerm }) => {
    const from = page * itemsPerPage;
    const { data: count, error: countError } = await supabase.rpc('count_customers_filtered', { 
      p_search_term: searchTerm, 
      p_status_filter: statusFilter 
    });
    if (countError) return { error: countError };

    const { data, error: dataError } = await supabase.rpc('get_paginated_customers_with_details', {
      p_limit: itemsPerPage,
      p_offset: from,
      p_search_term: searchTerm,
      p_status_filter: statusFilter,
    });
    if (dataError) return { error: dataError };
    
    return { data, count };
  }, [statusFilter]);

  const {
    data: customers,
    loading,
    isSaving,
    setIsSaving,
    isModalOpen,
    itemToEdit: customerToEdit,
    page,
    setPage,
    totalCount,
    searchTerm,
    setSearchTerm,
    fetchData: fetchCustomers,
    handleOpenModal,
    handleCloseModal,
  } = useResourceManagement({ key: 'full_name', direction: 'asc' }, fetchCustomersFn);

  const handleSaveCustomer = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_customer', formData);
    if (error) { toast.error(handleSupabaseError(error)); }
    else { toast.success(`Cliente ${customerToEdit ? 'atualizado' : 'criado'}!`); handleCloseModal(); fetchCustomers(); }
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
    const toastId = toast.loading('A preparar exportação...');
    const { data: customersToExport, error } = await supabase.rpc('get_customers_for_export');
    toast.dismiss(toastId);
    if (error) {
      toast.error(handleSupabaseError(error));
      return;
    }
    exportCustomersToGoogleCSV(customersToExport);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const renderTableView = () => (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Status</th>
            <th>Nome Completo</th>
            <th>Telemóvel</th>
            <th>Endereço</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(customer => (
            <tr key={customer.id}>
              <td data-label="Status">
                <span className={`${styles.statusIndicator} ${customer.is_active ? styles.active : styles.inactive}`}>
                  {customer.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td data-label="Nome">{customer.full_name}</td>
              <td data-label="Telemóvel">{customer.cellphone ? maskPhone(customer.cellphone) : 'N/A'}</td>
              <td data-label="Endereço">{customer.address_info}</td>
              <td data-label="Ações" className={styles.tableActions}>
                <ToggleSwitch id={`toggle-table-${customer.id}`} checked={customer.is_active} onChange={() => handleToggleStatus(customer)} />
                <Button variant="icon" onClick={() => navigate(`/customers/${customer.id}`)} title="Ver Detalhes">
                  <FaEye />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCardView = () => (
    <div className={styles.grid}>
      {customers.map(customer => (
        <div key={customer.id} className={`${styles.card} ${!customer.is_active ? styles.inactiveCard : ''}`}>
          <div className={styles.cardHeader}><FaUserCircle className={styles.cardIcon} /><h3 className={styles.cardTitle}>{customer.full_name}</h3></div>
          <div className={styles.cardBody}>
            <p><strong>CPF:</strong> {customer.cpf || 'Não informado'}</p>
            <p><strong>Telemóvel:</strong> {customer.cellphone ? maskPhone(customer.cellphone) : 'Não informado'}</p>
            <p><strong>Endereço:</strong> {customer.address_info}</p>
          </div>
          <div className={styles.cardFooter}>
            <ToggleSwitch id={`toggle-card-${customer.id}`} checked={customer.is_active} onChange={() => handleToggleStatus(customer)} />
            <button className={styles.actionButton} onClick={() => navigate(`/customers/${customer.id}`)}><FaEye /> Detalhes</button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={customerToEdit ? 'Editar Cliente' : 'Adicionar Novo Cliente'}>
        <CustomerForm onSave={handleSaveCustomer} onClose={handleCloseModal} customerToEdit={customerToEdit} loading={isSaving} />
      </Modal>

      <header className={styles.header}>
        <h1>Gerenciamento de Clientes</h1>
        <div className={styles.actions}>
          <div className={styles.searchInputWrapper}>
            <Input id="search" placeholder="Digite 🔤, 📞 ou 🪪..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <Button variant={statusFilter === 'active' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('active')}>Ativos</Button>
            <Button variant={statusFilter === 'inactive' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('inactive')}>Inativos</Button>
            <Button variant={statusFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('all')}>Todos</Button>
          </div>
          <div className={styles.viewToggle}>
            <Button variant={viewMode === 'card' ? 'primary' : 'icon'} onClick={() => setViewMode('card')} title="Visualização em Cartões"><FaTh /></Button>
            <Button variant={viewMode === 'table' ? 'primary' : 'icon'} onClick={() => setViewMode('table')} title="Visualização em Tabela"><FaList /></Button>
          </div>
          <Button onClick={handleExportCSV} variant="secondary"><FaFileCsv /> Exportar CSV</Button>
          <Button onClick={() => handleOpenModal(null)}><FaPlus /> Novo Cliente</Button>
        </div>
      </header>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} />)}
        </div>
      ) : customers.length > 0 ? (
        viewMode === 'card' ? renderCardView() : renderTableView()
      ) : (
        <EmptyState
          icon={FaUsers}
          title={searchTerm ? "Nenhum resultado" : "Nenhum cliente"}
          message={searchTerm ? <>Nenhum cliente encontrado para a busca <strong>"{searchTerm}"</strong>.</> : "Ainda não há clientes cadastrados."}
        />
      )}

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
